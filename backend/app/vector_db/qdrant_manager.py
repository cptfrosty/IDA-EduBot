import logging
import pandas as pd
from qdrant_client import QdrantClient
from qdrant_client.http import models
from sentence_transformers import SentenceTransformer
import numpy as np


# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class QdrantManager:
    def __init__(self, host, collection_name="test_db1"):
        """Инициализация менеджера Qdrant с обработкой ошибок подключения"""
        self.collection_name = collection_name
        self.is_connected = False
        
        try:
            # Инициализируем энкодер
            self.encoder = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
            
            # Пытаемся подключиться к Qdrant
            logger.info(f"[Qdrant] Попытка подключения к {host}:6333")
            self.client = QdrantClient(host, port=6333, timeout=10)
            
            # Проверяем подключение, запрашивая список коллекций
            collections = self.client.get_collections()
            self.is_connected = True
            logger.info(f"[Qdrant] Успешное подключение к Qdrant. Доступно коллекций: {len(collections.collections)}")
            
        except Exception as e:
            self.is_connected = False
            logger.error(f"[Qdrant] ОШИБКА: Не удалось подключиться к Qdrant на {host}:6333")
            logger.error(f"[Qdrant] Убедитесь, что Qdrant запущен и доступен по указанному адресу")
            logger.error(f"[Qdrant] Детали ошибки: {str(e)}")
            # Создаем заглушку для клиента чтобы избежать ошибок при вызовах методов
            self.client = None

    def search_relevant_info(self, query, top_k=5):
        """Поиск релевантной информации в Qdrant с обработкой ошибок"""
        if not self.is_connected or self.client is None:
            error_msg = "[Qdrant] ОШИБКА: Qdrant не доступен. Поиск невозможен."
            logger.error(error_msg)
            return "Сервис поиска временно недоступен. Пожалуйста, проверьте подключение к базе данных."
        
        logger.info(f"[Qdrant] Поиск: '{query}'")
        
        try:
            # Векторизация запроса
            query_vector = self.encoder.encode(query).tolist()
            
            # Поиск в Qdrant
            search_result = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                limit=top_k,
                score_threshold=0.3
            )
            
            logger.info(f"[Qdrant] Найдено результатов: {len(search_result)}")
            
            # Сбор релевантных текстов
            context_parts = []
            for i, hit in enumerate(search_result):
                logger.info(f"[Qdrant] Результат {i}: score={hit.score:.3f}")
                logger.debug(f"[Qdrant] Ключи payload: {list(hit.payload.keys())}")
                
                # Пытаемся найти текстовое содержимое
                text_content = self._extract_text_from_payload(hit.payload)
                
                if text_content:
                    context_parts.append(text_content)
                    logger.debug(f"  Текст: {text_content[:80]}...")
                else:
                    logger.debug(f"  Подходящий текст не найден в payload")
            
            context = "\n".join(context_parts)
            if not context:
                context = "Информация по вашему вопросу не найдена в базе знаний."
            
            logger.info(f"[Qdrant] Итоговый контекст: {len(context)} символов")
            return context
            
        except Exception as e:
            error_msg = f"[Qdrant] ОШИБКА при выполнении поиска: {str(e)}"
            logger.error(error_msg)
            return "Произошла ошибка при поиске информации в базе данных."

    def _extract_text_from_payload(self, payload):
        """Извлекает текст из payload разными способами"""
        # Способ 1: Если есть поле "text"
        if "text" in payload:
            return str(payload["text"])
        
        # Способ 2: Объединяем все строковые поля
        text_parts = []
        for key, value in payload.items():
            if isinstance(value, str) and value.strip():
                text_parts.append(value)
            elif pd.notna(value):  # Обработка числовых и других значений
                text_parts.append(str(value))
        
        if text_parts:
            return " ".join(text_parts)
        
        return None

    def check_connection(self):
        """Проверка подключения к Qdrant"""
        if self.is_connected:
            try:
                self.client.get_collections()
                return True
            except Exception:
                self.is_connected = False
                logger.error("[Qdrant] Соединение с Qdrant разорвано")
                return False
        return False