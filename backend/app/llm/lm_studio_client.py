import os
from typing import Optional, List, Dict, Any
import logging
import requests
import json

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LMStudioClient:
    """Клиент для работы с LM Studio API."""

    # Константы для ролей в сообщениях
    ROLE_SYSTEM = "system"
    ROLE_USER = "user"
    ROLE_ASSISTANT = "assistant"

    def __init__(self, 
                 base_url: Optional[str] = None,
                 model: Optional[str] = None,
                 api_key: Optional[str] = None):
        """
        Инициализация клиента для LM Studio.
        
        Args:
            base_url: URL сервера LM Studio (по умолчанию http://192.168.0.106:1234/v1)
            model: Модель для использования (опционально, будет использована первая доступная)
            api_key: API ключ (для совместимости с OpenAI, обычно не требуется для LM Studio)
        """
        
        # Настройки по умолчанию
        self.base_url = base_url or os.getenv("LM_STUDIO_URL", "http://192.168.0.106:1234/v1")
        self.model = model or os.getenv("LM_STUDIO_MODEL", "")
        self.api_key = api_key or os.getenv("LM_STUDIO_API_KEY", "")
        
        # Заголовки
        self.headers = {
            "Content-Type": "application/json"
        }
        
        if self.api_key:
            self.headers["Authorization"] = f"Bearer {self.api_key}"
        
        # Проверяем подключение при инициализации
        self._test_connection()
        
        logger.info("LM Studio client initialized successfully")

    def _test_connection(self) -> None:
        """Проверка подключения к серверу LM Studio."""
        try:
            response = requests.get(f"{self.base_url}/models", 
                                  headers=self.headers, 
                                  timeout=10)
            
            if response.status_code == 200:
                logger.info("✅ Подключение к LM Studio успешно")
                
                # Если модель не указана, берем первую доступную
                if not self.model:
                    models = response.json().get("data", [])
                    if models:
                        self.model = models[0]["id"]
                        logger.info(f"✅ Используется модель: {self.model}")
                    else:
                        logger.warning("⚠️ Модели не найдены, используется пустая строка")
            else:
                logger.warning(f"⚠️ Сервер ответил с кодом: {response.status_code}")
                
        except requests.exceptions.ConnectionError:
            logger.error("❌ Не удалось подключиться к LM Studio")
            logger.info("Убедитесь, что:")
            logger.info("1. LM Studio запущен")
            logger.info("2. Сервер активен (зеленая кнопка 'Stop Server')")
            logger.info(f"3. Сервер доступен по адресу: {self.base_url}")
            raise
        except Exception as e:
            logger.error(f"❌ Ошибка при подключении: {e}")
            raise

    def _make_request(self, 
                     endpoint: str, 
                     payload: Dict, 
                     stream: bool = False) -> Dict:
        """
        Выполнение запроса к API.
        
        Args:
            endpoint: API endpoint
            payload: Тело запроса
            stream: Флаг потокового вывода
            
        Returns:
            Ответ от API
        """
        url = f"{self.base_url}{endpoint}"
        
        if stream:
            payload["stream"] = True
        
        try:
            if stream:
                response = requests.post(url, 
                                       headers=self.headers, 
                                       json=payload, 
                                       stream=True,
                                       timeout=60)
                response.raise_for_status()
                return self._handle_stream_response(response)
            else:
                response = requests.post(url, 
                                       headers=self.headers, 
                                       json=payload,
                                       timeout=60)
                response.raise_for_status()
                return response.json()
                
        except requests.exceptions.Timeout:
            logger.error("⏰ Таймаут запроса")
            raise
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Ошибка запроса: {e}")
            raise
        except json.JSONDecodeError as e:
            logger.error(f"❌ Ошибка парсинга JSON: {e}")
            raise

    def _handle_stream_response(self, response: requests.Response) -> Dict:
        """
        Обработка потокового ответа.
        
        Args:
            response: Ответ с включенным потоковым выводом
            
        Returns:
            Собранный ответ
        """
        full_response = ""
        
        for line in response.iter_lines():
            if line:
                line = line.decode('utf-8')
                if line.startswith('data: '):
                    data = line[6:]  # Убираем 'data: '
                    
                    if data == '[DONE]':
                        break
                    
                    try:
                        chunk = json.loads(data)
                        if 'choices' in chunk:
                            delta = chunk['choices'][0].get('delta', {})
                            content = delta.get('content', '')
                            if content:
                                full_response += content
                    except json.JSONDecodeError:
                        continue
        
        return {
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": full_response
                }
            }]
        }

    def chat(self, 
            message: str, 
            system_prompt: Optional[str] = None,
            temperature: float = 0.7,
            max_tokens: int = 500,
            stream: bool = False) -> str:
        """
        Отправка сообщения в чат.
        
        Args:
            message: Сообщение пользователя
            system_prompt: Системный промпт (опционально)
            temperature: Температура генерации (0.0-2.0)
            max_tokens: Максимальное количество токенов в ответе
            stream: Включить потоковый вывод
            
        Returns:
            Ответ модели
        """
        # Формируем список сообщений
        messages = []
        
        if system_prompt:
            messages.append({
                "role": self.ROLE_SYSTEM,
                "content": system_prompt
            })
        
        messages.append({
            "role": self.ROLE_USER,
            "content": message
        })
        
        # Выполняем запрос
        response = self._make_request(
            endpoint="/chat/completions",
            payload={
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens
            },
            stream=stream
        )
        
        # Извлекаем ответ
        if stream:
            # Для потокового вывода ответ уже собран
            return response["choices"][0]["message"]["content"]
        else:
            if 'choices' in response and len(response['choices']) > 0:
                return response['choices'][0]['message']['content']
            else:
                logger.error("❌ Не удалось извлечь ответ из: %s", response)
                return "Ошибка: не удалось получить ответ от модели"

    # Метод для обратной совместимости с вашим кодом
    def invoke(self, messages: List[Dict[str, str]]) -> Any:
        """
        Совместимый метод с GigaChat API.
        
        Args:
            messages: Список сообщений в формате [{"role": "...", "content": "..."}]
            
        Returns:
            Объект-обертка с ответом
        """
        response = self._make_request(
            endpoint="/chat/completions",
            payload={
                "model": self.model,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 1000
            },
            stream=False
        )
        
        # Создаем объект-обертку для совместимости
        class ResponseWrapper:
            def __init__(self, content):
                self.content = content
                
        if 'choices' in response and len(response['choices']) > 0:
            content = response['choices'][0]['message']['content']
            return ResponseWrapper(content)
        else:
            return ResponseWrapper("Ошибка получения ответа")

    # Метод ask для сохранения совместимости
    def ask(self, 
           prompt: str, 
           context: str, 
           question: str,
           temperature: float = 0.7,
           max_tokens: int = 1000) -> str:
        """
        Задает вопрос модели на основе промпта и контекста.
        Сохранен для совместимости с вашим кодом.
        
        Args:
            prompt: Системный промпт
            context: Контекстная информация
            question: Вопрос пользователя
            
        Returns:
            Ответ модели
        """
        full_question = f"Контекст: {context}\n\nВопрос: {question}"
        
        return self.chat(
            message=full_question,
            system_prompt=prompt,
            temperature=temperature,
            max_tokens=max_tokens
        )

    def get_available_models(self) -> List[Dict]:
        """
        Получение списка доступных моделей.
        
        Returns:
            Список моделей
        """
        try:
            response = requests.get(f"{self.base_url}/models", 
                                  headers=self.headers, 
                                  timeout=5)
            if response.status_code == 200:
                return response.json().get("data", [])
            return []
        except:
            return []


# Пример использования
if __name__ == "__main__":
    # Пример 1: Простое использование
    print("Пример 1: Простое использование")
    print("-" * 40)
    
    lm_client = LMStudioClient()
    
    response = lm_client.chat(
        message="Можно выучить программирование за 10 дней?",
        system_prompt="Ты супер позитивный помощник и всегда мотивируешь"
    )
    
    print(f"Вопрос: Можно выучить программирование за 10 дней?")
    print(f"Ответ: {response}")
    
    # Пример 2: Использование как в исходном коде
    print("\nПример 2: Использование как в исходном коде")
    print("-" * 40)
    
    # Создаем клиент (можно указать свои параметры)
    # lm_client = LMStudioClient(base_url="http://192.168.0.106:1234/v1", model="")
    
    # Аналогично вашему коду
    message = [
        {"role": "system", "content": "Ты супер позитивный помощник и всегда мотивируешь"},
        {"role": "user", "content": "Можно выучить программирование за 10 дней?"}
    ]
    
    response_obj = lm_client.invoke(message)
    print(f"Ответ (через invoke): {response_obj.content}")
    
    # Пример 3: Использование метода ask
    print("\nПример 3: Использование метода ask")
    print("-" * 40)
    
    prompt = "Ты - помощник студента. Отвечай на основе предоставленного контекста."
    context = "Python - это язык программирования высокого уровня. Он известен своей простотой и читаемостью."
    question = "Что такое Python?"
    
    answer = lm_client.ask(prompt, context, question)
    print(f"Ответ (через ask): {answer}")
    
    # Пример 4: Потоковый вывод
    print("\nПример 4: Потоковый вывод")
    print("-" * 40)
    
    print("Вопрос: Расскажи о преимуществах Python")
    print("Ответ (потоковый): ", end="")
    
    response = lm_client.chat(
        message="Расскажи о преимуществах Python",
        stream=True
    )
    print(response)