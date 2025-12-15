from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Body, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import uuid
import json
from typing import List

from object_relation_db.database import DataBase

class ConversationSummary(BaseModel):
    id: str
    title: str
    last_message: str
    message_count: int
    created_at: datetime
    updated_at: datetime

# Модели данных
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar: Optional[str] = None
    role: str = "student"
    created_at: datetime

class ChangePassword(BaseModel):
    current_password: str
    new_password: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordConfirm(BaseModel):
    token: str
    new_password: str

class Document(BaseModel):
    id: str
    filename: str
    size: int
    uploaded_at: datetime
    status: str = "processed"
    content_type: str

class SearchQuery(BaseModel):
    query: str
    limit: Optional[int] = 10
    threshold: Optional[float] = 0.5

class SearchResult(BaseModel):
    id: str
    document_id: str
    content: str
    score: float
    metadata: Dict[str, Any]

class ChatMessage(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    sources: List[SearchResult]
    confidence: float

class HealthResponse(BaseModel):
    status: str
    version: str
    documents_count: int
    last_indexed: datetime

class AnalyticsQuery(BaseModel):
    query: str
    timestamp: datetime
    response_time: float

# Mock данные
mock_users_db = {
    "test@example.com": {
        "id": uuid.UUID('550e8400-e29b-41d4-a716-446655440000'),
        "email": "test@example.com",
        "password": "test123",  # В реальном приложении хранить хеш!
        "first_name": "Иван",
        "last_name": "Петров",
        "avatar": "https://i.pravatar.cc/150?img=3",
        "role": "student",
        "created_at": datetime.now() - timedelta(days=30)
    },
        "test1@example.com": {
        "id": uuid.UUID('550e8400-e29b-41d4-a716-446655440000'),
        "email": "test1@example.com",
        "password": "test123",  # В реальном приложении хранить хеш!
        "first_name": "Иван",
        "last_name": "Петров",
        "avatar": "https://i.pravatar.cc/150?img=3",
        "role": "student",
        "created_at": datetime.now() - timedelta(days=30)
    }
}

mock_documents_db = [
    {
        "id": "doc_001",
        "filename": "Введение в машинное обучение.pdf",
        "size": 2048000,
        "uploaded_at": datetime.now() - timedelta(days=10),
        "status": "processed",
        "content_type": "application/pdf"
    },
    {
        "id": "doc_002",
        "filename": "Нейронные сети для начинающих.txt",
        "size": 512000,
        "uploaded_at": datetime.now() - timedelta(days=5),
        "status": "processed",
        "content_type": "text/plain"
    },
    {
        "id": "doc_003",
        "filename": "Python для анализа данных.docx",
        "size": 4096000,
        "uploaded_at": datetime.now() - timedelta(days=2),
        "status": "processing",
        "content_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    }
]

mock_conversations = {}
mock_analytics = []

tags_metadata = [
    {
        'name': 'Auth',
        'description': 'Аутентификация и управление пользователями',
    },
    {
        'name': 'Documents',
        'description': 'Управление документами RAG',
    },
    {
        'name': 'Search',
        'description': 'Поиск по документам',
    },
    {
        'name': 'Chat',
        'description': 'Чат с ИИ на основе документов',
    },
    {
        'name': 'System',
        'description': 'Системная информация и аналитика',
    }
]

app = FastAPI(
    title='RAG Learning Assistant API',
    description='API для системы обучения с RAG-архитектурой',
    version='1.0.0',
    openapi_tags=tags_metadata
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Адрес вашего фронтенда
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db = DataBase()

# Генерация токенов (мок)
def create_access_token(user_id: uuid.UUID) -> str:
    """
    Создает access токен для пользователя с UUID
    Формат: ccess_token_{user_id}_{random_uuid}
    """
    return f"access_token_{user_id}_{uuid.uuid4()}"

def create_refresh_token(user_id: uuid.UUID) -> str:
    """
    Создает токен для пользователя с UUID
    Формат: {user_id}_{random_uuid}
    """
    return f"access_token_{user_id}_{uuid.uuid4()}"

def extract_user_id_from_token(token: str) -> Optional[uuid.UUID]:
    """
    Извлекает user_id (UUID) из токена
    Пример: "access_token_550e8400-e29b-41d4-a716-446655440000_123e4567-e89b-12d3-a456-426614174000"
    Возвращает: UUID('550e8400-e29b-41d4-a716-446655440000')
    """
    try:
        # Разбиваем токен по символу '_'
        parts = token.split('_')
        
        # Проверяем, что токен имеет правильный формат
        # Формат: "access_token_{UUID}_{UUID}"
        # parts: ['access', 'token', '550e8400-e29b-41d4-a716-446655440000', '123e4567-e89b-12d3-a456-426614174000']
        
        if len(parts) >= 4:
            # user_id находится на позиции 2
            user_id_str = parts[2]
            return uuid.UUID(user_id_str)
    except (ValueError, IndexError):
        pass
    
    return None

# ========== AUTH РОУТЫ ==========

@app.post("/auth/register", response_model=Token, tags=["Auth"])
async def auth_register(user_data: UserRegister):
    """Регистрация нового пользователя"""
    if user_data.email in mock_users_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует"
        )
    
    user_id = len(mock_users_db) + 1
    mock_users_db[user_data.email] = {
        "id": user_id,
        "email": user_data.email,
        "password": user_data.password,  # В реальности хранить хеш!
        "first_name": user_data.first_name,
        "last_name": user_data.last_name,
        "avatar": f"https://i.pravatar.cc/150?img={user_id}",
        "role": "student",
        "created_at": datetime.now()
    }
    
    return {
        "access_token": create_access_token(user_id),
        "refresh_token": create_refresh_token(user_id),
        "token_type": "bearer"
    }

@app.post("/auth/login", response_model=Token, tags=["Auth"])
async def auth_login(user_data: UserLogin):
    """Вход пользователя"""
    user = mock_users_db.get(user_data.email)

    if not user or user["password"] != user_data.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль"
        )
    
    return {
        "access_token": create_access_token(user["id"]),
        "refresh_token": create_refresh_token(user["id"]),
        "token_type": "bearer"
    }

@app.get("/auth/me", response_model=UserResponse, tags=["Auth"])
async def auth_me():
    """Получение информации о текущем пользователе"""
    # Мок: всегда возвращаем тестового пользователя
    user = mock_users_db["test@example.com"]
    return UserResponse(**user)

@app.post("/auth/logout", tags=["Auth"])
async def auth_logout():
    """Выход пользователя"""
    return {"message": "Успешный выход из системы"}

@app.post("/auth/refresh-token", response_model=Token, tags=["Auth"])
async def auth_refresh_token(refresh_token: str = Body(..., embed=True)):
    """Обновление access токена"""
    # Мок: просто генерируем новый токен
    return {
        "access_token": create_access_token(1),
        "refresh_token": create_refresh_token(1),
        "token_type": "bearer"
    }

@app.post("/auth/change-password", tags=["Auth"])
async def auth_change_password(password_data: ChangePassword):
    """Смена пароля"""
    return {"message": "Пароль успешно изменен"}

@app.post("/auth/reset-password/request", tags=["Auth"])
async def auth_reset_password_request(request_data: ResetPasswordRequest):
    """Запрос на сброс пароля"""
    return {"message": "Инструкции по сбросу пароля отправлены на email"}

@app.post("/auth/reset-password/confirm", tags=["Auth"])
async def auth_reset_password_confirm(confirm_data: ResetPasswordConfirm):
    """Подтверждение сброса пароля"""
    return {"message": "Пароль успешно сброшен"}

# ========== RAG - ДОКУМЕНТЫ ==========

@app.post("/rag/documents/upload", response_model=Document, tags=["Documents"])
async def rag_documents_upload(file: UploadFile = File(...)):
    """Загрузка документа"""
    document_id = f"doc_{uuid.uuid4().hex[:8]}"
    document = {
        "id": document_id,
        "filename": file.filename,
        "size": 0,  # В реальности нужно получить размер
        "uploaded_at": datetime.now(),
        "status": "processing",
        "content_type": file.content_type
    }
    
    mock_documents_db.append(document)
    
    # Имитация обработки
    import asyncio
    await asyncio.sleep(1)
    
    document["status"] = "processed"
    return Document(**document)

@app.post("/rag/documents/upload-batch", response_model=List[Document], tags=["Documents"])
async def rag_documents_upload_batch(files: List[UploadFile] = File(...)):
    """Пакетная загрузка документов"""
    documents = []
    for file in files:
        document_id = f"doc_{uuid.uuid4().hex[:8]}"
        document = {
            "id": document_id,
            "filename": file.filename,
            "size": 0,
            "uploaded_at": datetime.now(),
            "status": "processing",
            "content_type": file.content_type
        }
        mock_documents_db.append(document)
        documents.append(Document(**document))
    
    return documents

@app.get("/rag/documents", response_model=List[Document], tags=["Documents"])
async def rag_documents_get():
    """Получение списка документов"""
    return [Document(**doc) for doc in mock_documents_db]

@app.get("/rag/documents/{document_id}", response_model=Document, tags=["Documents"])
async def rag_documents_get_by_id(document_id: str):
    """Получение информации о документе"""
    for doc in mock_documents_db:
        if doc["id"] == document_id:
            return Document(**doc)
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Документ не найден"
    )

@app.delete("/rag/documents/{document_id}", tags=["Documents"])
async def rag_documents_delete(document_id: str):
    """Удаление документа"""
    global mock_documents_db
    initial_length = len(mock_documents_db)
    mock_documents_db = [doc for doc in mock_documents_db if doc["id"] != document_id]
    
    if len(mock_documents_db) == initial_length:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Документ не найден"
        )
    
    return {"message": "Документ успешно удален"}

# ========== RAG - ПОИСК ==========

@app.post("/rag/search", response_model=List[SearchResult], tags=["Search"])
async def rag_search(search_query: SearchQuery):
    """Поиск по документам"""
    query_lower = search_query.query.lower()
    
    # Мок результаты поиска
    results = []
    if "машинное обучение" in query_lower:
        results.append({
            "id": "res_001",
            "document_id": "doc_001",
            "content": "Машинное обучение — это подраздел искусственного интеллекта, который использует алгоритмы для анализа данных и обучения на их основе.",
            "score": 0.95,
            "metadata": {"page": 1, "section": "Введение"}
        })
    
    if "нейронные сети" in query_lower:
        results.append({
            "id": "res_002",
            "document_id": "doc_002",
            "content": "Нейронные сети состоят из слоев взаимосвязанных узлов (нейронов), которые обрабатывают информацию.",
            "score": 0.88,
            "metadata": {"page": 3, "section": "Архитектура"}
        })
    
    if "python" in query_lower or "анализ данных" in query_lower:
        results.append({
            "id": "res_003",
            "document_id": "doc_003",
            "content": "Python является популярным языком программирования для анализа данных благодаря библиотекам Pandas и NumPy.",
            "score": 0.82,
            "metadata": {"page": 2, "section": "Библиотеки"}
        })
    
    # Если нет конкретных совпадений, возвращаем общие результаты
    if not results:
        results = [
            {
                "id": "res_default_1",
                "document_id": "doc_001",
                "content": "Машинное обучение включает в себя различные методы: обучение с учителем, без учителя и с подкреплением.",
                "score": 0.75,
                "metadata": {"page": 2, "section": "Методы"}
            },
            {
                "id": "res_default_2",
                "document_id": "doc_002",
                "content": "Глубокое обучение — это подраздел машинного обучения, использующий глубокие нейронные сети.",
                "score": 0.70,
                "metadata": {"page": 4, "section": "Глубокое обучение"}
            }
        ]
    
    # Лимитируем результаты
    return results[:search_query.limit]

@app.get("/rag/search/suggestions", tags=["Search"])
async def rag_search_suggestions(query: str):
    """Получение поисковых подсказок"""
    suggestions = [
        "машинное обучение",
        "нейронные сети",
        "глубокое обучение",
        "python анализ данных",
        "pandas numpy",
        "линейная алгебра",
        "вероятность и статистика"
    ]
    
    query_lower = query.lower()
    filtered = [s for s in suggestions if query_lower in s.lower()]
    
    return {"suggestions": filtered[:5]}

# ========== RAG - ГЕНЕРАЦИЯ ==========

@app.post("/rag/generate", tags=["Chat"])
async def rag_generate(prompt: str = Body(..., embed=True)):
    """Генерация ответа на основе документов"""
    # Мок генерация
    responses = {
        "привет": "Здравствуйте! Я ваш ИИ-помощник по обучению. Чем могу помочь?",
        "что такое машинное обучение": "Машинное обучение — это подраздел искусственного интеллекта, который использует алгоритмы для анализа данных и обучения на их основе без явного программирования.",
        "объясни нейронные сети": "Нейронные сети — это вычислительные системы, вдохновленные биологическими нейронными сетями. Они состоят из слоев взаимосвязанных узлов (нейронов), которые обрабатывают информацию.",
        "как использовать python для анализа данных": "Python является популярным языком для анализа данных благодаря библиотекам Pandas для работы с таблицами и NumPy для численных вычислений."
    }
    
    prompt_lower = prompt.lower()
    response = responses.get(prompt_lower, 
        f"На основе документов, вот ответ на ваш вопрос '{prompt}': Это важная тема в области искусственного интеллекта и анализа данных. Рекомендую изучить соответствующие материалы для более глубокого понимания."
    )
    
    return {"response": response}

@app.post("/rag/chat", response_model=ChatResponse, tags=["Chat"])
async def rag_chat(chat_message: ChatMessage):
    """Чат с ИИ на основе документов"""
    conversation_id = chat_message.conversation_id or f"conv_{uuid.uuid4().hex[:8]}"
    
    if conversation_id not in mock_conversations:
        mock_conversations[conversation_id] = []
    
    # Добавляем сообщение пользователя в историю
    mock_conversations[conversation_id].append({
        "role": "user",
        "content": chat_message.message,
        "timestamp": datetime.now()
    })
    
    # Имитация поиска по документам
    search_results = []
    if any(word in chat_message.message.lower() for word in ["машинное", "ml", "обучение"]):
        search_results.append({
            "id": "res_chat_1",
            "document_id": "doc_001",
            "content": "Машинное обучение включает supervised, unsupervised и reinforcement learning.",
            "score": 0.92,
            "metadata": {"source": "Введение в ML.pdf"}
        })
    
    if any(word in chat_message.message.lower() for word in ["нейрон", "сеть", "deep"]):
        search_results.append({
            "id": "res_chat_2",
            "document_id": "doc_002",
            "content": "Нейронные сети используют слои нейронов для обработки информации.",
            "score": 0.87,
            "metadata": {"source": "Нейронные сети.txt"}
        })
    
    # Генерация ответа
    responses = {
        "привет": "Здравствуйте! Я ваш ИИ-помощник по обучению. Могу ответить на вопросы по машинному обучению, нейронным сетям и анализу данных.",
        "спасибо": "Пожалуйста! Буду рад помочь с другими вопросами.",
        "пока": "До свидания! Возвращайтесь с новыми вопросами."
    }
    
    message_lower = chat_message.message.lower()
    if message_lower in responses:
        response_text = responses[message_lower]
    else:
        response_text = f"На основе вашего вопроса '{chat_message.message}' и изученных документов: Это важная тема в современной информатике. В документах найдена информация о машинном обучении и нейронных сетях, которая может быть полезна для изучения."
    
    # Добавляем ответ ИИ в историю
    mock_conversations[conversation_id].append({
        "role": "assistant",
        "content": response_text,
        "timestamp": datetime.now(),
        "sources": search_results
    })
    
    # Сохраняем аналитику
    mock_analytics.append({
        "query": chat_message.message,
        "timestamp": datetime.now(),
        "response_time": 1.2
    })
    
    return {
        "response": response_text,
        "conversation_id": conversation_id,
        "sources": search_results,
        "confidence": 0.85
    }

@app.get("/rag/chat/{conversation_id}/history", tags=["Chat"])
async def rag_chat_history(conversation_id: str):
    """Получение истории чата"""
    history = mock_conversations.get(conversation_id, [])
    return {"conversation_id": conversation_id, "history": history}


@app.get("/rag/conversations/{user_token}", response_model=List[ConversationSummary], tags=["Chat"])
async def rag_conversations_list(user_token: str):
    """Получение списка всех бесед из PostgreSQL"""
    
    # Получаем ID студента из текущего пользователя
    
    # Предположим, что в current_user есть student_id
    user_id = extract_user_id_from_token(user_token)
    
    if not user_id:
        raise HTTPException(
            status_code=400,
            detail="User doesn't have student_id"
        )
    
    # Получаем беседы из БД
    conversations = db.get_conversations_summary(
        student_id=user_id,
        limit=50
    )
    
    return conversations

# Альтернативная версия функции с использованием мок-данных
@app.get("/rag/conversations/v2", response_model=List[ConversationSummary], tags=["Chat"])
async def rag_conversations_list_v2():
    """Получение списка всех бесед"""
    
    # Создаем псевдоданные для 5 бесед
    conversations = []
    
    # Примеры тем для бесед
    topics = [
        "Обсуждение проекта",
        "Вопросы по документации",
        "Техническая поддержка",
        "Обучение RAG системе",
        "Анализ данных"
    ]
    
    # Примеры последних сообщений
    last_messages = [
        "Какие этапы проекта нужно завершить на этой неделе?",
        "Где найти документацию по API?",
        "Проблема с авторизацией в системе",
        "Как работает векторный поиск в RAG?",
        "Можете ли вы проанализировать эти графики?",
        "Спасибо за помощь!",
        "Когда будет следующий релиз?",
        "Нужна помощь с настройкой"
    ]
    
    # Создаем 5 бесед с псевдоданными
    for i in range(5):
        conv_id = str(uuid.uuid4())
        message_count = i + 3  # От 3 до 7 сообщений в беседе
        created_at = datetime.now() - timedelta(days=i+1, hours=i*2)
        updated_at = created_at + timedelta(hours=i+1)
        
        conversations.append({
            "id": conv_id,
            "title": f"{topics[i % len(topics)]} {i+1}",
            "last_message": last_messages[i % len(last_messages)],
            "message_count": message_count,
            "created_at": created_at,
            "updated_at": updated_at
        })
    
    # Сортируем по дате обновления (самые свежие первые)
    conversations.sort(key=lambda x: x["updated_at"], reverse=True)
    
    return conversations
# ========== RAG - СИСТЕМА ==========

@app.get("/rag/status", response_model=HealthResponse, tags=["System"])
async def rag_status():
    """Получение статуса системы"""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "documents_count": len(mock_documents_db),
        "last_indexed": datetime.now() - timedelta(hours=1)
    }

@app.post("/rag/reindex", tags=["System"])
async def rag_reindex():
    """Переиндексация документов"""
    return {"message": "Переиндексация запущена", "estimated_time": "5 минут"}

@app.get("/rag/health", tags=["System"])
async def rag_health():
    """Проверка здоровья системы"""
    return {"status": "ok", "timestamp": datetime.now()}

@app.get("/rag/analytics/queries", response_model=List[AnalyticsQuery], tags=["System"])
async def rag_analytics_queries(days: int = 7):
    """Получение аналитики запросов"""
    # Генерируем мок аналитику
    analytics = []
    for i in range(min(20, len(mock_analytics))):
        analytics.append(mock_analytics[i])
    
    return analytics

@app.get("/rag/analytics/documents", tags=["System"])
async def rag_analytics_documents():
    """Получение аналитики документов"""
    doc_types = {}
    for doc in mock_documents_db:
        doc_type = doc["content_type"].split('/')[-1]
        doc_types[doc_type] = doc_types.get(doc_type, 0) + 1
    
    return {
        "total_documents": len(mock_documents_db),
        "document_types": doc_types,
        "total_size_mb": sum(doc["size"] for doc in mock_documents_db) / (1024 * 1024),
        "processed": len([d for d in mock_documents_db if d["status"] == "processed"])
    }

# ========== ДОПОЛНИТЕЛЬНЫЕ РОУТЫ ==========

@app.get("/")
async def root():
    """Корневой endpoint"""
    return {
        "message": "RAG Learning Assistant API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "auth": "/auth/*",
            "documents": "/rag/documents/*",
            "search": "/rag/search/*",
            "chat": "/rag/chat/*",
            "system": "/rag/*"
        }
    }

@app.get("/health")
async def health():
    """Проверка здоровья API"""
    return {"status": "healthy", "timestamp": datetime.now()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)