from typing import Dict, Any, List
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class RAGSystem:

    def __init__(self, db, orchestrator):
        self.db = db
        self.orchestrator = orchestrator
        self.dialog_memory: Dict[str, List[Dict[str, str]]] = {}

    async def process_student_query(
        self,
        student_id: str,
        query: str,
        discipline: str | None = None
    ):
        """
        Backward-compatible метод.
        discipline может быть:
        - передана явно
        - определена автоматически
        """

        student = self.db.get_user_by_id(student_id)
        if not student:
            return self._error("Студент не найден")

        student_disciplines = self._get_student_disciplines(student_id)

        # --- НОВОЕ: автоопределение дисциплины ---
        if discipline is None:
            discipline = self._auto_detect_discipline(query, student_disciplines)

            if discipline is None:
                return {
                    "type": "clarification",
                    "answer": (
                        "Уточните, по какой дисциплине вопрос.\n"
                        f"Доступные дисциплины: {', '.join(student_disciplines)}"
                    ),
                    "confidence": 0.7
                }

        # --- Проверка доступа ---
        if discipline not in student_disciplines:
            return self._deny(discipline, student_disciplines)

        history = self._get_dialog_history(student_id)

        response = await self.orchestrator.process(
            query=query,
            discipline=discipline,
            dialog_history=history[-5:],
            student_level=self._student_level(student.get("course_number"))
        )

        self._save_dialog(student_id, query, response.answer)

        return {
            "type": "answer",
            "answer": response.answer,
            "sources": response.sources,
            "confidence": response.confidence,
            "from_lectures": response.from_lectures
        }

    def _auto_detect_discipline(self, query: str, disciplines: list[str]) -> str | None:
        if not disciplines:
            return None

        # быстрый хак: старое правило оставляем как приоритет
        q = query.lower()
        for d in disciplines:
            if d.lower() in q:
                return d

        # LLM-классификация (один короткий вызов)
        prompt = (
            "Выбери наиболее подходящую дисциплину для вопроса студента.\n"
            "Верни строго JSON: {\"discipline\": <string|null>, \"confidence\": 0..1}\n"
            f"Дисциплины: {disciplines}\n"
            f"Вопрос: {query}\n"
        )
        try:
            raw = self.orchestrator.llm.chat([{"role": "system", "content": prompt}])
            # дальше: json.loads(raw) с try/except
            ...
        except Exception:
            return None
    
    def _get_student_disciplines(self, student_id: str) -> list[str]:
        """
        Получить список названий дисциплин,
        на которые записан студент,
        используя официальный метод БД
        """
        try:
            courses = self.db.get_courses_for_student(student_id=student_id, status="active")
            disciplines: list[str] = []

            for course in courses:
                # приоритет: discipline_name -> title -> name
                if isinstance(course, dict):
                    if course.get("discipline_name"):
                        disciplines.append(str(course["discipline_name"]))
                    elif course.get("title"):
                        disciplines.append(str(course["title"]))
                    elif course.get("name"):
                        disciplines.append(str(course["name"]))

            # уникализация с сохранением порядка
            seen = set()
            out = []
            for d in disciplines:
                if d not in seen:
                    seen.add(d)
                    out.append(d)
            return out

        except Exception as e:
            logger.error(f"Ошибка получения дисциплин студента: {e}")
        return []

    def _get_dialog_history(self, student_id: str):
        return self.dialog_memory.get(student_id, [])

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

    def _deny(self, discipline, available):
        return {
            "type": "access_denied",
            "answer": (
                f"Вы не записаны на дисциплину «{discipline}». "
                f"Доступные дисциплины: {', '.join(available)}"
            ),
            "confidence": 1.0
        }

    def _error(self, msg):
        return {
            "type": "error",
            "answer": msg,
            "confidence": 0.0
        }
        

from llm.lm_studio_client import LMStudioClient
from rag.GigaChatRAGOrchestrator import GigaChatRAGOrchestrator
from vector_db.qdrant_manager_async import AsyncQdrantManager


def create_rag_system(
    db_manager,
    qdrant_collection: str = "ida_edubot",
    llm_client=None
):
    """
    Фабрика RAG-системы.
    Нужна для обратной совместимости:
    from rag.rag_system import create_rag_system
    """

    # 1. LLM (можно передать снаружи)
    if llm_client is None:
        llm_client = LMStudioClient()

    # 2. Векторная БД
    qdrant = AsyncQdrantManager(collection_name=qdrant_collection)

    # 3. Оркестратор
    orchestrator = GigaChatRAGOrchestrator(
        vector_db=qdrant,
        llm_client=llm_client
    )

    # 4. RAG System
    return RAGSystem(
        db=db_manager,
        orchestrator=orchestrator
    )