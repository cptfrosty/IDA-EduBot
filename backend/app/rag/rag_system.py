# rag/rag_system.py (обновленная версия)
from rag.data_preprocessing import UniversityTextPreprocessor, PreprocessingResult
from rag.classification_answer import IntentClassifier, IntentClassificationResult
from rag.GigaChatRAGOrchestrator import GigaChatRAGOrchestrator, RAGContext, GigaChatResponse
from vector_db.qdrant_manager_async import AsyncQdrantManager  # <-- ИМПОРТИРУЕМ АСИНХРОННЫЙ
from llm.gigachat_client import GigaChatClient
from object_relation_db.database import DataBase
from typing import Dict, Any, Optional, List
import logging
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)


class RAGSystem:
    """
    Полная RAG-система с интеграцией всех компонентов.
    """
    
    def __init__(self, 
                 qdrant_manager: Optional[AsyncQdrantManager] = None,  # <-- AsyncQdrantManager
                 gigachat_client: Optional[GigaChatClient] = None,
                 db_manager: Optional[DataBase] = None,
                 qdrant_collection: str = "test_db1"):
        """
        Инициализация полной RAG-системы.
        """
        # Инициализация компонентов
        self.preprocessor = UniversityTextPreprocessor()
        self.intent_classifier = IntentClassifier()
        
        # Сохраняем или создаем клиенты
        if qdrant_manager is None:
            logger.info(f"Создание AsyncQdrantManager с коллекцией: {qdrant_collection}")
            self.qdrant = AsyncQdrantManager(collection_name=qdrant_collection)
        else:
            self.qdrant = qdrant_manager
        
        if gigachat_client is None:
            logger.info("Создание GigaChatClient")
            self.gigachat = GigaChatClient()
        else:
            self.gigachat = gigachat_client
        
        self.db = db_manager
        
        # Инициализация оркестратора RAG
        self.orchestrator = GigaChatRAGOrchestrator(
            vector_db_client=self.qdrant,  # <-- передаем асинхронный клиент
            gigachat_client=self.gigachat,
            db_session=self.db
        )
        
        logger.info("RAG System инициализирована")
    
    async def _get_student_data(self, student_id: str) -> Optional[Dict[str, Any]]:
        """Получение данных студента из базы данных."""
        if not student_id or not self.db:
            logger.debug("Student ID или DB manager не указаны")
            return None
        
        try:
            user_data = self.db.get_user_by_id(student_id)
            
            if not user_data:
                logger.warning(f"Студент с ID {student_id} не найден")
                return None
            
            # Определяем дисциплины студента
            disciplines = []
            if hasattr(self.db, 'get_user_disciplines'):
                disciplines = self.db.get_user_disciplines(student_id)
            
            # Определяем уровень студента
            course_number = user_data.get('course_number')
            student_level = self._determine_student_level(course_number)
            
            return {
                'id': user_data['id'],
                'name': f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip(),
                'email': user_data.get('email'),
                'year': course_number,
                'level': student_level,
                'disciplines': disciplines,
                'is_active': user_data.get('is_active', True)
            }
            
        except Exception as e:
            logger.error(f"Ошибка получения данных студента: {str(e)}")
            return None
    
    def _determine_student_level(self, course_number: Optional[int]) -> str:
        """Определение уровня студента."""
        if not course_number or course_number <= 1:
            return "beginner"
        elif course_number == 2:
            return "intermediate"
        else:
            return "advanced"
    
    async def process_student_query(self, student_id: str, query: str) -> Dict[str, Any]:
        """
        Полный цикл обработки запроса студента.
        """
        try:
            logger.info(f"Обработка запроса от студента {student_id}: {query}")
            
            # 1. Получение данных студента
            student_data = await self._get_student_data(student_id)
            
            # 2. Препроцессинг
            preprocessed = self.preprocessor.process(query)
            
            # 3. Классификация намерения
            intent_result = self.intent_classifier.classify(preprocessed)
            
            logger.info(f"Классифицирован как: {intent_result.intent_type} "
                       f"(уверенность: {intent_result.confidence:.2f})")
            
            # 4. Обработка в зависимости от типа
            if intent_result.intent_type == 'greeting':
                return await self._handle_greeting(query, student_data)
            
            elif intent_result.intent_type == 'farewell':
                return await self._handle_farewell(query)
            
            elif intent_result.intent_type == 'discipline':
                return await self._handle_discipline_query(
                    query=query,
                    intent_result=intent_result,
                    student_data=student_data,
                    student_id=student_id
                )
            
            elif intent_result.intent_type == 'general':
                return await self._handle_general_query(query, student_data)
            
            else:
                return await self._handle_unknown_query(query)
                
        except Exception as e:
            logger.error(f"Ошибка обработки запроса: {str(e)}", exc_info=True)
            return {
                'type': 'error',
                'answer': "Произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте позже.",
                'confidence': 0.0,
                'timestamp': datetime.now().isoformat()
            }
    
    async def _handle_greeting(self, query: str, student_data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Обработка приветствия."""
        student_name = student_data.get('name', '') if student_data else ''
        greeting = f"Привет{f', {student_name}' if student_name else ''}! Я помощник по учебным вопросам. Чем могу помочь?"
        
        return {
            'type': 'greeting',
            'answer': greeting,
            'confidence': 1.0,
            'timestamp': datetime.now().isoformat()
        }
    
    async def _handle_farewell(self, query: str) -> Dict[str, Any]:
        """Обработка прощания."""
        return {
            'type': 'farewell',
            'answer': "До свидания! Удачи в учёбе!",
            'confidence': 1.0,
            'timestamp': datetime.now().isoformat()
        }
    
    async def _handle_discipline_query(
        self, 
        query: str, 
        intent_result: IntentClassificationResult,
        student_data: Optional[Dict[str, Any]],
        student_id: str
    ) -> Dict[str, Any]:
        """
        Обработка дисциплинарного запроса через RAG оркестратор.
        """
        # Определяем дисциплину
        discipline = intent_result.extracted_discipline
        
        # Если дисциплина не указана, запрашиваем уточнение
        if not discipline:
            if student_data and student_data.get('disciplines'):
                disciplines_list = ', '.join(student_data['disciplines'])
                return {
                    'type': 'clarification',
                    'answer': f"Уточните, по какой дисциплине вопрос? Вы изучаете: {disciplines_list}",
                    'confidence': 0.7,
                    'timestamp': datetime.now().isoformat()
                }
            else:
                return {
                    'type': 'clarification',
                    'answer': "Уточните, по какой дисциплине вопрос? Например: 'по математике' или 'по программированию'.",
                    'confidence': 0.7,
                    'timestamp': datetime.now().isoformat()
                }
        
        # Создаем контекст RAG
        context = RAGContext(
            query=query,
            discipline=discipline,
            student_level=student_data.get('level', 'beginner') if student_data else 'beginner',
            language="ru"
        )
        
        # Используем оркестратор для обработки
        try:
            rag_response = await self.orchestrator.process_query_with_discipline(
                query=query,
                discipline=discipline,
                student_data=student_data,
                context=context
            )
            
            return {
                'type': 'rag_answer',
                'answer': rag_response.answer,
                'sources': rag_response.sources,
                'confidence': rag_response.confidence,
                'discipline': discipline,
                'processing_time': rag_response.processing_time,
                'tokens_used': rag_response.tokens_used,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Ошибка RAG обработки через оркестратор: {str(e)}")
            
            # Fallback: прямой поиск через Qdrant
            try:
                # Асинхронный поиск
                search_results = await self.qdrant.search(
                    collection="course_documents",
                    query_text=query,
                    filters={"discipline": discipline},
                    limit=5
                )
                
                if search_results:
                    # Формируем контекст из результатов
                    context_text = "\n".join([result['payload'].get('content', '') for result in search_results[:3]])
                    
                    # Запрашиваем ответ у GigaChat
                    loop = asyncio.get_event_loop()
                    response = await loop.run_in_executor(
                        None,
                        self.gigachat.chat,
                        f"Ты эксперт по дисциплине '{discipline}'. На основе контекста ответь на вопрос: {query}\n\nКонтекст:\n{context_text}"
                    )
                    
                    return {
                        'type': 'rag_answer_fallback',
                        'answer': response,
                        'sources': [{"source": "Qdrant search"}],
                        'confidence': 0.7,
                        'discipline': discipline,
                        'timestamp': datetime.now().isoformat()
                    }
                
            except Exception as fallback_error:
                logger.error(f"Ошибка fallback обработки: {fallback_error}")
            
            return {
                'type': 'error',
                'answer': f"Не удалось найти информацию по дисциплине '{discipline}'. Попробуйте уточнить вопрос.",
                'confidence': 0.0,
                'timestamp': datetime.now().isoformat()
            }
    
    async def _handle_general_query(
        self, 
        query: str, 
        student_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Обработка общего запроса."""
        try:
            # Персонализируем контекст
            student_context = ""
            if student_data:
                student_context = f" Студент {student_data.get('name', '')} курса {student_data.get('year', '')}."
            
            # Прямой ответ
            prompt = f"Ты помощник по вопросам университета.{student_context} Ответь на вопрос студента: {query}"
            
            # Используем run_in_executor для синхронного вызова
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                self.gigachat.chat,
                prompt
            )
            
            return {
                'type': 'general_answer',
                'answer': response,
                'confidence': 0.8,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Ошибка обработки общего запроса: {str(e)}")
            return {
                'type': 'error',
                'answer': "Не удалось обработать ваш запрос. Попробуйте переформулировать.",
                'confidence': 0.0,
                'timestamp': datetime.now().isoformat()
            }
    
    async def _handle_unknown_query(self, query: str) -> Dict[str, Any]:
        """Обработка неизвестного запроса."""
        return {
            'type': 'unknown',
            'answer': "Пока я могу отвечать только на учебные вопросы по дисциплинам и общие вопросы об университете.",
            'confidence': 0.5,
            'timestamp': datetime.now().isoformat()
        }


# Фабричная функция
def create_rag_system(
    qdrant_collection: str = "test_db1",
    db_manager: Optional[DataBase] = None
) -> RAGSystem:
    """Создание и настройка RAG системы."""
    return RAGSystem(
        qdrant_collection=qdrant_collection,
        db_manager=db_manager
    )