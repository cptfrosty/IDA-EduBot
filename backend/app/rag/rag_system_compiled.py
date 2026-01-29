# app/rag/rag_system_compiled.py
from __future__ import annotations

import logging
import re
from typing import Dict, Any, List, Optional

from .rag_compiled import RAGOrchestrator, QdrantVectorDB
from llm.lm_studio_client import LMStudioClient
from llm.async_llm_wrapper import AsyncLLMWrapper

logger = logging.getLogger(__name__)


class CompiledRAGSystem:
    def __init__(self, db, orchestrator: RAGOrchestrator):
        self.db = db
        self.orchestrator = orchestrator
        self.dialog_memory: Dict[str, List[Dict[str, str]]] = {}

    # -------------------------
    # Simple intent router (keywords / regex)
    # -------------------------
    _RE_LIST_ACCESS = re.compile(
        r"\b(какие|какой|спис(ок|ок)|переч(ень|ислить)|каталог|что)\b.*\b(курс(ы|ов)?|лекц(ии|ий|ия)|материал(ы|ов)?|доступ(но|ны|ен|на)?)\b"
        r"|\b(мои)\b.*\b(курс(ы|ов)?|лекц(ии|ий|ия)|материал(ы|ов)?)\b"
        r"|\b(на\s+что\s+я\s+(записан|записана)|что\s+мне\s+доступно)\b",
        re.IGNORECASE,
    )
    _RE_CHECK_ACCESS = re.compile(
        r"\b(есть\s+ли|имеетс?я\s+ли|доступ(ен|на|но)\s+ли|у\s+меня\s+есть|могу\s+ли\s+(получить\s+)?доступ)\b",
        re.IGNORECASE,
    )
    _RE_ACCESS_OBJECT = re.compile(r"\b(курс|лекц(ия|ии|ий)|материал|модул(ь|и)|видео|занят(ие|ия))\b", re.IGNORECASE)

    def _detect_access_intent(self, query: str) -> str:
        q = (query or "").strip()
        if not q:
            return "OTHER"
        if self._RE_LIST_ACCESS.search(q):
            return "LIST_ACCESS"
        if self._RE_CHECK_ACCESS.search(q) and self._RE_ACCESS_OBJECT.search(q):
            return "CHECK_ACCESS"
        return "OTHER"

    @staticmethod
    def _norm_title(s: str) -> str:
        s = (s or "").lower().strip()
        s = re.sub(r"\s+", " ", s)
        s = re.sub(r"[«»\"\'`]", "", s)
        return s

    def _find_course_matches(self, query: str, course_titles: List[str]) -> List[str]:
        qn = self._norm_title(query)
        matches = []
        for t in course_titles:
            tn = self._norm_title(t)
            if not tn:
                continue
            if tn in qn or qn in tn:
                matches.append(t)
        if not matches:
            q_tokens = {x for x in re.findall(r"[a-zа-я0-9]+", qn) if len(x) >= 4}
            for t in course_titles:
                tn = self._norm_title(t)
                t_tokens = {x for x in re.findall(r"[a-zа-я0-9]+", tn) if len(x) >= 4}
                if q_tokens and len(q_tokens & t_tokens) >= 2:
                    matches.append(t)
        return matches

    async def process_student_query(
        self,
        student_id: str,
        query: str,
        discipline: str | None = None,  # backward compatible: тут course_title (если фронт так отправляет)
    ):
        student = self.db.get_user_by_id(student_id)
        if not student:
            return {"type": "error", "answer": "Студент не найден", "confidence": 0.0, "sources": []}

        courses = self._get_student_courses(student_id)
        course_titles = [c["title"] for c in courses]
        course_ids = [c["course_id"] for c in courses]
        course_by_title = {c["title"]: c for c in courses}
        # --- keyword intent router: access/list checks must be deterministic (no LLM) ---
        access_intent = self._detect_access_intent(query)

        if access_intent == "LIST_ACCESS":
            if not course_titles:
                return {
                    "type": "answer",
                    "answer": "Сейчас у вас нет активных курсов.",
                    "sources": [],
                    "confidence": 1.0,
                    "need": {"intent": "LIST_ACCESS", "confidence": 1.0},
                    "recommendations": [],
                }
            return {
                "type": "answer",
                "answer": "Доступные вам курсы:\n- " + "\n- ".join(course_titles),
                "sources": [],
                "confidence": 1.0,
                "need": {"intent": "LIST_ACCESS", "confidence": 1.0},
                "recommendations": [],
            }

        if access_intent == "CHECK_ACCESS":
            matches = self._find_course_matches(query, course_titles)
            if matches:
                if len(matches) == 1:
                    msg = f"Да, курс «{matches[0]}» вам доступен (есть активная запись)."
                else:
                    msg = "Похоже, вы имели в виду один из этих доступных курсов:\n- " + "\n- ".join(matches)
                return {
                    "type": "answer",
                    "answer": msg,
                    "sources": [],
                    "confidence": 1.0,
                    "need": {"intent": "CHECK_ACCESS", "confidence": 1.0},
                    "recommendations": [],
                }

            if course_titles:
                msg = "По активным курсам в базе у вас нет записи на такой курс. Доступные курсы:\n- " + "\n- ".join(course_titles)
            else:
                msg = "По активным курсам в базе у вас сейчас нет записей."
            return {
                "type": "answer",
                "answer": msg,
                "sources": [],
                "confidence": 1.0,
                "need": {"intent": "CHECK_ACCESS", "confidence": 1.0},
                "recommendations": [],
            }

        course_title = discipline
        # Если фронт прислал название курса, но оно не совпало 1:1 — пробуем мягкое сопоставление.
        if course_title is not None and course_title not in course_by_title:
            matches = self._find_course_matches(course_title, course_titles)
            if len(matches) == 1:
                course_title = matches[0]
            elif len(matches) > 1:
                return {
                    "type": "clarification",
                    "answer": (
                        "Уточните, по какому курсу вопрос. Похоже на несколько вариантов:\n- "
                        + "\n- ".join(matches)
                    ),
                    "confidence": 0.7,
                    "sources": [],
                }
            else:
                return {
                    "type": "access_denied",
                    "answer": f"Вы не записаны на курс «{course_title}». Доступные курсы: {', '.join(course_titles)}",
                    "confidence": 1.0,
                    "sources": []
                }

        course_id = course_by_title[course_title]["course_id"] if course_title else None

        history = self.dialog_memory.get(student_id, [])

        resp = await self.orchestrator.process(
            query=query,
            student_level=self._student_level(student.get("course_number")),
            course_id=course_id,
            course_title=course_title,
            available_courses=course_titles,
            course_access_ids=course_ids,
            dialog_history=history[-8:],
        )

        self._save_dialog(student_id, query, resp.answer)

        return {
            "type": "answer",
            "answer": resp.answer,
            "sources": resp.sources,
            "confidence": resp.confidence,
            "need": resp.need.__dict__ if resp.need else None,
            "recommendations": resp.recommendations or [],
        }

    def _get_student_courses(self, student_id: str) -> list[dict]:
        try:
            courses = self.db.get_courses_for_student(student_id=student_id, status="active")
            out = []
            for c in courses:
                if not isinstance(c, dict):
                    continue
                if c.get("course_id") and c.get("title"):
                    out.append({
                        "course_id": str(c["course_id"]),
                        "title": str(c["title"]),
                    })
            return out
        except Exception as e:
            logger.error(f"Ошибка получения курсов студента: {e}")
            return []

    def _save_dialog(self, student_id: str, user_msg: str, bot_msg: str):
        self.dialog_memory.setdefault(student_id, []).extend([
            {"role": "user", "content": user_msg},
            {"role": "assistant", "content": bot_msg}
        ])

    def _student_level(self, course: int | None) -> str:
        if course is None or course <= 1:
            return "beginner"
        if course == 2:
            return "intermediate"
        return "advanced"


def create_rag_system_compiled(
    db_manager,
    *,
    course_collection: str = "ida_edubot",
    institute_collection: str = "institute_faq_v2",
    llm_client=None,
):
    if llm_client is None:
        llm_client = AsyncLLMWrapper(LMStudioClient())

    # Учебная коллекция: chunk_text
    course_db = QdrantVectorDB(
        collection_name=course_collection,
        payload_text_keys=["chunk_text", "content", "text"],
    )

    # Институтская коллекция: text / question+answer
    institute_db = QdrantVectorDB(
        collection_name=institute_collection,
        payload_text_keys=["text", "answer", "content"],
    )

    orchestrator = RAGOrchestrator(
        llm=llm_client,
        course_db=course_db,
        institute_db=institute_db,
        max_chunks=8,
        min_score=0.25,
    )

    return CompiledRAGSystem(db=db_manager, orchestrator=orchestrator)
