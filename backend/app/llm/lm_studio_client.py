# llm/lm_studio_client.py
from __future__ import annotations

import os
import logging
from typing import List, Dict, Any, Optional

import requests

logger = logging.getLogger(__name__)


def _clean_llm_text(text: str) -> str:
    if not text:
        return ""
    bad_tokens = [
        "assistant<|role_sep|>",
        "<|role_sep|>",
        "<|assistant|>",
        "assistant:",
    ]
    for t in bad_tokens:
        text = text.replace(t, "")
    return text.strip()


class LMStudioClient:
    def __init__(self, base_url: Optional[str] = None, model: Optional[str] = None):
        env_url = os.getenv("LM_STUDIO_URL")
        self.base_url = (base_url or env_url or "http://127.0.0.1:1234/v1").rstrip("/")
        self.model = model or os.getenv("LM_STUDIO_MODEL", "local-model")

        if not isinstance(self.base_url, str) or not self.base_url.startswith(("http://", "https://")):
            raise ValueError(
                f"Некорректный LM_STUDIO_URL: {self.base_url}. Пример: http://127.0.0.1:1234/v1"
            )

        self.headers = {"Content-Type": "application/json"}

        logger.info(f"Используется модель: {self.model}")

    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 1200,
        timeout: int = 60,
    ) -> str:
        url = f"{self.base_url}/chat/completions"
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        try:
            resp = requests.post(url, headers=self.headers, json=payload, timeout=timeout)
            resp.raise_for_status()
            data = resp.json()

            # OpenAI-like format
            content = (
                data.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
            )

            return _clean_llm_text(content)

        except requests.RequestException as e:
            logger.error(f"LMStudio chat error: {e}")
            return "Ошибка LLM-сервиса. Попробуйте повторить позже."
        except Exception as e:
            logger.error(f"LMStudio unexpected error: {e}")
            return "Непредвиденная ошибка при генерации ответа."