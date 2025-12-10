from openai import OpenAI
from core.config import Settings

class AITunnelClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.client = OpenAI(
                    self.api_key, # Ключ из нашего сервиса
                    base_url="https://api.aitunnel.ru/v1/",)
    
    def chat(self, message):
        chat_result = self.client.chat.completions.create(
        messages=[{"role": "user", "content": message}],
        model="deepseek-r1",
        max_tokens=500,) # Старайтесь указывать для более точного расчёта цены
        
        return chat_result.choices[0].message