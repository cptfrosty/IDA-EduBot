import os
from rag.engine import RagEngine
from vector_db.qdrant_manager import QdrantManager
from llm.gigachat_client import GigaChatClient


class AppContext:
    QdrantManager = QdrantManager(host=os.getenv("QDRANT_HOST"))
    GigaChatClient = GigaChatClient(api_key=os.getenv("GIGACHAT_API_KEY"))
    Rag = RagEngine(qdrant = QdrantManager, gigachat = GigaChatClient)