import React from 'react';
import { FiPlay, FiBook, FiFileText, FiStar } from 'react-icons/fi';

const MaterialCard = ({ material }) => {
  const getTypeIcon = (type) => {
    switch (type) {
      case 'video': return <FiPlay />;
      case 'practice': return <FiBook />;
      case 'test': return <FiFileText />;
      default: return <FiBook />;
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner': return 'var(--success-color)';
      case 'intermediate': return 'var(--primary-color)';
      case 'advanced': return 'var(--warning-color)';
      default: return '#666';
    }
  };

  return (
    <div className="material-card">
      <div className="material-header">
        <span className={`material-type type-${material.type}`}>
          {getTypeIcon(material.type)} {material.type === 'video' ? 'Видео' : 
           material.type === 'practice' ? 'Практика' : 'Тест'}
        </span>
        <span 
          className="difficulty"
          style={{ color: getDifficultyColor(material.difficulty) }}
        >
          {material.difficulty === 'beginner' ? 'Начальный' :
           material.difficulty === 'intermediate' ? 'Средний' : 'Продвинутый'}
        </span>
      </div>

      <h4 className="material-title">{material.title}</h4>

      <div className="material-meta">
        <span>{material.duration}</span>
        <span>•</span>
        <span>{material.size}</span>
      </div>

      <div className="progress-container">
        <div className="progress-bar">
          <div className={`progress-fill progress-${material.progress}`} />
        </div>
        <span className="progress-text">{material.progress}% завершено</span>
      </div>

      <div className="material-footer">
        <div className="rating">
          <FiStar className="star-icon" />
          <span>{material.rating}/5</span>
        </div>
        <button className="action-button">
          {material.progress === 100 ? 'Повторить' : 'Продолжить'}
        </button>
      </div>
    </div>
  );
};

export default MaterialCard;