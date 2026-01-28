# app/rag/rag_system_compiled.py
from __future__ import annotations

import logging
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

        course_title = discipline
        if course_title is not None and course_title not in course_by_title:
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
