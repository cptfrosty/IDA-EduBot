# app/rag/rag_compiled.py
from __future__ import annotations

import os
import re
import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Literal

import requests
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

Intent = Literal["INSTITUTE_QA", "COURSE_QA", "RECOMMENDATION", "MIXED"]


# -------------------------
# Models
# -------------------------

@dataclass
class StudentNeed:
    intent: Intent
    confidence: float = 0.6


@dataclass
class RetrievedChunk:
    content: str
    score: float
    source: str
    meta: Dict[str, Any]


@dataclass
class RAGResponse:
    answer: str
    confidence: float
    sources: List[Dict[str, Any]]
    need: Optional[StudentNeed] = None
    recommendations: Optional[List[Dict[str, Any]]] = None


# -------------------------
# Qdrant Vector DB (REST)
# -------------------------

class QdrantVectorDB:
    """
    REST search в Qdrant.
    payload_text_keys: в каком поле лежит текст.
    Для institute_faq_v2: "text" (или "question"+"answer" как fallback)
    Для лекций: "chunk_text"
    """
    def __init__(
        self,
        collection_name: str,
        *,
        qdrant_url: Optional[str] = None,
        encoder_model: str = "intfloat/multilingual-e5-large",
        payload_text_keys: Optional[List[str]] = None,
        normalize_embeddings: bool = True,
        use_e5_query_prefix: bool = True,
    ):
        self.collection = collection_name
        self.qdrant_url = (qdrant_url or os.getenv("QDRANT_URL", "http://localhost:6333")).rstrip("/")
        self.encoder = SentenceTransformer(encoder_model)
        self.payload_text_keys = payload_text_keys or ["chunk_text", "text", "content"]
        self.normalize_embeddings = normalize_embeddings
        self.use_e5_query_prefix = use_e5_query_prefix

    def _embed(self, text: str) -> List[float]:
        q = text.strip()
        if self.use_e5_query_prefix:
            q = f"query: {q}"
        vec = self.encoder.encode([q], normalize_embeddings=self.normalize_embeddings)[0]
        return vec.tolist()

    def _extract_text(self, payload: Dict[str, Any]) -> str:
        for k in self.payload_text_keys:
            v = payload.get(k)
            if isinstance(v, str) and v.strip():
                return v.strip()

        # fallback for FAQ
        q = payload.get("question")
        a = payload.get("answer")
        parts = []
        if isinstance(q, str) and q.strip():
            parts.append(f"Q: {q.strip()}")
        if isinstance(a, str) and a.strip():
            parts.append(f"A: {a.strip()}")
        return "\n".join(parts).strip()

    def search(
        self,
        query_text: str,
        *,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 8,
    ) -> List[RetrievedChunk]:
        vector = self._embed(query_text)

        qdrant_filter = None
        if filters:
            must = []
            for k, v in filters.items():
                if v is None:
                    continue
                must.append({"key": k, "match": {"value": v}})
            if must:
                qdrant_filter = {"must": must}

        body = {
            "vector": vector,
            "limit": limit,
            "with_payload": True,
        }
        if qdrant_filter:
            body["filter"] = qdrant_filter

        url = f"{self.qdrant_url}/collections/{self.collection}/points/search"
        r = requests.post(url, json=body, timeout=30)
        r.raise_for_status()
        data = r.json()

        out: List[RetrievedChunk] = []
        for p in data.get("result", []):
            score = float(p.get("score", 0.0))
            payload = p.get("payload") or {}

            content = self._extract_text(payload)
            # источник делаем человекочитаемым
            source = (
                payload.get("source_file")
                or payload.get("course_title")
                or payload.get("category_ru")
                or payload.get("category")
                or "Источник"
            )

            out.append(RetrievedChunk(
                content=content,
                score=score,
                source=str(source),
                meta=dict(payload),
            ))

        out.sort(key=lambda x: x.score, reverse=True)
        return out


# -------------------------
# Orchestrator
# -------------------------

class RAGOrchestrator:
    def __init__(
        self,
        *,
        llm,
        course_db: QdrantVectorDB,
        institute_db: QdrantVectorDB,
        max_chunks: int = 8,
        min_score: float = 0.25,
    ):
        self.llm = llm
        self.course_db = course_db
        self.institute_db = institute_db
        self.max_chunks = max_chunks
        self.min_score = min_score

    # -------- intent routing --------

    def _detect_intent(self, query: str) -> StudentNeed:
        q = query.lower()

        inst_kw = [
            "деканат", "справка", "отчисл", "восстанов", "перевод",
            "стипен", "общежит", "расписан", "аудитор", "кафедр",
            "пересдач", "приказ", "документ", "оплата", "договор",
            "пропуск", "карта", "кампус", "время работы", "адрес", "контакты"
        ]
        rec_kw = ["что учить", "что повторить", "порекомендуй", "рекоменд", "план обучения", "как подготовиться"]

        has_inst = any(k in q for k in inst_kw)
        has_rec = any(k in q for k in rec_kw)

        if has_inst and has_rec:
            return StudentNeed(intent="MIXED", confidence=0.7)
        if has_inst:
            return StudentNeed(intent="INSTITUTE_QA", confidence=0.7)
        if has_rec:
            return StudentNeed(intent="RECOMMENDATION", confidence=0.7)
        return StudentNeed(intent="COURSE_QA", confidence=0.6)

    # -------- course auto detect --------

    async def _auto_detect_course(
        self,
        *,
        query: str,
        courses: List[str],
        student_level: str = "unknown",
    ) -> Optional[str]:
        if not courses:
            return None

        # 1) быстрое вхождение
        q = query.lower()
        for c in courses:
            if c and c.lower() in q:
                return c

        # 2) если один курс — берём его
        if len(courses) == 1:
            return courses[0]

        # 3) LLM-роутер
        prompt = (
            "Выбери ОДИН наиболее подходящий курс из списка, или верни 'NONE'.\n"
            f"Вопрос: {query}\n"
            f"Курсы: {', '.join(courses)}\n"
            "Ответ: только название курса или NONE."
        )
        raw = await self.llm.chat([{"role": "system", "content": prompt}], temperature=0.0, max_tokens=40)
        ans = (raw or "").strip()
        if ans.upper() == "NONE":
            return None

        ans_l = ans.lower()
        # exact / fuzzy
        for c in courses:
            if c.lower() == ans_l:
                return c
        for c in courses:
            if ans_l in c.lower() or c.lower() in ans_l:
                return c
        return None

    # -------- prompt building --------

    def _build_course_prompt(self, query: str, course_title: str, chunks: List[RetrievedChunk], student_level: str) -> str:
        ctx = "\n\n".join([f"[{i+1}] {c.content}" for i, c in enumerate(chunks)])
        return f"""
Ты — учебный ассистент по курсу «{course_title}».

Правила:
- Используй КОНТЕКСТ ниже (лекционные материалы курса).
- Если прямого ответа нет: скажи, что в материалах курса нет прямого ответа, задай 1-2 уточняющих вопроса
  и предложи, что повторить из найденного контекста.

Уровень студента: {student_level}

КОНТЕКСТ:
{ctx}

Вопрос:
{query}

Формат:
1) Ответ
2) Что повторить (2-4 пункта)
3) Мини-проверка (1-2 вопроса)
""".strip()

    def _build_institute_prompt(self, query: str, chunks: List[RetrievedChunk]) -> str:
        ctx = "\n\n".join([f"[{i+1}] {c.content}" for i, c in enumerate(chunks)])
        return f"""
Ты — справочный помощник по институту. Отвечай ТОЛЬКО по КОНТЕКСТУ (FAQ).

Если ответа нет: скажи, что в базе FAQ нет точного ответа, и задай 1-2 уточняющих вопроса.

КОНТЕКСТ:
{ctx}

Вопрос:
{query}

Формат:
1) Ответ
2) Что уточнить / куда обратиться
""".strip()

    # -------- helpers --------

    def _sources_payload(self, chunks: List[RetrievedChunk], max_items: int = 8) -> List[Dict[str, Any]]:
        out = []
        for c in chunks[:max_items]:
            meta = c.meta or {}
            out.append({
                "source": c.source,
                "score": round(float(c.score), 3),
                "collection_hint": meta.get("course_title") or meta.get("content_type") or meta.get("category_ru"),
                "course_id": meta.get("course_id"),
                "course_title": meta.get("course_title"),
                "chunk_index": meta.get("chunk_index"),
                "content_type": meta.get("content_type"),
                "category_ru": meta.get("category_ru"),
                "meta": {k: v for k, v in meta.items() if k not in ("chunk_text", "text", "content", "answer")},
            })
        return out

    def _make_recommendations(self, chunks: List[RetrievedChunk], max_items: int = 5) -> List[Dict[str, Any]]:
        recs: List[Dict[str, Any]] = []
        seen = set()
        for c in chunks:
            meta = c.meta or {}
            key = (c.source, meta.get("chunk_index"), meta.get("material_id"))
            if key in seen:
                continue
            seen.add(key)
            recs.append({
                "title": meta.get("title") or meta.get("course_title") or c.source,
                "source": c.source,
                "course_id": meta.get("course_id"),
                "course_title": meta.get("course_title"),
                "chunk_index": meta.get("chunk_index"),
                "score": round(float(c.score), 3),
            })
            if len(recs) >= max_items:
                break
        return recs

    def _confidence(self, chunks: List[RetrievedChunk]) -> float:
        if not chunks:
            return 0.0
        top = float(chunks[0].score)
        return max(0.0, min(top, 1.0))

    # -------------------------
    # Main process
    # -------------------------

    async def process(
        self,
        query: str,
        *,
        student_level: str = "unknown",
        # course scope
        course_id: Optional[str] = None,
        course_title: Optional[str] = None,
        available_courses: Optional[List[str]] = None,
        course_access_ids: Optional[List[str]] = None,
        # dialog
        dialog_history: Optional[List[Dict[str, str]]] = None,
    ) -> RAGResponse:
        need = self._detect_intent(query)
        history = dialog_history or []

        # --- INSTITUTE ROUTE ---
        if need.intent in ("INSTITUTE_QA", "MIXED"):
            # ваша коллекция уже FAQ → фильтр можно оставить минимальным:
            inst_chunks = self.institute_db.search(
                query_text=query,
                filters={"content_type": "faq"},
                limit=self.max_chunks,
            )
            inst_chunks = [c for c in inst_chunks if c.score >= self.min_score]

            if inst_chunks:
                prompt = self._build_institute_prompt(query, inst_chunks)
                messages = history[-6:] + [{"role": "system", "content": prompt}]
                answer = await self.llm.chat(messages, temperature=0.2, max_tokens=700)

                return RAGResponse(
                    answer=answer,
                    confidence=self._confidence(inst_chunks),
                    sources=self._sources_payload(inst_chunks),
                    need=need,
                    recommendations=self._make_recommendations(inst_chunks),
                )

            if need.intent == "INSTITUTE_QA":
                return RAGResponse(
                    answer="Не нашёл точного ответа в базе FAQ института. Уточните, пожалуйста, формулировку (что именно нужно и для какого процесса/отдела).",
                    confidence=0.3,
                    sources=[],
                    need=need,
                    recommendations=[],
                )
            # если MIXED — падаем дальше в курс

        # --- COURSE ROUTE / RECOMMENDATION ---
        if course_title is None and available_courses:
            course_title = await self._auto_detect_course(query=query, courses=available_courses, student_level=student_level)

        # поиск по курсам: обязателен фильтр по course_id, если он известен
        # Если course_id не передан (курс не выбран) — делаем wide-поиск, но потом "голосуем" за course_id из чанков
        course_filters = {"course_id": course_id} if course_id else None
        chunks = self.course_db.search(query_text=query, filters=course_filters, limit=self.max_chunks)
        chunks = [c for c in chunks if c.score >= self.min_score]
        chunks.sort(key=lambda x: x.score, reverse=True)

        # если course_id не задан — пытаемся определить по найденным чанкам
        if not course_id and chunks:
            votes: Dict[str, float] = {}
            for c in chunks:
                cid = (c.meta or {}).get("course_id")
                if not cid:
                    continue
                # проверка доступа (если передали список доступных course_id)
                if course_access_ids and str(cid) not in set(course_access_ids):
                    continue
                votes[str(cid)] = votes.get(str(cid), 0.0) + float(c.score)

            if votes:
                course_id = max(votes.items(), key=lambda kv: kv[1])[0]
                # перезапрос уже строго по course_id
                chunks2 = self.course_db.search(query_text=query, filters={"course_id": course_id}, limit=self.max_chunks)
                chunks2 = [c for c in chunks2 if c.score >= self.min_score]
                chunks2.sort(key=lambda x: x.score, reverse=True)
                if chunks2:
                    chunks = chunks2

        if not chunks:
            if need.intent == "RECOMMENDATION":
                return RAGResponse(
                    answer="Не нашёл подходящих материалов по вашим курсам. Напишите тему/раздел (например: «списки в Python», «циклы», «ООП») — порекомендую точнее.",
                    confidence=0.25,
                    sources=[],
                    need=need,
                    recommendations=[],
                )

            return RAGResponse(
                answer="В материалах ваших курсов не нашёл прямого ответа. Уточните тему/раздел или пришлите формулировку из лекции — тогда найду точнее и порекомендую материал.",
                confidence=0.25,
                sources=[],
                need=need,
                recommendations=[],
            )

        course_label = course_title or "ваш курс"
        prompt = self._build_course_prompt(query, course_label, chunks, student_level)
        messages = history[-6:] + [{"role": "system", "content": prompt}]
        answer = await self.llm.chat(messages, temperature=0.2, max_tokens=900)

        return RAGResponse(
            answer=answer,
            confidence=self._confidence(chunks),
            sources=self._sources_payload(chunks),
            need=need,
            recommendations=self._make_recommendations(chunks),
        )
