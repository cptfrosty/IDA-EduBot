import os
import threading
from telegram_bot import TelegramRunner
from dotenv import load_dotenv
import uvicorn

def start_telegram():
    load_dotenv()
    bot = TelegramRunner()
    bot.start()

def main():
    uvicorn.run(
        "app:app",
        host='localhost',
        port=8080,
        reload = True
    )   
    

if __name__ == "__main__":
    main()