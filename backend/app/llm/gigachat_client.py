''' 
Пример использования

load_dotenv()
giga_client = GigaChatClient()
print(giga_client.chat("Можно выучить программирование за 10 дней?"))

API Документация > https://developers.sber.ru/docs/ru/gigachat/prompts-hub/programming/code-explainer

'''

from langchain_gigachat.chat_models import GigaChat
import os
from typing import Optional, List, Dict, Any
import logging
from dotenv import load_dotenv

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GigaChatClient:
    """Клиент для работы с GigaChat API."""

    # Константы для ролей в сообщениях
    ROLE_SYSTEM = "system"
    ROLE_USER = "user"

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        """
        Инициализация клиента GigaChat.
        
        Args:
            credentials: Ключ API (опционально, если не указан - берется из env)
            model: Модель GigaChat (опционально)
        """
        
        load_dotenv()  # Загрузка переменных окружения

        self.credentials = api_key or os.getenv("GIGACHAT_API_KEY")
        self.model = model or os.getenv("GIGACHAT_MODEL")
        self.client_id = os.getenv("GIGACHAT_CLIENT_ID")
        
        self._validate_credentials()
        self._initialize_llm()

        

    def _validate_credentials(self) -> None:
        """Проверка наличия необходимых учетных данных."""
        if not self.credentials:
            raise ValueError("GigaChat credentials not found. Set GIGACHAT_API_KEY environment variable.")
        
    def _initialize_llm(self) -> None:
        """Инициализация языковой модели."""
        self.llm = GigaChat(
            model=self.model,
            credentials=self.credentials,
            verify_ssl_certs=False
        )
        logger.info("GigaChat client initialized successfully")

    def chat(self, message):
        message = [{"role": "system", "content": "Ты супер позитивный помощник и всегда мотивируешь"},{"role": "user", "content": message}]
        response = self.llm.invoke(message)
        return response.content
    
    #promt - "Ты - помощник студента. Отвечай на основе предоставленного контекста. Если в контексте нет информации, так и скажи."
    def ask(self, prompt: str, context: str, question: str) -> str:
        """
        Задает вопрос модели на основе промпта и контекста.
        
        Args:
            prompt: Системный промпт
            context: Контекстная информация
            question: Вопрос пользователя
            
        Returns:
            Ответ модели
        """
        message = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": f"Контекст: {context}\n\nВопрос: {question}"}
        ]
        
        try:
            response = self.llm.invoke(message)
            logger.debug(f"[GigaChat] Response type: {type(response)}")
            
            return self._extract_content(response)
            
        except Exception as e:
            logger.error(f"[GigaChat] Error: {e}")
            return "Извините, произошла ошибка при обработке вашего запроса."

    def _extract_content(self, response: Any) -> str:
        """Извлекает контент из ответа модели."""
        extraction_methods = [
            (lambda r: r.content, "response.content"),
            (lambda r: r.text, "response.text"), 
            (lambda r: r.choices[0].message.content if hasattr(r, 'choices') and r.choices else None, "response.choices[0].message.content")
        ]
        
        for extractor, method_name in extraction_methods:
            try:
                content = extractor(response)
                if content is not None:
                    logger.info(f"[GigaChat] Using {method_name}")
                    return content
            except (AttributeError, IndexError):
                continue
        
        logger.warning(f"[GigaChat] Using fallback str(response)")
        return str(response)