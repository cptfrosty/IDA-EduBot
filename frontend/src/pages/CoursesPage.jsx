import React, { useState, useEffect } from 'react';
import { FiBookOpen, FiUser, FiCalendar, FiCheckCircle, FiClock, FiBarChart2 } from 'react-icons/fi';

const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    // TODO: Заменить на реальный API вызов
    // loadCourses();
    setTimeout(() => {
      setCourses([]); // Пока пустой список
      setLoading(false);
    }, 500);
  }, []);

  const loadCourses = async () => {
    // TODO: Реализовать загрузку курсов с бэкенда
    // const response = await apiService.courses.list();
    // setCourses(response);
    setLoading(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Загрузка курсов...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Мои курсы</h2>
        <p>Управление и отслеживание учебных курсов</p>
      </div>

      <div className="courses-tabs">
        <button 
          className={`tab-button ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Активные курсы
        </button>
        <button 
          className={`tab-button ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Завершенные
        </button>
        <button 
          className={`tab-button ${activeTab === 'available' ? 'active' : ''}`}
          onClick={() => setActiveTab('available')}
        >
          Доступные
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="empty-state">
          <FiBookOpen size={48} />
          <h4>Курсы пока не добавлены</h4>
          <p>Начните изучение нового курса для отслеживания прогресса</p>
          <button className="btn-primary">
            Найти курсы
          </button>
        </div>
      ) : (
        <div className="courses-grid">
          {courses.map(course => (
            <div key={course.id} className="course-card">
              <div className="course-header">
                <h3>{course.title}</h3>
                <span className={`course-status ${course.status}`}>
                  {course.status === 'active' ? 'Активный' : 
                   course.status === 'completed' ? 'Завершен' : 'Доступен'}
                </span>
              </div>
              
              <div className="course-info">
                <div className="info-item">
                  <FiUser />
                  <span>{course.instructor}</span>
                </div>
                <div className="info-item">
                  <FiCalendar />
                  <span>До {formatDate(course.deadline)}</span>
                </div>
              </div>
              
              <div className="course-progress">
                <div className="progress-header">
                  <span>Прогресс</span>
                  <span>{course.progress}%</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
              </div>
              
              <div className="course-components">
                <div className="component">
                  <FiBookOpen />
                  <span>Лекции: {course.lectures_completed}/{course.lectures_total}</span>
                </div>
                <div className="component">
                  <FiCheckCircle />
                  <span>Тесты: {course.tests_completed}/{course.tests_total}</span>
                </div>
                <div className="component">
                  <FiClock />
                  <span>Практика: {course.practice_completed}/{course.practice_total}</span>
                </div>
              </div>
              
              <div className="course-actions">
                <button className="btn-primary">
                  {course.status === 'active' ? 'Продолжить' : 'Начать'}
                </button>
                <button className="btn-secondary">
                  <FiBarChart2 /> Детали
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CoursesPage;