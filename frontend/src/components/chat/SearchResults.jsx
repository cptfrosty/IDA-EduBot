import React from 'react';

const SearchResults = ({ results }) => {
  if (!results || results.length === 0) return null;

  return (
    <div className="search-results">
      <div className="search-results-header">
        Найдено документов: {results.length}
      </div>

      <div className="search-results-list">
        {results.map((item, index) => (
          <div key={index} className="search-result-item">
            <div className="search-result-title">
              {item.title || item.filename || 'Документ'}
            </div>

            {item.content && (
              <div className="search-result-snippet">
                {item.content.length > 200
                  ? item.content.slice(0, 200) + '…'
                  : item.content}
              </div>
            )}

            {item.score !== undefined && (
              <div className="search-result-score">
                Релевантность: {(Number(item.score) * 100).toFixed(0)}%
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchResults;
