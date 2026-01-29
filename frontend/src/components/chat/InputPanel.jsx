import React, { useState } from 'react';
import { FiSend, FiSearch } from 'react-icons/fi';

const InputPanel = ({ onSendMessage, onSearch, isLoading }) => {
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading) return;
    const text = message.trim();
    if (!text) return;
    onSendMessage(text);
    setMessage('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!onSearch || isLoading) return;
    const q = searchQuery.trim();
    if (!q) return;
    onSearch(q);
  };

  return (
    <div className="input-panel">
      <form onSubmit={handleSubmit}>
        <div className="input-area">
          <textarea
            className="message-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isLoading ? "Подождите..." : "Введите ваш вопрос..."}
            rows={2}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="send-button"
            disabled={isLoading || !message.trim()}
            title="Отправить"
          >
            <FiSend />
          </button>
        </div>
      </form>

      {onSearch && (
        <form onSubmit={handleSearch} className="search-row" style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <input
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по документам…"
            disabled={isLoading}
            style={{ flex: 1 }}
          />
          <button
            type="submit"
            className="btn-secondary"
            disabled={isLoading || !searchQuery.trim()}
            title="Искать"
          >
            <FiSearch />
          </button>
        </form>
      )}

      <div className="input-hint">
        Enter — отправить, Shift+Enter — новая строка
      </div>
    </div>
  );
};

export default InputPanel;