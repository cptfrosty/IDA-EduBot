# gigachat_integration.py
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import json
import logging
from datetime import datetime

import asyncio

# Предполагаем, что у нас есть клиенты
# from vector_db import VectorDBClient
# from gigachat import GigaChat

logger = logging.getLogger(__name__)


@dataclass
class RAGContext:
    """Контекст для RAG-запроса."""
    query: str
    discipline: Optional[str] = None
    course_id: Optional[int] = None
    student_level: str = "beginner"  # beginner, intermediate, advanced
    language: str = "ru"
    max_context_chunks: int = 5
    include_definitions: bool = True
    include_examples: bool = True
    include_practical: bool = True


@dataclass
class RetrievedChunk:
    """Извлеченный чанк из векторной БД."""
    id: str
    content: str
    score: float
    metadata: Dict[str, Any]
    source: str  # Название документа


@dataclass
class GigaChatResponse:
    """Ответ от GigaChat."""
    answer: str
    sources: List[Dict[str, Any]]
    tokens_used: int
    processing_time: float
    confidence: float


class GigaChatRAGOrchestrator:
    """
    Оркестратор для работы с GigaChat и RAG.
    Управляет поиском в векторной БД, подготовкой контекста и вызовом LLM.
    """
    
    def __init__(self, vector_db_client, gigachat_client, db_session=None):
        """
        Инициализация оркестратора.
        
        Args:
            vector_db_client: Клиент векторной БД (Qdrant/Pinecone/Weaviate)
            gigachat_client: Клиент GigaChat API
            db_session: Сессия PostgreSQL (опционально)
        """
        self.vector_db = vector_db_client
        self.gigachat = gigachat_client
        self.db = db_session
        
        # Конфигурация
        self.config = {
            'similarity_threshold': 0.90,  # Порог релевантности
            'max_tokens': 1500,  # Максимальное количество токенов
            'temperature': 0.3,  # Температура для творческих ответов
            'max_retrieved_chunks': 7,  # Максимальное количество чанков
            'min_chunks_for_answer': 2,  # Минимальное количество для ответа
        }
        
        # Кэш для часто используемых промптов
        self.prompt_cache = {}
        
        logger.info("GigaChatRAGOrchestrator инициализирован")
    
    async def process_query_with_discipline(
        self,
        query: str,
        discipline: str,
        student_data: Optional[Dict] = None,
        context: Optional[RAGContext] = None
    ) -> GigaChatResponse:
        """
        Обработка запроса с учетом дисциплины.
        
        Args:
            query: Вопрос студента
            discipline: Дисциплина (название)
            student_data: Данные студента (курс, уровень)
            context: Дополнительный контекст
            
        Returns:
            GigaChatResponse
        """
        start_time = datetime.now()
        
        try:
            # 1. Подготовка контекста
            rag_context = self._prepare_context(query, discipline, student_data, context)
            
            # 2. Поиск релевантных чанков по дисциплине
            retrieved_chunks = await self._retrieve_relevant_chunks(rag_context)
            
            if not retrieved_chunks:
                return self._create_no_results_response(query, discipline)
            
            # 3. Подготовка промпта с контекстом
            prompt = self._build_prompt_with_context(rag_context, retrieved_chunks)
            
            # 4. Вызов GigaChat
            gigachat_response = await self._call_gigachat(prompt, rag_context)
            
            # 5. Обработка ответа
            response = self._process_gigachat_response(
                gigachat_response,
                retrieved_chunks,
                rag_context,
                start_time
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Ошибка обработки запроса: {str(e)}")
            return self._create_error_response(query, discipline, str(e))
    
    def _prepare_context(
        self,
        query: str,
        discipline: str,
        student_data: Optional[Dict],
        context: Optional[RAGContext]
    ) -> RAGContext:
        """Подготовка контекста RAG."""
        if context:
            context.query = query
            context.discipline = discipline
            return context
        
        # Определяем уровень студента
        student_level = "beginner"
        if student_data:
            if student_data.get('year') in [3, 4]:
                student_level = "advanced"
            elif student_data.get('year') in [2]:
                student_level = "intermediate"
        
        return RAGContext(
            query=query,
            discipline=discipline,
            student_level=student_level,
            language="ru"
        )
    
    async def _retrieve_relevant_chunks(self, context: RAGContext) -> List[RetrievedChunk]:
        """
        Поиск релевантных чанков в векторной БД с учетом дисциплины.
        """
        try:
            # 1. Поиск в основной коллекции с фильтром по дисциплине
            search_results = await self.vector_db.search(
                collection="ida_edubot",
                query_text=context.query,
                filters={
                    "discipline": context.discipline,
                    "is_active": True
                },
                limit=self.config['max_retrieved_chunks'] * 2  # Начальный лимит
            )
            
            # 2. Если результатов мало, ищем в смежных дисциплинах
            if len(search_results) < self.config['min_chunks_for_answer']:
                # Получаем смежные дисциплины из БД
                related_disciplines = await self._get_related_disciplines(context.discipline)
                
                for related_disc in related_disciplines[:2]:  # Берем 2 смежные
                    additional_results = await self.vector_db.search(
                        collection="ida_edubot",
                        query_text=context.query,
                        filters={
                            "discipline": related_disc,
                            "is_active": True
                        },
                        limit=3
                    )
                    search_results.extend(additional_results)
            
            # 3. Фильтрация по порогу релевантности
            filtered_chunks = []
            for result in search_results:
                if result['score'] >= self.config['similarity_threshold']:
                    chunk = RetrievedChunk(
                        id=result['id'],
                        content=result['payload'].get('clean_content', result['payload'].get('content', '')),
                        score=result['score'],
                        metadata=result['payload'],
                        source=result['payload'].get('source', 'Неизвестный источник')
                    )
                    filtered_chunks.append(chunk)
            
            # 4. Сортировка по релевантности и ограничение количества
            filtered_chunks.sort(key=lambda x: x.score, reverse=True)
            
            # 5. Дедупликация похожего контента
            deduplicated_chunks = self._deduplicate_chunks(filtered_chunks)
            
            # 6. Выбор лучших чанков
            final_chunks = deduplicated_chunks[:self.config['max_retrieved_chunks']]
            
            logger.info(f"Найдено {len(final_chunks)} релевантных чанков по дисциплине {context.discipline}")
            return final_chunks
            
        except Exception as e:
            logger.error(f"Ошибка поиска чанков: {str(e)}")
            return []
    
    async def _get_related_disciplines(self, discipline: str) -> List[str]:
        """Получение смежных дисциплин."""
        if not self.db:
            return []
        
        try:
            # Пример запроса к PostgreSQL
            query = """
            SELECT d2.name
            FROM disciplines d1
            JOIN discipline_relations dr ON d1.id = dr.discipline_id_1
            JOIN disciplines d2 ON dr.discipline_id_2 = d2.id
            WHERE d1.name = :discipline
            UNION
            SELECT d2.name
            FROM disciplines d1
            JOIN discipline_relations dr ON d1.id = dr.discipline_id_2
            JOIN disciplines d2 ON dr.discipline_id_1 = d2.id
            WHERE d1.name = :discipline
            """
            
            result = await self.db.fetch_all(query, {"discipline": discipline})
            return [row['name'] for row in result]
            
        except Exception as e:
            logger.error(f"Ошибка получения смежных дисциплин: {str(e)}")
            return []
    
    def _deduplicate_chunks(self, chunks: List[RetrievedChunk]) -> List[RetrievedChunk]:
        """Дедупликация похожих чанков."""
        if not chunks:
            return []
        
        deduplicated = []
        seen_content = set()
        
        for chunk in chunks:
            # Создаем сигнатуру контента (первые 100 символов)
            content_sig = chunk.content[:100].lower()
            
            # Если такой контент уже видели, пропускаем
            if content_sig in seen_content:
                continue
            
            seen_content.add(content_sig)
            deduplicated.append(chunk)
        
        return deduplicated
    
    def _build_prompt_with_context(
        self,
        context: RAGContext,
        chunks: List[RetrievedChunk]
    ) -> str:
        """
        Построение промпта для GigaChat с контекстом из чанков.
        """
        # Кэширование промптов по типу вопроса
        cache_key = f"{context.discipline}_{context.student_level}"
        
        if cache_key in self.prompt_cache:
            prompt_template = self.prompt_cache[cache_key]
        else:
            prompt_template = self._create_prompt_template(context)
            self.prompt_cache[cache_key] = prompt_template
        
        # Формирование контекста из чанков
        context_text = self._format_chunks_as_context(chunks)
        
        # Сборка финального промпта
        prompt = prompt_template.format(
            discipline=context.discipline,
            student_level=context.student_level,
            question=context.query,
            context=context_text
        )
        
        return prompt
    
    def _create_prompt_template(self, context: RAGContext) -> str:
        """Создание шаблона промпта в зависимости от дисциплины и уровня."""
        
        # Базовый шаблон
        base_template = """Ты - экспертный помощник по дисциплине "{discipline}" в университете.

КОНТЕКСТНАЯ ИНФОРМАЦИЯ:
{context}

ИНСТРУКЦИИ:
1. Ответь на вопрос студента, используя ТОЛЬКО предоставленный контекст
2. Если в контексте нет ответа, честно скажи об этом
3. Отвечай на русском языке
4. Будь точным и конкретным
5. Адаптируй сложность ответа под уровень студента: {student_level}
6. Для сложных тем используй аналогии и примеры
7. Ссылайся на источники в контексте

ВОПРОС СТУДЕНТА: {question}

ОТВЕТ:"""
        
        # Специализированные шаблоны для разных дисциплин
        discipline_templates = {
            "математика": """
Ты - преподаватель математики. Отвечай на вопросы студентов, используя предоставленные материалы.

КОНТЕКСТ:
{context}

ИНСТРУКЦИИ ДЛЯ МАТЕМАТИКИ:
1. Объясняй математические концепции шаг за шагом
2. Приводи формулы и их вывод (если есть в контексте)
3. Давай примеры решения задач
4. Используй математическую нотацию: $формула$ для LaTeX
5. Объясняй, как применять формулы на практике
6. Если студент новичок, начинай с основ

Уровень студента: {student_level}
Вопрос: {question}

Ответ математического помощника:""",
            
            "программирование": """
Ты - senior разработчик и преподаватель программирования.

КОНТЕКСТНЫЕ МАТЕРИАЛЫ:
{context}

ИНСТРУКЦИИ ДЛЯ ПРОГРАММИРОВАНИЯ:
1. Приводи примеры кода с комментариями
2. Объясняй алгоритмы и структуры данных
3. Упоминай best practices
4. Сравнивай разные подходы
5. Указывай временную сложность алгоритмов
6. Предупреждай о типичных ошибках

Язык программирования: (определи из контекста)
Уровень студента: {student_level}
Вопрос: {question}

Ответ разработчика:""",
            
            "физика": """
Ты - профессор физики. Объясняй физические законы и явления.

КОНТЕКСТ:
{context}

ИНСТРУКЦИИ ДЛЯ ФИЗИКИ:
1. Объясняй физические законы и их применение
2. Приводи формулы и единицы измерения
3. Давай реальные примеры из жизни
4. Используй аналогии для сложных концепций
5. Объясняй эксперименты и наблюдения

Уровень студента: {student_level}
Вопрос: {question}

Ответ физика:"""
        }
        
        # Выбираем специализированный шаблон или базовый
        discipline_lower = context.discipline.lower()
        
        for key, template in discipline_templates.items():
            if key in discipline_lower:
                return template
        
        # Модификация базового шаблона по уровню студента
        if context.student_level == "beginner":
            base_template += "\n\nВАЖНО: Объясняй простыми словами, как для новичка."
        elif context.student_level == "advanced":
            base_template += "\n\nВАЖНО: Можно использовать профессиональную терминологию."
        
        return base_template
    
    def _format_chunks_as_context(self, chunks: List[RetrievedChunk]) -> str:
        """Форматирование чанков в текстовый контекст."""
        if not chunks:
            return "Контекстная информация отсутствует."
        
        context_parts = []
        
        for i, chunk in enumerate(chunks, 1):
            source_info = f"Источник: {chunk.source}"
            if 'page_number' in chunk.metadata:
                source_info += f", страница {chunk.metadata['page_number']}"
            if 'author' in chunk.metadata:
                source_info += f", автор: {chunk.metadata['author']}"
            
            context_parts.append(f"""
[ФРАГМЕНТ {i} - Релевантность: {chunk.score:.2f}]
{source_info}
{chunk.content}
""")
        
        return "\n".join(context_parts)
    
    async def _call_gigachat(self, prompt: str, context: RAGContext) -> Dict[str, Any]:
        """
        Вызов GigaChat API - упрощенная версия для вашего клиента.
        """
        import asyncio
        
        try:
            # Ваш GigaChatClient имеет метод chat(), используем его
            loop = asyncio.get_event_loop()
            response_text = await loop.run_in_executor(
                None,
                self.gigachat.chat,
                prompt
            )
            
            return {
                'content': response_text,
                'usage': {
                    'total_tokens': len(response_text.split()),
                    'prompt_tokens': len(prompt.split()),
                    'completion_tokens': len(response_text.split()) - len(prompt.split())
                },
                'model': 'GigaChat',
                'finish_reason': 'stop'
            }
            
        except Exception as e:
            logger.error(f"Ошибка вызова GigaChat: {str(e)}")
            raise
    
    def _process_gigachat_response(
        self,
        gigachat_response: Dict[str, Any],
        chunks: List[RetrievedChunk],
        context: RAGContext,
        start_time: datetime
    ) -> GigaChatResponse:
        """Обработка ответа от GigaChat."""
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Извлечение источников, на которые ссылался GigaChat
        sources = self._extract_sources_from_response(gigachat_response['content'], chunks)
        
        # Расчет уверенности на основе релевантности чанков
        confidence = self._calculate_confidence(chunks)
        
        return GigaChatResponse(
            answer=gigachat_response['content'],
            sources=sources,
            tokens_used=gigachat_response['usage'].get('total_tokens', 0),
            processing_time=processing_time,
            confidence=confidence
        )
    
    def _extract_sources_from_response(
        self,
        answer: str,
        chunks: List[RetrievedChunk]
    ) -> List[Dict[str, Any]]:
        """Извлечение источников из ответа GigaChat."""
        sources = []
        
        # Ищем упоминания источников в ответе
        for chunk in chunks[:3]:  # Берем топ-3 наиболее релевантных
            # Проверяем, упоминается ли контент чанка в ответе
            chunk_keywords = self._extract_keywords(chunk.content[:100])
            answer_lower = answer.lower()
            
            # Если в ответе есть ключевые слова из чанка
            if any(keyword in answer_lower for keyword in chunk_keywords[:3]):
                sources.append({
                    'source': chunk.source,
                    'relevance': chunk.score,
                    'metadata': {
                        'author': chunk.metadata.get('author'),
                        'year': chunk.metadata.get('year'),
                        'page': chunk.metadata.get('page_number'),
                        'section': chunk.metadata.get('section_title')
                    }
                })
        
        # Если не нашли источников, добавляем наиболее релевантные
        if not sources and chunks:
            for chunk in chunks[:2]:
                sources.append({
                    'source': chunk.source,
                    'relevance': chunk.score,
                    'metadata': chunk.metadata
                })
        
        return sources
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Извлечение ключевых слов из текста."""
        # Простая реализация - первые несколько уникальных слов
        words = text.lower().split()
        stop_words = {'и', 'в', 'на', 'по', 'для', 'что', 'как', 'это', 'тот', 'этот'}
        keywords = [word for word in words if word not in stop_words and len(word) > 3]
        return list(set(keywords))[:5]
    
    def _calculate_confidence(self, chunks: List[RetrievedChunk]) -> float:
        """Расчет уверенности на основе релевантности чанков."""
        if not chunks:
            return 0.0
        
        # Средняя релевантность чанков
        avg_score = sum(chunk.score for chunk in chunks) / len(chunks)
        
        # Дополнительные факторы
        score_variance = max(chunks[0].score - chunks[-1].score, 0)
        
        # Формула уверенности
        confidence = (avg_score * 0.7) + ((1 - score_variance) * 0.3)
        
        return min(confidence, 1.0)
    
    def _create_no_results_response(self, query: str, discipline: str) -> GigaChatResponse:
        """Создание ответа при отсутствии результатов."""
        return GigaChatResponse(
            answer=f"К сожалению, в материалах по дисциплине '{discipline}' "
                  f"не найдено информации по вашему вопросу: '{query}'. "
                  f"Рекомендую обратиться к преподавателю или учебнику.",
            sources=[],
            tokens_used=0,
            processing_time=0.0,
            confidence=0.0
        )
    
    def _create_error_response(self, query: str, discipline: str, error: str) -> GigaChatResponse:
        """Создание ответа при ошибке."""
        return GigaChatResponse(
            answer=f"Произошла ошибка при обработке вашего вопроса по дисциплине '{discipline}'. "
                  f"Пожалуйста, попробуйте позже или обратитесь к преподавателю.",
            sources=[],
            tokens_used=0,
            processing_time=0.0,
            confidence=0.0
        )


# Вспомогательные функции для интеграции с основной системой
class RAGSystem:
    """
    Полная RAG-система с интеграцией всех компонентов.
    """
    
    def __init__(self, preprocessor, intent_classifier, vector_db, gigachat, db):
        self.preprocessor = preprocessor
        self.intent_classifier = intent_classifier
        self.orchestrator = GigaChatRAGOrchestrator(vector_db, gigachat, db)
        
    async def process_student_query(self, student_id: str, query: str) -> Dict[str, Any]:
        """
        Полный цикл обработки запроса студента.
        """
        # 1. Получение данных студента
        student_data = await self._get_student_data(student_id)
        
        # 2. Препроцессинг
        preprocessed = self.preprocessor.process(query)
        
        # 3. Классификация намерения
        intent_result = self.intent_classifier.classify(preprocessed.to_dict())
        
        # 4. Если нужна дисциплина и она определена
        if intent_result.intent_type.value == 'discipline':
            if intent_result.needs_clarification:
                return {
                    'type': 'clarification',
                    'message': f"Уточните, по какой дисциплине вопрос? "
                              f"Ваши дисциплины: {', '.join(student_data.get('disciplines', []))}"
                }
            
            elif intent_result.extracted_discipline:
                # 5. Поиск в векторной БД и ответ через GigaChat
                response = await self.orchestrator.process_query_with_discipline(
                    query=query,
                    discipline=intent_result.extracted_discipline,
                    student_data=student_data
                )
                
                return {
                    'type': 'answer',
                    'answer': response,
                    'sources': response.sources,
                    'confidence': 0,
                    'discipline': intent_result.extracted_discipline
                }
        
        # 6. Для общих вопросов (обработка через общую БД)
        elif intent_result.intent_type.value == 'general':
            # ... обработка общих вопросов
            pass
        
        return {
            'type': 'unknown',
            'answer': "Не могу обработать ваш запрос."
        }


if __name__ == "__main__":
    # Пример запуска
    import asyncio
    
    async def test():
        # Здесь были бы реальные инициализации клиентов
        print("Пример работы с GigaChat RAG")
        
        # Создаем мок-данные для теста
        class MockGigaChat:
            async def completions(self):
                return type('obj', (object,), {
                    'create': lambda **kwargs: type('resp', (object,), {
                        'choices': [type('choice', (object,), {
                            'message': type('msg', (object,), {
                                'content': "Переменные в программировании используются для хранения данных..."
                            }),
                            'finish_reason': 'stop'
                        })],
                        'usage': {'total_tokens': 150},
                        'model': 'GigaChat'
                    })
                })()
        
        # Тестовый вызов
        gigachat = MockGigaChat()
        
        print("Тест завершен")
    
    asyncio.run(test())