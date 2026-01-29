import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import { FiMessageSquare, FiCalendar, FiClock, FiSearch, FiTrash2 } from 'react-icons/fi';

const ChatHistory = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversations, setSelectedConversations] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Загружаем историю чатов
    loadChatHistory();
  }, []);

  const extractConversationsArray = (res) => {
    // list() может вернуть: axiosResponse, {data: [...]}, {conversations:[...]} или просто [...]
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.conversations)) return res.conversations;
    if (Array.isArray(res.data?.conversations)) return res.data.conversations;
    return [];
  };

  const normalizeConversation = (conv) => {
    const id = String(conv.id || conv.conversation_id || conv.session_id || '');
    return {
      id,
      title: String(conv.title || 'Беседа без названия'),
      lastMessage: String(conv.last_message ?? conv.lastMessage ?? ''),
      messageCount: Number(conv.message_count ?? conv.messageCount ?? 0),
      createdAt: conv.created_at || conv.createdAt || new Date().toISOString(),
      updatedAt: conv.updated_at || conv.updatedAt || conv.created_at || conv.createdAt || new Date().toISOString(),
    };
  };

  const loadChatHistory = async () => {
    try {
      setLoading(true);
      const res = await apiService.conversations.list();
      const raw = extractConversationsArray(res);

      const normalized = raw
        .map(normalizeConversation)
        // сортируем по updatedAt DESC
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      setConversations(normalized);
    } catch (error) {
      console.error('Ошибка загрузки истории с сервера:', error);
      const savedHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
      const normalized = (Array.isArray(savedHistory) ? savedHistory : [])
        .map(normalizeConversation)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setConversations(normalized);
    } finally {
      setLoading(false);
    }
  };

  const handleConversationClick = (conversationId) => {
    navigate(`/chat/${conversationId}`);
  };

  const handleDelete = async (conversationId) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту беседу?')) return;
    
    try {
      // TODO: Реализовать удаление на сервере
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      setSelectedConversations(prev => prev.filter(id => id !== conversationId));
      console.log(`Беседа ${conversationId} удалена`);
    } catch (error) {
      console.error('Ошибка удаления беседы:', error);
      alert('Ошибка удаления беседы');
    }
  };

  const handleDeleteSelected = () => {
    if (selectedConversations.length === 0) return;
    
    if (!window.confirm(`Удалить ${selectedConversations.length} выбранных бесед?`)) return;
    
    setConversations(prev => 
      prev.filter(conv => !selectedConversations.includes(conv.id))
    );
    setSelectedConversations([]);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedConversations(filteredConversations.map(conv => conv.id));
    } else {
      setSelectedConversations([]);
    }
  };

  const lastActivity = conversations.length > 0 ? conversations[0].updatedAt : null;

  const handleSelectConversation = (conversationId, checked) => {
    if (checked) {
      setSelectedConversations(prev => [...prev, conversationId]);
    } else {
      setSelectedConversations(prev => prev.filter(id => id !== conversationId));
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const title = String(conv.title || '').toLowerCase();
    const last = String(conv.lastMessage || '').toLowerCase();
    const term = String(searchTerm || '').toLowerCase();
    return title.includes(term) || last.includes(term);
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Сегодня';
    } else if (diffDays === 1) {
      return 'Вчера';
    } else if (diffDays < 7) {
      return `${diffDays} дней назад`;
    } else {
      return date.toLocaleDateString('ru-RU');
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="chat-history-container">
        <div className="loading">Загрузка истории...</div>
      </div>
    );
  }

  return (
    <div className="chat-history-container">
      <div className="chat-history-header">
        <h3>История чатов</h3>
        <p>Все ваши предыдущие беседы с ИИ-помощником</p>
        
        <div className="history-actions">
          <div className="search-box">
            <FiSearch />
            <input
              type="text"
              placeholder="Поиск по истории..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {selectedConversations.length > 0 && (
            <button 
              className="btn-danger"
              onClick={handleDeleteSelected}
            >
              <FiTrash2 /> Удалить выбранные ({selectedConversations.length})
            </button>
          )}
          
          <Link to="/chat" className="btn-primary">
            <FiMessageSquare /> Новый чат
          </Link>
        </div>
      </div>

      {filteredConversations.length === 0 ? (
        <div className="empty-history">
          <FiMessageSquare size={48} />
          <h4>История чатов пуста</h4>
          <p>Начните новый диалог с ИИ-помощником</p>
          <Link to="/chat" className="btn-primary">
            Начать новый чат
          </Link>
        </div>
      ) : (
        <div className="conversations-list">
          <div className="conversations-header">
            <div className="header-cell select-cell">
              <input
                type="checkbox"
                checked={selectedConversations.length === filteredConversations.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
            </div>
            <div className="header-cell title-cell">Беседа</div>
            <div className="header-cell last-message-cell">Последнее сообщение</div>
            <div className="header-cell stats-cell">Сообщений</div>
            <div className="header-cell date-cell">Дата</div>
            <div className="header-cell actions-cell">Действия</div>
          </div>
          
          <div className="conversations-body">
            {filteredConversations.map(conversation => (
              <div 
                key={conversation.id} 
                className="conversation-item"
                onClick={() => handleConversationClick(conversation.id)}
              >
                <div className="conversation-cell select-cell" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedConversations.includes(conversation.id)}
                    onChange={(e) => handleSelectConversation(conversation.id, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                
                <div className="conversation-cell title-cell">
                  <FiMessageSquare className="conversation-icon" />
                  <div className="conversation-title">
                    <strong>{conversation.title}</strong>
                    <span className="conversation-id">ID: {conversation.id.slice(0, 8)}...</span>
                  </div>
                </div>
                
                <div className="conversation-cell last-message-cell">
                  <span className="last-message">{conversation.lastMessage}</span>
                </div>
                
                <div className="conversation-cell stats-cell">
                  <span className="message-count">{conversation.messageCount}</span>
                </div>
                
                <div className="conversation-cell date-cell">
                  <div className="date-info">
                    <FiCalendar />
                    <span>{formatDate(conversation.updatedAt)}</span>
                  </div>
                  <div className="time-info">
                    <FiClock />
                    <span>{formatTime(conversation.updatedAt)}</span>
                  </div>
                </div>
                
                <div className="conversation-cell actions-cell">
                  <button 
                    className="btn-icon danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(conversation.id);
                    }}
                    title="Удалить"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="history-stats">
        <span>Всего бесед: {conversations.length}</span>
        <span>•</span>
        <span>Сообщений: {conversations.reduce((sum, conv) => sum + conv.messageCount, 0)}</span>
        <span>•</span>
        <span>Последняя активность: {lastActivity ? formatDate(lastActivity) : 'нет'}</span>
      </div>
    </div>
  );
};

export default ChatHistory;