import React, { useState } from 'react';
import { FiStar, FiCheck, FiClock } from 'react-icons/fi';

const MessageItem = ({ message, onRate }) => {
  const [hoveredStar, setHoveredStar] = useState(0);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`message-item message-${message.sender}`}>
      <div className={`message-bubble bubble-${message.sender}`}>
        <div className="message-text">{message.text}</div>
        
        {message.sender === 'agent' && message.sources && (
          <div className="sources-list">
            <small>Источники:</small>
            {message.sources.map((source, idx) => (
              <span key={idx} className="source-item">
                {source.title}
              </span>
            ))}
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
          
          {message.sender === 'agent' && (
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