# database.py
import hashlib
import os
import secrets
from datetime import datetime, timedelta
from dotenv import load_dotenv
import psycopg2
from psycopg2 import sql
from typing import List, Dict, Any, Optional
from datetime import datetime
import json

class DataBase:
    def __init__(self):

        load_dotenv()

        print("PGSQL_HOST:", os.getenv("PGSQL_HOST"))
        print("PGSQL_PORT:", os.getenv("PGSQL_PORT")) 
        print("PGSQL_USER:", os.getenv("PGSQL_USER"))
        print("PGSQL_PASSWORD:", "***" if os.getenv("PGSQL_PASSWORD") else "NOT SET")

        try:
            
            connection = self.create_connection_db()
            # Создание курсора
            cur = connection.cursor()
            
            # Выполнение запроса
            cur.execute("SELECT version();")
            
            # Получение результата
            version = cur.fetchone()
            print(f"PostgreSQL version: {version[0]}")

            connection.close()

        except Exception as error:
            print(f"Ошибка подключение к PGSQL: {error}")

    def create_connection_db(self):
        try:
            connection = psycopg2.connect(
                host = os.getenv("PGSQL_HOST"),
                port = os.getenv("PGSQL_PORT"),
                user = os.getenv("PGSQL_USER"),
                password = os.getenv("PGSQL_PASSWORD")
                # port - указывается самостоятельно
            )
            print(f"Успешное подключение к БД")
            return connection
        except Exception as error:
            print(f"Ошибка подключение к PGSQL: {error}")
            return None

    def create_user(self, username, password):
        """Создание нового пользователя"""
        connection = self.create_connection_db()
        try:
            with connection.cursor() as cursor:
                # Вызываем функцию PostgreSQL
                cursor.execute(
                    "SELECT create_user_check(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);",
                    (
                        user_data['email'],
                        user_data['password_hash'],
                        user_data['role'],
                        user_data['first_name'],
                        user_data['last_name'],
                        user_data['phone'],
                        user_data['avatar_url'],
                        user_data['is_active'],
                        user_data['created_at'],
                        user_data['updated_at'],
                        user_data['last_login'],
                        user_data['last_activity']
                    )
                )
                    
                # Получаем результат (true/false)
                result = cursor.fetchone()[0]
                connection.commit()
                    
                return result
                    
        except Exception as e:
            Connection.rollback()
            print(f"Ошибка при вызове функции: {e}")
            return False

        if username in self.users:
            return False  # Пользователь уже существует
        
        password_hash, salt = self.hash_password(password)
        
        self.users[username] = {
            "id": self.next_user_id,
            "username": username,
            "password_hash": password_hash,
            "salt": salt,
            "created_at": datetime.now(),
            "is_active": True
        }
        self.next_user_id += 1
        return True
    
    def get_dialog_history_by_student(
        self, 
        student_id: int, 
        limit: int = 100, 
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Получить историю диалогов для конкретного студента"""
        connection = self.create_connection_db()
        if not connection:
            return []
        
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        dialog_id,
                        student_id,
                        course_id,
                        session_id,
                        question,
                        answer,
                        question_vector_id,
                        answer_vector_id,
                        used_chunk_ids,
                        response_time_ms,
                        rating,
                        feedback_text,
                        context_used,
                        model_used,
                        tokens_used,
                        cost_estimated,
                        is_successful,
                        error_message,
                        user_agent,
                        ip_address,
                        created_at
                    FROM dialog_history
                    WHERE student_id = %s
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                """, (student_id, limit, offset))
                
                # Получаем названия колонок
                column_names = [desc[0] for desc in cursor.description]
                
                # Преобразуем результаты в список словарей
                results = []
                for row in cursor.fetchall():
                    row_dict = dict(zip(column_names, row))
                    
                    # Обрабатываем специальные поля
                    if row_dict.get('used_chunk_ids'):
                        try:
                            row_dict['used_chunk_ids'] = json.loads(row_dict['used_chunk_ids'])
                        except:
                            row_dict['used_chunk_ids'] = []
                    
                    if row_dict.get('context_used'):
                        try:
                            row_dict['context_used'] = json.loads(row_dict['context_used'])
                        except:
                            row_dict['context_used'] = []
                    
                    results.append(row_dict)
                
                return results
                
        except Exception as e:
            print(f"Ошибка при получении истории диалогов: {e}")
            return []
        finally:
            connection.close()
    
    def get_conversations_summary(
        self, 
        student_id: int, 
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Получить сводку по диалогам (аналог списка бесед)"""
        connection = self.create_connection_db()
        if not connection:
            return []
        
        try:
            with connection.cursor() as cursor:
                # Группируем по session_id для получения "бесед"
                cursor.execute("""
                    SELECT 
                        session_id as id,
                        MIN(created_at) as created_at,
                        MAX(created_at) as updated_at,
                        COUNT(*) as message_count,
                        STRING_AGG(question, ' ' ORDER BY created_at) as questions_text,
                        -- Получаем последний вопрос через подзапрос
                        (SELECT question 
                        FROM dialog_history dh2 
                        WHERE dh2.session_id = dh.session_id 
                        ORDER BY created_at DESC 
                        LIMIT 1) as last_question,
                        -- Получаем последний ответ через подзапрос  
                        (SELECT answer
                        FROM dialog_history dh3
                        WHERE dh3.session_id = dh.session_id
                        ORDER BY created_at DESC
                        LIMIT 1) as last_answer
                    FROM dialog_history dh
                    WHERE student_id = %s
                    GROUP BY session_id
                    ORDER BY MAX(created_at) DESC
                    LIMIT %s;
                """, (student_id, limit))
                
                # Получаем названия колонок
                column_names = [desc[0] for desc in cursor.description]
                
                # Преобразуем результаты
                conversations = []
                for row in cursor.fetchall():
                    row_dict = dict(zip(column_names, row))
                    
                    # Создаем заголовок из первых слов вопроса
                    questions_text = row_dict.get('questions_text', '')
                    if questions_text:
                        # Берем первые 3 слова для заголовка
                        words = questions_text.split()[:3]
                        title = ' '.join(words)
                        if len(questions_text.split()) > 3:
                            title += '...'
                    else:
                        title = f"Диалог {row_dict.get('id', '')[:8]}"
                    
                    # Создаем последнее сообщение
                    last_question = row_dict.get('last_question', '')
                    last_answer = row_dict.get('last_answer', '')
                    
                    if last_answer:
                        last_message = f"В: {last_question[:50]}... | О: {last_answer[:50]}..."
                    else:
                        last_message = f"В: {last_question[:100]}..."
                    
                    conversation = {
                        "id": row_dict.get('id'),
                        "title": title,
                        "last_message": last_message,
                        "message_count": row_dict.get('message_count', 0),
                        "created_at": row_dict.get('created_at'),
                        "updated_at": row_dict.get('updated_at')
                    }
                    
                    conversations.append(conversation)
                
                return conversations
                
        except Exception as e:
            print(f"Ошибка при получении сводки диалогов: {e}")
            return []
        finally:
            connection.close()
    
    def get_conversation_messages(
        self, 
        session_id: str, 
        student_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Получить все сообщения конкретной сессии (беседы)"""
        connection = self.create_connection_db()
        if not connection:
            return []
        
        try:
            with connection.cursor() as cursor:
                query = """
                    SELECT 
                        dialog_id,
                        question,
                        answer,
                        response_time_ms,
                        rating,
                        feedback_text,
                        model_used,
                        tokens_used,
                        cost_estimated,
                        is_successful,
                        created_at
                    FROM dialog_history
                    WHERE session_id = %s
                """
                params = [session_id]
                
                if student_id:
                    query += " AND student_id = %s"
                    params.append(student_id)
                
                query += " ORDER BY created_at ASC"
                
                cursor.execute(query, params)
                
                column_names = [desc[0] for desc in cursor.description]
                
                messages = []
                for row in cursor.fetchall():
                    row_dict = dict(zip(column_names, row))
                    
                    message = {
                        "id": row_dict.get('dialog_id'),
                        "question": row_dict.get('question'),
                        "answer": row_dict.get('answer'),
                        "response_time": row_dict.get('response_time_ms'),
                        "rating": row_dict.get('rating'),
                        "feedback": row_dict.get('feedback_text'),
                        "model": row_dict.get('model_used'),
                        "tokens": row_dict.get('tokens_used'),
                        "cost": row_dict.get('cost_estimated'),
                        "is_successful": row_dict.get('is_successful'),
                        "created_at": row_dict.get('created_at'),
                        "role": "user"  # Можно добавить логику для определения роли
                    }
                    
                    messages.append(message)
                
                return messages
                
        except Exception as e:
            print(f"Ошибка при получении сообщений сессии: {e}")
            return []
        finally:
            connection.close()