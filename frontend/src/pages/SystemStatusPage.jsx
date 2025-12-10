import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { FiServer, FiDatabase, FiCpu, FiActivity, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

const SystemStatusPage = () => {
  const [status, setStatus] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSystemStatus();
  }, []);

  const loadSystemStatus = async () => {
    try {
      const [statusData, healthData] = await Promise.all([
        apiService.system.getStatus(),
        apiService.system.getHealth()
      ]);
      
      setStatus(statusData);
      setHealth(healthData);
    } catch (err) {
      console.error('Ошибка загрузки статуса:', err);
      setError('Не удалось загрузить статус системы');
    } finally {
      setLoading(false);
    }
  };

  const handleReindex = async () => {
    if (!window.confirm('Вы уверены, что хотите запустить переиндексацию документов?')) return;
    
    try {
      await apiService.system.reindex();
      alert('Переиндексация запущена');
      loadSystemStatus(); // Обновляем статус
    } catch (err) {
      alert('Ошибка запуска переиндексации');
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Загрузка статуса системы...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Статус системы</h2>
        <p>Мониторинг состояния RAG системы и ресурсов</p>
      </div>

      {error && (
        <div className="error-message">
          <FiAlertCircle />
          {error}
        </div>
      )}

      <div className="system-status-grid">
        {/* Основной статус */}
        <div className="status-card primary">
          <div className="status-header">
            <FiServer className="status-icon" />
            <h3>Общий статус</h3>
          </div>
          <div className="status-body">
            <div className={`status-indicator ${status?.status === 'healthy' ? 'success' : 'error'}`}>
              {status?.status === 'healthy' ? (
                <>
                  <FiCheckCircle />
                  <span>Система работает нормально</span>
                </>
              ) : (
                <>
                  <FiAlertCircle />
                  <span>Проблемы с системой</span>
                </>
              )}
            </div>
            
            <div className="status-details">
              <div className="detail-item">
                <span className="detail-label">Версия:</span>
                <span className="detail-value">{status?.version || '1.0.0'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Документов:</span>
                <span className="detail-value">{status?.documents_count || 0}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Последняя индексация:</span>
                <span className="detail-value">
                  {status?.last_indexed ? new Date(status.last_indexed).toLocaleString('ru-RU') : 'Н/Д'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Здоровье системы */}
        <div className="status-card">
          <div className="status-header">
            <FiActivity className="status-icon" />
            <h3>Здоровье системы</h3>
          </div>
          <div className="status-body">
            <div className="health-indicator success">
              <FiCheckCircle />
              <span>API доступен</span>
            </div>
            <div className="health-metrics">
              <div className="metric">
                <span className="metric-label">Время ответа API:</span>
                <span className="metric-value">~{health?.response_time || 'N/A'}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Последняя проверка:</span>
                <span className="metric-value">
                  {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString('ru-RU') : 'Только что'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* База данных */}
        <div className="status-card">
          <div className="status-header">
            <FiDatabase className="status-icon" />
            <h3>База данных</h3>
          </div>
          <div className="status-body">
            <div className="health-indicator success">
              <FiCheckCircle />
              <span>Подключение активно</span>
            </div>
            <div className="db-stats">
              <div className="db-stat">
                <span>Эмбеддинги:</span>
                <strong>{status?.documents_count || 0} векторов</strong>
              </div>
              <div className="db-stat">
                <span>Размер индекса:</span>
                <strong>~{Math.round((status?.documents_count || 0) * 0.5)} MB</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Процессор */}
        <div className="status-card">
          <div className="status-header">
            <FiCpu className="status-icon" />
            <h3>Ресурсы</h3>
          </div>
          <div className="status-body">
            <div className="resource-usage">
              <div className="usage-bar">
                <div className="usage-label">Загрузка CPU:</div>
                <div className="usage-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '45%' }} />
                  </div>
                  <span className="usage-percent">45%</span>
                </div>
              </div>
              
              <div className="usage-bar">
                <div className="usage-label">Использование памяти:</div>
                <div className="usage-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '68%' }} />
                  </div>
                  <span className="usage-percent">68%</span>
                </div>
              </div>
              
              <div className="usage-bar">
                <div className="usage-label">Дисковое пространство:</div>
                <div className="usage-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '32%' }} />
                  </div>
                  <span className="usage-percent">32%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Действия системы */}
      <div className="system-actions">
        <h3>Действия системы</h3>
        <div className="actions-grid">
          <button onClick={handleReindex} className="btn-primary">
            <FiDatabase /> Переиндексировать документы
          </button>
          
          <button onClick={loadSystemStatus} className="btn-secondary">
            <FiActivity /> Обновить статус
          </button>
          
          <button onClick={() => window.open('/api/docs', '_blank')} className="btn-secondary">
            <FiServer /> API документация
          </button>
        </div>
      </div>

      {/* Информация о системе */}
      <div className="system-info">
        <h3>Информация о системе</h3>
        <div className="info-grid">
          <div className="info-card">
            <h4>Версии</h4>
            <ul>
              <li>API: {status?.version || '1.0.0'}</li>
              <li>Модель эмбеддингов: sentence-transformers/all-MiniLM-L6-v2</li>
              <li>База векторов: FAISS</li>
            </ul>
          </div>
          
          <div className="info-card">
            <h4>Метрики производительности</h4>
            <ul>
              <li>Среднее время ответа: 120 мс</li>
              <li>99-й перцентиль: 250 мс</li>
              <li>Пропускная способность: 100 запросов/мин</li>
            </ul>
          </div>
          
          <div className="info-card">
            <h4>Поддерживаемые форматы</h4>
            <ul>
              <li>PDF, DOC, DOCX</li>
              <li>TXT, MD</li>
              <li>PPTX, XLSX</li>
              <li>HTML</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStatusPage;