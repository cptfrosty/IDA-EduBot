// Конфигурация API
const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  ENDPOINTS: {
    // Аутентификация
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      ME: '/auth/me',
      LOGOUT: '/auth/logout',
      REFRESH_TOKEN: '/auth/refresh-token',
      CHANGE_PASSWORD: '/auth/change-password',
      RESET_PASSWORD_REQUEST: '/auth/reset-password/request',
      RESET_PASSWORD_CONFIRM: '/auth/reset-password/confirm'
    },
    
    // Документы RAG
    DOCUMENTS: {
      UPLOAD: '/rag/documents/upload',
      UPLOAD_BATCH: '/rag/documents/upload-batch',
      LIST: '/rag/documents',
      DETAIL: (id) => `/rag/documents/${id}`,
      DELETE: (id) => `/rag/documents/${id}`
    },
    
    // Поиск RAG
    SEARCH: {
      SEARCH: '/rag/search',
      SUGGESTIONS: '/rag/search/suggestions'
    },
    
    // Генерация RAG
    GENERATION: {
      GENERATE: '/rag/generate',
      CHAT: '/rag/chat',
      CHAT_HISTORY: (conversationId) => `/rag/chat/${conversationId}/history`
    },

    CONVERSATIONS: {
      LIST: '/rag/conversations',
    },
    
    // Система RAG
    SYSTEM: {
      STATUS: '/rag/status',
      REINDEX: '/rag/reindex',
      HEALTH: '/rag/health',
      ANALYTICS_QUERIES: '/rag/analytics/queries',
      ANALYTICS_DOCUMENTS: '/rag/analytics/documents'
    }
  },
  
  // Настройки запросов
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  
  // Настройки времени
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3
};

export default API_CONFIG;