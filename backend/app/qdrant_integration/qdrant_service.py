# file: backend/app/services/qdrant_service.py

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import uuid

from qdrant_integration.qdrant_loader import QdrantDocumentUploader, DocumentMetadata
from vector_db import models

logger = logging.getLogger(__name__)

class QdrantService:
    """Сервис для работы с Qdrant"""
    
    _instance = None
    
    def __new__(cls):
        """Singleton паттерн"""
        if cls._instance is None:
            cls._instance = super(QdrantService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        # Конфигурация из настроек приложения
        from app.core.config import settings
        
        self.uploader = QdrantDocumentUploader(
            qdrant_host="localhost",
            qdrant_port=6333,
            collection_name="ida_edubot",
            embedding_model_name="intfloat/multilingual-e5-large"
        )
        
        self._initialized = True
        logger.info("QdrantService инициализирован")
    
    def upload_lecture(
        self,
        file_path: str,
        course_id: str,
        course_title: str,
        discipline_id: Optional[str] = None,
        discipline_name: Optional[str] = None,
        material_id: Optional[str] = None,
        difficulty: str = "medium"
    ) -> Dict[str, Any]:
        """
        Загрузка лекции в Qdrant
        
        Args:
            file_path: Путь к файлу лекции
            course_id: ID курса
            course_title: Название курса
            discipline_id: ID дисциплины
            discipline_name: Название дисциплины
            material_id: ID материала (если None, генерируется)
            difficulty: Уровень сложности
            
        Returns:
            Результат загрузки
        """
        try:
            # Генерируем ID материала если не указан
            if not material_id:
                material_id = str(uuid.uuid4())
            
            # Если не указана дисциплина, используем данные курса
            if not discipline_name:
                discipline_name = course_title
            if not discipline_id:
                discipline_id = course_id
            
            # Создаем метаданные
            metadata = DocumentMetadata(
                course_title=course_title,
                discipline_name=discipline_name,
                discipline_id=discipline_id,
                material_id=material_id,
                course_id=course_id,
                difficulty=difficulty,
                content_type="lecture"
            )
            
            # Загружаем документ
            result = self.uploader.upload_document(file_path, metadata)
            
            # Добавляем дополнительную информацию
            if result["success"]:
                result["uploaded_at"] = datetime.now().isoformat()
                result["course_id"] = course_id
            
            return result
            
        except Exception as e:
            logger.error(f"Ошибка загрузки лекции: {e}")
            return {
                "success": False,
                "error": str(e),
                "material_id": material_id,
                "course_id": course_id
            }
    
    def search_in_lectures(
        self,
        query: str,
        course_id: Optional[str] = None,
        discipline_id: Optional[str] = None,
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        Поиск в лекциях
        
        Args:
            query: Поисковый запрос
            course_id: Фильтр по курсу
            discipline_id: Фильтр по дисциплине
            limit: Лимит результатов
            
        Returns:
            Результаты поиска
        """
        try:
            # Подготавливаем фильтры
            filters = {}
            if course_id:
                filters["course_id"] = course_id
            if discipline_id:
                filters["discipline_id"] = discipline_id
            
            # Выполняем поиск
            results = self.uploader.search_documents(query, limit, filters)
            
            return {
                "success": True,
                "query": query,
                "filters": filters,
                "results": results,
                "count": len(results)
            }
            
        except Exception as e:
            logger.error(f"Ошибка поиска: {e}")
            return {
                "success": False,
                "error": str(e),
                "results": [],
                "count": 0
            }
    
    def get_lecture_chunks(
        self,
        material_id: str,
        limit: int = 100
    ) -> Dict[str, Any]:
        """
        Получение всех чанков лекции
        
        Args:
            material_id: ID материала
            limit: Лимит чанков
            
        Returns:
            Чанки лекции
        """
        try:
            # Используем scroll для получения всех чанков материала
            scroll_results = self.uploader.client.scroll(
                collection_name=self.uploader.collection_name,
                scroll_filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="material_id",
                            match=models.MatchValue(value=material_id)
                        )
                    ]
                ),
                limit=limit,
                with_payload=True,
                with_vectors=False
            )
            
            chunks = []
            for point in scroll_results[0]:
                chunks.append({
                    "chunk_index": point.payload.get("chunk_index"),
                    "text": point.payload.get("chunk_text"),
                    "score": None  # Для поиска будет релевантность
                })
            
            # Сортируем по chunk_index
            chunks.sort(key=lambda x: x["chunk_index"])
            
            return {
                "success": True,
                "material_id": material_id,
                "chunks": chunks,
                "total_chunks": len(chunks)
            }
            
        except Exception as e:
            logger.error(f"Ошибка получения чанков: {e}")
            return {
                "success": False,
                "error": str(e),
                "chunks": [],
                "total_chunks": 0
            }
    
    def delete_lecture(self, material_id: str) -> Dict[str, Any]:
        """
        Удаление лекции из Qdrant
        
        Args:
            material_id: ID материала для удаления
            
        Returns:
            Результат удаления
        """
        try:
            # Удаляем все точки с данным material_id
            self.uploader.client.delete(
                collection_name=self.uploader.collection_name,
                points_selector=models.FilterSelector(
                    filter=models.Filter(
                        must=[
                            models.FieldCondition(
                                key="material_id",
                                match=models.MatchValue(value=material_id)
                            )
                        ]
                    )
                )
            )
            
            return {
                "success": True,
                "message": f"Лекция {material_id} удалена из Qdrant",
                "material_id": material_id
            }
            
        except Exception as e:
            logger.error(f"Ошибка удаления лекции: {e}")
            return {
                "success": False,
                "error": str(e),
                "material_id": material_id
            }
    
    def get_stats(self) -> Dict[str, Any]:
        """Получение статистики Qdrant"""
        try:
            collection_stats = self.uploader.get_collection_stats()
            
            # Дополнительная статистика по материалам
            materials = self._get_unique_materials()
            
            return {
                "success": True,
                "collection": collection_stats,
                "materials_count": len(materials),
                "materials": materials[:10],  # Первые 10 материалов
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Ошибка получения статистики: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _get_unique_materials(self) -> List[Dict[str, Any]]:
        """Получение уникальных материалов в коллекции"""
        try:
            # Используем агрегацию для получения уникальных материалов
            scroll_results = self.uploader.client.scroll(
                collection_name=self.uploader.collection_name,
                limit=1000,
                with_payload=True,
                with_vectors=False
            )
            
            materials_map = {}
            for point in scroll_results[0]:
                material_id = point.payload.get("material_id")
                if material_id and material_id not in materials_map:
                    materials_map[material_id] = {
                        "material_id": material_id,
                        "course_title": point.payload.get("course_title"),
                        "discipline_name": point.payload.get("discipline_name"),
                        "chunks_count": 0,
                        "difficulty": point.payload.get("difficulty"),
                        "upload_timestamp": point.payload.get("upload_timestamp")
                    }
                
                if material_id in materials_map:
                    materials_map[material_id]["chunks_count"] += 1
            
            return list(materials_map.values())
            
        except Exception as e:
            logger.error(f"Ошибка получения материалов: {e}")
            return []