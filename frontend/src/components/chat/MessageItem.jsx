import React, { useState } from 'react';
import { FiStar, FiCheck, FiClock } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown'; // Добавьте эту строку

const MessageItem = ({ message, onRate }) => {
  const [hoveredStar, setHoveredStar] = useState(0);

  const formatTime = (timestamp) => {
    const d = new Date(timestamp);
    if (isNaN(d)) return '';
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const isAI = message.sender === 'agent';
  const isUser = message.sender === 'user';
  const isSystem = message.sender === 'system';

  return (
    <div className={`message-item message-${message.sender}`}>
      <div className={`message-bubble bubble-${message.sender}`}>
        <div className="message-text">
          {/* Используем ReactMarkdown только для AI сообщений */}
          {isAI ? (
            <ReactMarkdown>
              {message.text}
            </ReactMarkdown>
          ) : (
            // Для остальных сообщений - обычный текст
            <div className="plain-text">{message.text}</div>
          )}
        </div>
        
        {isAI && message.sources && message.sources.length > 0 && (
          <div className="sources-list">
            <small>Источники:</small>
            {message.sources.map((source, idx) => (
              <span key={idx} className="source-item">
                {source.title || source.source || source.meta?.source_file || `Источник ${idx + 1}`}
              </span>
            ))}
          </div>
        )}
        
        {isAI && message.confidence !== undefined && message.confidence !== null && (
          <div className="confidence-indicator">
            <small>Уверенность: {Math.round(message.confidence * 100)}%</small>
          </div>
        )}
      </div>

      <div className="message-meta">
        <div className="message-time">
          <FiClock /> {formatTime(message.timestamp)}
        </div>
        
        <div className="message-actions">
          {message.status === 'sending' && (
            <span className="status-indicator">Отправка...</span>
          )}
          {message.status === 'delivered' && (
            <FiCheck className="delivered-icon" />
          )}
          
          {isAI && (
            <div className="rating-stars">
              {[1, 2, 3, 4, 5].map(star => (
                <FiStar
                  key={star}
                  className={`star ${star <= (hoveredStar || message.rating || 0) ? 'active' : ''}`}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => onRate && onRate(message.id, star)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;