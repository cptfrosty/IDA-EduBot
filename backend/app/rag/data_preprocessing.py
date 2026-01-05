# app/rag/data_preprocessing.py
import re
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)

class PreprocessingResult:
    """Результат препроцессинга текста."""
    def __init__(self, original_text: str, normalized_text: str, clean_text: str,
                 tokens: List[str], lemmas: List[str], entities: Dict[str, List[str]],
                 features: Dict[str, Any], metadata: Dict[str, Any]):
        self.original_text = original_text
        self.normalized_text = normalized_text
        self.clean_text = clean_text
        self.tokens = tokens
        self.lemmas = lemmas
        self.entities = entities
        self.features = features
        self.metadata = metadata
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'original_text': self.original_text,
            'normalized_text': self.normalized_text,
            'clean_text': self.clean_text,
            'tokens': self.tokens,
            'lemmas': self.lemmas,
            'entities': self.entities,
            'features': self.features,
            'metadata': self.metadata
        }
    
    def __str__(self):
        return self.original_text

class UniversityTextPreprocessor:
    """
    Упрощенный препроцессор.
    """
    
    def __init__(self, config: Optional[Dict] = None):
        self.config = config or {}
        logger.info("UniversityTextPreprocessor инициализирован")
    
    def process(self, text: str) -> PreprocessingResult:
        """
        Упрощенный препроцессинг.
        """
        try:
            # Базовая очистка
            cleaned = text.lower().strip()
            
            # Простая токенизация
            tokens = re.findall(r'\b\w+\b', cleaned)
            
            # Леммы (пока те же что и токены)
            lemmas = tokens
            
            # Извлечение сущностей
            entities = self._extract_entities(cleaned)
            
            # Признаки
            features = {
                'text_length': len(text),
                'word_count': len(tokens),
                'token_count': len(tokens),
                'is_question': '?' in text,
                'has_discipline': bool(self._extract_discipline(cleaned)),
                'question_word': self._extract_question_word(cleaned)
            }
            
            metadata = {
                'processing_time': '2024-01-15T10:00:00',
                'original_length': len(text),
                'token_count': len(tokens)
            }
            
            return PreprocessingResult(
                original_text=text,
                normalized_text=' '.join(lemmas),
                clean_text=cleaned,
                tokens=tokens,
                lemmas=lemmas,
                entities=entities,
                features=features,
                metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"Ошибка препроцессинга: {str(e)}")
            # Возвращаем простой результат
            return PreprocessingResult(
                original_text=text,
                normalized_text=text.lower(),
                clean_text=text.lower(),
                tokens=[text],
                lemmas=[text],
                entities={},
                features={'error': str(e)},
                metadata={'error': True}
            )
    
    def _extract_entities(self, text: str) -> Dict[str, List[str]]:
        """Извлечение сущностей."""
        entities = {
            'discipline': [],
            'room': [],
            'date': [],
            'time': []
        }
        
        # Ищем дисциплины
        discipline = self._extract_discipline(text)
        if discipline:
            entities['discipline'].append(discipline)
        
        return entities
    
    def _extract_discipline(self, text: str) -> Optional[str]:
        """Извлечение дисциплины."""
        match = re.search(r'\bпо\s+([а-яё\s\-]{3,})(?=\s|$|\?)', text)
        if match:
            return match.group(1).strip()
        return None
    
    def _extract_question_word(self, text: str) -> str:
        """Извлечение вопросительного слова."""
        question_words = ['кто', 'что', 'где', 'когда', 'почему', 
                         'зачем', 'как', 'сколько', 'какой', 'какая']
        
        first_word = text.split()[0] if text.split() else ''
        return first_word if first_word in question_words else ''