import React, { useState, useEffect } from 'react';
import { FiBook, FiVideo, FiFileText, FiPlayCircle, FiBarChart2, FiClock, FiFilter } from 'react-icons/fi';

const MaterialsPage = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    // TODO: Заменить на реальный API вызов
    // loadMaterials();
    setTimeout(() => {
      setMaterials([]); // Пока пустой список
      setLoading(false);
    }, 500);
  }, []);

  const loadMaterials = async () => {
    // TODO: Реализовать загрузку материалов с бэкенда
    // const response = await apiService.materials.list();
    // setMaterials(response);
    setLoading(false);
  };

  const filteredMaterials = materials.filter(material => {
    if (filter !== 'all' && material.type !== filter) return false;
    if (search && !material.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Загрузка материалов...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Учебные материалы</h2>
        <p>Доступ к курсам, видео, практикам и тестам</p>
      </div>

      <div className="materials-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Поиск материалов..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="filter-buttons">
          <button 
            className={`filter-button ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            <FiFilter /> Все
          </button>
          <button 
            className={`filter-button ${filter === 'video' ? 'active' : ''}`}
            onClick={() => setFilter('video')}
          >
            <FiVideo /> Видео
          </button>
          <button 
            className={`filter-button ${filter === 'article' ? 'active' : ''}`}
            onClick={() => setFilter('article')}
          >
            <FiBook /> Статьи
          </button>
          <button 
            className={`filter-button ${filter === 'test' ? 'active' : ''}`}
            onClick={() => setFilter('test')}
          >
            <FiFileText /> Тесты
          </button>
        </div>
      </div>

      {filteredMaterials.length === 0 ? (
        <div className="empty-state">
          <FiBook size={48} />
          <h4>Материалы не найдены</h4>
          <p>Измените параметры поиска или загрузите новые материалы</p>
          <button className="btn-primary">
            Загрузить материалы
          </button>
        </div>
      ) : (
        <div className="materials-grid">
          {filteredMaterials.map(material => (
            <div key={material.id} className="material-card">
              <div className="material-header">
                <div className="material-type">
                  {material.type === 'video' ? <FiVideo /> : 
                   material.type === 'article' ? <FiBook /> : <FiFileText />}
                  <span>{material.type === 'video' ? 'Видео' : 
                         material.type === 'article' ? 'Статья' : 'Тест'}</span>
                </div>
                <span className={`difficulty ${material.difficulty}`}>
                  {material.difficulty === 'beginner' ? 'Начинающий' :
                   material.difficulty === 'intermediate' ? 'Средний' : 'Продвинутый'}
                </span>
              </div>
              
              <h3 className="material-title">{material.title}</h3>
              
              <div className="material-meta">
                <div className="meta-item">
                  <FiClock />
                  <span>{material.duration || '30 мин'}</span>
                </div>
                <div className="meta-item">
                  <FiBarChart2 />
                  <span>{material.rating || 4.5}/5</span>
                </div>
              </div>
              
              <div className="material-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${material.progress || 0}%` }}
                  />
                </div>
                <span className="progress-text">{material.progress || 0}% завершено</span>
              </div>
              
              <div className="material-actions">
                <button className="btn-primary">
                  <FiPlayCircle /> {material.progress > 0 ? 'Продолжить' : 'Начать'}
                </button>
                <button className="btn-secondary">
                  Подробнее
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MaterialsPage;