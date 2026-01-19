import React from 'react';
import { FiUser, FiCalendar, FiBookOpen, FiCheckCircle, FiClock } from 'react-icons/fi';

const CoursesTable = ({ courses = [] }) => {
  // Если нет курсов или пустой массив
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

  // Получаем компоненты курса в нужном формате
  const getCourseComponents = (course) => {
    return [
      {
        type: 'lecture',
        label: 'Лекции',
        completed: course.lectures_completed || 0,
        total: course.lectures_total || 0,
        icon: <FiBookOpen />
      },
      {
        type: 'practice',
        label: 'Практика',
        completed: course.practice_completed || 0,
        total: course.practice_total || 0,
        icon: <FiClock />
      },
      {
        type: 'test',
        label: 'Тесты',
        completed: course.tests_completed || 0,
        total: course.tests_total || 0,
        icon: <FiCheckCircle />
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
            <th>Статус</th>
            <th>Прогресс</th>
            <th>Компоненты</th>
            <th>Дедлайн</th>
          </tr>
        </thead>
        <tbody>
          {courses.map(course => {
            const components = getCourseComponents(course);
            const statusText = course.is_published === false ? 'Черновик' : 
                             course.status === 'active' ? 'Активный' :
                             course.status === 'completed' ? 'Завершен' : 'Доступен';
            
            return (
              <tr key={course.id} className={`course-row ${course.is_published === false ? 'draft' : ''}`}>
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
                    <span>{course.instructor || 'Не указан'}</span>
                  </div>
                </td>
                
                <td>
                  <span className={`course-status-badge ${course.status}`}>
                    {statusText}
                  </span>
                </td>
                
                <td>
                  {getProgressBar(course.progress || 0)}
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
                    <span>{formatDate(course.deadline)}</span>
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