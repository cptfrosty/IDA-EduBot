import logging
import streamlit as st
from auth import AuthManager
from utils import init_session_state, render_sidebar, render_chat_interface, render_auth_interface, render_test
from object_relational_db.database import DataBase

def main():

    logging.basicConfig(level=logging.DEBUG)
    logging.debug("sadfsa")

    # Инициализация базы данных
    relation_database_manager = DataBase()

    # Инициализация менеджера аутентификации
    auth_manager = AuthManager()
    
    # Проверка авторизации
    auth_manager.check_auth()
    
    # Если пользователь не авторизован, показываем интерфейс входа
    if not st.session_state.logged_in:
        render_auth_interface(auth_manager)
        st.stop()
    
    # ОСНОВНОЕ ПРИЛОЖЕНИЕ (после авторизации)
    st.set_page_config(
        page_title="AI Ассистент",
        page_icon="🤖",
        layout="wide"
    )
    
    # Инициализация состояния сессии
    init_session_state()
    
    # Отрисовка сайдбара
    render_sidebar(auth_manager)
    
    # Основной интерфейс чата
    st.title("🤖 AI Ассистент")
    st.markdown("---")
    
    # Отрисовка интерфейса чата
    render_chat_interface()
    
    # Дополнительная информация
    st.markdown("---")
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("**Примеры запросов:**")
        st.markdown("- Привет!")
        st.markdown("- Как дела?")
        st.markdown("- Статус системы")
    with col2:
        st.markdown("**Технологии:**")
        st.markdown("- Streamlit UI")
        st.markdown("- Mock Database")
        st.markdown("- AI Ассистент")

if __name__ == "__main__":
    main()