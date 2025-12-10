import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { FiBarChart2, FiFileText, FiUsers, FiTrendingUp, FiActivity, FiSearch, FiClock } from 'react-icons/fi';

const AnalyticsPage = () => {
  const location = useLocation();
  const [analytics, setAnalytics] = useState({
    queries: [],
    documents: {},
    usage: {}
  });
  const [loading, setLoading] = useState(true);

  const navItems = [
    { path: '/analytics', icon: <FiBarChart2 />, label: 'Общая аналитика', exact: true },
    { path: '/analytics/queries', icon: <FiSearch />, label: 'Запросы' },
    { path: '/analytics/documents', icon: <FiFileText />, label: 'Документы' },
    { path: '/analytics/usage', icon: <FiUsers />, label: 'Использование' },
  ];

  const loadAnalytics = useCallback(async () => {
    try {
      const [queriesData, documentsData] = await Promise.all([
        apiService.system.getAnalyticsQueries(),
        apiService.system.getAnalyticsDocuments()
      ]);
      
      setAnalytics({
        queries: queriesData || [],
        documents: documentsData || {},
        usage: calculateUsageStats(queriesData || [])
      });
    } catch (error) {
      console.error('Ошибка загрузки аналитики:', error);
      // Mock данные для тестирования
      setAnalytics({
        queries: [
          { query: 'машинное обучение', timestamp: new Date().toISOString(), response_time: 1.2 },
          { query: 'нейронные сети', timestamp: new Date(Date.now() - 86400000).toISOString(), response_time: 0.8 }
        ],
        documents: {
          total_documents: 3,
          document_types: { pdf: 2, txt: 1 },
          total_size_mb: 2.5,
          processed: 3
        },
        usage: {
          totalQueries: 15,
          weeklyQueries: 8,
          avgResponseTime: 1.0,
          popularTopics: [
            { topic: 'машинное', count: 5 },
            { topic: 'обучение', count: 5 },
            { topic: 'нейронные', count: 3 },
            { topic: 'сети', count: 3 }
          ]
        }
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const calculateUsageStats = (queries) => {
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentQueries = queries.filter(q => 
      new Date(q.timestamp) > lastWeek
    );
    
    return {
      totalQueries: queries.length,
      weeklyQueries: recentQueries.length,
      avgResponseTime: queries.length > 0 ? 
        queries.reduce((sum, q) => sum + (q.response_time || 0), 0) / queries.length : 0,
      popularTopics: getPopularTopics(queries)
    };
  };

  const getPopularTopics = (queries) => {
    const topics = {};
    queries.forEach(q => {
      const words = (q.query || '').toLowerCase().split(' ');
      words.forEach(word => {
        if (word.length > 3) {
          topics[word] = (topics[word] || 0) + 1;
        }
      });
    });
    
    return Object.entries(topics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count }));
  };

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Загрузка аналитики...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Аналитика и статистика</h2>
        <p>Статистика использования системы и эффективности RAG</p>
      </div>

      <div className="analytics-overview">
        <div className="overview-card">
          <FiBarChart2 className="overview-icon" />
          <div className="overview-content">
            <h3>{analytics.usage.totalQueries}</h3>
            <p>Всего запросов</p>
          </div>
        </div>
        
        <div className="overview-card">
          <FiTrendingUp className="overview-icon" />
          <div className="overview-content">
            <h3>{analytics.usage.weeklyQueries}</h3>
            <p>Запросов за неделю</p>
          </div>
        </div>
        
        <div className="overview-card">
          <FiActivity className="overview-icon" />
          <div className="overview-content">
            <h3>{analytics.usage.avgResponseTime.toFixed(2)}s</h3>
            <p>Среднее время ответа</p>
          </div>
        </div>
        
        <div className="overview-card">
          <FiFileText className="overview-icon" />
          <div className="overview-content">
            <h3>{analytics.documents.total_documents || 0}</h3>
            <p>Документов в системе</p>
          </div>
        </div>
      </div>

      <div className="analytics-layout">
        <aside className="analytics-sidebar">
          <nav className="analytics-nav">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive(item.path, item.exact) ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            ))}
          </nav>
          
          <div className="popular-topics">
            <h4>Популярные темы</h4>
            {analytics.usage.popularTopics?.map((topic, index) => (
              <div key={index} className="topic-item">
                <span className="topic-name">{topic.topic}</span>
                <span className="topic-count">{topic.count}</span>
              </div>
            ))}
          </div>
        </aside>

        <main className="analytics-content">
          {/* Общая аналитика */}
          {isActive('/analytics', true) && (
            <div className="analytics-dashboard">
              <h3>Общая статистика</h3>
              
              <div className="analytics-grid">
                <div className="analytics-card">
                  <h4>Активность запросов</h4>
                  <div className="activity-chart">
                    <div className="activity-bars">
                      {[5, 8, 12, 7, 9, 11, 6].map((height, index) => (
                        <div 
                          key={index} 
                          className="activity-bar" 
                          style={{ height: `${height * 10}px` }}
                        />
                      ))}
                    </div>
                    <div className="activity-labels">
                      <span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span>
                      <span>Пт</span><span>Сб</span><span>Вс</span>
                    </div>
                  </div>
                </div>
                
                <div className="analytics-card">
                  <h4>Последние запросы</h4>
                  <div className="recent-queries">
                    {analytics.queries.slice(0, 5).map((query, index) => (
                      <div key={index} className="query-item">
                        <div className="query-text">{query.query}</div>
                        <div className="query-meta">
                          <FiClock />
                          <span>{new Date(query.timestamp).toLocaleTimeString('ru-RU')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Аналитика запросов */}
          {isActive('/analytics/queries') && !isActive('/analytics', true) && (
            <div className="queries-analytics">
              <h3>Аналитика запросов</h3>
              <p>Детальная статистика поисковых запросов</p>
              <div className="analytics-card">
                <p>Здесь будет детальная статистика по запросам...</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AnalyticsPage;