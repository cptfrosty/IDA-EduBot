import time
import pandas as pd
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer
from qdrant_client.models import VectorParams, Distance, PointStruct
from qdrant_client import QdrantClient
from qdrant_client.http import models
import torch

'''
Нужна ещё openpyxl
pip install openpyxl

 http://localhost:6333/collections <--- проверка коллекций


'''

class QdrantLoader:
    def __init__(self):
        self.collection_name = "test_db1"
        self.import_data_name = "KnowlengeBase.xlsx"
        self.client = QdrantClient(host="localhost", port=6333)

    def load(self):
        # Загрузка модели для эмбеддингов
        model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

        df = pd.read_excel(self.import_data_name)
        client = QdrantClient("localhost", port=6333)

        points = []
        for index, row in df.iterrows():
            # Создаем объединенный текст из всех колонок
            text = " ".join([str(x) for x in row.values if pd.notna(x)])
            vector = model.encode(text).tolist()
            
            # Создаем payload с ОБЯЗАТЕЛЬНЫМ полем "text"
            payload = row.to_dict()
            payload["text"] = text  # Добавляем поле text
            
            points.append(PointStruct(
                id=index,
                vector=vector,
                payload=payload
            ))

        client.upsert(self.collection_name, points=points)
        print(f"[Qdrant] Loaded {len(points)} documents with 'text' field")

    def create_collection(self):
        client = QdrantClient(host="localhost", port=6333)
        
        # Сначала пытаемся удалить существующую коллекцию
        try:
            client.delete_collection(collection_name=self.collection_name)
            print(f"[Qdrant] Existing collection '{self.collection_name}' deleted")
            time.sleep(1)  # Даем время на завершение удаления
        except Exception as e:
            print(f"[Qdrant] No collection to delete or error: {e}")
        
        # Создаем новую коллекцию
        client.create_collection(
            collection_name=self.collection_name,
            vectors_config=models.VectorParams(
                size=384,  # Размерность векторов
                distance=models.Distance.COSINE  # Метрика расстояния
            )
        )
        print(f"[Qdrant] New collection '{self.collection_name}' created")

    def _optimize_collection(self):
        """Принудительная оптимизация коллекции для индексации"""
        try:
            # Запускаем оптимизацию
            self.client.update_collection(
                collection_name=self.collection_name,
                optimizer_config=models.OptimizersConfigDiff(
                    indexing_threshold=100  # Понижаем порог индексации
                )
            )
            print("[Qdrant] Optimization triggered")
            time.sleep(3)  # Ждем оптимизацию
        except Exception as e:
            print(f"[Qdrant] Optimization error: {e}")

if __name__ == "__main__":
    qdrant_loader = QdrantLoader();
    qdrant_loader.create_collection()
    qdrant_loader.load()
    qdrant_loader._optimize_collection()