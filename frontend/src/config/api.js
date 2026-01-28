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
    },

    // Курсы
    COURSES: {
      GET_COURSES: '/courses',
      GET_COURSE: (id) => `/courses/${id}`,
      CREATE_COURSE: '/courses',
      UPDATE_COURSE: (id) => `/courses/${id}`,
      DELETE_COURSE: (id) => `/courses/${id}`,
      PUBLISH_COURSE: (id) => `/courses/${id}/publish`,
      GET_STUDENTS: (courseId) => `/courses/${courseId}/students`,
      ENROLL_STUDENTS: (courseId) => `/courses/${courseId}/enroll`,
      UPLOAD_DOCUMENT: '/courses/upload',
      GET_DISCIPLINES: '/disciplines',
      CREATE_DISCIPLINE: '/disciplines'
    },
    
    // Материалы
    MATERIALS: {
      CREATE_MATERIAL: '/materials',
      GET_COURSE_MATERIALS: '/materials/course',
      DOWNLOAD_MATERIAL: '/materials',
      PREVIEW_MATERIAL: '/materials'
    },
    
    // Пользователи
    USERS: {
      GET_STUDENTS: '/users/students',
      GET_USER: (userId) => `/users/${userId}`,
      GET_INSTRUCTORS: '/users/instructors'
    },

    // Админка
    ADMIN: {
      USERS: '/admin/users',
      UPDATE_USER_ROLE: (userId) => `/admin/users/${userId}/role`,
      CREATE_USER: '/admin/users'
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