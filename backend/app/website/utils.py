import time
import streamlit as st

def init_session_state():
    """Инициализация состояния сессии"""
    if "messages" not in st.session_state:
        st.session_state.messages = []
    
    if "agent" not in st.session_state:
        from agent_mock import DialogAgent
        st.session_state.agent = DialogAgent()

def render_test():
    st.set_page_config(page_title="Тестовые элементы")
    st.title("Тестовые элементы")

    #st.altair_chart()
    #st.area_chart()
    #st.audio()
    #st.audio_input()
    #st.badge()
    #st.balloons()
    #st.bar_chart()
    #st.bokeh_chart()
    st.button(label="Кнопка 1")
    st.button(label="Кнопка 2", type="tertiary")
    #st.caption()
    #camera_input = _main.camera_input
    #chat_message = _main.chat_message
    #chat_input = _main.chat_input
    #checkbox = _main.checkbox
    #code = _main.code
    #columns = _main.columns
    #tabs = _main.tabs
    #container = _main.container
    #dataframe = _main.dataframe
    #data_editor = _main.data_editor
    #date_input = _main.date_input
    #divider = _main.divider
    #download_button = _main.download_button
    #expander = _main.expander
    #feedback = _main.feedback
    #pydeck_chart = _main.pydeck_chart
    #empty = _main.empty
    #error = _main.error
    #exception = _main.exception
    #file_uploader = _main.file_uploader
    #form = _main.form
    #form_submit_button = _main.form_submit_button
    #graphviz_chart = _main.graphviz_chart
    #header = _main.header
    #help = _main.help
    #html = _main.html
    #image = _main.image
    #info = _main.info
    #json = _main.json
    #latex = _main.latex
    #line_chart = _main.line_chart
    #link_button = _main.link_button
    #map = _main.map
    #markdown = _main.markdown
    #metric = _main.metric
    #multiselect = _main.multiselect
    #number_input = _main.number_input
    #page_link = _main.page_link
    #pdf = _main.pdf
    #pills = _main.pills
    #plotly_chart = _main.plotly_chart
    #popover = _main.popover
    #progress = _main.progress
    #pyplot = _main.pyplot
    #radio = _main.radio
    #scatter_chart = _main.scatter_chart
    #selectbox = _main.selectbox
    #select_slider = _main.select_slider
    #segmented_control = _main.segmented_control
    #slider = _main.slider
    #snow = _main.snow
    #space = _main.space
    #subheader = _main.subheader
    #success = _main.success
    #table = _main.table
    #text = _main.text
    #text_area = _main.text_area
    #text_input = _main.text_input
    #toggle = _main.toggle
    #time_input = _main.time_input
    #title = _main.title
    #vega_lite_chart = _main.vega_lite_chart
    #video = _main.video
    #warning = _main.warning
    #write = _main.write
    #write_stream = _main.write_stream
    #color_picker = _main.color_picker
    #status = _main.status

def render_sidebar(auth_manager):
    """Отрисовка сайдбара"""
    with st.sidebar:

        st.markdown("---")
        

        
        st.markdown("---")
        if st.button("Очистить историю"):
            st.session_state.messages = [
                {"role": "assistant", "content": "История очищена. Чем могу помочь?"}
            ]
            st.rerun()

        st.title(f"🤖 Привет, {st.session_state.username}!")
        if st.button("Выйти"):
            auth_manager.logout_user()
            st.rerun()
        st.markdown("---")
        
        # Информация о системе
        stats = auth_manager.get_system_stats()
        st.markdown("**Информация о системе:**")
        st.markdown(f"Пользователей: {stats['total_users']}")
        st.markdown(f"Активных сессий: {stats['active_sessions']}")
        
        # Инициализация
        if "chats" not in st.session_state:
            st.session_state.chats = {"default": []}
        if "current_chat" not in st.session_state:
            st.session_state.current_chat = "default"

        # Поле для имени нового чата
        new_chat_name = st.text_input("Название чата")
    
        if st.button("➕ Создать новый чат") and new_chat_name:
            if new_chat_name not in st.session_state.chats:
                st.session_state.chats[new_chat_name] = []
            st.session_state.current_chat = new_chat_name
            st.rerun()
            
            # Список существующих чатов
        st.subheader("Мои чаты")
        for chat_name in st.session_state.chats.keys():
            if st.button(f"💬 {chat_name}", key=chat_name):
                st.session_state.current_chat = chat_name
                st.session_state.messages = []
                st.rerun()


def render_chat_interface():
    """Отрисовка интерфейса чата"""
    # Отображение истории сообщений
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])
    
    # Обработка ввода пользователя
    if prompt := st.chat_input("Введите ваше сообщение..."):
        # Добавление сообщения пользователя в историю
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)
        
        # Получение ответа от агента
        with st.chat_message("assistant"):
            with st.spinner("Думаю..."):
                response = st.session_state.agent.say(prompt)
                st.markdown(response)
        
        # Добавление ответа ассистента в историю
        st.session_state.messages.append({"role": "assistant", "content": response})

def render_auth_interface(auth_manager):
    """Отрисовка интерфейса аутентификации"""
    st.set_page_config(page_title="Авторизация", page_icon="🔐")
    
    st.title("🔐 Авторизация")
    
    # Информация о тестовом пользователе
    with st.expander("Тестовые данные для входа"):
        st.info("""
        **Логин:** demo  
        **Пароль:** 123456
        
        Или зарегистрируйте нового пользователя.
        """)
    
    tab1, tab2 = st.tabs(["Вход", "Регистрация"])
    
    with tab1:
        with st.form("login_form"):
            username = st.text_input("Логин")
            password = st.text_input("Пароль", type="password")
            submit = st.form_submit_button("Войти")
            
            if submit:
                if auth_manager.login_user(username, password):
                    st.success("Успешный вход!")
                    time.sleep(1)
                    st.rerun()
                else:
                    st.error("Неверный логин или пароль")
    
    with tab2:
        with st.form("register_form"):
            new_username = st.text_input("Новый логин", placeholder="Введите логин")
            new_password = st.text_input("Новый пароль", type="password", placeholder="Не менее 6 символов")
            confirm_password = st.text_input("Подтвердите пароль", type="password")
            submit_register = st.form_submit_button("Зарегистрироваться")
            
            if submit_register:
                result = auth_manager.register_user(new_username, new_password, confirm_password)
                if result == "success":
                    st.success("Пользователь создан! Теперь вы можете войти.")
                else:
                    st.error(result)