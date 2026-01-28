from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging

from vector_db import models

logger = logging.getLogger(__name__)


@dataclass
class RetrievedChunk:
    content: str
    score: float
    source: str


@dataclass
class RAGResponse:
    answer: str
    sources: List[Dict[str, Any]]
    confidence: float
    from_lectures: bool
    processing_time: float


class GigaChatRAGOrchestrator:

    def __init__(self, vector_db, llm_client):
        self.vector_db = vector_db
        self.llm = llm_client

        # Уменьшите порог сходства с 0.9 до 0.7-0.8
        self.similarity_threshold = 0.79  # Было 0.9
        self.min_chunks = 2
        self.max_chunks = 5

    def search(self, query_text: str, filters: dict | None = None, limit: int = 10) -> list[dict]:
        if not self.is_connected or self.client is None:
            return []

        query_vector = self.encoder.encode(query_text).tolist()

        q_filter = None
        if filters and "discipline" in filters:
            q_filter = models.Filter(
                must=[models.FieldCondition(
                    key="discipline",
                    match=models.MatchValue(value=filters["discipline"])
                )]
            )

        hits = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            query_filter=q_filter,
            limit=limit,
            with_payload=True
        )

        out = []
        for h in hits:
            out.append({
                "score": float(h.score),
                "payload": dict(h.payload or {})
            })
        return out

    async def process(
        self,
        query: str,
        discipline: str,
        dialog_history: List[Dict[str, str]],
        student_level: str
    ) -> RAGResponse:

        start = datetime.now()

        chunks = await self._search_chunks(query, discipline)

        if len(chunks) < self.min_chunks:
            answer = self._answer_from_general_knowledge(
                query, dialog_history
            )
            return self._build_fallback(answer, start)

        prompt = self._build_prompt(query, discipline, chunks, student_level)
        messages = dialog_history + [
            {"role": "system", "content": prompt},
            {"role": "user", "content": query}
        ]

        answer = self.llm.chat(messages)

        return RAGResponse(
            answer=answer,
            sources=[{"source": c.source, "score": c.score} for c in chunks],
            confidence=self._calc_confidence(chunks),
            from_lectures=True,
            processing_time=(datetime.now() - start).total_seconds()
        )

    async def _search_chunks(self, query: str, discipline: str) -> List[RetrievedChunk]:
        results = await self.vector_db.search(
            query_text=query,
            filters={"discipline": discipline},
            limit=10
        )

        chunks = []
        for r in results:
            if r["score"] >= self.similarity_threshold:
                chunks.append(
                    RetrievedChunk(
                        content=r["payload"].get("content", ""),
                        score=r["score"],
                        source=r["payload"].get("source", "Лекции")
                    )
                )

        return sorted(chunks, key=lambda x: x.score, reverse=True)[:self.max_chunks]

    def _build_prompt(self, query, discipline, chunks, level) -> str:
        context_blocks = []
        for i, c in enumerate(chunks, start=1):
            context_blocks.append(f"[{i}] SOURCE={c.source}\n{c.content}")

        context = "\n\n".join(context_blocks)

        return f"""
    Ты — преподаватель по дисциплине «{discipline}».
    Уровень студента: {level}

    ТЕБЕ ДАН КОНТЕКСТ (выдержки из лекций). Отвечай ТОЛЬКО опираясь на него.
    Если ответа нет в контексте — скажи: "В материалах лекций этого нет" и предложи, что уточнить.

    КОНТЕКСТ:
    {context}

    ТРЕБОВАНИЯ К ОТВЕТУ:
    1) Дай краткий ответ (2-5 предложений).
    2) Затем "Что повторить": 2-4 пункта.
    3) Затем "Мини-проверка": 1-3 вопроса студенту.
    4) В конце укажи источники в формате: [номер] SOURCE.
    """

    def _build_fallback(self, answer: str, start: datetime) -> RAGResponse:
        return RAGResponse(
            answer=(
                "⚠️ В лекционных материалах ответ не найден.\n\n"
                "Ответ ниже основан на общих знаниях и открытых источниках:\n\n"
                f"{answer}"
            ),
            sources=[],
            confidence=0.3,
            from_lectures=False,
            processing_time=(datetime.now() - start).total_seconds()
        )

    def _calc_confidence(self, chunks: list[RetrievedChunk]) -> float:
        if not chunks:
            return 0.0
        scores = [c.score for c in chunks]
        top = scores[0]
        avg = sum(scores) / len(scores)
        # лёгкий штраф за малое кол-во
        n_bonus = min(len(scores) / self.max_chunks, 1.0)
        conf = 0.6 * top + 0.4 * avg
        conf *= 0.7 + 0.3 * n_bonus
        return max(0.0, min(conf, 1.0))
