# async_llm_wrapper.py
import asyncio
from typing import List, Dict

class AsyncLLMWrapper:
    """
    Делает синхронный LLM-клиент (LMStudioClient) совместимым с async-кодом.
    """
    def __init__(self, sync_client):
        self._client = sync_client

    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        max_tokens: int = 800
    ) -> str:
        return await asyncio.to_thread(
            self._client.chat,
            messages,
            temperature,
            max_tokens
        )
