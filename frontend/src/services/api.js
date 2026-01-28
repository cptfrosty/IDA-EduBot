import axios from 'axios';
import API_CONFIG from '../config/api';

// Создаем экземпляр axios с базовой конфигурацией
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.DEFAULT_HEADERS,
  withCredentials: true
});

// Интерцептор для добавления токена к запросам
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Интерцептор для обработки 401 ошибок и обновления токена
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Если ошибка 401 и это не запрос на обновление токена
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }
        
        // Пытаемся обновить токен
        const response = await axios.post(
          `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.REFRESH_TOKEN}`,
          { refresh_token: refreshToken }
        );
        
        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);
        
        // Обновляем заголовок и повторяем запрос
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Если не удалось обновить токен, разлогиниваем пользователя
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Вспомогательные функции для API
export const apiService = {
  // Аутентификация
  auth: {
    login: async (credentials) => {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.LOGIN, credentials);
      return response.data;
    },
    
    register: async (userData) => {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.REGISTER, userData);
      return response.data;
    },
    
    getMe: async () => {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.AUTH.ME);
      return response.data;
    },
    
    logout: async () => {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.LOGOUT);
      return response.data;
    },
    
    changePassword: async (passwordData) => {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.CHANGE_PASSWORD, passwordData);
      return response.data;
    },
    
    requestPasswordReset: async (email) => {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.RESET_PASSWORD_REQUEST, { email });
      return response.data;
    },
    
    confirmPasswordReset: async (resetData) => {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.RESET_PASSWORD_CONFIRM, resetData);
      return response.data;
    }
  },
  
  conversations: {
    list: async () => {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.CONVERSATIONS.LIST + '/' + localStorage.getItem('access_token'));
      return response.data;
    },
  },

  // Документы RAG
  documents: {
    upload: async (formData) => {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.DOCUMENTS.UPLOAD, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    },
    
    uploadBatch: async (files) => {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.DOCUMENTS.UPLOAD_BATCH, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    },
    
    list: async (params = {}) => {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.DOCUMENTS.LIST, { params });
      return response.data;
    },
    
    get: async (id) => {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.DOCUMENTS.DETAIL(id));
      return response.data;
    },
    
    delete: async (id) => {
      const response = await apiClient.delete(API_CONFIG.ENDPOINTS.DOCUMENTS.DELETE(id));
      return response.data;
    }
  },
  
  // Поиск RAG
  search: {
    search: async (query, params = {}) => {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.SEARCH.SEARCH, {
        query,
        ...params
      });
      return response.data;
    },
    
    getSuggestions: async (query) => {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.SEARCH.SUGGESTIONS, {
        params: { query }
      });
      return response.data;
    }
  },
  
  // Генерация RAG
  generation: {
    generate: async (prompt, options = {}) => {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.GENERATION.GENERATE, {
        prompt,
        ...options
      });
      return response.data;
    },
    
    chat: async (message, conversationId = null, options = {}) => {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.GENERATION.CHAT, {
        message,
        conversation_id: conversationId,
        ...options
      });
      return response.data;
    },
    
    getChatHistory: async (conversationId) => {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.GENERATION.CHAT_HISTORY(conversationId));
      return response.data;
    }
  },
  
  // Система RAG
  system: {
    getStatus: async () => {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.SYSTEM.STATUS);
      return response.data;
    },
    
    reindex: async () => {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.SYSTEM.REINDEX);
      return response.data;
    },
    
    getHealth: async () => {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.SYSTEM.HEALTH);
      return response.data;
    },
    
    getAnalyticsQueries: async (params = {}) => {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.SYSTEM.ANALYTICS_QUERIES, { params });
      return response.data;
    },
    
    getAnalyticsDocuments: async (params = {}) => {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.SYSTEM.ANALYTICS_DOCUMENTS, { params });
      return response.data;
    }
  },

  // Курсы - ИСПРАВЛЕНО
  courses: {
    // Получить все курсы
    getCourses: async () => {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.COURSES.GET_COURSES);
      return response;
    },
    
    // Получить конкретный курс
    getCourse: async (courseId) => {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.COURSES.GET_COURSE(courseId));
      return response;
    },
    
    // Создать курс
    createCourse: async (courseData) => {
      try {
        // Создаем глубокую копию без циклических ссылок
        const cleanData = JSON.parse(JSON.stringify({
          discipline_id: String(courseData.discipline_id || ''),
          title: String(courseData.title || ''),
          semester: String(courseData.semester || ''),
          instructor_id: String(courseData.instructor_id || ''),
          start_date: String(courseData.start_date || ''),
          end_date: String(courseData.end_date || ''),
          max_students: Number(courseData.max_students) || 30,
          classroom: String(courseData.classroom || ''),
          status: String(courseData.status || 'planned'),
          description: String(courseData.description || ''),
          assistant_id: courseData.assistant_id || null,
          schedule_json: courseData.schedule_json || null,
          current_students: Number(courseData.current_students) || 0
        }));
        
        console.log('Отправляем на сервер:', cleanData);
        
        const response = await apiClient.post(
          API_CONFIG.ENDPOINTS.COURSES.CREATE_COURSE, 
          cleanData
        );
        return response;
      } catch (error) {
        console.error('Error in createCourse:', error);
        console.error('Request data:', courseData);
        throw error;
      }
    },
    
    // Обновить курс
    updateCourse: async (courseId, courseData) => {
      const response = await apiClient.put(API_CONFIG.ENDPOINTS.COURSES.UPDATE_COURSE(courseId), courseData);
      return response;
    },
    
    // Удалить курс
    deleteCourse: async (courseId) => {
      const response = await apiClient.delete(API_CONFIG.ENDPOINTS.COURSES.DELETE_COURSE(courseId));
      return response;
    },
    
    // Опубликовать курс
    publishCourse: async (courseId) => {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.COURSES.PUBLISH_COURSE(courseId));
      return response;
    },
    
    // Получить студентов курса
    getCourseStudents: async (courseId) => {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.COURSES.GET_STUDENTS(courseId));
      return response;
    },
    
    // Добавить студентов на курс
    enrollStudents: async (courseId, studentIds) => {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.COURSES.ENROLL_STUDENTS(courseId), {
        student_ids: studentIds
      });
      return response;
    },
    
    // Получить дисциплины
    getDisciplines: async () => {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.COURSES.GET_DISCIPLINES);
      return response;
    },
    
    // Создать дисциплину
    createDiscipline: async (disciplineData) => {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.COURSES.CREATE_DISCIPLINE, disciplineData);
      return response;
    }
  },
  
  // Материалы курса - ИСПРАВЛЕНО
  materials: {
    // Получить материалы курса
    getCourseMaterials: async (courseId) => {
      const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.MATERIALS.GET_COURSE_MATERIALS}/${courseId}`);
      return response;
    },
    
    // Создать материал
    createMaterial: async (formData) => {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.MATERIALS.CREATE_MATERIAL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response;
    },
    
    // Скачать материал
    downloadMaterial: async (materialId) => {
      const response = await apiClient.get(
        `${API_CONFIG.ENDPOINTS.MATERIALS.DOWNLOAD_MATERIAL}/${materialId}/download`,
        { responseType: 'blob' }
      );
      return response;
    }
  },
  
  // Пользователи - ИСПРАВЛЕНО
  users: {
    // Получить всех студентов
    getStudents: async () => {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.USERS.GET_STUDENTS);
      return response;
    },
    
    // Получить пользователя по ID
    getUser: async (userId) => {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.USERS.GET_USER(userId));
      return response;
    },
    
    // Получить преподавателей
    getInstructors: async () => {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.USERS.GET_INSTRUCTORS);
      return response;
    }
  },

  admin: {
    getUsers: async () => {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.ADMIN.USERS);
      return response;
    },
    updateUserRole: async (userId, role) => {
      const response = await apiClient.put(API_CONFIG.ENDPOINTS.ADMIN.UPDATE_USER_ROLE(userId), { role });
      return response;
    },
    createUser: async (userData) => {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.ADMIN.CREATE_USER, userData);
      return response;
    }
  }
};

export default apiService;