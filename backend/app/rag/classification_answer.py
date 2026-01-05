# app/rag/classification_answer.py
from typing import Dict, List, Any, Optional
import re

class IntentClassificationResult:
    """Результат классификации намерения."""
    def __init__(self, intent_type: str, confidence: float, original_text: str,
                 extracted_discipline: Optional[str] = None, 
                 needs_clarification: bool = False):
        self.intent_type = intent_type
        self.confidence = confidence
        self.original_text = original_text
        self.extracted_discipline = extracted_discipline
        self.needs_clarification = needs_clarification
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'intent_type': self.intent_type,
            'confidence': self.confidence,
            'original_text': self.original_text,
            'extracted_discipline': self.extracted_discipline,
            'needs_clarification': self.needs_clarification
        }

class IntentClassifier:
    """
    Классификатор намерений.
    """
    
    def __init__(self):
        print("IntentClassifier инициализирован")
        
        # Ключевые слова для классификации
        self.discipline_keywords = [
            'лекция', 'семинар', 'практика', 'экзамен', 'зачет',
            'курсовая', 'диплом', 'проект', 'предмет', 'дисциплина',
            'тема', 'раздел', 'параграф', 'учебник', 'пособие',
            'объясни', 'что такое', 'как работает', 'почему',
            'определение', 'формула', 'теорема', 'реши', 'посчитай'
        ]
        
        self.general_keywords = [
            'сессия', 'расписание', 'деканат', 'общежитие', 'стипендия',
            'ректорат', 'библиотека', 'корпус', 'аудитория', 'график',
            'календарь', 'адрес', 'контакты', 'правила', 'приказ',
            'заявление', 'справка', 'документ'
        ]
        
        self.greeting_keywords = [
            'привет', 'здравствуй', 'здравствуйте', 'добрый день',
            'доброе утро', 'добрый вечер', 'хай', 'hello', 'hi'
        ]
        
        self.farewell_keywords = [
            'пока', 'до свидания', 'всего доброго', 'до встречи',
            'спасибо', 'благодарю', 'goodbye', 'bye'
        ]
    
    def classify(self, input_data: Any) -> IntentClassificationResult:
        """
        Классификация намерения.
        
        Args:
            input_data: может быть строкой или PreprocessingResult
            
        Returns:
            IntentClassificationResult
        """
        try:
            # Извлекаем текст из разных типов входных данных
            if hasattr(input_data, 'original_text'):
                # Это PreprocessingResult
                text = input_data.original_text
                # Можем использовать features если есть
                has_discipline = getattr(input_data.features, 'has_discipline', False) if hasattr(input_data, 'features') else False
            elif isinstance(input_data, dict) and 'original_text' in input_data:
                text = input_data['original_text']
                has_discipline = input_data.get('features', {}).get('has_discipline', False)
            elif isinstance(input_data, str):
                text = input_data
                has_discipline = False
            else:
                text = str(input_data)
                has_discipline = False
            
            text_lower = text.lower()
            
            # Проверка на приветствия и прощания (высокий приоритет)
            if any(keyword in text_lower for keyword in self.greeting_keywords):
                return IntentClassificationResult(
                    intent_type='greeting',
                    confidence=0.95,
                    original_text=text
                )
            
            if any(keyword in text_lower for keyword in self.farewell_keywords):
                return IntentClassificationResult(
                    intent_type='farewell',
                    confidence=0.95,
                    original_text=text
                )
            
            # Подсчет баллов
            discipline_score = sum(1 for kw in self.discipline_keywords if kw in text_lower)
            general_score = sum(1 for kw in self.general_keywords if kw in text_lower)
            
            # Дополнительные признаки
            is_question = '?' in text_lower
            
            # Явное указание дисциплины
            discipline = self._extract_discipline(text_lower)
            has_explicit_discipline = bool(discipline)
            
            # Определение типа
            if discipline_score > 0 or has_discipline or has_explicit_discipline:
                confidence = 0.8
                
                return IntentClassificationResult(
                    intent_type='discipline',
                    confidence=confidence,
                    original_text=text,
                    extracted_discipline=discipline,
                    needs_clarification=(discipline is None and discipline_score > 0)
                )
            elif general_score > 0:
                return IntentClassificationResult(
                    intent_type='general',
                    confidence=0.7,
                    original_text=text
                )
            else:
                # По умолчанию считаем общим вопросом
                return IntentClassificationResult(
                    intent_type='general',
                    confidence=0.5,
                    original_text=text
                )
                
        except Exception as e:
            print(f"Ошибка классификации: {str(e)}")
            return IntentClassificationResult(
                intent_type='unknown',
                confidence=0.0,
                original_text=str(input_data)
            )
    
    def _extract_discipline(self, text: str) -> Optional[str]:
        """Извлечение дисциплины из текста."""
        # Паттерны для извлечения дисциплины
        patterns = [
            r'\bпо\s+([а-яё\s\-]{3,})(?=\s|$|\?)',
            r'\bпредмету\s+([а-яё\s\-]{3,})(?=\s|$|\?)',
            r'\bдисциплине\s+([а-яё\s\-]{3,})(?=\s|$|\?)',
            r'\bкурсу\s+([а-яё\s\-]{3,})(?=\s|$|\?)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                discipline = match.group(1).strip()
                # Очищаем от лишних слов
                discipline = re.sub(r'^\s*и\s+', '', discipline)
                return discipline if discipline else None
        
        return None

# Фабричная функция (если нужна)
def create_intent_classifier(config: Optional[Dict[str, Any]] = None):
    """Создание экземпляра классификатора."""
    return IntentClassifier()