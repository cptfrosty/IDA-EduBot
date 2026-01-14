# vector_db/qdrant_manager_async.py
from vector_db.qdrant_manager import QdrantManager
from typing import List, Dict, Any, Optional
import asyncio
import logging

logger = logging.getLogger(__name__)

class AsyncQdrantManager:
    """
    Асинхронная обертка над синхронным QdrantManager с поддержкой разных коллекций.
    """
    def __init__(self, collection_name: str = "ida_edubot"):
        self.manager = QdrantManager(collection_name=collection_name)
        self.default_collection = collection_name
    
    async def search(self, 
                     collection: str = None, 
                     query_text: str = None, 
                     filters: Dict = None, 
                     limit: int = 5) -> List[Dict[str, Any]]:
        """
        Асинхронный поиск в Qdrant с поддержкой разных коллекций.
        
        Args:
            collection: Название коллекции (если None, используется default_collection)
            query_text: Текст для поиска
            filters: Фильтры (дисциплина, тема и т.д.)
            limit: Количество результатов
        """
        if not query_text:
            return []
        
        # Используем указанную коллекцию или коллекцию по умолчанию
        target_collection = collection or self.default_collection
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self._perform_search,
            query_text,
            limit,
            target_collection,
            filters
        )
    
    def _perform_search(self, query_text: str, limit: int, 
                       collection_name: str, filters: Dict = None) -> List[Dict[str, Any]]:
        """Синхронный поиск в указанной коллекции."""
        try:
            # Временное переключение коллекции
            original_collection = self.manager.collection_name
            self.manager.collection_name = collection_name
            
            # Используем существующий метод search_relevant_info
            result_text = self.manager.search_relevant_info(query_text, top_k=limit)
            
            # Восстанавливаем исходную коллекцию
            self.manager.collection_name = original_collection
            
            # Проверяем, не вернулась ли ошибка
            if not result_text or "недоступен" in result_text.lower() or "ошибка" in result_text.lower():
                return []
            
            # Определяем тип коллекции для metadata
            collection_type = self._get_collection_type(collection_name)
            
            # Преобразуем в формат, ожидаемый оркестратором
            return [{
                'id': f'result_{i}_{collection_name}',
                'score': 0.9 - (i * 0.1),  # Имитация релевантности
                'payload': {
                    'clean_content': result_text,
                    'content': result_text,
                    'source': f'Qdrant: {collection_name}',
                    'collection': collection_name,
                    'collection_type': collection_type,
                    'discipline': self._extract_discipline_from_query(query_text, filters)
                }
            } for i in range(min(3, limit))]
            
        except Exception as e:
            logger.error(f"Ошибка поиска в коллекции {collection_name}: {str(e)}")
            # Восстанавливаем коллекцию в случае ошибки
            try:
                self.manager.collection_name = original_collection
            except:
                pass
            return []
    
    def _get_collection_type(self, collection_name: str) -> str:
        """Определяет тип коллекции по названию."""
        collection_name_lower = collection_name.lower()
        
        if any(keyword in collection_name_lower for keyword in ['course', 'учебн', 'дисциплин', 'предмет']):
            return 'academic'
        elif any(keyword in collection_name_lower for keyword in ['university', 'универ', 'админ', 'general']):
            return 'university_info'
        elif any(keyword in collection_name_lower for keyword in ['test', 'тест']):
            return 'test'
        else:
            return 'general'
    
    def _extract_discipline_from_query(self, query_text: str, filters: Dict = None) -> str:
        """Извлекает дисциплину из запроса или фильтров."""
        if filters and 'discipline' in filters:
            return filters['discipline']
        
        import re
        discipline_match = re.search(r'\bпо\s+([а-яё\s\-]{3,})(?=\s|$|\?|\.)', query_text.lower())
        if discipline_match:
            return discipline_match.group(1).strip()
        return "general"
    
    async def search_multiple_collections(self, 
                                         query_text: str,
                                         collections: List[str] = None,
                                         limit_per_collection: int = 3) -> List[Dict[str, Any]]:
        """
        Поиск в нескольких коллекциях одновременно.
        """
        if not collections:
            collections = [self.default_collection, 'university_info']  # Ваша новая коллекция
        
        all_results = []
        
        for collection in collections:
            try:
                results = await self.search(
                    collection=collection,
                    query_text=query_text,
                    limit=limit_per_collection
                )
                all_results.extend(results)
            except Exception as e:
                logger.error(f"Ошибка поиска в коллекции {collection}: {str(e)}")
        
        # Сортируем по релевантности
        all_results.sort(key=lambda x: x.get('score', 0), reverse=True)
        
        return all_results