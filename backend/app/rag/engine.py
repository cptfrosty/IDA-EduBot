# engine.py (обновленный)
from rag.rag_system import RAGSystem, create_rag_system

# Для обратной совместимости
RagEngine = RAGSystem

# Или создать адаптер
class RagEngineAdapter:
    def __init__(self, **kwargs):
        self.system = create_rag_system(**kwargs)
    
    async def process_query(self, query: str, student_id: str = None):
        return await self.system.process_student_query(student_id, query)
    
    def chat(self, message: str, student_id: str = None):
        return self.system.chat(message, student_id)