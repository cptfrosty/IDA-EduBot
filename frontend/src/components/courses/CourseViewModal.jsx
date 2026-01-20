// components/courses/CourseViewModal.jsx
import React from 'react';
import { 
  FiUser, 
  FiCalendar, 
  FiBarChart2, 
  FiDownload, 
  FiEye, 
  FiFileText,
  FiX,
  FiUsers,
  FiPlus
} from 'react-icons/fi';

const CourseViewModal = ({ 
  course, 
  lectures = [], 
  students = [],
  onClose,
  onDownload,
  onPreview,
  downloadingFile,
  isInstructor = false,
  onAddLecture,
  onAddStudents
}) => {
  if (!course) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getStatusText = (status) => {
    const statusMap = {
      'planned': 'Запланирован',
      'active': 'Активный',
      'completed': 'Завершен',
      'cancelled': 'Отменен'
    };
    return statusMap[status] || status;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal wide-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <h3>{course.title}</h3>
            <span className={`course-status-badge ${course.status}`}>
              {getStatusText(course.status)}
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
              <p>{course.description || 'Описание отсутствует'}</p>
            </div>
            
            <div className="info-grid">
              <div className="info-item">
                <FiUser />
                <div className="info-content">
                  <span className="info-label">Преподаватель</span>
                  <span className="info-value">{course.instructor_name || course.instructor_id}</span>
                </div>
              </div>
              
              <div className="info-item">
                <FiCalendar />
                <div className="info-content">
                  <span className="info-label">Дата начала</span>
                  <span className="info-value">{formatDate(course.start_date)}</span>
                </div>
              </div>
              
              <div className="info-item">
                <FiCalendar />
                <div className="info-content">
                  <span className="info-label">Дата окончания</span>
                  <span className="info-value">{formatDate(course.end_date)}</span>
                </div>
              </div>
              
              <div className="info-item">
                <FiUsers />
                <div className="info-content">
                  <span className="info-label">Студентов</span>
                  <span className="info-value">{course.current_students || 0}/{course.max_students || 30}</span>
                </div>
              </div>
              
              <div className="info-item">
                <div className="info-content">
                  <span className="info-label">Семестр</span>
                  <span className="info-value">{course.semester || 'Не указан'}</span>
                </div>
              </div>
              
              <div className="info-item">
                <div className="info-content">
                  <span className="info-label">Аудитория</span>
                  <span className="info-value">{course.classroom || 'Не указана'}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Секция студентов (только для преподавателей) */}
          {isInstructor && (
            <div className="students-section">
              <div className="section-header">
                <h4>Студенты курса</h4>
                <div className="section-actions">
                  <button 
                    className="btn-primary small"
                    onClick={onAddStudents}
                  >
                    <FiPlus /> Добавить студентов
                  </button>
                </div>
              </div>
              
              {students.length === 0 ? (
                <div className="empty-students">
                  <p>На курс еще не записаны студенты</p>
                </div>
              ) : (
                <div className="students-list">
                  <table className="students-table">
                    <thead>
                      <tr>
                        <th>Имя</th>
                        <th>Email</th>
                        <th>Группа</th>
                        <th>Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(student => (
                        <tr key={student.user_id || student.id}>
                          <td>{student.name || 'Без имени'}</td>
                          <td>{student.email}</td>
                          <td>{student.group || 'Не указана'}</td>
                          <td>
                            <span className="student-status active">Активный</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {/* Лекции */}
          <div className="lectures-section">
            <div className="section-header">
              <h4>Лекции курса</h4>
              <div className="section-actions">
                <span className="lecture-count">({lectures.length})</span>
                {isInstructor && (
                  <button 
                    className="btn-primary small"
                    onClick={onAddLecture}
                  >
                    <FiPlus /> Добавить лекцию
                  </button>
                )}
              </div>
            </div>
            
            {lectures.length === 0 ? (
              <div className="empty-lectures">
                <p>Лекции еще не добавлены</p>
              </div>
            ) : (
              <div className="lectures-list">
                {lectures.map(lecture => (
                  <div key={lecture.material_id || lecture.id} className="lecture-card">
                    <div className="lecture-header">
                      <h5>{lecture.title}</h5>
                      {lecture.estimated_duration && (
                        <span className="lecture-duration">{lecture.estimated_duration} мин</span>
                      )}
                    </div>
                    
                    <p className="lecture-description">{lecture.description}</p>
                    
                    {lecture.file_path && (
                      <div className="lecture-file-info">
                        <div className="file-details">
                          <FiFileText />
                          <div className="file-info">
                            <span className="file-name">{lecture.original_filename || 'Файл'}</span>
                            {lecture.file_size && (
                              <span className="file-size">({Math.round(lecture.file_size / 1024)} KB)</span>
                            )}
                            {lecture.file_type && (
                              <span className="file-type"> - {lecture.file_type}</span>
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
                            className={`btn-icon ${downloadingFile === (lecture.material_id || lecture.id) ? 'loading' : ''}`}
                            onClick={() => onDownload(lecture)}
                            disabled={downloadingFile === (lecture.material_id || lecture.id)}
                            title="Скачать"
                          >
                            {downloadingFile === (lecture.material_id || lecture.id) ? (
                              <span className="spinner"></span>
                            ) : (
                              <FiDownload />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {lecture.content_text && !lecture.file_path && (
                      <div className="lecture-content">
                        <p>{lecture.content_text.substring(0, 200)}...</p>
                      </div>
                    )}
                    
                    <div className="lecture-meta">
                      {lecture.created_at && (
                        <span className="lecture-date">
                          Добавлено: {formatDate(lecture.created_at)}
                        </span>
                      )}
                      {lecture.tags && lecture.tags.length > 0 && (
                        <div className="lecture-tags">
                          {lecture.tags.map((tag, idx) => (
                            <span key={idx} className="tag">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
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
          
          {course.status === 'active' && !isInstructor && (
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
          
          {(course.status === 'active' || course.status === 'completed') && !isInstructor && (
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