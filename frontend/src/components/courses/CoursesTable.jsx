import React from 'react';
import { FiUser, FiCalendar } from 'react-icons/fi'; // Удалили FiClock

const CoursesTable = ({ courses }) => {
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
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  return (
    <table className="courses-table">
      <thead>
        <tr>
          <th>Курс</th>
          <th>Преподаватель</th>
          <th>Прогресс</th>
          <th>Компоненты</th>
          <th>Дедлайн</th>
        </tr>
      </thead>
      <tbody>
        {courses.map(course => (
          <tr key={course.id}>
            <td>
              <strong>{course.title}</strong>
            </td>
            <td>
              <FiUser /> {course.instructor}
            </td>
            <td>
              {getProgressBar(course.progress)}
            </td>
            <td>
              <div className="course-components">
                {course.components.map((comp, idx) => (
                  <span key={idx} className="component-badge">
                    {comp.type === 'lecture' ? 'Лекции' :
                     comp.type === 'practice' ? 'Практика' : 'Тесты'}: {comp.completed}/{comp.total}
                  </span>
                ))}
              </div>
            </td>
            <td>
              <div className="deadline-info">
                <FiCalendar /> {formatDate(course.deadline)}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default CoursesTable;