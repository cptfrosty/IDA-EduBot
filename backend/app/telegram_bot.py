import os
import threading
from telegram.ext import Application, MessageHandler, filters
from core.app_contex import AppContext
from core.agent import DialogAgent

class TelegramRunner:

    bot = None

    def __init__(self):
        pass
    
    def run_bot(self):
        """Функция для запуска бота в отдельном потоке"""
        try:
            qdrant = AppContext.QdrantManager
            gigachat = AppContext.GigaChatClient
            rag = AppContext.Rag
            bot = TelegramBotClient(
                token=os.getenv("TELEGRAM_BOT_TOKEN"), 
                gigachat=gigachat, 
                qdrant=qdrant, 
                rag=rag
            )
            
            # Запускаем бота
            bot.run()  # или bot.start()
            
        except Exception as e:
            print(f"❌ Ошибка в потоке бота: {e}")
            import traceback
            traceback.print_exc()

    # Альтернативное название метода для ясности
    def start(self):
        # Запускаем бота в отдельном потоке
        bot_thread = threading.Thread(target=self.run_bot, name="TelegramBot")
        bot_thread.daemon = True
        bot_thread.start()
        
        print("✅ Телеграм бот запущен в отдельном потоке")
        print("🚀 Позже здесь можно запустить веб-сервер")
        print("⏹️  Нажмите Ctrl+C для остановки")
        
        # Основной поток ждет
        try:
            while True:
                # Проверяем, жив ли поток с ботом
                if not bot_thread.is_alive():
                    print("❌ Поток с ботом остановился, перезапускаем...")
                    bot_thread = threading.Thread(target=self.run_bot, name="TelegramBot")
                    bot_thread.daemon = True
                    bot_thread.start()
                    print("✅ Бот перезапущен")
                
                # Ждем немного перед следующей проверкой
                threading.Event().wait(10)  # Увеличил интервал проверки
                
        except KeyboardInterrupt:
            print("\n👋 Завершение работы...")

class TelegramBotClient:
    def __init__(self, token: str, gigachat, qdrant, rag):
        self.token = token
        self.bot = Application.builder().token(self.token).build()
        self.agent = DialogAgent(gigachat, qdrant, rag)
        
        # Настраиваем обработчики при инициализации
        self._setup_handlers()

    def _setup_handlers(self):
        """Настройка обработчиков сообщений"""
        async def message_handler(update, context):
            message = update.message.text
            user = update.effective_user
            
            print(f"Новое сообщение от {user.username}: {message}")

            if "статус" in message.lower():
                await update.message.reply_text("Агент работает")
            else:
                response = self.agent.say(message)
                await update.message.reply_text(response)
        
        self.bot.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, message_handler))

    def run(self):
        """Запуск бота (синхронный метод для использования в потоках)"""
        print("Бот запущен...")
        self.bot.run_polling()