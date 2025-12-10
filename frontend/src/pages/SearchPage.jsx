import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { FiSearch, FiClock, FiFileText, FiBarChart2 } from 'react-icons/fi';

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const response = await apiService.search.search(query);
      setResults(response.results || []);
      
      // Добавляем в историю
      const newSearch = {
        query,
        timestamp: new Date().toISOString(),
        resultsCount: response.results?.length || 0
      };
      setSearchHistory(prev => [newSearch, ...prev.slice(0, 9)]);
      
      // Сохраняем в localStorage
      const savedHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
      savedHistory.unshift(newSearch);
      localStorage.setItem('searchHistory', JSON.stringify(savedHistory.slice(0, 10)));
    } catch (error) {
      console.error('Ошибка поиска:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = async (value) => {
    setQuery(value);
    if (value.trim().length > 2) {
      try {
        const response = await apiService.search.getSuggestions(value);
        setSuggestions(response.suggestions || []);
      } catch (error) {
        console.error('Ошибка получения подсказок:', error);
      }
    } else {
      setSuggestions([]);
    }
  };

  useEffect(() => {
    // Загружаем историю поиска
    const savedHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    setSearchHistory(savedHistory);
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Поиск по документам</h2>
        <p>Ищите информацию в загруженных документах с помощью семантического поиска</p>
      </div>

      <div className="search-container">
        {/* Поисковая строка */}
        <div className="search-box-wrapper">
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-input-group">
              <FiSearch className="search-icon" />
              <input
                type="text"
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Введите поисковый запрос..."
                className="search-input"
                autoFocus
              />
              <button 
                type="submit" 
                className="search-button"
                disabled={isSearching || !query.trim()}
              >
                {isSearching ? 'Поиск...' : 'Найти'}
              </button>
            </div>
          </form>

          {/* Подсказки */}
          {suggestions.length > 0 && (
            <div className="suggestions-box">
              {suggestions.map((suggestion, index) => (
                <div 
                  key={index}
                  className="suggestion-item"
                  onClick={() => {
                    setQuery(suggestion);
                    handleSearch();
                  }}
                >
                  <FiSearch size={14} />
                  <span>{suggestion}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Результаты поиска */}
        {results.length > 0 && (
          <div className="search-results-section">
            <h3>
              <FiSearch />
              Найдено {results.length} результатов
            </h3>
            
            <div className="results-grid">
              {results.map((result, index) => (
                <div key={index} className="result-card">
                  <div className="result-header">
                    <FiFileText className="result-icon" />
                    <div className="result-meta">
                      <span className="document-name">{result.document_name || 'Документ'}</span>
                      <span className="confidence">
                        <FiBarChart2 /> {(result.score * 100).toFixed(1)}% релевантности
                      </span>
                    </div>
                  </div>
                  
                  <div className="result-content">
                    {result.content}
                  </div>
                  
                  {result.metadata && (
                    <div className="result-metadata">
                      {Object.entries(result.metadata).map(([key, value]) => (
                        <span key={key} className="metadata-tag">
                          {key}: {value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* История поиска */}
        {searchHistory.length > 0 && (
          <div className="search-history-section">
            <h3>
              <FiClock />
              История поиска
            </h3>
            <div className="history-list">
              {searchHistory.map((item, index) => (
                <div key={index} className="history-item">
                  <div className="history-query" onClick={() => setQuery(item.query)}>
                    {item.query}
                  </div>
                  <div className="history-details">
                    <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{item.resultsCount} результатов</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;