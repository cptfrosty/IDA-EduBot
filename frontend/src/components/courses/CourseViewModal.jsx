// components/courses/CourseViewModal.jsx
import React from 'react';
import { 
  FiUser, 
  FiCalendar, 
  FiBarChart2, 
  FiDownload, 
  FiEye, 
  FiFileText,
  FiX
} from 'react-icons/fi';

const CourseViewModal = ({ 
  course, 
  lectures = [], 
  onClose,
  onDownload,
  onPreview,
  downloadingFile 
}) => {
  if (!course) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getStatusText = (status, isPublished) => {
    if (!isPublished) return 'Черновик';
    switch(status) {
      case 'active': return 'Активный';
      case 'completed': return 'Завершен';
      case 'available': return 'Доступен';
      default: return 'Неизвестно';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal wide-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <h3>{course.title}</h3>
            <span className={`course-status-badge ${course.status}`}>
              {getStatusText(course.status, course.is_published)}
            </span>
          </div>
          <button className="close-button" onClick={onClose}>
            <FiX />
          </button>
        </div>
        
        <div className="modal-body">
          <div className="course-info-full">
            <div className="info-section">
              <h4>Описание курса</h4>
              <p>{course.description}</p>
            </div>
            
            <div className="info-grid">
              <div className="info-item">
                <FiUser />
                <div className="info-content">
                  <span className="info-label">Преподаватель</span>
                  <span className="info-value">{course.instructor}</span>
                </div>
              </div>
              
              <div className="info-item">
                <FiCalendar />
                <div className="info-content">
                  <span className="info-label">Дедлайн</span>
                  <span className="info-value">{formatDate(course.deadline)}</span>
                </div>
              </div>
              
              <div className="info-item">
                <FiBarChart2 />
                <div className="info-content">
                  <span className="info-label">Прогресс</span>
                  <span className="info-value">{course.progress}%</span>
                </div>
              </div>
              
              <div className="info-item">
                <div className="info-content">
                  <span className="info-label">Лекции</span>
                  <span className="info-value">{course.lectures_completed}/{course.lectures_total}</span>
                </div>
              </div>
            </div>
            
            {/* Прогресс бар */}
            <div className="progress-section">
              <div className="progress-header">
                <span>Общий прогресс</span>
                <span>{course.progress}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${course.progress}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Лекции */}
          <div className="lectures-section">
            <div className="section-header">
              <h4>Лекции курса</h4>
              <span className="lecture-count">({lectures.length})</span>
            </div>
            
            {lectures.length === 0 ? (
              <div className="empty-lectures">
                <p>Лекции еще не добавлены</p>
              </div>
            ) : (
              <div className="lectures-list">
                {lectures.map(lecture => (
                  <div key={lecture.id} className="lecture-card">
                    <div className="lecture-header">
                      <div className="lecture-number">
                        Лекция {lecture.order}
                      </div>
                      <h5>{lecture.title}</h5>
                      {lecture.duration && (
                        <span className="lecture-duration">{lecture.duration}</span>
                      )}
                    </div>
                    
                    <p className="lecture-description">{lecture.description}</p>
                    
                    {lecture.file_url && (
                      <div className="lecture-file-info">
                        <div className="file-details">
                          <FiFileText />
                          <div className="file-info">
                            <span className="file-name">{lecture.file_name}</span>
                            {lecture.file_size && (
                              <span className="file-size">{lecture.file_size}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="file-actions">
                          <button 
                            className="btn-icon"
                            onClick={() => onPreview(lecture)}
                            title="Просмотреть"
                          >
                            <FiEye />
                          </button>
                          <button 
                            className={`btn-icon ${downloadingFile === lecture.id ? 'loading' : ''}`}
                            onClick={() => onDownload(lecture)}
                            disabled={downloadingFile === lecture.id}
                            title="Скачать"
                          >
                            {downloadingFile === lecture.id ? (
                              <span className="spinner"></span>
                            ) : (
                              <FiDownload />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            className="btn-secondary"
            onClick={onClose}
          >
            Закрыть
          </button>
          
          {course.status === 'available' && course.is_published && (
            <button 
              className="btn-primary"
              onClick={() => {
                alert('Вы успешно записались на курс!');
                onClose();
              }}
            >
              Записаться на курс
            </button>
          )}
          
          {(course.status === 'active' || course.status === 'completed') && (
            <button 
              className="btn-primary"
              onClick={() => {
                alert('Переход к следующей лекции...');
              }}
            >
              Продолжить обучение
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseViewModal;