import time
import pandas as pd
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer
from qdrant_client.models import PointStruct
from qdrant_client.http import models
import hashlib

class InstituteFAQLoader:
    def __init__(self):
        self.collection_name = "institute_faq_v2"  # Можно изменить на нужное имя
        # Используем ту же модель, что и в основном скрипте
        self.model = SentenceTransformer('intfloat/multilingual-e5-large')
        self.vector_size = 1024  # Размерность для multilingual-e5-large
        self.client = QdrantClient(host="localhost", port=6333)  # Ваш порт 6333
    
    def create_collection(self):
        """Создание коллекции FAQ"""
        try:
            # Пытаемся удалить существующую коллекцию
            self.client.delete_collection(collection_name=self.collection_name)
            print(f"🗑️ Коллекция '{self.collection_name}' удалена")
            time.sleep(1)
        except Exception as e:
            print(f"ℹ️ Коллекция не существовала или ошибка: {e}")
        
        # Создаем новую коллекцию с правильной размерностью
        self.client.create_collection(
            collection_name=self.collection_name,
            vectors_config=models.VectorParams(
                size=self.vector_size,  # 1536 для multilingual-e5-large
                distance=models.Distance.COSINE
            )
        )
        print(f"✅ Коллекция '{self.collection_name}' создана (размерность: {self.vector_size})")
    
    def _get_chunk_id(self, text: str) -> int:
        """Генерация ID чанка из текста"""
        hash_obj = hashlib.md5(text.encode())
        hex_dig = hash_obj.hexdigest()
        return int(hex_dig[:8], 16)
    
    def _get_material_id(self, category: str) -> str:
        """Генерация ID материала"""
        hash_obj = hashlib.md5(category.encode())
        hex_dig = hash_obj.hexdigest()
        return f"{hex_dig[:8]}-{hex_dig[8:12]}-{hex_dig[12:16]}-{hex_dig[16:20]}-{hex_dig[20:]}"
    
    def add_from_console(self):
        """Добавление FAQ через консоль"""
        print("\n" + "="*60)
        print("📝 ДОБАВЛЕНИЕ FAQ ПО ИНСТИТУТУ")
        print("="*60)
        print("Введите 'стоп' в любом поле для выхода")
        print("-"*60)
        
        faqs = []
        
        while True:
            print(f"\n❓ Вопрос #{len(faqs) + 1}:")
            
            # Ввод вопроса
            question = input("Вопрос: ").strip()
            if question.lower() == 'стоп':
                break
            
            # Ввод ответа
            answer = input("Ответ: ").strip()
            if answer.lower() == 'стоп':
                break
            
            # Ввод категории
            print("\n📂 Категории:")
            print("1. schedule - Расписание")
            print("2. contacts - Контакты")
            print("3. locations - Локации")
            print("4. admission - Поступление")
            print("5. study - Учеба")
            print("6. general - Общие")
            
            category_choice = input("Выберите категорию (1-6) [6]: ").strip() or "6"
            
            category_map = {
                "1": "schedule",
                "2": "contacts", 
                "3": "locations",
                "4": "admission",
                "5": "study",
                "6": "general"
            }
            
            category = category_map.get(category_choice, "general")
            category_ru = {
                "schedule": "расписание",
                "contacts": "контакты",
                "locations": "локации", 
                "admission": "поступление",
                "study": "учеба",
                "general": "общие"
            }[category]
            
            if question and answer:
                faqs.append({
                    'question': question,
                    'answer': answer,
                    'category': category,
                    'category_ru': category_ru
                })
                print(f"✅ Сохранено: '{question[:50]}...' ({category_ru})")
            else:
                print("❌ Вопрос и ответ не могут быть пустыми")
        
        if faqs:
            self._load_to_qdrant(faqs)
    
    def add_from_excel(self, filename="institute_faq.xlsx"):
        """Добавление FAQ из Excel файла"""
        try:
            print(f"\n📂 Загрузка FAQ из файла: {filename}")
            
            df = pd.read_excel(filename)
            
            # Проверяем обязательные поля
            required = ['question', 'answer']
            for field in required:
                if field not in df.columns:
                    raise ValueError(f"Отсутствует колонка: {field}")
            
            # Проверяем категорию
            if 'category' not in df.columns:
                print("⚠️ Колонка 'category' не найдена, используем 'general'")
                df['category'] = 'general'
            
            # Добавляем русские названия категорий
            category_translation = {
                'schedule': 'расписание',
                'contacts': 'контакты', 
                'locations': 'локации',
                'admission': 'поступление',
                'study': 'учеба',
                'general': 'общие'
            }
            
            df['category_ru'] = df['category'].map(
                lambda x: category_translation.get(x, 'общие')
            )
            
            # Конвертируем в список
            faqs = df.to_dict('records')
            
            # Загружаем в Qdrant
            self._load_to_qdrant(faqs)
            
        except FileNotFoundError:
            print(f"❌ Файл {filename} не найден")
            self._show_excel_template()
        except Exception as e:
            print(f"❌ Ошибка: {e}")
    
    def _load_to_qdrant(self, faqs):
        """Загрузка FAQ в Qdrant"""
        if not faqs:
            print("❌ Нет данных для загрузки")
            return
        
        points = []
        
        print(f"\n🚀 Загрузка {len(faqs)} FAQ в Qdrant...")
        
        # Получаем текущее количество точек
        try:
            existing_count = self.client.count(
                collection_name=self.collection_name,
                exact=True
            ).count
            start_id = existing_count + 1
        except:
            start_id = 1
        
        for idx, faq in enumerate(faqs):
            # Создаем текстовое поле для эмбеддинга
            text = f"{faq['question']} {faq['answer']}"
            
            # Генерируем вектор с помощью модели
            # Для E5 моделей нужно добавлять префикс "query: " или "passage: "
            passage_text = f"passage: {text}"
            vector = self.model.encode(passage_text).tolist()
            
            # Проверяем размерность
            if len(vector) != self.vector_size:
                print(f"⚠️ Размерность вектора {len(vector)} ≠ {self.vector_size}")
                # При необходимости дополняем или обрезаем
                if len(vector) > self.vector_size:
                    vector = vector[:self.vector_size]
                else:
                    vector = vector + [0] * (self.vector_size - len(vector))
            
            # Генерируем ID
            chunk_id = self._get_chunk_id(text)
            material_id = self._get_material_id(faq.get('category', 'general'))
            
            # Создаем payload
            payload = {
                'text': text,
                'question': faq['question'],
                'answer': faq['answer'],
                'category': faq.get('category', 'general'),
                'category_ru': faq.get('category_ru', 'общие'),
                
                # Совместимость с вашей основной системой
                'content_type': 'faq',
                'chunk_id': chunk_id,
                'chunk_index': idx,
                'material_id': material_id,
                'course_id': 'institute_general',
                'course_title': 'Общая информация института',
                'discipline_name': 'Общие вопросы',
                'discipline_id': 'institute_faq',
                'difficulty': 'beginner',
                'total_chunks': len(faqs),
                'upload_timestamp': int(time.time())
            }
            
            # Создаем точку
            points.append(PointStruct(
                id=start_id + idx,
                vector=vector,
                payload=payload
            ))
            
            # Прогресс
            if (idx + 1) % 10 == 0 or (idx + 1) == len(faqs):
                print(f"  Подготовлено: {idx + 1}/{len(faqs)}")
        
        # Загружаем в Qdrant
        try:
            self.client.upsert(
                collection_name=self.collection_name,
                points=points,
                wait=True
            )
            
            print(f"\n✅ Успешно загружено {len(points)} FAQ!")
            
            # Показываем статистику
            self._show_statistics(faqs)
            
        except Exception as e:
            print(f"❌ Ошибка загрузки в Qdrant: {e}")
            # Пробуем загрузить по одному
            success_count = 0
            for point in points:
                try:
                    self.client.upsert(
                        collection_name=self.collection_name,
                        points=[point],
                        wait=False
                    )
                    success_count += 1
                except:
                    pass
            print(f"   Частично загружено: {success_count}/{len(points)}")
    
    def _show_statistics(self, faqs):
        """Показать статистику"""
        categories = {}
        for faq in faqs:
            cat = faq.get('category_ru', 'общие')
            categories[cat] = categories.get(cat, 0) + 1
        
        print("\n📊 Статистика:")
        print("-" * 30)
        for category, count in sorted(categories.items()):
            print(f"  {category}: {count} вопросов")
        
        total_chars = sum(len(f"{f['question']} {f['answer']}") for f in faqs)
        avg_length = total_chars / len(faqs) if faqs else 0
        print(f"\n📝 Средняя длина: {avg_length:.0f} символов на FAQ")
    
    def _show_excel_template(self):
        """Показать шаблон Excel файла"""
        print("\n📋 СОЗДАЙТЕ Excel файл 'institute_faq.xlsx':")
        print("\nКолонки файла:")
        print("-" * 50)
        print("question (обязательно) - вопрос")
        print("answer (обязательно) - ответ")
        print("category (опционально) - категория из списка:")
        print("  • schedule - расписание")
        print("  • contacts - контакты")
        print("  • locations - локации")
        print("  • admission - поступление")
        print("  • study - учеба")
        print("  • general - общие (по умолчанию)")
        print("-" * 50)
        
        # Пример данных
        example_data = [
            {
                'question': 'В какое время работает институт?',
                'answer': 'Институт работает с 8:00 до 19:00 по будним дням.',
                'category': 'schedule'
            },
            {
                'question': 'Где находится главный корпус?',
                'answer': 'Главный корпус: ул. Образовательная, д. 1.',
                'category': 'locations'
            },
            {
                'question': 'Телефон приемной комиссии?',
                'answer': '+7 (495) 123-45-67.',
                'category': 'contacts'
            }
        ]
        
        df = pd.DataFrame(example_data)
        df.to_excel("institute_faq_template.xlsx", index=False)
        print(f"\n📁 Пример сохранен в: institute_faq_template.xlsx")
    
    def test_search(self):
        """Тестовый поиск FAQ"""
        print("\n🔍 Тестовый поиск FAQ")
        
        test_queries = [
            "время работы института",
            "адрес где находится",
            "телефон контакты",
            "поступление документы"
        ]
        
        for query in test_queries:
            print(f"\nПоиск: '{query}'")
            
            # Для E5 моделей нужно добавлять префикс "query: "
            query_text = f"query: {query}"
            query_vector = self.model.encode(query_text).tolist()
            
            # Проверяем размерность
            if len(query_vector) != self.vector_size:
                if len(query_vector) > self.vector_size:
                    query_vector = query_vector[:self.vector_size]
                else:
                    query_vector = query_vector + [0] * (self.vector_size - len(query_vector))
            
            try:
                results = self.client.search(
                    collection_name=self.collection_name,
                    query_vector=query_vector,
                    limit=3,
                    score_threshold=0.3  # Порог релевантности
                )
                
                if results:
                    for i, result in enumerate(results, 1):
                        score = result.score
                        question = result.payload.get('question', 'N/A')[:60]
                        answer = result.payload.get('answer', 'N/A')[:80]
                        category = result.payload.get('category_ru', 'N/A')
                        
                        print(f"  {i}. [{category}] {question}...")
                        print(f"     Ответ: {answer}...")
                        print(f"     Сходство: {score:.3f}")
                else:
                    print("  ℹ️ Ничего не найдено")
                    
            except Exception as e:
                print(f"  ❌ Ошибка поиска: {e}")
    
    def show_collection_info(self):
        """Показать информацию о коллекции"""
        try:
            collections = self.client.get_collections().collections
            if self.collection_name in [c.name for c in collections]:
                info = self.client.get_collection(self.collection_name)
                print(f"\n📊 Коллекция '{self.collection_name}':")
                print(f"  Кол-во точек: {info.points_count:,}")
                print(f"  Размерность: {info.config.params.vectors.size}")
                print(f"  Статус: {info.status}")
            else:
                print(f"\nℹ️ Коллекция '{self.collection_name}' не существует")
                print("Доступные коллекции:")
                for col in collections:
                    print(f"  • {col.name}")
        except Exception as e:
            print(f"❌ Ошибка получения информации: {e}")

def main():
    """Главное меню"""
    print("="*60)
    print("🏫 FAQ ЗАГРУЗЧИК ДЛЯ ИНСТИТУТА")
    print("="*60)
    print("Используется модель: intfloat/multilingual-e5-large")
    print(f"Размерность векторов: 1024")
    print(f"Порт Qdrant: {6333}")
    print("="*60)
    
    loader = InstituteFAQLoader()
    
    while True:
        print("\n" + "="*50)
        print("ГЛАВНОЕ МЕНЮ FAQ")
        print("="*50)
        print("1. 📦 Создать коллекцию FAQ")
        print("2. ⌨️  Добавить FAQ через консоль")
        print("3. 📂 Загрузить из Excel (institute_faq.xlsx)")
        print("4. 📋 Показать шаблон Excel")
        print("5. 🔍 Тестовый поиск FAQ")
        print("6. 📊 Информация о коллекции")
        print("7. 🚪 Выйти")
        print("="*50)
        
        choice = input("\nВыберите действие (1-7): ").strip()
        
        if choice == '1':
            loader.create_collection()
        elif choice == '2':
            loader.add_from_console()
        elif choice == '3':
            filename = input("Имя файла [institute_faq.xlsx]: ").strip()
            if not filename:
                filename = "institute_faq.xlsx"
            loader.add_from_excel(filename)
        elif choice == '4':
            loader._show_excel_template()
        elif choice == '5':
            loader.test_search()
        elif choice == '6':
            loader.show_collection_info()
        elif choice == '7':
            print("👋 Выход из программы")
            break
        else:
            print("❌ Неверный выбор")

# Скрипт для быстрого создания Excel файла
def create_faq_excel():
    """Создание примерного Excel файла с FAQ"""
    import pandas as pd
    
    faq_data = [
        {
            'question': 'В какое время работает институт?',
            'answer': 'Институт работает с 8:00 до 19:00 по будним дням. В субботу с 9:00 до 16:00. Воскресенье - выходной.',
            'category': 'schedule'
        },
        {
            'question': 'Какой график работы в праздничные дни?',
            'answer': 'В праздничные дни институт не работает. Актуальное расписание публикуется на сайте за неделю до праздников.',
            'category': 'schedule'
        },
        {
            'question': 'Где находится главный корпус института?',
            'answer': 'Главный корпус расположен по адресу: г. Москва, ул. Образовательная, д. 1, ст. м. "Университет".',
            'category': 'locations'
        },
        {
            'question': 'Где находится деканат?',
            'answer': 'Деканат находится на 3 этаже главного корпуса, кабинет 305. Работает с 9:00 до 18:00.',
            'category': 'locations'
        },
        {
            'question': 'Какой телефон приемной комиссии?',
            'answer': 'Телефон приемной комиссии: +7 (495) 123-45-67. Работает с 9:00 до 18:00.',
            'category': 'contacts'
        },
        {
            'question': 'Есть ли email для вопросов?',
            'answer': 'Общий email: info@institute.edu. Для приемной комиссии: admission@institute.edu.',
            'category': 'contacts'
        },
        {
            'question': 'Какие документы нужны для поступления?',
            'answer': 'Для поступления нужны: паспорт, аттестат, 4 фото 3x4, медицинская справка 086/у.',
            'category': 'admission'
        },
        {
            'question': 'Когда начинается приемная кампания?',
            'answer': 'Приемная кампания начинается 20 июня и заканчивается 15 августа.',
            'category': 'admission'
        },
        {
            'question': 'Где можно посмотреть расписание занятий?',
            'answer': 'Расписание доступно на сайте института в личном кабинете студента и на информационных стендах.',
            'category': 'study'
        },
        {
            'question': 'Сколько длится учебный семестр?',
            'answer': 'Осенний семестр: сентябрь-декабрь, весенний: февраль-май. Каникулы: январь и июль.',
            'category': 'study'
        },
        {
            'question': 'Кто является ректором института?',
            'answer': 'Ректор института - профессор Иванов Иван Иванович.',
            'category': 'general'
        },
        {
            'question': 'Сколько факультетов в институте?',
            'answer': 'В институте 5 факультетов: технический, экономический, гуманитарный, юридический, медицинский.',
            'category': 'general'
        }
    ]
    
    df = pd.DataFrame(faq_data)
    filename = "institute_faq.xlsx"
    df.to_excel(filename, index=False)
    
    print(f"✅ Файл создан: {filename}")
    print(f"📊 Всего вопросов: {len(faq_data)}")
    
    # Статистика
    stats = df['category'].value_counts()
    print("\n📈 Статистика по категориям:")
    for category, count in stats.items():
        category_names = {
            'schedule': 'Расписание',
            'contacts': 'Контакты',
            'locations': 'Локации',
            'admission': 'Поступление',
            'study': 'Учеба',
            'general': 'Общие'
        }
        print(f"  {category_names.get(category, category)}: {count}")
    
    return df

if __name__ == "__main__":
    print("="*60)
    print("FAQ ЗАГРУЗЧИК ДЛЯ ИНСТИТУТА")
    print("="*60)
    print("Перед использованием убедитесь:")
    print("1. Qdrant запущен на localhost:6333")
    print("2. Установлены зависимости: pip install pandas openpyxl sentence-transformers")
    print("="*60)
    
    # Можно раскомментировать для быстрого создания Excel файла
    # create_faq_excel()
    
    main()