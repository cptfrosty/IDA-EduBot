import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiService } from '../../services/api';
import MessageList from './MessageList';
import InputPanel from './InputPanel';
import { FiUpload, FiRefreshCw } from 'react-icons/fi';

const ChatWindow = () => {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [sessionName, setSessionName] = useState('Новый диалог');
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const messageListRef = useRef(null);

  // Загрузка документов при монтировании
  useEffect(() => {
    loadDocuments();
  }, []);

  // Скролл к последнему сообщению при добавлении новых
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, []);

  const loadDocuments = async () => {
    try {
      const result = await apiService.documents.list();
      setDocuments(Array.isArray(result) ? result : (result.documents || result || []));
    } catch (error) {
      console.error('Ошибка загрузки документов:', error);
    }
  };

  const handleSendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    // Добавляем сообщение пользователя
    const userMessage = {
      id: Date.now(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date().toISOString(),
      status: 'sending'
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Отправляем сообщение на сервер
      const result = await apiService.generation.chat(text, conversationId);
      
      // Обновляем conversationId если это первый ответ
      if (!conversationId && result.conversation_id) {
        setConversationId(result.conversation_id);
        setSessionName(`Беседа ${result.conversation_id.slice(0, 8)}`);
      }

      // Добавляем ответ ИИ
      const aiMessage = {
        id: Date.now() + 1,
        text: result.response,
        sender: 'agent',
        timestamp: new Date().toISOString(),
        status: 'delivered',
        sources: result.sources || [],
        confidence: result.confidence
      };

      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id 
          ? { ...msg, status: 'delivered' } 
          : msg
      ).concat(aiMessage));
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      
      // Обработка ошибки
      const errorMessage = {
        id: Date.now() + 1,
        text: `Ошибка: ${error.response?.data?.detail || 'Не удалось отправить сообщение'}`,
        sender: 'system',
        timestamp: new Date().toISOString(),
        status: 'error'
      };
      
      setMessages(prev => prev.concat(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query) => {
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const result = await apiService.search.search(query);
      setSearchResults(result);
      
      // Показываем результаты поиска
      const searchMessage = {
        id: Date.now(),
        text: `Найдено ${result.length || 0} результатов по запросу: "${query}"`,
        sender: 'system',
        timestamp: new Date().toISOString(),
        status: 'delivered',
        searchResults: result
      };
      
      setMessages(prev => [...prev, searchMessage]);
    } catch (error) {
      console.error('Ошибка поиска:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadDocument = async (file) => {
    setIsLoading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      await apiService.documents.upload(formData);
      
      // Обновляем список документов
      await loadDocuments();
      
      // Показываем сообщение об успешной загрузке
      const uploadMessage = {
        id: Date.now(),
        text: `Документ "${file.name}" успешно загружен`,
        sender: 'system',
        timestamp: new Date().toISOString(),
        status: 'delivered'
      };
      
      setMessages(prev => [...prev, uploadMessage]);
    } catch (error) {
      console.error('Ошибка загрузки документа:', error);
      
      // Показываем ошибку
      const errorMessage = {
        id: Date.now(),
        text: `Ошибка загрузки: ${error.response?.data?.detail || 'Не удалось загрузить документ'}`,
        sender: 'system',
        timestamp: new Date().toISOString(),
        status: 'error'
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSession = () => {
    setMessages([]);
    setConversationId(null);
    setSessionName(`Новая сессия ${new Date().toLocaleDateString()}`);
    setSearchResults(null);
  };

  const handleRateMessage = (messageId, rating) => {
    setMessages(messages.map(msg => 
      msg.id === messageId ? { ...msg, rating } : msg
    ));
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="session-info">
          <h3>{sessionName}</h3>
          <span className="session-status">
            {conversationId ? `ID: ${conversationId.slice(0, 8)}...` : 'Новая сессия'}
          </span>
          <div className="session-stats">
            <span>{messages.filter(m => m.sender === 'user').length} сообщений</span>
          </div>
        </div>
        
        <div className="session-controls">
          <button 
            onClick={() => document.getElementById('file-upload').click()} 
            className="btn-secondary"
            disabled={isLoading}
          >
            <FiUpload /> Загрузить
          </button>
          <input
            id="file-upload"
            type="file"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files[0]) {
                handleUploadDocument(e.target.files[0]);
              }
            }}
            accept=".pdf,.txt,.doc,.docx,.md"
          />
          
          <button 
            onClick={() => loadDocuments()} 
            className="btn-secondary"
            disabled={isLoading}
          >
            <FiRefreshCw /> Обновить
          </button>
          
          <button 
            onClick={handleNewSession} 
            className="btn-primary"
          >
            Новая сессия
          </button>
        </div>
      </div>

      {/* Message List with scroll container */}
      <div className="message-list-container" ref={messageListRef}>
        <MessageList 
          messages={messages} 
          onRateMessage={handleRateMessage}
          searchResults={searchResults}
        />
      </div>

      <InputPanel 
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        onSearch={handleSearch}
      />
    </div>
  );
};

export default ChatWindow;