from llm.gigachat_client import GigaChatClient
from vector_db.qdrant_manager import QdrantManager


class RagEngine:
    def __init__(self, qdrant: QdrantManager, gigachat: GigaChatClient):
        self.qdrant = qdrant
        self.gigachat = gigachat