import pytest
import sys
import os

# Добавляем путь к проекту
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

@pytest.fixture(autouse=True)
def setup_logging():
    """Настройка логирования для тестов"""
    import logging
    logging.basicConfig(level=logging.WARNING)  # Уменьшаем логи для тестов

@pytest.fixture
def test_client():
    """Создание тестового клиента"""
    from fastapi.testclient import TestClient
    from app import app
    return TestClient(app)