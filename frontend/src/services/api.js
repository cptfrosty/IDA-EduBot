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
  }
};

export default apiService;