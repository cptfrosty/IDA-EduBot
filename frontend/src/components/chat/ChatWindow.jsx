import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import MessageList from './MessageList';
import InputPanel from './InputPanel';
import { FiUpload, FiRefreshCw, FiArrowLeftCircle } from 'react-icons/fi';

const ChatWindow = ({ chatId }) => {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(chatId || null);
  const [sessionName, setSessionName] = useState('Новый диалог');
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(!!chatId);
  const navigate = useNavigate();
  const messageListRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, []);

  // Загрузка истории чата при наличии chatId
  useEffect(() => {
    const loadChatHistory = async () => {
      if (chatId) {
        setIsLoadingHistory(true);
        try {
          const result = await apiService.generation.getChatHistory(chatId);

          if (result) {
            setConversationId(chatId);
            setSessionName(`Беседа ${chatId.slice(0, 8)}`);

            if (result.messages && Array.isArray(result.messages)) {
              const formattedMessages = result.messages.map(msg => ({
                id: msg.id || Date.now() + Math.random(),
                text: msg.text || msg.content || '',
                sender: msg.sender || msg.role || 'user',
                timestamp: msg.timestamp || new Date().toISOString(),
                status: 'delivered',
                ...(msg.sources && { sources: msg.sources }),
                ...(msg.confidence && { confidence: msg.confidence }),
              }));
              setMessages(formattedMessages);
            }
          }
        } catch (error) {
          console.error('Ошибка загрузки истории чата:', error);
          
          const errorMessage = {
            id: Date.now(),
            text: `Не удалось загрузить историю беседы: ${error.response?.data?.detail || 'Беседа не найдена'}`,
            sender: 'system',
            timestamp: new Date().toISOString(),
            status: 'error'
          };
          setMessages([errorMessage]);

          // Через 3 секунды перенаправляем на новый чат
          setTimeout(() => {
            navigate('/chat');
          }, 3000);
        } finally {
          setIsLoadingHistory(false);
        }
      }
    };

    loadChatHistory();
  }, [chatId, navigate]);

  // Загрузка документов при монтировании (только если не загружаем историю)
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const result = await apiService.documents.list();
        setDocuments(Array.isArray(result) ? result : (result.documents || result || []));
      } catch (error) {
        console.error('Ошибка загрузки документов:', error);
      }
    };

    if (!chatId || !isLoadingHistory) {
      loadDocuments();
    }
  }, [chatId, isLoadingHistory]);

  // Скролл к последнему сообщению при добавлении новых
  useEffect(() => {
    if (!isLoadingHistory) {
      scrollToBottom();
    }
  }, [messages, isLoadingHistory, scrollToBottom]);

  const handleSendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    // Если у нас есть chatId, используем его как conversationId
    const currentConvId = conversationId || chatId;

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
      const result = await apiService.generation.chat(text, currentConvId);
      
      // Обновляем conversationId если это первый ответ в новой сессии
      if (!currentConvId && result.conversation_id) {
        const newConvId = result.conversation_id;
        setConversationId(newConvId);
        setSessionName(`Беседа ${newConvId.slice(0, 8)}`);
        
        // Обновляем URL если мы не на /chat/:id
        if (!chatId) {
          navigate(`/chat/${newConvId}`);
        }
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
      const result = await apiService.documents.list();
      setDocuments(Array.isArray(result) ? result : (result.documents || result || []));
      
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
    navigate('/chat');
  };

  const handleBackToList = () => {
    navigate('/chat/history');
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
          {chatId && (
            <button 
              onClick={handleBackToList} 
              className="btn-secondary"
              style={{ marginRight: '10px' }}
            >
              <FiArrowLeftCircle /> Назад
            </button>
          )}
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
            disabled={isLoading || isLoadingHistory}
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
            onClick={async () => {
              try {
                const result = await apiService.documents.list();
                setDocuments(Array.isArray(result) ? result : (result.documents || result || []));
              } catch (error) {
                console.error('Ошибка загрузки документов:', error);
              }
            }} 
            className="btn-secondary"
            disabled={isLoading || isLoadingHistory}
          >
            <FiRefreshCw /> Обновить
          </button>
          
          <button 
            onClick={handleNewSession} 
            className="btn-primary"
            disabled={isLoadingHistory}
          >
            Новая сессия
          </button>
        </div>
      </div>

      {/* Показываем индикатор загрузки истории */}
      {isLoadingHistory ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Загрузка истории беседы...</p>
        </div>
      ) : (
        <>
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
            isLoading={isLoading || isLoadingHistory}
            onSearch={handleSearch}
          />
        </>
      )}
    </div>
  );
};

export default ChatWindow;