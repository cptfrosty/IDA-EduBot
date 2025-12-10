import React, { useState } from 'react';
import { FiSend, FiPaperclip, FiMic, FiSmile } from 'react-icons/fi';

const InputPanel = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="input-panel">
      <form onSubmit={handleSubmit}>
        <div className="input-area">
          <textarea
            className="message-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Введите ваш вопрос..."
            rows={2}
          />
          <button type="submit" className="send-button">
            <FiSend />
          </button>
        </div>

        <div className="input-controls">
          <button type="button" className="icon-button">
            <FiPaperclip />
          </button>
          <button type="button" className="icon-button">
            <FiMic />
          </button>
          <button type="button" className="icon-button">
            <FiSmile />
          </button>
          <div className="input-hint">
            Нажмите Enter для отправки, Shift+Enter для новой строки
          </div>
        </div>
      </form>
    </div>
  );
};

export default InputPanel;