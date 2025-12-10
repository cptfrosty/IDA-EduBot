import React from 'react';
import { FiTrendingUp, FiClock, FiCheckCircle, FiAward } from 'react-icons/fi';

const ProgressDashboard = ({ progress }) => {
  return (
    <div className="progress-dashboard">
      <div className="stats-grid">
        <div className="stat-card">
          <FiClock className="stat-icon" />
          <div className="stat-value">{progress.stats.hoursStudied}</div>
          <div className="stat-label">Часов изучено</div>
        </div>
        
        <div className="stat-card">
          <FiCheckCircle className="stat-icon" />
          <div className="stat-value">{progress.stats.materialsCompleted}</div>
          <div className="stat-label">Материалов завершено</div>
        </div>
        
        <div className="stat-card">
          <FiAward className="stat-icon" />
          <div className="stat-value">{progress.stats.testsPassed}</div>
          <div className="stat-label">Тестов пройдено</div>
        </div>
        
        <div className="stat-card">
          <FiTrendingUp className="stat-icon" />
          <div className="stat-value">{progress.stats.averageScore}</div>
          <div className="stat-label">Средний балл</div>
        </div>
      </div>

      <div className="recommendations-section">
        <h3>Рекомендации</h3>
        <ul className="recommendations-list">
          {progress.recommendations.map((rec, index) => (
            <li key={index} className="recommendation-item">
              <FiCheckCircle className="rec-icon" />
              {rec}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ProgressDashboard;