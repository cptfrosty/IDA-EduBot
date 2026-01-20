import React from 'react';
import { FiUser, FiCalendar, FiBookOpen, FiCheckCircle, FiClock, FiUsers, FiEye } from 'react-icons/fi';

const CoursesTable = ({ courses = [], onViewCourse, userRole, userId }) => {
  if (!courses || courses.length === 0) {
    return (
      <div className="empty-table">
        <p>Курсы не найдены</p>
      </div>
    );
  }

  const getProgressBar = (progress) => {
    return (
      <div className="course-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="progress-text">{progress}%</span>
      </div>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Не указан';
    try {
      return new Date(dateString).toLocaleDateString('ru-RU');
    } catch (e) {
      return 'Неверная дата';
    }
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

  // Получаем компоненты курса в нужном формате
  const getCourseComponents = (course) => {
    return [
      {
        type: 'lecture',
        label: 'Лекции',
        completed: 0, // Здесь нужно получать из API
        total: 0, // Здесь нужно получать из API
        icon: <FiBookOpen />
      },
      {
        type: 'practice',
        label: 'Практика',
        completed: 0, // Здесь нужно получать из API
        total: 0, // Здесь нужно получать из API
        icon: <FiClock />
      },
      {
        type: 'students',
        label: 'Студентов',
        completed: course.current_students || 0,
        total: course.max_students || 30,
        icon: <FiUsers />
      }
    ];
  };

  return (
    <div className="courses-table-container">
      <table className="courses-table">
        <thead>
          <tr>
            <th>Курс</th>
            <th>Преподаватель</th>
            <th>Семестр</th>
            <th>Статус</th>
            <th>Прогресс</th>
            <th>Компоненты</th>
            <th>Дедлайн</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {courses.map(course => {
            const components = getCourseComponents(course);
            const statusText = getStatusText(course.status);
            const isInstructor = userRole === 'instructor' || userRole === 'admin';
            const isMyCourse = isInstructor && (course.instructor_id === userId || course.assistant_id === userId);
            
            return (
              <tr key={course.course_id || course.id} className={`course-row ${course.status === 'planned' ? 'draft' : ''}`}>
                <td className="course-title-cell">
                  <div className="course-title">
                    <strong>{course.title || 'Без названия'}</strong>
                    {course.description && (
                      <div className="course-description-small">
                        {course.description.length > 50 
                          ? `${course.description.substring(0, 50)}...` 
                          : course.description}
                      </div>
                    )}
                  </div>
                </td>
                
                <td className="course-instructor">
                  <div className="instructor-info">
                    <FiUser /> 
                    <span>{course.instructor_name || course.instructor_id || 'Не указан'}</span>
                  </div>
                </td>
                
                <td>
                  <span className="course-semester">{course.semester || 'Не указан'}</span>
                </td>
                
                <td>
                  <span className={`course-status-badge ${course.status}`}>
                    {statusText}
                  </span>
                </td>
                
                <td>
                  {getProgressBar(0)} {/* Здесь нужно получать прогресс из API */}
                </td>
                
                <td>
                  <div className="course-components-list">
                    {components.map((comp, idx) => (
                      <div key={idx} className="component-item">
                        {comp.icon}
                        <span className="component-label">{comp.label}:</span>
                        <span className="component-count">{comp.completed}/{comp.total}</span>
                      </div>
                    ))}
                  </div>
                </td>
                
                <td>
                  <div className="deadline-info">
                    <FiCalendar /> 
                    <span>{formatDate(course.end_date)}</span>
                  </div>
                </td>
                
                <td>
                  <div className="table-actions">
                    <button 
                      className="btn-primary small"
                      onClick={() => onViewCourse && onViewCourse(course)}
                    >
                      <FiEye /> Просмотр
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default CoursesTable;