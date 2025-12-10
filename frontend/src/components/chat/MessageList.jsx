import React from 'react';
import MessageItem from './MessageItem';

const MessageList = ({ messages, onRateMessage, searchResults }) => {
  if (messages.length === 0) {
    return (
      <div className="message-list">
        <div className="empty-chat">
          <p>Начните диалог с ИИ-ассистентом</p>
          <p className="hint">Задайте вопрос по учебному материалу</p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map(message => (
        <MessageItem 
          key={message.id} 
          message={message} 
          onRate={onRateMessage}
        />
      ))}
      
      {/* Search Results */}
      {searchResults && searchResults.length > 0 && (
        <div className="search-results">
          <h4>Результаты поиска:</h4>
          {searchResults.slice(0, 3).map((result, index) => (
            <div key={index} className="search-result-item">
              <div className="search-result-content">
                {result.content || result.text}
              </div>
              {result.score && (
                <div className="search-result-meta">
                  <span>Релевантность: {(result.score * 100).toFixed(1)}%</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageList;