import streamlit as st
from object_relational_db.database import AuthDatabaseMock

class AuthManager:
    def __init__(self):
        if "db" not in st.session_state:
            st.session_state.db = AuthDatabaseMock()
        
        # Инициализация состояния аутентификации
        if "logged_in" not in st.session_state:
            st.session_state.logged_in = False
        if "username" not in st.session_state:
            st.session_state.username = None
        if "session_token" not in st.session_state:
            st.session_state.session_token = None
    
    def login_user(self, username, password):
        """Авторизация пользователя"""
        user_id = st.session_state.db.verify_user(username, password)
        if user_id:
            session_token = st.session_state.db.create_session(user_id)
            if session_token:
                st.session_state.session_token = session_token
                st.session_state.logged_in = True
                st.session_state.username = username
                return True
        return False
    
    def logout_user(self):
        """Выход пользователя"""
        if "session_token" in st.session_state:
            st.session_state.db.delete_session(st.session_state.session_token)
        st.session_state.session_token = None
        st.session_state.logged_in = False
        st.session_state.username = None
    
    def check_auth(self):
        """Проверка авторизации при загрузке страницы"""
        if "session_token" in st.session_state and st.session_state.session_token:
            user_info = st.session_state.db.validate_session(st.session_state.session_token)
            if user_info:
                st.session_state.logged_in = True
                st.session_state.username = user_info[1]
            else:
                self.logout_user()
    
    def register_user(self, username, password, confirm_password):
        """Регистрация нового пользователя"""
        if not username or not password:
            return "Заполните все поля"
        elif password != confirm_password:
            return "Пароли не совпадают"
        elif len(password) < 6:
            return "Пароль должен быть не менее 6 символов"
        else:
            if st.session_state.db.create_user(username, password):
                return "success"
            else:
                return "Пользователь с таким логином уже существует"
    
    def get_system_stats(self):
        """Получение статистики системы"""
        return st.session_state.db.get_stats()