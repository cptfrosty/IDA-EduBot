from rag.data_preprocessing import UniversityTextPreprocessor
from rag.classification_answer import IntentClassifier
from llm.gigachat_client import GigaChatClient
from vector_db.qdrant_manager import QdrantManager


class RagEngine:
    def __init__(self, qdrant, gigachat):
        self.qdrant = qdrant
        self.gigachat = gigachat
        self.preprocessor = UniversityTextPreprocessor()
        self.intent_classifier = IntentClassifier()

    def chat(self, message: str) -> str:
        """
        Основной метод чата.
        Возвращает строку ответа.
        """
        try:
            # 1. Препроцессинг
            preprocessed = self.preprocessor.process(message)
            
            # 2. Классификация
            intent_result = self.intent_classifier.classify(preprocessed)
            
            # 3. Формирование ответа на основе типа
            if intent_result.intent_type == 'discipline':
                if intent_result.needs_clarification:
                    return "Уточните, по какой дисциплине вопрос? Например: 'по математике' или 'по программированию'."
                elif intent_result.extracted_discipline:
                    return f"Вопрос по дисциплине '{intent_result.extracted_discipline}'. Для ответа нужны учебные материалы."
                else:
                    return "Это учебный вопрос. Для ответа нужны материалы по дисциплине."
            
            elif intent_result.intent_type == 'general':
                return "Это общий вопрос об университете. Обратитесь в деканат или учебный отдел."
            
            elif intent_result.intent_type == 'greeting':
                return "Привет! Я помощник по учебным вопросам. Чем могу помочь?"
            
            elif intent_result.intent_type == 'farewell':
                return "До свидания! Обращайтесь, если будут вопросы."
            
            else:
                return "Пока я могу отвечать только на учебные и общие вопросы об университете."
                
        except Exception as e:
            return f"Произошла ошибка при обработке запроса: {str(e)}"