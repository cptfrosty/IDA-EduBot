# Dialog-Agent
[Dev] Диалоговый агент

## Модули
pydantic_settings - модуль библиотеки Pydantic для удобной работы с настройками приложения в Python-проектах. 
Он позволяет автоматически загружать настройки из переменных окружения, .env-файлов, словарей и других источников в виде Pydantic-моделей — с валидацией, аннотациями типов и автозаполнением в IDE

## Конфиг (.env)
```python
# Telegram
telegram_bot_token = ""
    
# Qdrant
qdrant_host = "localhost"
qdrant_port = 6333
    
# AiTunnel
aitunnel_api_key = "key"
aitunnel_base_url ="https://api.aitunnel.ru/v1"

# GigaChat
GIGACHAT_CLIENT_ID = "***client_id"
GIGACHAT_API_KEY = "***key"
gigachat_model = "GigaChat-2-Max"
gigachat_credentials = "200"
    
# Model settings
embedding_model = "all-MiniLM-L6-v2"
llm_temperature = 0.7
```
## Последовательность работы системы
**1. Инициализация:**

```python
# Запуск всех компонентов
bot = TelegramBot(token="YOUR_BOT_TOKEN")
qdrant = QdrantManager(host="localhost")
aitunnel = AITunnelClient(api_key="YOUR_AITUNNEL_KEY")
agent = DialogAgent(qdrant, aitunnel)
```

**2. Обработка сообщения:**

- Пользователь отправляет сообщение в Telegram

- Бот передает сообщение в DialogAgent

- Агент определяет интент (вопрос/рекомендация)

- Соответствующий модуль обрабатывает запрос

- Формируется и возвращается ответ

**3. RAG-процесс:**

- Векторизация вопроса → поиск в Qdrant → генерация ответа через AiTunnel

**4. Рекомендации:**

- Анализ профиля + запроса → поиск материалов → форматирование ответа

## Запуск сайта

PS D:\projects\Python\Dialog-Agent> streamlit run app/website/app.py

## Получение собственных пакетов через setup.py

Первоначально нужно выполнить команду в терминале

```
pip install -e .
```

## Роуты

### Auth
POST   /auth/register
POST   /auth/login
GET    /auth/me
POST   /auth/logout
POST   /auth/refresh-token
POST   /auth/change-password
POST   /auth/reset-password/request
POST   /auth/reset-password/confirm

### RAG - Документы
POST   /rag/documents/upload
POST   /rag/documents/upload-batch
GET    /rag/documents
GET    /rag/documents/{document_id}
DELETE /rag/documents/{document_id}

### RAG - Поиск
POST   /rag/search
GET    /rag/search/suggestions

### RAG - Генерация
POST   /rag/generate
POST   /rag/chat
GET    /rag/chat/{conversation_id}/history

### RAG - Система
GET    /rag/status
POST   /rag/reindex
GET    /rag/health
GET    /rag/analytics/queries
GET    /rag/analytics/documents

## To-Do
- [x] Создание новых чатов
- [ ] Привязка к базе данных PostgreSQL
- [ ] Привязать агента, убрать mock
- [ ] Сделать админ панель для добавления новых пользователей
- [ ] Сделать панель преподавателя
- [ ] Сохранение чатов и диалогов