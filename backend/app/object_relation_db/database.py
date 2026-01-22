# database.py
import hashlib
import os
import secrets
from datetime import datetime, timedelta
import uuid
from dotenv import load_dotenv
import logging
import psycopg2
from psycopg2 import sql
from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import bcrypt


logger = logging.getLogger(__name__)  # Создаем логгер для этого модуля

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
                password = os.getenv("PGSQL_PASSWORD"),
                database = os.getenv("PGSQL_DATABASE")
                # port - указывается самостоятельно
            )
            print(f"Успешное подключение к БД")
            
            self.print_all_tables(connection)

            return connection
        except Exception as error:
            print(f"Ошибка подключение к PGSQL: {error}")
            return None

    def print_all_tables(self, connection):
        '''Напечатать все таблицы в базе данных'''
        cur = connection.cursor()
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """)
        tables = cur.fetchall()
        print(f"Всего таблиц: {len(tables)}")
        for table in tables:
            print(f"- {table[0]}")

    def create_user(self, user_data):
        """Создание нового пользователя в базе данных"""
        connection = self.create_connection_db()
        try:
            # Хешируем пароль (bcrypt сам генерирует соль и включает ее в хеш)
            password_hash = self.hash_password_bcrypt(user_data['password'])
            
            with connection.cursor() as cursor:
                # Вызываем функцию PostgreSQL для создания пользователя
                cursor.execute(
                    "SELECT create_user_check(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);",
                    (
                        user_data['email'],
                        password_hash,  # Передаем готовый хеш от bcrypt
                        user_data.get('role', 'student'),
                        user_data.get('first_name'),
                        user_data.get('last_name'),
                        user_data.get('phone'),
                        user_data.get('avatar_url'),
                        user_data.get('is_active', True),
                        user_data.get('created_at'),
                        user_data.get('updated_at'),
                        user_data.get('last_login'),
                        user_data.get('last_activity')
                    )
                )
                
                # Получаем результат
                result = cursor.fetchone()
                connection.commit()
                
                if result and result[0]:
                    print(f"Пользователь {user_data['email']} успешно создан")
                    return True
                
                print(f"Не удалось создать пользователя {user_data['email']}")
                return False
                    
        except Exception as e:
            if connection:
                connection.rollback()
            print(f"Ошибка при создании пользователя: {e}")
            return False
        finally:
            if connection:
                connection.close()
    
    # Курс содержится внутри дисциплины (курс - это лекции/практические)

    def create_course(self, course_data: dict) -> Optional[str]:
        """
        Создать новый курс в базе данных.
        
        Args:
            course_data: Словарь с данными курса.
        
        Returns:
            str: UUID созданного курса в виде строки или None в случае ошибки
        """
        connection = self.create_connection_db()
        if not connection:
            return None
        
        try:
            with connection.cursor() as cursor:
                # Проверяем обязательные поля
                required_fields = ['discipline_id', 'title', 'semester', 'instructor_id', 'start_date', 'end_date']
                for field in required_fields:
                    if field not in course_data or not course_data[field]:
                        logger.error(f"Отсутствует обязательное поле: {field}")
                        return None
                
                # Проверяем существование дисциплины
                discipline = self.get_discipline_by_id(course_data['discipline_id'])
                if not discipline:
                    logger.error(f"Дисциплина с ID {course_data['discipline_id']} не найдена")
                    return None
                
                # Проверяем существование преподавателя
                instructor = self.get_user_by_id(course_data['instructor_id'])
                if not instructor:
                    logger.error(f"Преподаватель с ID {course_data['instructor_id']} не найден")
                    return None
                
                # Проверяем существование ассистента, если указан
                if course_data.get('assistant_id'):
                    assistant = self.get_user_by_id(course_data['assistant_id'])
                    if not assistant:
                        logger.error(f"Ассистент с ID {course_data['assistant_id']} не найден")
                        return None
                
                # Проверяем и преобразуем UUID поля
                uuid_fields = ['discipline_id', 'instructor_id', 'assistant_id']
                try:
                    for field in uuid_fields:
                        if field in course_data and course_data[field]:
                            uuid.UUID(course_data[field])
                except (ValueError, TypeError) as e:
                    logger.error(f"Неверный формат UUID для поля {field}: {e}")
                    return None
                
                # Преобразуем schedule_json в JSON строку если он есть
                schedule_json_str = None
                if 'schedule_json' in course_data and course_data['schedule_json']:
                    try:
                        schedule_json_str = json.dumps(course_data['schedule_json'])
                    except Exception as e:
                        logger.error(f"Ошибка преобразования schedule_json в JSON: {e}")
                        return None
                
                # Преобразуем даты
                try:
                    start_date = datetime.strptime(course_data['start_date'], '%Y-%m-%d').date()
                    end_date = datetime.strptime(course_data['end_date'], '%Y-%m-%d').date()
                    
                    # Проверка, что end_date > start_date
                    if end_date <= start_date:
                        logger.error(f"Дата окончания ({end_date}) должна быть позже даты начала ({start_date})")
                        return None
                except ValueError as e:
                    logger.error(f"Неверный формат даты: {e}. Ожидается формат 'YYYY-MM-DD'")
                    return None
                
                # Проверяем статус
                valid_statuses = ['planned', 'active', 'completed', 'cancelled']
                status = course_data.get('status', 'planned')
                if status not in valid_statuses:
                    logger.error(f"Неверный статус: {status}. Допустимые значения: {valid_statuses}")
                    return None
                
                # Проверяем числовые поля
                max_students = course_data.get('max_students', 30)
                current_students = course_data.get('current_students', 0)
                
                if not isinstance(max_students, int) or max_students <= 0:
                    logger.error(f"max_students должно быть положительным целым числом: {max_students}")
                    return None
                
                if not isinstance(current_students, int) or current_students < 0:
                    logger.error(f"current_students должно быть неотрицательным целым числом: {current_students}")
                    return None
                
                if current_students > max_students:
                    logger.error(f"current_students ({current_students}) не может превышать max_students ({max_students})")
                    return None
                
                # Подготавливаем параметры
                query = """
                    INSERT INTO public.courses (
                        discipline_id, title, semester, instructor_id, assistant_id,
                        start_date, end_date, schedule_json, max_students, current_students,
                        status, classroom, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING course_id
                """
                
                params = (
                    course_data['discipline_id'],
                    course_data['title'],
                    course_data['semester'],
                    course_data['instructor_id'],
                    course_data.get('assistant_id'),  # Может быть None
                    start_date,
                    end_date,
                    schedule_json_str,  # Может быть None
                    max_students,
                    current_students,
                    status,
                    course_data.get('classroom'),  # Может быть None
                )
                
                cursor.execute(query, params)
                result = cursor.fetchone()
                if result:
                    created_course_id = str(result[0])
                    logger.info(f"Курс создан с course_id: {created_course_id}")
                    connection.commit()
                    return created_course_id
                else:
                    logger.error("Не удалось получить созданный course_id")
                    connection.rollback()
                    return None
                    
        except psycopg2.Error as e:
            logger.error(f"Ошибка PostgreSQL при создании курса: {e}")
            logger.error(f"Параметры: {course_data}")
            if connection:
                connection.rollback()
            return None
        except Exception as e:
            logger.error(f"Неожиданная ошибка при создании курса: {e}")
            if connection:
                connection.rollback()
            return None
        finally:
            if connection:
                connection.close()

    # Создание дисциплины

    def create_discipline(self, discipline_data: dict) -> Optional[str]:
        """
        Создать новую дисциплину в базе данных.
        
        Args:
            discipline_data: Словарь с данными дисциплины. Должен содержать:
                - name: str (название дисциплины)
                - code: str (код дисциплины)
                - department: str (кафедра/факультет)
                - description: Optional[str] (описание)
                - credits: Optional[int] (кредиты, по умолчанию 3)
                - hours_total: Optional[int] (общее количество часов)
                - hours_lecture: Optional[int] (часы лекций)
                - hours_practice: Optional[int] (часы практики)
                - difficulty_level: Optional[str] ('beginner', 'intermediate', 'advanced')
                - is_active: Optional[bool] (активна ли дисциплина)
                - created_by: Optional[str] (UUID пользователя, создавшего дисциплину)
        
        Returns:
            str: UUID созданной дисциплины в виде строки или None в случае ошибки
        """
        connection = self.create_connection_db()
        if not connection:
            return None
        
        try:
            with connection.cursor() as cursor:
                # Проверяем обязательные поля
                required_fields = ['name', 'code', 'department']
                for field in required_fields:
                    if field not in discipline_data or not discipline_data[field]:
                        logger.error(f"Отсутствует обязательное поле: {field}")
                        return None
                
                # Проверяем created_by, если указан
                if discipline_data.get('created_by'):
                    try:
                        # Проверяем формат UUID
                        uuid.UUID(discipline_data['created_by'])
                        # Проверяем существование пользователя
                        creator = self.get_user_by_id(discipline_data['created_by'])
                        if not creator:
                            logger.error(f"Пользователь с ID {discipline_data['created_by']} не найден")
                            return None
                    except ValueError as e:
                        logger.error(f"Неверный формат UUID для created_by: {e}")
                        return None
                
                # Проверяем difficulty_level если указан
                difficulty_level = discipline_data.get('difficulty_level')
                if difficulty_level:
                    valid_levels = ['beginner', 'intermediate', 'advanced']
                    if difficulty_level not in valid_levels:
                        logger.error(f"Неверный уровень сложности: {difficulty_level}. Допустимые: {valid_levels}")
                        return None
                
                # Проверяем числовые поля
                credits = discipline_data.get('credits', 3)
                if credits is not None and (not isinstance(credits, int) or credits <= 0):
                    logger.error(f"credits должно быть положительным целым числом: {credits}")
                    return None
                
                hours_fields = ['hours_total', 'hours_lecture', 'hours_practice']
                for field in hours_fields:
                    value = discipline_data.get(field)
                    if value is not None and (not isinstance(value, int) or value < 0):
                        logger.error(f"{field} должно быть неотрицательным целым числом: {value}")
                        return None
                
                # Проверяем логическое поле
                is_active = discipline_data.get('is_active', True)
                if not isinstance(is_active, bool):
                    logger.error(f"is_active должно быть boolean: {is_active}")
                    return None
                
                # Проверяем уникальность кода дисциплины (опционально)
                check_code_query = "SELECT discipline_id FROM public.disciplines WHERE code = %s"
                cursor.execute(check_code_query, (discipline_data['code'],))
                existing = cursor.fetchone()
                if existing:
                    logger.warning(f"Дисциплина с кодом {discipline_data['code']} уже существует")
                    # Можно вернуть ошибку или продолжить, в зависимости от требований
                    # return None
                
                # Подготавливаем SQL запрос
                query = """
                    INSERT INTO public.disciplines (
                        name, code, description, department, credits,
                        hours_total, hours_lecture, hours_practice,
                        difficulty_level, is_active, created_by,
                        created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING discipline_id
                """
                
                params = (
                    discipline_data['name'],
                    discipline_data['code'],
                    discipline_data.get('description'),
                    discipline_data['department'],
                    discipline_data.get('credits', 3),
                    discipline_data.get('hours_total'),
                    discipline_data.get('hours_lecture'),
                    discipline_data.get('hours_practice'),
                    discipline_data.get('difficulty_level'),
                    discipline_data.get('is_active', True),
                    discipline_data.get('created_by'),
                )
                
                cursor.execute(query, params)
                result = cursor.fetchone()
                if result:
                    created_discipline_id = str(result[0])
                    logger.info(f"Дисциплина создана с discipline_id: {created_discipline_id}")
                    connection.commit()
                    return created_discipline_id
                else:
                    logger.error("Не удалось получить созданный discipline_id")
                    connection.rollback()
                    return None
                    
        except psycopg2.Error as e:  # Если вы используете psycopg2
            logger.error(f"Ошибка PostgreSQL при создании дисциплины: {e}")
            logger.error(f"Параметры: {discipline_data}")
            if connection:
                connection.rollback()
            return None
        except Exception as e:
            logger.error(f"Неожиданная ошибка при создании дисциплины: {e}")
            if connection:
                connection.rollback()
            return None
        finally:
            if connection:
                connection.close()

    def get_all_disciplines(self, active_only: bool = True) -> List[dict]:
        """
        Получить список всех дисциплин.
        
        Args:
            active_only: Если True, возвращать только активные дисциплины
        
        Returns:
            List[dict]: Список дисциплин
        """
        connection = self.create_connection_db()
        if not connection:
            return []
        
        try:
            with connection.cursor() as cursor:
                if active_only:
                    query = """
                        SELECT discipline_id, name, code, description, department,
                            credits, hours_total, difficulty_level, is_active
                        FROM public.disciplines 
                        WHERE is_active = TRUE
                        ORDER BY name
                    """
                else:
                    query = """
                        SELECT discipline_id, name, code, description, department,
                            credits, hours_total, difficulty_level, is_active
                        FROM public.disciplines 
                        ORDER BY name
                    """
                
                cursor.execute(query)
                results = cursor.fetchall()
                
                disciplines = []
                for row in results:
                    disciplines.append({
                        'discipline_id': str(row[0]),
                        'name': row[1],
                        'code': row[2],
                        'description': row[3],
                        'department': row[4],
                        'credits': row[5],
                        'hours_total': row[6],
                        'difficulty_level': row[7],
                        'is_active': row[8]
                    })
                
                return disciplines
        except Exception as e:
            logger.error(f"Ошибка при получении списка дисциплин: {e}")
            return []
        finally:
            if connection:
                connection.close()

    def get_discipline_by_id(self, discipline_id: str) -> Optional[dict]:
        """
        Получить дисциплину по ID.
        
        Args:
            discipline_id: UUID дисциплины в виде строки
        
        Returns:
            dict: Данные дисциплины или None если не найдена
        """
        connection = self.create_connection_db()
        if not connection:
            return None
        
        try:
            # Проверяем формат UUID
            try:
                uuid.UUID(discipline_id)
            except ValueError:
                logger.error(f"Неверный формат UUID для discipline_id: {discipline_id}")
                return None
            
            with connection.cursor() as cursor:
                query = """
                    SELECT discipline_id, name, code, description, department,
                        credits, hours_total, hours_lecture, hours_practice,
                        difficulty_level, is_active, created_by, created_at
                    FROM public.disciplines 
                    WHERE discipline_id = %s
                """
                
                cursor.execute(query, (discipline_id,))
                result = cursor.fetchone()
                
                if result:
                    return {
                        'discipline_id': str(result[0]),
                        'name': result[1],
                        'code': result[2],
                        'description': result[3],
                        'department': result[4],
                        'credits': result[5],
                        'hours_total': result[6],
                        'hours_lecture': result[7],
                        'hours_practice': result[8],
                        'difficulty_level': result[9],
                        'is_active': result[10],
                        'created_by': str(result[11]) if result[11] else None,
                        'created_at': result[12]
                    }
                return None
        except Exception as e:
            logger.error(f"Ошибка при получении дисциплины: {e}")
            return None
        finally:
            if connection:
                connection.close()

    def get_disciplines(self, skip: int = 0, limit: int = 100):
        """
        Получить список дисциплин
        """
        connection = self.create_connection_db()
        if not connection:
            return []
        
        try:
            with connection.cursor() as cursor:
                query = """
                SELECT 
                    discipline_id,
                    name,
                    code,
                    department,
                    description,
                    credits,
                    hours_total,
                    hours_lecture,
                    hours_practice,
                    difficulty_level,
                    is_active,
                    created_by,
                    created_at
                FROM public.disciplines 
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
                """
                cursor.execute(query, (limit, skip))
                results = cursor.fetchall()
                
                disciplines = []
                for row in results:
                    discipline = {
                        'discipline_id': str(row[0]),
                        'name': row[1],
                        'code': row[2],
                        'department': row[3],
                        'description': row[4],
                        'credits': row[5],
                        'hours_total': row[6],
                        'hours_lecture': row[7],
                        'hours_practice': row[8],
                        'difficulty_level': row[9],
                        'is_active': row[10],
                        'created_by': str(row[11]) if row[11] else None,
                        'created_at': row[12].isoformat() if row[12] else None
                    }
                    disciplines.append(discipline)
                
                return disciplines
                
        except Exception as e:
            print(f"Ошибка при получении дисциплин: {str(e)}")
            return []
        finally:
            if connection:
                connection.close()

    # Создание мнового материала

    def create_learning_material(self, material_data: dict) -> Optional[str]:
        """
        Создать новый учебный материал.
        
        Args:
            material_data: Словарь с данными материала. Должен содержать:
                - course_id: str (UUID курса)
                - title: str (название материала)
                - material_type: str ('lecture', 'textbook', 'exercise', 'code_example', 
                                    'presentation', 'video', 'article')
                - uploader_id: str (UUID пользователя, загрузившего материал)
                
                Опциональные поля:
                - description: str (описание материала)
                - content_text: str (текстовое содержание)
                - file_path: str (путь к файлу)
                - file_size: int (размер файла в байтах)
                - file_type: str (тип файла)
                - original_filename: str (оригинальное имя файла)
                - version: int (версия материала, по умолчанию 1)
                - is_public: bool (публичный ли материал)
                - access_level: str ('course', 'department', 'university', 'public')
                - tags: List[str] или dict (теги материала)
                - difficulty: str ('beginner', 'intermediate', 'advanced')
                - estimated_duration: int (оценочная длительность в минутах)
                - is_active: bool (активен ли материал)
        
        Returns:
            str: UUID созданного материала в виде строки или None в случае ошибки
        """
        connection = self.create_connection_db()
        if not connection:
            return None
        
        try:
            with connection.cursor() as cursor:
                # Проверяем обязательные поля
                required_fields = ['course_id', 'title', 'material_type', 'uploader_id']
                for field in required_fields:
                    if field not in material_data or not material_data[field]:
                        logger.error(f"Отсутствует обязательное поле: {field}")
                        return None
                
                # Проверяем существование курса
                course = self.get_course_by_id(material_data['course_id'])
                if not course:
                    logger.error(f"Курс с ID {material_data['course_id']} не найден")
                    return None
                
                # Проверяем существование пользователя
                uploader = self.get_user_by_id(material_data['uploader_id'])
                if not uploader:
                    logger.error(f"Пользователь с ID {material_data['uploader_id']} не найден")
                    return None
                
                # Проверяем тип материала
                valid_material_types = ['lecture', 'textbook', 'exercise', 'code_example', 
                                    'presentation', 'video', 'article']
                material_type = material_data['material_type']
                if material_type not in valid_material_types:
                    logger.error(f"Неверный тип материала: {material_type}. Допустимые: {valid_material_types}")
                    return None
                
                # Проверяем уровень доступа если указан
                access_level = material_data.get('access_level', 'course')
                valid_access_levels = ['course', 'department', 'university', 'public']
                if access_level not in valid_access_levels:
                    logger.error(f"Неверный уровень доступа: {access_level}. Допустимые: {valid_access_levels}")
                    return None
                
                # Проверяем сложность если указана
                difficulty = material_data.get('difficulty')
                if difficulty:
                    valid_difficulties = ['beginner', 'intermediate', 'advanced']
                    if difficulty not in valid_difficulties:
                        logger.error(f"Неверная сложность: {difficulty}. Допустимые: {valid_difficulties}")
                        return None
                
                # Проверяем числовые поля
                file_size = material_data.get('file_size')
                if file_size is not None and (not isinstance(file_size, int) or file_size < 0):
                    logger.error(f"file_size должно быть неотрицательным целым числом: {file_size}")
                    return None
                
                version = material_data.get('version', 1)
                if not isinstance(version, int) or version < 1:
                    logger.error(f"version должно быть положительным целым числом: {version}")
                    return None
                
                estimated_duration = material_data.get('estimated_duration')
                if estimated_duration is not None and (not isinstance(estimated_duration, int) or estimated_duration <= 0):
                    logger.error(f"estimated_duration должно быть положительным целым числом: {estimated_duration}")
                    return None
                
                # Преобразуем tags в JSON если указаны
                tags_json = None
                if 'tags' in material_data and material_data['tags']:
                    try:
                        tags_json = json.dumps(material_data['tags'])
                    except Exception as e:
                        logger.error(f"Ошибка преобразования tags в JSON: {e}")
                        return None
                
                # Проверяем, что хотя бы одно из content_text или file_path указано
                if not material_data.get('content_text') and not material_data.get('file_path'):
                    logger.warning("Материал не содержит ни текстового содержания, ни файла")
                    # Можно решить, разрешить ли это или нет
                
                # Подготавливаем SQL запрос
                query = """
                    INSERT INTO public.learning_materials (
                        course_id, title, description, material_type,
                        content_text, file_path, file_size, file_type,
                        original_filename, uploader_id, version,
                        is_public, access_level, tags, difficulty,
                        estimated_duration, is_active,
                        created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING material_id
                """
                
                params = (
                    material_data['course_id'],
                    material_data['title'],
                    material_data.get('description'),
                    material_data['material_type'],
                    material_data.get('content_text'),
                    material_data.get('file_path'),
                    material_data.get('file_size'),
                    material_data.get('file_type'),
                    material_data.get('original_filename'),
                    material_data['uploader_id'],
                    version,
                    material_data.get('is_public', False),
                    access_level,
                    tags_json,  # JSON строка или None
                    difficulty,
                    estimated_duration,
                    material_data.get('is_active', True),
                )
                
                cursor.execute(query, params)
                result = cursor.fetchone()
                if result:
                    created_material_id = str(result[0])
                    logger.info(f"Учебный материал создан с material_id: {created_material_id}")
                    connection.commit()
                    return created_material_id
                else:
                    logger.error("Не удалось получить созданный material_id")
                    connection.rollback()
                    return None
                    
        except psycopg2.Error as e:
            logger.error(f"Ошибка PostgreSQL при создании учебного материала: {e}")
            logger.error(f"Параметры: {material_data}")
            if connection:
                connection.rollback()
            return None
        except Exception as e:
            logger.error(f"Неожиданная ошибка при создании учебного материала: {e}")
            if connection:
                connection.rollback()
            return None
        finally:
            if connection:
                connection.close()

    def get_course_by_id(self, course_id: str) -> Optional[dict]:
        """
        Получить курс по ID.
        
        Args:
            course_id: UUID курса в виде строки
        
        Returns:
            dict: Данные курса или None если не найден
        """
        connection = self.create_connection_db()
        if not connection:
            return None
        
        try:
            with connection.cursor() as cursor:
                query = """
                    SELECT 
                        c.course_id, c.discipline_id, c.title, c.semester,
                        c.instructor_id, c.assistant_id, c.start_date, c.end_date,
                        c.schedule_json, c.max_students, c.current_students,
                        c.status, c.classroom, c.created_at,
                        CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
                        u.email as instructor_email,
                        d.name as discipline_name,
                        d.description as discipline_description
                    FROM public.courses c
                    LEFT JOIN public.users u ON c.instructor_id = u.user_id
                    LEFT JOIN public.disciplines d ON c.discipline_id = d.discipline_id
                    WHERE c.course_id = %s
                """
                
                cursor.execute(query, (course_id,))
                result = cursor.fetchone()
                
                if result:
                    schedule_json = None
                    if result[8]:  # schedule_json
                        try:
                            schedule_json = json.loads(result[8])
                        except:
                            schedule_json = result[8]
                    
                    instructor_name = result[13]
                    if not instructor_name or instructor_name == ' ':
                        instructor_name = result[14]  # email, если имя не указано
                    
                    return {
                        'course_id': str(result[0]),
                        'discipline_id': str(result[1]) if result[1] else None,
                        'title': result[2],
                        'semester': result[3],
                        'instructor_id': str(result[4]) if result[4] else None,
                        'assistant_id': str(result[5]) if result[5] else None,
                        'start_date': result[6].isoformat() if result[6] else None,
                        'end_date': result[7].isoformat() if result[7] else None,
                        'schedule_json': schedule_json,
                        'max_students': result[9],
                        'current_students': result[10],
                        'status': result[11],
                        'classroom': result[12],
                        'created_at': result[13].isoformat() if result[13] else None,
                        'instructor_name': instructor_name,
                        'instructor_email': result[14],
                        'discipline_name': result[15],
                        'description': result[16]  # Описание из дисциплины
                    }
                return None
        except Exception as e:
            logger.error(f"Ошибка при получении курса: {e}")
            return None
        finally:
            if connection:
                connection.close()

    def get_learning_material_by_id(self, material_id: str) -> Optional[dict]:
        """
        Получить учебный материал по ID.
        
        Args:
            material_id: UUID материала в виде строки
        
        Returns:
            dict: Данные материала или None если не найден
        """
        connection = self.create_connection_db()
        if not connection:
            return None
        
        try:
            with connection.cursor() as cursor:
                query = """
                    SELECT material_id, course_id, title, description, material_type,
                        content_text, file_path, file_size, file_type,
                        original_filename, uploader_id, version,
                        is_public, access_level, tags, difficulty,
                        estimated_duration, is_active, created_at
                    FROM public.learning_materials 
                    WHERE material_id = %s
                """
                
                cursor.execute(query, (material_id,))
                result = cursor.fetchone()
                
                if result:
                    # Преобразуем tags из JSON обратно
                    tags = None
                    if result[14]:  # tags field
                        try:
                            tags = json.loads(result[14])
                        except:
                            tags = result[14]
                    
                    return {
                        'material_id': str(result[0]),
                        'course_id': str(result[1]),
                        'title': result[2],
                        'description': result[3],
                        'material_type': result[4],
                        'content_text': result[5],
                        'file_path': result[6],
                        'file_size': result[7],
                        'file_type': result[8],
                        'original_filename': result[9],
                        'uploader_id': str(result[10]),
                        'version': result[11],
                        'is_public': result[12],
                        'access_level': result[13],
                        'tags': tags,
                        'difficulty': result[15],
                        'estimated_duration': result[16],
                        'is_active': result[17],
                        'created_at': result[18]
                    }
                return None
        except Exception as e:
            logger.error(f"Ошибка при получении учебного материала: {e}")
            return None
        finally:
            if connection:
                connection.close()
    
    def get_all_courses(self, status: Optional[str] = None) -> List[dict]:
        """
        Получить все курсы (для администратора).
        
        Args:
            status: Фильтр по статусу (planned, active, completed, cancelled)
        
        Returns:
            List[dict]: Список курсов
        """
        connection = self.create_connection_db()
        if not connection:
            return []
        
        try:
            with connection.cursor() as cursor:
                if status:
                    query = """
                        SELECT 
                            c.course_id, c.discipline_id, c.title, c.semester,
                            c.instructor_id, c.assistant_id, c.start_date, c.end_date,
                            c.schedule_json, c.max_students, c.current_students,
                            c.status, c.classroom, c.created_at,
                            CONCAT(u1.first_name, ' ', u1.last_name) as instructor_name,
                            u1.email as instructor_email,
                            CONCAT(u2.first_name, ' ', u2.last_name) as assistant_name,
                            u2.email as assistant_email,
                            d.name as discipline_name,
                            d.description as discipline_description
                        FROM public.courses c
                        LEFT JOIN public.users u1 ON c.instructor_id = u1.user_id
                        LEFT JOIN public.users u2 ON c.assistant_id = u2.user_id
                        LEFT JOIN public.disciplines d ON c.discipline_id = d.discipline_id
                        WHERE c.status = %s
                        ORDER BY c.start_date DESC
                    """
                    cursor.execute(query, (status,))
                else:
                    query = """
                        SELECT 
                            c.course_id, c.discipline_id, c.title, c.semester,
                            c.instructor_id, c.assistant_id, c.start_date, c.end_date,
                            c.schedule_json, c.max_students, c.current_students,
                            c.status, c.classroom, c.created_at,
                            CONCAT(u1.first_name, ' ', u1.last_name) as instructor_name,
                            u1.email as instructor_email,
                            CONCAT(u2.first_name, ' ', u2.last_name) as assistant_name,
                            u2.email as assistant_email,
                            d.name as discipline_name,
                            d.description as discipline_description
                        FROM public.courses c
                        LEFT JOIN public.users u1 ON c.instructor_id = u1.user_id
                        LEFT JOIN public.users u2 ON c.assistant_id = u2.user_id
                        LEFT JOIN public.disciplines d ON c.discipline_id = d.discipline_id
                        ORDER BY c.start_date DESC
                    """
                    cursor.execute(query)
                
                results = cursor.fetchall()
                
                courses = []
                for row in results:
                    # Парсим schedule_json если он есть
                    schedule_json = None
                    if row[8]:
                        try:
                            schedule_json = json.loads(row[8])
                        except:
                            schedule_json = row[8]
                    
                    # Формируем имя преподавателя (может быть NULL если first_name или last_name пустые)
                    instructor_name = row[13]
                    if not instructor_name or instructor_name == ' ':
                        instructor_name = row[14]  # email, если имя не указано
                    
                    assistant_name = row[15]
                    if not assistant_name or assistant_name == ' ':
                        assistant_name = row[16]  # email, если имя не указано
                    
                    courses.append({
                        'course_id': str(row[0]),
                        'discipline_id': str(row[1]) if row[1] else None,
                        'title': row[2],
                        'semester': row[3],
                        'instructor_id': str(row[4]) if row[4] else None,
                        'assistant_id': str(row[5]) if row[5] else None,
                        'start_date': row[6].isoformat() if row[6] else None,
                        'end_date': row[7].isoformat() if row[7] else None,
                        'schedule_json': schedule_json,
                        'max_students': row[9],
                        'current_students': row[10],
                        'status': row[11],
                        'classroom': row[12],
                        'created_at': row[13].isoformat() if row[13] else None,
                        'instructor_name': instructor_name,
                        'instructor_email': row[14],
                        'assistant_name': assistant_name,
                        'assistant_email': row[16],
                        'discipline_name': row[17],  # Название дисциплины
                        'description': row[18]  # Описание из дисциплины
                    })
                
                return courses
                
        except Exception as e:
            logger.error(f"Ошибка при получении всех курсов: {e}")
            return []
        finally:
            if connection:
                connection.close()

    def get_courses_for_instructor(self, instructor_id: str, status: Optional[str] = None) -> List[dict]:
        """
        Получить курсы для преподавателя.
        
        Args:
            instructor_id: UUID преподавателя
            status: Фильтр по статусу
        
        Returns:
            List[dict]: Список курсов преподавателя
        """
        connection = self.create_connection_db()
        if not connection:
            return []
        
        try:
            # Проверяем формат UUID
            try:
                uuid.UUID(instructor_id)
            except ValueError:
                logger.error(f"Неверный формат UUID для instructor_id: {instructor_id}")
                return []
            
            with connection.cursor() as cursor:
                if status:
                    query = """
                        SELECT 
                            c.course_id, c.discipline_id, c.title, c.semester,
                            c.instructor_id, c.assistant_id, c.start_date, c.end_date,
                            c.schedule_json, c.max_students, c.current_students,
                            c.status, c.classroom, c.created_at,
                            CONCAT(u1.first_name, ' ', u1.last_name) as instructor_name,
                            u1.email as instructor_email,
                            CONCAT(u2.first_name, ' ', u2.last_name) as assistant_name,
                            u2.email as assistant_email,
                            d.name as discipline_name,
                            d.description as discipline_description
                        FROM public.courses c
                        LEFT JOIN public.users u1 ON c.instructor_id = u1.user_id
                        LEFT JOIN public.users u2 ON c.assistant_id = u2.user_id
                        LEFT JOIN public.disciplines d ON c.discipline_id = d.discipline_id
                        WHERE (c.instructor_id = %s OR c.assistant_id = %s)
                            AND c.status = %s
                        ORDER BY c.start_date DESC
                    """
                    cursor.execute(query, (instructor_id, instructor_id, status))
                else:
                    query = """
                        SELECT 
                            c.course_id, c.discipline_id, c.title, c.semester,
                            c.instructor_id, c.assistant_id, c.start_date, c.end_date,
                            c.schedule_json, c.max_students, c.current_students,
                            c.status, c.classroom, c.created_at,
                            CONCAT(u1.first_name, ' ', u1.last_name) as instructor_name,
                            u1.email as instructor_email,
                            CONCAT(u2.first_name, ' ', u2.last_name) as assistant_name,
                            u2.email as assistant_email,
                            d.name as discipline_name,
                            d.description as discipline_description
                        FROM public.courses c
                        LEFT JOIN public.users u1 ON c.instructor_id = u1.user_id
                        LEFT JOIN public.users u2 ON c.assistant_id = u2.user_id
                        LEFT JOIN public.disciplines d ON c.discipline_id = d.discipline_id
                        WHERE c.instructor_id = %s OR c.assistant_id = %s
                        ORDER BY c.start_date DESC
                    """
                    cursor.execute(query, (instructor_id, instructor_id))
                
                results = cursor.fetchall()
                
                courses = []
                for row in results:
                    schedule_json = None
                    if row[8]:
                        try:
                            schedule_json = json.loads(row[8])
                        except:
                            schedule_json = row[8]
                    
                    instructor_name = row[13]
                    if not instructor_name or instructor_name == ' ':
                        instructor_name = row[14]
                    
                    assistant_name = row[15]
                    if not assistant_name or assistant_name == ' ':
                        assistant_name = row[16]
                    
                    courses.append({
                        'course_id': str(row[0]),
                        'discipline_id': str(row[1]) if row[1] else None,
                        'title': row[2],
                        'semester': row[3],
                        'instructor_id': str(row[4]) if row[4] else None,
                        'assistant_id': str(row[5]) if row[5] else None,
                        'start_date': row[6].isoformat() if row[6] else None,
                        'end_date': row[7].isoformat() if row[7] else None,
                        'schedule_json': schedule_json,
                        'max_students': row[9],
                        'current_students': row[10],
                        'status': row[11],
                        'classroom': row[12],
                        'created_at': row[13].isoformat() if row[13] else None,
                        'instructor_name': instructor_name,
                        'instructor_email': row[14],
                        'assistant_name': assistant_name,
                        'assistant_email': row[16],
                        'discipline_name': row[17],
                        'description': row[18]  # Описание из дисциплины
                    })
                
                return courses
                
        except Exception as e:
            logger.error(f"Ошибка при получении курсов для преподавателя: {e}")
            return []
        finally:
            if connection:
                connection.close()

    def get_courses_for_student(self, student_id: str, status: Optional[str] = None) -> List[dict]:
        """
        Получить курсы для студента (курсы, на которые он записан).
        
        Args:
            student_id: UUID студента
            status: Фильтр по статусу курса
        
        Returns:
            List[dict]: Список курсов студента
        """
        connection = self.create_connection_db()
        if not connection:
            return []
        
        try:
            # Проверяем формат UUID
            try:
                uuid.UUID(student_id)
            except ValueError:
                logger.error(f"Неверный формат UUID для student_id: {student_id}")
                return []
            
            with connection.cursor() as cursor:
                base_query = """
                    SELECT 
                        c.course_id, c.discipline_id, c.title, c.semester,
                        c.instructor_id, c.assistant_id, c.start_date, c.end_date,
                        c.schedule_json, c.max_students, c.current_students,
                        c.status, c.classroom, c.created_at,
                        CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
                        u.email as instructor_email,
                        d.name as discipline_name,
                        d.description as discipline_description,
                        sc.enrollment_date, sc.enrollment_type, sc.status as student_status,
                        sc.final_grade, sc.completion_date
                    FROM public.courses c
                    JOIN public.student_courses sc ON c.course_id = sc.course_id
                    LEFT JOIN public.users u ON c.instructor_id = u.user_id
                    LEFT JOIN public.disciplines d ON c.discipline_id = d.discipline_id
                    WHERE sc.student_id = %s
                """
                
                params = [student_id]
                
                # Добавляем фильтр по статусу курса
                if status:
                    base_query += " AND c.status = %s"
                    params.append(status)
                
                # Добавляем сортировку
                base_query += " ORDER BY c.start_date DESC, c.title"
                
                cursor.execute(base_query, params)
                results = cursor.fetchall()
                
                courses = []
                for row in results:
                    schedule_json = None
                    if row[8]:  # schedule_json
                        try:
                            schedule_json = json.loads(row[8])
                        except:
                            schedule_json = row[8]
                    
                    instructor_name = row[13]
                    if not instructor_name or instructor_name == ' ':
                        instructor_name = row[14]  # email, если имя не указано
                    
                    # Рассчитываем прогресс студента по курсу
                    progress = 0
                    if row[20]:  # completion_date
                        progress = 100
                    
                    courses.append({
                        'course_id': str(row[0]),
                        'discipline_id': str(row[1]) if row[1] else None,
                        'title': row[2],
                        'semester': row[3],
                        'instructor_id': str(row[4]) if row[4] else None,
                        'assistant_id': str(row[5]) if row[5] else None,
                        'start_date': row[6].isoformat() if row[6] else None,
                        'end_date': row[7].isoformat() if row[7] else None,
                        'schedule_json': schedule_json,
                        'max_students': row[9],
                        'current_students': row[10],
                        'status': row[11],  # статус курса
                        'classroom': row[12],
                        'created_at': row[13].isoformat() if row[13] else None,
                        'instructor_name': instructor_name,
                        'instructor_email': row[14],
                        'discipline_name': row[15],
                        'description': row[16],  # Описание из дисциплины
                        # Информация о записи студента
                        'enrollment_date': row[17].isoformat() if row[17] else None,
                        'enrollment_type': row[18],
                        'student_status': row[19],  # статус студента в курсе
                        'final_grade': float(row[20]) if row[20] else None,
                        'completion_date': row[21].isoformat() if row[21] else None,
                        'progress': progress
                    })
                
                return courses
                
        except Exception as e:
            logger.error(f"Ошибка при получении курсов для студента: {e}")
            return []
        finally:
            if connection:
                connection.close()

    def get_materials_by_course_id(self, course_id: str) -> List[dict]:
        """
        Получить учебные материалы по ID курса.
        
        Args:
            course_id: UUID курса
        
        Returns:
            List[dict]: Список материалов курса
        """
        connection = self.create_connection_db()
        if not connection:
            return []
        
        try:
            with connection.cursor() as cursor:
                query = """
                    SELECT 
                        material_id, course_id, title, description, material_type,
                        content_text, file_path, file_size, file_type,
                        original_filename, uploader_id, version,
                        is_public, access_level, tags, difficulty,
                        estimated_duration, is_active, created_at
                    FROM public.learning_materials 
                    WHERE course_id = %s 
                        AND is_active = TRUE
                    ORDER BY created_at DESC
                """
                
                cursor.execute(query, (course_id,))
                results = cursor.fetchall()
                
                materials = []
                for row in results:
                    tags = None
                    if row[14]:  # tags field
                        try:
                            tags = json.loads(row[14])
                        except:
                            tags = row[14]
                    
                    materials.append({
                        'material_id': str(row[0]),
                        'course_id': str(row[1]),
                        'title': row[2],
                        'description': row[3],
                        'material_type': row[4],
                        'content_text': row[5],
                        'file_path': row[6],
                        'file_size': row[7],
                        'file_type': row[8],
                        'original_filename': row[9],
                        'uploader_id': str(row[10]),
                        'version': row[11],
                        'is_public': row[12],
                        'access_level': row[13],
                        'tags': tags,
                        'difficulty': row[15],
                        'estimated_duration': row[16],
                        'is_active': row[17],
                        'created_at': row[18].isoformat() if row[18] else None
                    })
                
                return materials
                
        except Exception as e:
            logger.error(f"Ошибка при получении материалов курса: {e}")
            return []
        finally:
            if connection:
                connection.close()

    def get_students_by_course_id(self, course_id: str) -> List[dict]:
        """
        Получить список студентов по ID курса.
        
        Args:
            course_id: UUID курса
        
        Returns:
            List[dict]: Список студентов курса
        """
        connection = self.create_connection_db()
        if not connection:
            return []
        
        try:
            with connection.cursor() as cursor:
                query = """
                    SELECT 
                        u.user_id, u.email, 
                        CONCAT(u.first_name, ' ', u.last_name) as name,
                        u.role, u.phone, u.is_active, 
                        sc.enrollment_date, sc.enrollment_type, sc.status,
                        sc.final_grade, sc.completion_date
                    FROM public.student_courses sc
                    JOIN public.users u ON sc.student_id = u.user_id
                    WHERE sc.course_id = %s
                        AND u.role = 'student'
                    ORDER BY u.last_name, u.first_name, sc.enrollment_date
                """
                
                cursor.execute(query, (course_id,))
                results = cursor.fetchall()
                
                students = []
                for row in results:
                    name = row[2]
                    if not name or name == ' ':
                        name = row[1]  # email, если имя не указано
                    
                    students.append({
                        'user_id': str(row[0]),
                        'email': row[1],
                        'name': name,
                        'role': row[3],
                        'phone': row[4],
                        'is_active': row[5],
                        'enrollment_date': row[6].isoformat() if row[6] else None,
                        'enrollment_type': row[7],
                        'status': row[8],  # статус в курсе (active, completed, dropped, expelled)
                        'final_grade': float(row[9]) if row[9] else None,
                        'completion_date': row[10].isoformat() if row[10] else None
                    })
                
                return students
                
        except Exception as e:
            logger.error(f"Ошибка при получении студентов курса: {e}")
            return []
        finally:
            if connection:
                connection.close()

    def get_students(self, active_only: bool = True) -> List[dict]:
        """
        Получить список всех студентов.
        
        Args:
            active_only: Если True, возвращать только активных студентов
        
        Returns:
            List[dict]: Список студентов
        """
        connection = self.create_connection_db()
        if not connection:
            return []
        
        try:
            with connection.cursor() as cursor:
                if active_only:
                    query = """
                        SELECT 
                            user_id, email, 
                            CONCAT(first_name, ' ', last_name) as full_name,
                            role, phone, avatar_url, is_active, created_at,
                            last_login, last_activity
                        FROM public.users 
                        WHERE role = 'student' AND is_active = TRUE
                        ORDER BY last_name, first_name, email
                    """
                else:
                    query = """
                        SELECT 
                            user_id, email, 
                            CONCAT(first_name, ' ', last_name) as full_name,
                            role, phone, avatar_url, is_active, created_at,
                            last_login, last_activity
                        FROM public.users 
                        WHERE role = 'student'
                        ORDER BY last_name, first_name, email
                    """
                
                cursor.execute(query)
                results = cursor.fetchall()
                
                students = []
                for row in results:
                    full_name = row[2]
                    if not full_name or full_name == ' ':
                        full_name = row[1]  # email, если имя не указано
                    
                    students.append({
                        'user_id': str(row[0]),
                        'email': row[1],
                        'full_name': full_name,
                        'name': full_name,  # для совместимости с фронтендом
                        'role': row[3],
                        'phone': row[4],
                        'avatar_url': row[5],
                        'is_active': row[6],
                        'created_at': row[7].isoformat() if row[7] else None,
                        'last_login': row[8].isoformat() if row[8] else None,
                        'last_activity': row[9].isoformat() if row[9] else None
                    })
                
                return students
        except Exception as e:
            logger.error(f"Ошибка при получении списка студентов: {e}")
            return []
        finally:
            if connection:
                connection.close()

    def enroll_student_to_course(self, course_id: str, student_id: str, 
                            enrollment_type: str = 'regular', status: str = 'active') -> bool:
        """
        Записать студента на курс.
        
        Args:
            course_id: UUID курса
            student_id: UUID студента
            enrollment_type: Тип записи ('regular', 'auditor', 'retake')
            status: Статус записи ('active', 'completed', 'dropped', 'expelled')
        
        Returns:
            bool: True если успешно, False в противном случае
        """
        connection = self.create_connection_db()
        if not connection:
            return False
        
        try:
            # Проверяем UUID
            try:
                uuid.UUID(course_id)
                uuid.UUID(student_id)
            except ValueError as e:
                logger.error(f"Неверный формат UUID: {e}")
                return False
            
            with connection.cursor() as cursor:
                # Проверяем существование курса
                course = self.get_course_by_id(course_id)
                if not course:
                    logger.error(f"Курс с ID {course_id} не найден")
                    return False
                
                # Проверяем существование студента
                student = self.get_user_by_id(student_id)
                if not student or student.get('role') != 'student':
                    logger.error(f"Студент с ID {student_id} не найден")
                    return False
                
                # Проверяем, не записан ли уже студент на курс
                check_query = """
                    SELECT 1 FROM public.student_courses 
                    WHERE course_id = %s AND student_id = %s
                """
                cursor.execute(check_query, (course_id, student_id))
                if cursor.fetchone():
                    logger.error(f"Студент {student_id} уже записан на курс {course_id}")
                    return False
                
                # Проверяем enrollment_type
                valid_enrollment_types = ['regular', 'auditor', 'retake']
                if enrollment_type not in valid_enrollment_types:
                    logger.error(f"Неверный enrollment_type: {enrollment_type}")
                    return False
                
                # Проверяем status
                valid_statuses = ['active', 'completed', 'dropped', 'expelled']
                if status not in valid_statuses:
                    logger.error(f"Неверный статус: {status}")
                    return False
                
                # Записываем студента на курс
                insert_query = """
                    INSERT INTO public.student_courses 
                    (course_id, student_id, enrollment_type, status, enrollment_date)
                    VALUES (%s, %s, %s, %s, CURRENT_DATE)
                """
                
                cursor.execute(insert_query, (course_id, student_id, enrollment_type, status))
                
                # Обновляем счетчик студентов на курсе
                update_query = """
                    UPDATE public.courses 
                    SET current_students = (
                        SELECT COUNT(*) 
                        FROM public.student_courses 
                        WHERE course_id = %s AND status = 'active'
                    )
                    WHERE course_id = %s
                """
                cursor.execute(update_query, (course_id, course_id))
                
                connection.commit()
                logger.info(f"Студент {student_id} успешно записан на курс {course_id}")
                return True
                
        except Exception as e:
            logger.error(f"Ошибка при записи студента на курс: {e}")
            if connection:
                connection.rollback()
            return False
        finally:
            if connection:
                connection.close()

    # Авторизация

    def check_auth(self, email, password):
        """Проверка авторизации пользователя"""
        connection = self.create_connection_db()
        try:
            with connection.cursor() as cursor:
                # Получаем хеш пароля из БД
                cursor.execute(
                    """
                    SELECT user_id, password_hash, email, role, is_active 
                    FROM users 
                    WHERE email = %s;
                    """,
                    (email,)
                )
                
                result = cursor.fetchone()
                
                if not result:
                    print(f"Пользователь с email {email} не найден")
                    return None
                
                user_id, stored_hash, email_db, role, is_active = result
                
                # Проверяем активность
                if not is_active:
                    print(f"Аккаунт {email} не активен")
                    return None
                
                # Проверяем пароль с помощью bcrypt
                if not bcrypt.checkpw(password.encode(), stored_hash.encode()):
                    print(f"Неверный пароль для {email}")
                    return None
                
                # Обновляем время последнего входа (используем user_id, а не id)
                cursor.execute(
                    """
                    UPDATE users 
                    SET last_login = CURRENT_TIMESTAMP, 
                        last_activity = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = %s;
                    """,
                    (user_id,)
                )
                connection.commit()
                
                print(f"Успешная авторизация: {email}, user_id: {user_id}")
                return {
                    "id": user_id,
                    "email": email_db,
                    "role": role,
                    "is_active": is_active
                }
                
        except Exception as e:
            print(f"Ошибка при проверке авторизации: {e}")
            import traceback
            traceback.print_exc()
            if connection:
                connection.rollback()
            return None
        finally:
            if connection:
                connection.close()

    def hash_password_bcrypt(self, password):
        """Хеширование пароля с использованием bcrypt"""
        # Генерируем соль и хешируем пароль
        salt = bcrypt.gensalt()
        password_hash = bcrypt.hashpw(password.encode(), salt)
        
        return password_hash.decode()  # Возвращаем только хеш (в нем уже содержится соль)

    def verify_password_bcrypt(self, password, stored_hash):
        """Проверка пароля с использованием bcrypt"""
        try:
            return bcrypt.checkpw(password.encode(), stored_hash.encode())
        except Exception as e:
            print(f"Ошибка проверки пароля: {e}")
            return False      

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
    
    def add_dialog_history(
        self,
        dialog_id: str,  # ИЗМЕНЕНО: должен быть UUID в виде строки
        student_id: str,  # ИЗМЕНЕНО: должен быть UUID в виде строки
        course_id: Optional[str],  # ИЗМЕНЕНО: может быть None и должен быть UUID в виде строки
        session_id: str,  # Остается строкой (UUID)
        question: str,
        answer: str,
        question_vector_id: Optional[str] = None,  # ДОБАВЛЕНО: может быть None
        answer_vector_id: Optional[str] = None,    # ДОБАВЛЕНО: может быть None
        used_chunk_ids: Optional[List[str]] = None,  # ИЗМЕНЕНО: может быть None
        response_time_ms: Optional[int] = None,
        rating: Optional[int] = None,
        feedback_text: Optional[str] = None,
        context_used: Optional[str] = None,
        model_used: Optional[str] = None,
        tokens_used: Optional[int] = None,
        cost_estimated: Optional[float] = None,
        is_successful: bool = True,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
) -> bool:
    
        """Добавить диалог вопрос-ответ"""
        connection = self.create_connection_db()
        if not connection:
            return False
        
        try:
            with connection.cursor() as cursor:
                created_at_value = datetime.now()
                
                # Проверяем и преобразуем UUID
                try:
                    # Преобразуем строки в UUID объекты для проверки
                    if dialog_id:
                        dialog_uuid = uuid.UUID(dialog_id)
                    if student_id:
                        student_uuid = uuid.UUID(student_id)
                    if course_id:
                        course_uuid = uuid.UUID(course_id)
                    if session_id:
                        session_uuid = uuid.UUID(session_id)
                except ValueError as e:
                    logger.error(f"Неверный формат UUID: {e}")
                    return False
                
                # Преобразуем used_chunk_ids в JSON
                used_chunk_ids_json = None
                if used_chunk_ids and isinstance(used_chunk_ids, list):
                    used_chunk_ids_json = json.dumps(used_chunk_ids)
                
                # Валидация IP-адреса
                valid_ip_address = None
                if ip_address:
                    # Преобразуем 'localhost' в '127.0.0.1'
                    if ip_address.lower() == 'localhost':
                        valid_ip_address = '127.0.0.1'
                    # Проверяем, похож ли на IP-адрес
                    elif self._is_valid_ip(ip_address):
                        valid_ip_address = ip_address
                    else:
                        logger.warning(f"Некорректный IP-адрес: {ip_address}. Установлен NULL.")
                        valid_ip_address = None
                
                query = """
                    INSERT INTO public.dialog_history (
                        dialog_id, student_id, course_id, session_id,
                        question, answer, question_vector_id, answer_vector_id,
                        used_chunk_ids, response_time_ms, rating, feedback_text,
                        context_used, model_used, tokens_used, cost_estimated,
                        is_successful, user_agent, ip_address, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING dialog_id
                """

                params = (
                    dialog_id, student_id, course_id, session_id,
                    question, answer, question_vector_id, answer_vector_id,
                    used_chunk_ids_json,  # JSON строка вместо списка
                    response_time_ms, rating, feedback_text,
                    context_used, model_used, tokens_used, cost_estimated,
                    is_successful, user_agent, ip_address, created_at_value
                )
                
                cursor.execute(query, params)
                inserted_id = cursor.fetchone()[0]
                logger.info(f"Диалог добавлен с dialog_id: {inserted_id}")
                connection.commit()
                return True
                
        except Exception as e:
            logger.error(f"Ошибка PostgreSQL при записи диалога: {e}")
            logger.error(f"Параметры: dialog_id={dialog_id}, student_id={student_id}, session_id={session_id}")
            connection.rollback()
            return False
        finally:
            connection.close()
        
    def _is_valid_ip(self, ip_address: str) -> bool:
        """Проверка валидности IP-адреса"""
        import re
        # Простая проверка IPv4
        ipv4_pattern = r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$'
        if re.match(ipv4_pattern, ip_address):
            parts = ip_address.split('.')
            if all(0 <= int(part) <= 255 for part in parts):
                return True
        return False

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
                student_id_str = str(student_id)

                # Группируем по session_id для получения "бесед"
                cursor.execute("""
                    SELECT 
                        session_id::text as id,
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
                """, (student_id_str, limit))
                
                # Получаем названия колонок
                column_names = [desc[0] for desc in cursor.description]
                
                # Преобразуем результаты
                conversations = []
                for row in cursor.fetchall():
                    row_dict = dict(zip(column_names, row))
                    
                    # Преобразуем UUID в строку
                    session_id = row_dict.get('id')
                    if session_id:
                        session_id = str(session_id)
                    
                    # Создаем заголовок из первых слов вопроса
                    questions_text = row_dict.get('questions_text', '')
                    if questions_text:
                        # Берем первые 3 слова для заголовка
                        words = questions_text.split()[:3]
                        title = ' '.join(words)
                        if len(questions_text.split()) > 3:
                            title += '...'
                    else:
                        title = f"Диалог {session_id[:8] if session_id else ''}"
                    
                    # Создаем последнее сообщение
                    last_question = row_dict.get('last_question', '')
                    last_answer = row_dict.get('last_answer', '')
                    
                    if last_answer:
                        last_message = f"В: {last_question[:50]}... | О: {last_answer[:50]}..."
                    else:
                        last_message = f"В: {last_question[:100]}..."
                    
                    conversation = {
                        "id": session_id,  # Используем преобразованный UUID
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
            import traceback
            traceback.print_exc()  # Для детальной информации об ошибке
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
                student_id_str = str(student_id) if student_id else None
                
                # Всегда используем session_id::text для сравнения UUID как строк
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
                    WHERE session_id::text = %s
                """
                params = [session_id]
                
                if student_id_str:
                    query += " AND student_id = %s"
                    params.append(student_id_str)
                
                query += " ORDER BY created_at ASC"
                
                print(f"DEBUG: Выполняем запрос: {query}")
                print(f"DEBUG: Параметры: session_id={session_id}, student_id={student_id_str}")
                
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
                        "created_at": row_dict.get('created_at')
                    }
                    
                    messages.append(message)
                
                print(f"DEBUG: Найдено сообщений: {len(messages)}")
                return messages
                
        except Exception as e:
            print(f"Ошибка при получении сообщений сессии: {e}")
            import traceback
            traceback.print_exc()  # Для детальной информации об ошибке
            return []
        finally:
            connection.close()

    def get_user_by_email(self, email: str):
        """Получение пользователя по email"""
        connection = self.create_connection_db()
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT 
                        user_id, email, role, first_name, last_name, 
                        phone, avatar_url, is_active, created_at, 
                        updated_at, last_login, last_activity
                    FROM users 
                    WHERE email = %s AND is_active = true;
                    """,
                    (email,)
                )
                
                user_data = cursor.fetchone()
                
                if not user_data:
                    return None
                
                user_dict = {
                    "id": str(user_data[0]),
                    "email": user_data[1],
                    "role": user_data[2],
                    "first_name": user_data[3],
                    "last_name": user_data[4],
                    "phone": user_data[5],
                    "avatar_url": user_data[6],
                    "is_active": user_data[7],
                    "created_at": user_data[8],
                    "updated_at": user_data[9],
                    "last_login": user_data[10],
                    "last_activity": user_data[11]
                }
                
                return user_dict
                
        except Exception as e:
            print(f"Ошибка при получении пользователя по email {email}: {e}")
            return None
        finally:
            if connection:
                connection.close()

    def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """
        Получить пользователя по ID.
        
        Args:
            user_id: UUID пользователя в виде строки
        
        Returns:
            dict: Данные пользователя или None если не найден
        """
        connection = self.create_connection_db()
        if not connection:
            return None
        
        try:
            # Проверяем формат UUID
            try:
                uuid.UUID(user_id)
            except ValueError:
                logger.error(f"Неверный формат UUID для user_id: {user_id}")
                return None
            
            with connection.cursor() as cursor:
                query = """
                    SELECT 
                        user_id, email, role, first_name, last_name, 
                        phone, avatar_url, is_active, created_at
                    FROM public.users 
                    WHERE user_id = %s
                """
                
                cursor.execute(query, (user_id,))
                result = cursor.fetchone()
                
                if result:
                    full_name = None
                    if result[3] or result[4]:  # first_name или last_name
                        full_name = f"{result[3] or ''} {result[4] or ''}".strip()
                    
                    return {
                        'user_id': str(result[0]),
                        'email': result[1],
                        'role': result[2],
                        'first_name': result[3],
                        'last_name': result[4],
                        'full_name': full_name,
                        'phone': result[5],
                        'avatar_url': result[6],
                        'is_active': result[7],
                        'created_at': result[8].isoformat() if result[8] else None
                    }
                return None
        except Exception as e:
            logger.error(f"Ошибка при получении пользователя: {e}")
            return None
        finally:
            if connection:
                connection.close()

    def update_user_last_activity(self, user_id: str):
        """Обновление времени последней активности пользователя"""
        connection = self.create_connection_db()
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE users 
                    SET last_activity = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = %s::uuid;
                    """,
                    (user_id,)
                )
                connection.commit()
                return True
                
        except Exception as e:
            print(f"Ошибка при обновлении last_activity для пользователя {user_id}: {e}")
            if connection:
                connection.rollback()
            return False
        finally:
            if connection:
                connection.close()

    def update_user_last_login(self, user_id: str):
        """Обновление времени последнего входа пользователя"""
        connection = self.create_connection_db()
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE users 
                    SET last_login = CURRENT_TIMESTAMP,
                        last_activity = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = %s::uuid;
                    """,
                    (user_id,)
                )
                connection.commit()
                return True
                
        except Exception as e:
            print(f"Ошибка при обновлении last_login для пользователя {user_id}: {e}")
            if connection:
                connection.rollback()
            return False
        finally:
            if connection:
                connection.close()

    def get_all_active_users(self):
        """Получение всех активных пользователей"""
        connection = self.create_connection_db()
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT 
                        user_id, email, role, first_name, last_name, 
                        is_active, created_at, last_login
                    FROM users 
                    WHERE is_active = true
                    ORDER BY created_at DESC;
                    """
                )
                
                users = cursor.fetchall()
                
                result = []
                for user in users:
                    result.append({
                        "id": str(user[0]),
                        "email": user[1],
                        "role": user[2],
                        "first_name": user[3],
                        "last_name": user[4],
                        "is_active": user[5],
                        "created_at": user[6],
                        "last_login": user[7]
                    })
                
                return result
                
        except Exception as e:
            print(f"Ошибка при получении всех пользователей: {e}")
            return []
        finally:
            if connection:
                connection.close()