import React from 'react';
import MessageItem from './MessageItem';
import SearchResults from './SearchResults';

const MessageList = ({ messages, searchResults, isLoading }) => {
  // Нормализуем searchResults, чтобы всегда был массив
  const resultsArray = Array.isArray(searchResults)
    ? searchResults
    : Array.isArray(searchResults?.results)
      ? searchResults.results
      : Array.isArray(searchResults?.data)
        ? searchResults.data
        : [];

  return (
    <div className="message-list">
      {/* Результаты поиска (если есть) */}
      {resultsArray.length > 0 && (
        <SearchResults results={resultsArray} />
      )}

      {/* Сообщения */}
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}

      {/* Индикатор загрузки */}
      {isLoading && (
        <div className="loading-message">
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p>ИИ печатает...</p>
        </div>
      )}
    </div>
  );
};

export default MessageList;
