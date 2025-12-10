import { apiService } from './api';

export const chatService = {
  // Создать новый чат
  createNewChat: () => {
    const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      id: chatId,
      title: 'Новый диалог',
      createdAt: new Date().toISOString(),
      messages: []
    };
  },

  // Отправить сообщение
  sendMessage: async (message, conversationId = null) => {
    try {
      const response = await apiService.generation.chat(message, conversationId);
      return {
        success: true,
        data: response,
        conversationId: response.conversation_id || conversationId
      };
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Ошибка отправки сообщения'
      };
    }
  },

  // Получить историю чата
  getChatHistory: async (conversationId) => {
    try {
      const response = await apiService.generation.getChatHistory(conversationId);
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Ошибка получения истории чата:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Ошибка получения истории'
      };
    }
  },

  // Поиск по документам
  searchDocuments: async (query) => {
    try {
      const response = await apiService.search.search(query);
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Ошибка поиска:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Ошибка поиска'
      };
    }
  },

  // Загрузить документ
  uploadDocument: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiService.documents.upload(formData);
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Ошибка загрузки документа:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Ошибка загрузки документа'
      };
    }
  },

  // Получить список документов
  getDocuments: async () => {
    try {
      const response = await apiService.documents.list();
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Ошибка получения документов:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Ошибка получения документов'
      };
    }
  }
};