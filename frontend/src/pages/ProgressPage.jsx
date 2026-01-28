import React, { useState, useEffect } from 'react';
import { FiTrendingUp, FiClock, FiCheckCircle, FiAward, FiBarChart2, FiTarget } from 'react-icons/fi';
import { apiService } from "../services/api";


const ProgressPage = () => {
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');

  useEffect(() => {
    loadProgressData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const loadProgressData = async () => {
    setLoading(true);
    try {
      const data = await apiService.progress.get(timeRange);
      setProgressData(data);
    } catch (e) {
      console.error("Ошибка загрузки прогресса:", e);
      setProgressData({
        overallProgress: 0,
        stats: { hoursStudied: 0, materialsCompleted: 0, testsPassed: 0, averageScore: 0 },
        recommendations: ["Не удалось загрузить прогресс. Проверьте сервер."],
        courses: []
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Загрузка прогресса...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Прогресс обучения</h2>
        <p>Статистика и рекомендации для эффективного обучения</p>
      </div>

      <div className="time-range-selector">
        <button 
          className={`time-button ${timeRange === 'week' ? 'active' : ''}`}
          onClick={() => setTimeRange('week')}
        >
          Неделя
        </button>
        <button 
          className={`time-button ${timeRange === 'month' ? 'active' : ''}`}
          onClick={() => setTimeRange('month')}
        >
          Месяц
        </button>
        <button 
          className={`time-button ${timeRange === 'year' ? 'active' : ''}`}
          onClick={() => setTimeRange('year')}
        >
          Год
        </button>
        <button 
          className={`time-button ${timeRange === 'all' ? 'active' : ''}`}
          onClick={() => setTimeRange('all')}
        >
          Все время
        </button>
      </div>

      <div className="overall-progress">
        <div className="progress-card">
          <h3>Общий прогресс</h3>
          <div className="progress-circle">
            <div className="progress-value">{progressData?.overallProgress || 0}%</div>
          </div>
          <p className="progress-description">
            {progressData?.overallProgress === 0 
              ? 'Начните обучение для отслеживания прогресса' 
              : `Вы завершили ${progressData.overallProgress}% от общей программы`}
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <FiClock className="stat-icon" />
          <div className="stat-value">{progressData?.stats.hoursStudied || 0}</div>
          <div className="stat-label">Часов изучено</div>
        </div>
        
        <div className="stat-card">
          <FiCheckCircle className="stat-icon" />
          <div className="stat-value">{progressData?.stats.materialsCompleted || 0}</div>
          <div className="stat-label">Материалов завершено</div>
        </div>
        
        <div className="stat-card">
          <FiAward className="stat-icon" />
          <div className="stat-value">{progressData?.stats.testsPassed || 0}</div>
          <div className="stat-label">Тестов пройдено</div>
        </div>
        
        <div className="stat-card">
          <FiTrendingUp className="stat-icon" />
          <div className="stat-value">{progressData?.stats.averageScore || 0}</div>
          <div className="stat-label">Средний балл</div>
        </div>
      </div>

      <div className="progress-charts">
        <div className="chart-card">
          <h3>Активность по дням</h3>
          <div className="chart-placeholder">
            <FiBarChart2 size={48} />
            <p>График активности появится после начала обучения</p>
          </div>
        </div>
        
        <div className="chart-card">
          <h3>Распределение по темам</h3>
          <div className="chart-placeholder">
            <FiTarget size={48} />
            <p>Данные о темах появятся после изучения материалов</p>
          </div>
        </div>
      </div>

      {progressData?.recommendations && progressData.recommendations.length > 0 && (
        <div className="recommendations-section">
          <h3>
            <FiTrendingUp /> Рекомендации
          </h3>
          <div className="recommendations-list">
            {progressData.recommendations.map((rec, index) => (
              <div key={index} className="recommendation-item">
                <FiCheckCircle className="rec-icon" />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="achievements-section">
        <h3>
          <FiAward /> Достижения
        </h3>
        <div className="achievements-grid">
          <div className="achievement-badge locked">
            <span className="badge-icon">📚</span>
            <span className="badge-title">Первый шаг</span>
            <span className="badge-desc">Начните изучение</span>
          </div>
          <div className="achievement-badge locked">
            <span className="badge-icon">⏱️</span>
            <span className="badge-title">Усердный ученик</span>
            <span className="badge-desc">1 час обучения</span>
          </div>
          <div className="achievement-badge locked">
            <span className="badge-icon">🎯</span>
            <span className="badge-title">Первый тест</span>
            <span className="badge-desc">Пройдите тест</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressPage;