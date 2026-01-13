# vector_db/qdrant_manager_async.py
from vector_db.qdrant_manager import QdrantManager
from typing import List, Dict, Any, Optional
import asyncio

class AsyncQdrantManager:
    """
    Асинхронная обертка над синхронным QdrantManager.
    """
    def __init__(self, collection_name: str = "test_db1"):
        self.manager = QdrantManager(collection_name=collection_name)
        self.collection_name = collection_name
    
    async def search(self, 
                     collection: str = None, 
                     query_text: str = None, 
                     filters: Dict = None, 
                     limit: int = 5) -> List[Dict[str, Any]]:
        """
        Асинхронный поиск в Qdrant.
        
        Args:
            collection: Название коллекции (игнорируется, используется self.collection_name)
            query_text: Текст для поиска
            filters: Фильтры (пока не используются)
            limit: Количество результатов
        """
        if not query_text:
            return []
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self._perform_search,
            query_text,
            limit
        )
    
    def _perform_search(self, query_text: str, limit: int) -> List[Dict[str, Any]]:
        """Синхронный поиск."""
        try:
            # Используем существующий метод search_relevant_info
            result_text = self.manager.search_relevant_info(query_text, top_k=limit)
            
            # Проверяем, не вернулась ли ошибка
            if "недоступен" in result_text.lower() or "ошибка" in result_text.lower():
                return []
            
            # Преобразуем в формат, ожидаемый GigaChatRAGOrchestrator
            return [{
                'id': f'result_{i}',
                'score': 0.9 - (i * 0.1),  # Имитация релевантности
                'payload': {
                    'clean_content': result_text,
                    'content': result_text,
                    'source': 'Qdrant Database',
                    'discipline': self._extract_discipline_from_query(query_text)
                }
            } for i in range(min(3, limit))]
            
        except Exception as e:
            print(f"Ошибка поиска в Qdrant: {str(e)}")
            return []
    
    def _extract_discipline_from_query(self, query_text: str) -> str:
        """Извлекает дисциплину из запроса (упрощенно)."""
        import re
        discipline_match = re.search(r'\bпо\s+([а-яё\s\-]{3,})(?=\s|$|\?|\.)', query_text.lower())
        if discipline_match:
            return discipline_match.group(1).strip()
        return "general"
    
    async def get_related_disciplines(self, discipline: str) -> List[str]:
        """
        Получение смежных дисциплин.
        В реальной системе это бы делалось через БД, здесь возвращаем пустой список.
        """
        return []