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
import re
from typing import Set

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
        min_top_score: float = 0.45
    ):
        self.llm = llm
        self.course_db = course_db
        self.institute_db = institute_db
        self.max_chunks = max_chunks
        self.min_score = min_score
        self.min_top_score = min_top_score

    # -------- intent routing --------

    def _kw_set(self, text: str) -> Set[str]:
        # простая токенизация: рус/англ буквы+цифры
        tokens = re.findall(r"[a-zа-яё0-9]+", (text or "").lower())
        # отсекаем короткие/мусорные
        return {t for t in tokens if len(t) >= 4}

    def _chunk_is_related(self, query: str, chunk_text: str, min_overlap: int = 2) -> bool:
        """
        Санити-чек: если в тексте чанка нет пересечения по ключевым словам с запросом,
        считаем чанк нерелевантным (например: "ядерная физика" vs "ООП/классы/методы").
        """
        qk = self._kw_set(query)
        if len(qk) < 2:  # очень короткий запрос — не блокируем
            return True

        ck = self._kw_set(chunk_text)
        overlap = qk.intersection(ck)
        return len(overlap) >= min_overlap

    def _detect_intent(self, query: str) -> StudentNeed:
        q = (query or "").lower()

        # Маркеры института (админ. процессы)
        inst_kw = [
            "деканат", "справка", "отчисл", "восстанов", "перевод",
            "стипен", "общежит", "пересдач", "приказ", "документ",
            "оплата", "договор", "пропуск", "карта", "кампус",

            # ✅ время/режим работы
            "время работы", "график работы", "режим работы", "часы работы",
            "до скольки", "со скольки", "когда работает", "работает ли", "работает",

            # ✅ контакты/поступление
            "адрес", "контакты", "телефон", "почта",
            "приёмная комиссия", "приемная комиссия",
            "поступ",
        ]

        # Слабые/двусмысленные маркеры (часто встречаются и в учебных вопросах)
        inst_weak_kw = ["расписан", "аудитор", "кафедр"]

        rec_kw = ["что учить", "что повторить", "порекомендуй", "рекоменд", "план обучения", "как подготовиться"]

        course_markers = [
            "лекц", "дз", "домаш", "лабо", "практи", "семинар", "тема",
            "модул", "конспект", "слайд", "видео", "задач", "пример"
        ]

        has_rec = any(k in q for k in rec_kw)
        has_course = any(k in q for k in course_markers)

        has_inst_strong = any(k in q for k in inst_kw)
        has_inst_weak = any(k in q for k in inst_weak_kw)

        # Если явный институт + явный учебный контекст — MIXED
        if (has_inst_strong or has_inst_weak) and has_course:
            return StudentNeed(intent="MIXED", confidence=0.7)

        if has_inst_strong or (has_inst_weak and not has_course):
            return StudentNeed(intent="INSTITUTE_QA", confidence=0.7)

        if has_rec:
            return StudentNeed(intent="RECOMMENDATION", confidence=0.7)

        return StudentNeed(intent="COURSE_QA", confidence=0.6)

    def _looks_like_institute_query(self, query: str) -> bool:
        q = (query or "").lower()

        inst_patterns = (
            "время работы", "график работы", "режим работы", "часы работы",
            "до скольки", "со скольки", "когда работает", "работает ли",
            "адрес", "контакты", "телефон", "почта",
            "как поступить", "поступление", "приемная комиссия", "приёмная комиссия",
        )

        org_markers = (
            "институт", "политех", "впи", "впИ", "волжск", "волжский"
        )

        return any(p in q for p in inst_patterns) and any(m in q for m in org_markers)

    def _explicit_general_request(self, query: str) -> bool:
        q = (query or "").lower()
        # пользователь явно просит общий ответ "не по лекциям"
        return any(
            p in q
            for p in (
                "по общим знаниям",
                "в общем",
                "вообще",
                "не по лекциям",
                "не по материалам",
                "без привязки к курсу",
                "вне курса",
                "теоретически",
            )
        )

    def _looks_like_access_or_inventory_query(self, query: str) -> bool:
        q = (query or "").lower()
        access_markers = (
            "доступ", "доступно", "доступен", "записан", "записана", "мои курсы",
            "какие курсы", "список курсов", "какие лекции", "список лекций",
            "что мне доступно", "есть ли курс", "есть ли лекция",
        )
        return any(m in q for m in access_markers)
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
        # Уникализируем по source_file (или material_id)
        best_by_key: Dict[str, RetrievedChunk] = {}

        for c in chunks:
            meta = c.meta or {}
            key = (
                str(meta.get("source_file"))
                if meta.get("source_file")
                else str(meta.get("material_id") or c.source)
            )

            if key not in best_by_key or c.score > best_by_key[key].score:
                best_by_key[key] = c

        uniq = sorted(best_by_key.values(), key=lambda x: x.score, reverse=True)[:max_items]

        out: List[Dict[str, Any]] = []
        for c in uniq:
            meta = c.meta or {}
            out.append({
                "source": c.source,
                "score": round(float(c.score), 3),
                "course_id": meta.get("course_id"),
                "course_title": meta.get("course_title"),
                "content_type": meta.get("content_type"),
                "chunk_index": meta.get("chunk_index"),
                "meta": {
                    k: v for k, v in meta.items()
                    if k not in ("chunk_text", "text", "content", "answer")
                },
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

    def _chunk_text(self, c) -> str:
        """
        Унифицировано достаём текст чанка.
        Поддерживает варианты:
        - c.text
        - c.payload["text"]
        - c.meta["text"]
        - c.payload["content"]/["chunk"] и т.п.
        """
        # 1) прямое поле text
        if hasattr(c, "text") and isinstance(getattr(c, "text"), str):
            return getattr(c, "text") or ""

        # 2) payload/meta словари (как часто у Qdrant клиентов)
        payload = getattr(c, "payload", None)
        meta = getattr(c, "meta", None)

        # иногда meta/payload бывают None
        payload = payload or {}
        meta = meta or {}

        for d in (payload, meta):
            if isinstance(d, dict):
                for key in ("text", "content", "chunk", "page_content"):
                    v = d.get(key)
                    if isinstance(v, str) and v.strip():
                        return v

        return ""

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
    ) -> "RAGResponse":
        history = dialog_history or []
        need = self._detect_intent(query)

        # ---------------------------------------------------------------------
        # 1) Жёсткий приоритет: если вопрос похож на "институтский" — сначала institute_db
        # ---------------------------------------------------------------------
        if self._looks_like_institute_query(query) or need.intent in ("INSTITUTE_QA", "MIXED"):
            inst_chunks = self.institute_db.search(
                query_text=query,
                filters={"content_type": "faq", "course_id": "institute_general"},
                limit=self.max_chunks,
            )
            inst_chunks = [c for c in inst_chunks if float(c.score) >= self.min_score]
            inst_chunks.sort(key=lambda x: float(x.score), reverse=True)

            if inst_chunks and float(inst_chunks[0].score) >= self.min_top_score:
                prompt = self._build_institute_prompt(query, inst_chunks)
                messages = [{"role": "system", "content": prompt}] + history[-6:] + [{"role": "user", "content": query}]
                answer = await self.llm.chat(messages, temperature=0.2, max_tokens=700)

                # Правило №3: без источников (даже если Qdrant использовали)
                return RAGResponse(
                    answer=answer,
                    confidence=self._confidence(inst_chunks),
                    sources=[],
                    need=StudentNeed(intent="INSTITUTE_QA", confidence=0.9),
                    recommendations=[],
                )

            # Если intent был чисто институтский — не уходим в лекции, а эскалируем
            if need.intent == "INSTITUTE_QA" or self._looks_like_institute_query(query):
                return RAGResponse(
                    answer=(
                        "Точного ответа в базе FAQ института не нашёл. "
                        "Лучше уточнить по официальным контактам института (приёмная/деканат) — телефон или email."
                    ),
                    confidence=0.3,
                    sources=[],
                    need=StudentNeed(intent="INSTITUTE_QA", confidence=0.7),
                    recommendations=[],
                )
            # если MIXED — продолжаем дальше в курс

        # ---------------------------------------------------------------------
        # 2) COURSE ROUTE: авто-определение курса (не делаем для институтских запросов)
        # ---------------------------------------------------------------------
        if course_title is None and available_courses and not self._looks_like_institute_query(query):
            course_title = await self._auto_detect_course(
                query=query, courses=available_courses, student_level=student_level
            )

        # фильтр по course_id если задан; иначе — широкий поиск
        course_filters = {"course_id": course_id} if course_id else None
        chunks = self.course_db.search(query_text=query, filters=course_filters, limit=self.max_chunks)

        # ---------------------------------------------------------------------
        # 3) Фильтр по score + сортировка
        # ---------------------------------------------------------------------
        chunks = [c for c in chunks if float(c.score) >= self.min_score]
        chunks.sort(key=lambda x: float(x.score), reverse=True)

        # ---------------------------------------------------------------------
        # 4) Санити-чек: если top чанк не тематический — НЕ приклеиваем источники, уходим в GENERAL_MODEL
        # ---------------------------------------------------------------------
        if chunks:
            top_text = self._chunk_text(chunks[0])
            if not self._chunk_is_related(query, top_text, min_overlap=2):
                answer = await self._general_answer(query, history)
                return RAGResponse(
                    answer=answer + "\n\n(Ответ основан на общих знаниях языковой модели.)",
                    confidence=0.25,
                    sources=[],
                    need=StudentNeed(intent="GENERAL_MODEL", confidence=0.6),
                    recommendations=[],
                )

        # ---------------------------------------------------------------------
        # 5) Санити-чек на всём наборе чанков (убираем шум)
        # ---------------------------------------------------------------------
        chunks = [c for c in chunks if self._chunk_is_related(query, self._chunk_text(c), min_overlap=2)]

        if not chunks:
            answer = await self._general_answer(query, history)
            return RAGResponse(
                answer=answer + "\n\n(Ответ основан на общих знаниях языковой модели.)",
                confidence=0.25,
                sources=[],
                need=StudentNeed(intent="GENERAL_MODEL", confidence=0.6),
                recommendations=[],
            )

        # ---------------------------------------------------------------------
        # 6) Порог уверенности по top-score
        # ---------------------------------------------------------------------
        top_score = float(chunks[0].score)
        if top_score < self.min_top_score:
            # не галлюцинируем про доступ/списки
            if not self._looks_like_access_or_inventory_query(query) and need.intent != "INSTITUTE_QA":
                answer = await self._general_answer(query, history)
                return RAGResponse(
                    answer="Ответ основан на общих знаниях языковой модели.\n\n" + answer,
                    confidence=0.5,
                    sources=[],
                    need=StudentNeed(intent="GENERAL_MODEL", confidence=0.6),
                    recommendations=[],
                )

            return RAGResponse(
                answer=(
                    "В материалах ваших курсов не нашёл уверенного ответа по этому запросу. "
                    "Уточните формулировку (ключевые термины/тему) или выберите курс — тогда найду точнее."
                ),
                confidence=0.3,
                sources=[],
                need=need,
                recommendations=[],
            )

        # ---------------------------------------------------------------------
        # 7) Если course_id не задан — определяем по найденным чанкам (vote) и перезапрашиваем
        # ---------------------------------------------------------------------
        if not course_id:
            votes: Dict[str, float] = {}
            allowed = set(course_access_ids or [])

            for c in chunks:
                meta = getattr(c, "meta", None) or {}
                payload = getattr(c, "payload", None) or {}
                cid = None
                if isinstance(meta, dict):
                    cid = meta.get("course_id")
                if cid is None and isinstance(payload, dict):
                    cid = payload.get("course_id")

                if not cid:
                    continue
                cid = str(cid)

                if allowed and cid not in allowed:
                    continue

                votes[cid] = votes.get(cid, 0.0) + float(c.score)

            if votes:
                course_id = max(votes.items(), key=lambda kv: kv[1])[0]
                chunks2 = self.course_db.search(query_text=query, filters={"course_id": course_id}, limit=self.max_chunks)
                chunks2 = [c for c in chunks2 if float(c.score) >= self.min_score]
                chunks2.sort(key=lambda x: float(x.score), reverse=True)
                chunks2 = [c for c in chunks2 if self._chunk_is_related(query, self._chunk_text(c), min_overlap=2)]
                if chunks2 and float(chunks2[0].score) >= self.min_top_score:
                    chunks = chunks2

        if not chunks:
            answer = await self._general_answer(query, history)
            return RAGResponse(
                answer=answer + "\n\n(Ответ основан на общих знаниях языковой модели.)",
                confidence=0.25,
                sources=[],
                need=StudentNeed(intent="GENERAL_MODEL", confidence=0.6),
                recommendations=[],
            )

        # ---------------------------------------------------------------------
        # 8) Генерация ответа по курсу + источники (только тут sources != [])
        # ---------------------------------------------------------------------
        course_label = course_title or "ваш курс"
        prompt = self._build_course_prompt(query, course_label, chunks, student_level)
        messages = [{"role": "system", "content": prompt}] + history[-6:] + [{"role": "user", "content": query}]
        answer = await self.llm.chat(messages, temperature=0.2, max_tokens=900)

        return RAGResponse(
            answer=answer,
            confidence=self._confidence(chunks),
            sources=self._sources_payload(chunks),          # ✅ источники только для COURSE_QA
            need=need,
            recommendations=self._make_recommendations(chunks),
        )

    async def _general_answer(self, query: str, history: List[Dict[str, str]]) -> str:
        prompt = (
            "Ты — полезный учебный ассистент. Ответь своими общими знаниями, даже если в лекциях нет материала.\n"
            "Правила:\n"
            "- Отвечай по-русски, ясно и структурировано.\n"
            "- Дай определение, краткое объяснение и 1-2 примера.\n"
            "- Не упоминай лекции/источники.\n"
            f"Вопрос: {query}"
        )
        messages = [{"role": "system", "content": prompt}] + history[-6:] + [{"role": "user", "content": query}]
        ans = await self.llm.chat(messages, temperature=0.2, max_tokens=500)
        return (ans or "").strip() or "Не смог сформулировать ответ. Попробуйте уточнить вопрос."