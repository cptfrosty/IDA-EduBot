from qdrant_client import QdrantClient
from rag.engine import RagEngine
from llm.gigachat_client import GigaChatClient
from vector_db.qdrant_manager import QdrantManager


class DialogAgent:
    def __init__(self, gigachat: GigaChatClient, qdrant: QdrantManager, rag: RagEngine):
        """
        Инициализация диалогового агента.
        
        Args:
            gigachat: Модель GigaChat
            qdrant: Модель векторной бд Qdrant
        """

        self.gigachat_client = gigachat
        self.qdrant_manager = qdrant
        self.rag = rag

    def say(self, message):
        print(f"[Agent] Received: {message}")
        
        # Получаем контекст из Qdrant
        context = self.qdrant_manager.search_relevant_info(message)
        
        # Генерируем ответ с помощью GigaChat
        prompt = "Ты - AI-ассистент университета. Отвечай на вопросы студентов на основе предоставленного контекста."
        answer = self.gigachat_client.ask(prompt, context, message)
        
        print(f"[Agent] Final answer: {answer}")
        return answer

    def process_message(self, user_message, chat_history):
        # 1. Анализируем намерение
        intent = self.classify_intent(user_message)
        
        if intent == "factual_question":
            # Используем RAG для точного ответа
            return self.rag_engine.say(user_message, chat_history)
            
        elif intent == "recommendation":
            # Используем систему рекомендаций + RAG
            #user_profile = self.get_user_profile(user_id)
            #recommendations = self.recommender.get_recommendations(user_profile)
            context = self.rag_engine.search_relevant_content(user_message)
            #return self.format_recommendation(recommendations, context)
            
        elif intent == "small_talk":
            # Простой ответ без RAG
            return self.llm_client.chat(user_message)
            
        elif intent == "complex_scenario":
            # Многошаговый диалог
            return self.handle_complex_scenario(user_message, chat_history)

