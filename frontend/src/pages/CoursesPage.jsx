import React, { useState, useEffect } from 'react';
import { 
  FiBookOpen, 
  FiUser, 
  FiCalendar, 
  FiCheckCircle, 
  FiClock, 
  FiBarChart2, 
  FiPlus, 
  FiEdit2, 
  FiTrash2,
  FiMoreVertical,
  FiUpload,
  FiGrid,
  FiList,
  FiDownload,
  FiEye,
  FiFileText
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import CoursesTable from '../components/courses/CoursesTable';

const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [viewMode, setViewMode] = useState('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAddLectureModal, setShowAddLectureModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [downloadingFile, setDownloadingFile] = useState(null);
  
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    instructor: '',
    duration: 0,
    category: 'programming'
  });
  const [newLecture, setNewLecture] = useState({
    title: '',
    description: '',
    order: 1
  });
  const [uploadingFile, setUploadingFile] = useState(null);

  const { user } = useAuth();
  const userRole = user?.role || 'student';
  const isAdmin = userRole === 'admin' || userRole === 'teacher';

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    filterCourses();
  }, [courses, activeTab]);

  const loadCourses = async () => {
    try {
      setTimeout(() => {
        const mockCourses = [
          {
            id: 1,
            title: 'Основы Python',
            description: 'Введение в программирование на Python от основ до продвинутых тем',
            instructor: 'Иван Иванов',
            status: 'active',
            progress: 65,
            deadline: '2024-12-31',
            lectures_completed: 8,
            lectures_total: 12,
            tests_completed: 3,
            tests_total: 5,
            practice_completed: 2,
            practice_total: 4,
            created_by: user?.id,
            is_published: true,
            category: 'programming',
            lectures: [
              {
                id: 1,
                title: 'Введение в Python',
                description: 'Основы синтаксиса Python',
                order: 1,
                file_url: '/documents/python_intro.docx',
                file_name: 'python_intro.docx',
                created_at: '2024-01-15'
              },
              {
                id: 2,
                title: 'Переменные и типы данных',
                description: 'Работа с переменными и типами данных',
                order: 2,
                file_url: '/documents/python_variables.docx',
                file_name: 'python_variables.docx',
                created_at: '2024-01-22'
              }
            ]
          },
          {
            id: 2,
            title: 'Машинное обучение',
            description: 'Практический курс по машинному обучению и нейронным сетям',
            instructor: 'Петр Петров',
            status: 'available',
            progress: 0,
            deadline: '2024-12-31',
            lectures_completed: 0,
            lectures_total: 2,
            tests_completed: 0,
            tests_total: 6,
            practice_completed: 0,
            practice_total: 8,
            created_by: user?.id,
            is_published: false,
            category: 'data_science',
            lectures: [
              {
                id: 3,
                title: 'Введение в ML',
                description: 'Основные понятия машинного обучения',
                order: 1,
                file_url: '/documents/ml_intro.docx',
                file_name: 'ml_intro.docx',
                created_at: '2024-02-01'
              }
            ]
          },
          {
            id: 3,
            title: 'Веб-разработка на React',
            description: 'Современная веб-разработка с использованием React и Redux',
            instructor: 'Анна Смирнова',
            status: 'completed',
            progress: 100,
            deadline: '2024-06-30',
            lectures_completed: 20,
            lectures_total: 20,
            tests_completed: 5,
            tests_total: 5,
            practice_completed: 10,
            practice_total: 10,
            created_by: 'admin_123',
            is_published: true,
            category: 'web',
            lectures: []
          }
        ];
        setCourses(mockCourses);
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Ошибка загрузки курсов:', error);
      setLoading(false);
    }
  };

  const loadCourseLectures = async (courseId) => {
    try {
      const mockLectures = [
        {
          id: 1,
          title: 'Введение в Python',
          description: 'Основы синтаксиса Python',
          order: 1,
          file_url: '/documents/python_intro.docx',
          file_name: 'python_intro.docx',
          file_size: '2.4 MB',
          created_at: '2024-01-15',
          duration: '45 минут'
        },
        {
          id: 2,
          title: 'Переменные и типы данных',
          description: 'Работа с переменными и типами данных в Python',
          order: 2,
          file_url: '/documents/python_variables.docx',
          file_name: 'python_variables.docx',
          file_size: '3.1 MB',
          created_at: '2024-01-22',
          duration: '60 минут'
        }
      ];
      
      return mockLectures;
    } catch (error) {
      console.error('Ошибка загрузки лекций:', error);
      return [];
    }
  };

  const handleViewCourse = async (course) => {
    setSelectedCourse(course);
    const courseLectures = await loadCourseLectures(course.id);
    setLectures(courseLectures);
    setShowViewModal(true);
  };

  const handleDownloadFile = async (lecture) => {
    if (!lecture.file_url) {
      alert('Файл не прикреплен к лекции');
      return;
    }

    setDownloadingFile(lecture.id);
    
    try {
      const link = document.createElement('a');
      link.href = lecture.file_url;
      link.download = lecture.file_name || 'lecture.docx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => {
        setDownloadingFile(null);
        alert(`Файл "${lecture.file_name}" успешно скачан!`);
      }, 1000);
      
    } catch (error) {
      console.error('Ошибка скачивания файла:', error);
      setDownloadingFile(null);
      alert('Ошибка при скачивании файла');
    }
  };

  const handlePreviewFile = (lecture) => {
    if (!lecture.file_url) {
      alert('Файл не прикреплен к лекции');
      return;
    }
    window.open(lecture.file_url, '_blank');
  };

  const filterCourses = () => {
    let filtered = courses;
    
    switch (activeTab) {
      case 'active':
        filtered = courses.filter(course => course.status === 'active');
        break;
      case 'completed':
        filtered = courses.filter(course => course.status === 'completed');
        break;
      case 'available':
        filtered = courses.filter(course => course.status === 'available' && course.is_published);
        break;
      case 'draft':
        filtered = isAdmin ? courses.filter(course => !course.is_published) : [];
        break;
      default:
        filtered = courses;
    }
    
    setFilteredCourses(filtered);
  };

  const handleCreateCourse = async () => {
    if (!newCourse.title.trim()) {
      alert('Введите название курса');
      return;
    }

    try {
      const createdCourse = {
        id: Date.now(),
        ...newCourse,
        status: 'draft',
        progress: 0,
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        lectures_completed: 0,
        lectures_total: 0,
        tests_completed: 0,
        tests_total: 0,
        practice_completed: 0,
        practice_total: 0,
        created_by: user?.id,
        is_published: false,
        lectures: []
      };
      
      setCourses(prev => [...prev, createdCourse]);
      setShowCreateModal(false);
      setNewCourse({
        title: '',
        description: '',
        instructor: user?.name || '',
        duration: 0,
        category: 'programming'
      });
      
      alert('Курс успешно создан!');
    } catch (error) {
      console.error('Ошибка создания курса:', error);
      alert('Ошибка при создании курса');
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот курс? Все лекции и материалы также будут удалены.')) {
      return;
    }
    
    try {
      setCourses(prev => prev.filter(course => course.id !== courseId));
      alert('Курс успешно удален!');
    } catch (error) {
      console.error('Ошибка удаления курса:', error);
      alert('Ошибка при удалении курса');
    }
  };

  const handlePublishCourse = async (courseId) => {
    try {
      setCourses(prev => prev.map(course => 
        course.id === courseId 
          ? { ...course, is_published: true, status: 'available' } 
          : course
      ));
      alert('Курс опубликован!');
    } catch (error) {
      console.error('Ошибка публикации курса:', error);
      alert('Ошибка при публикации курса');
    }
  };

  const handleAddLecture = async () => {
    if (!newLecture.title.trim()) {
      alert('Введите название лекции');
      return;
    }

    if (!selectedCourse) return;

    try {
      setCourses(prev => prev.map(course => 
        course.id === selectedCourse.id 
          ? { ...course, lectures_total: course.lectures_total + 1 } 
          : course
      ));
      
      setNewLecture({
        title: '',
        description: '',
        order: selectedCourse.lectures_total + 1
      });
      setShowAddLectureModal(false);
      alert('Лекция добавлена!');
    } catch (error) {
      console.error('Ошибка добавления лекции:', error);
      alert('Ошибка при добавлении лекции');
    }
  };

  const handleUploadDocument = async (file) => {
    if (!file) return;
    
    setUploadingFile(true);
    try {
      setTimeout(() => {
        setUploadingFile(false);
        alert('Документ успешно загружен!');
      }, 1000);
    } catch (error) {
      console.error('Ошибка загрузки документа:', error);
      setUploadingFile(false);
      alert('Ошибка при загрузке документа');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getCategoryName = (category) => {
    const categories = {
      programming: 'Программирование',
      data_science: 'Data Science',
      web: 'Веб-разработка',
      mobile: 'Мобильная разработка',
      design: 'Дизайн'
    };
    return categories[category] || category;
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Загрузка курсов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-left">
          <h2>Мои курсы</h2>
          <p>Управление и отслеживание учебных курсов</p>
        </div>
        
        <div className="header-right">
          <div className="view-toggle">
            <button 
              className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Сетка"
            >
              <FiGrid />
            </button>
            <button 
              className={`view-button ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Таблица"
            >
              <FiList />
            </button>
          </div>
          
          {isAdmin && (
            <button 
              className="btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              <FiPlus /> Создать курс
            </button>
          )}
        </div>
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
        {isAdmin && (
          <button 
            className={`tab-button ${activeTab === 'draft' ? 'active' : ''}`}
            onClick={() => setActiveTab('draft')}
          >
            Черновики
          </button>
        )}
      </div>

      {filteredCourses.length === 0 ? (
        <div className="empty-state">
          <FiBookOpen size={48} />
          <h4>
            {activeTab === 'draft' ? 'Черновиков нет' : 
             activeTab === 'available' ? 'Нет доступных курсов' : 
             activeTab === 'completed' ? 'Нет завершенных курсов' :
             'Нет активных курсов'}
          </h4>
          <p>
            {isAdmin && activeTab === 'draft' ? 'Создайте первый черновик курса' :
             'Начните изучение нового курса для отслеживания прогресса'}
          </p>
          {isAdmin && (
            <button 
              className="btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              <FiPlus /> Создать курс
            </button>
          )}
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="courses-grid">
              {filteredCourses.map(course => (
                <div key={course.id} className="course-card">
                  <div className="course-header">
                    <div className="course-title">
                      <h3>{course.title}</h3>
                      {isAdmin && course.created_by === user?.id && (
                        <span className="course-badge">Ваш курс</span>
                      )}
                      <span className="course-category">
                        {getCategoryName(course.category)}
                      </span>
                    </div>
                    
                    <div className="course-header-actions">
                      <span className={`course-status ${course.status}`}>
                        {course.status === 'active' ? 'Активный' : 
                         course.status === 'completed' ? 'Завершен' : 
                         course.is_published ? 'Доступен' : 'Черновик'}
                      </span>
                      
                      {isAdmin && course.created_by === user?.id && (
                        <div className="admin-actions">
                          <button 
                            className="btn-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              const menu = e.target.closest('.admin-actions').querySelector('.dropdown-menu');
                              menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                            }}
                            title="Действия"
                          >
                            <FiMoreVertical />
                          </button>
                          
                          <div className="dropdown-menu">
                            <button 
                              className="dropdown-item"
                              onClick={() => {
                                setSelectedCourse(course);
                                setShowManageModal(true);
                                document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
                              }}
                            >
                              <FiEdit2 /> Управление
                            </button>
                            {!course.is_published && (
                              <button 
                                className="dropdown-item"
                                onClick={() => {
                                  handlePublishCourse(course.id);
                                  document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
                                }}
                              >
                                <FiCheckCircle /> Опубликовать
                              </button>
                            )}
                            <button 
                              className="dropdown-item delete"
                              onClick={() => {
                                handleDeleteCourse(course.id);
                                document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
                              }}
                            >
                              <FiTrash2 /> Удалить
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="course-description">
                    <p>{course.description}</p>
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
                  
                  {(course.status === 'active' || course.status === 'completed') && (
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
                  )}
                  
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
                    <button 
                      className="btn-primary"
                      onClick={() => handleViewCourse(course)}
                    >
                      <FiEye /> {course.status === 'active' ? 'Продолжить' : 
                       course.status === 'available' ? 'Начать' : 
                       course.is_published ? 'Просмотреть' : 'Редактировать'}
                    </button>
                    <button className="btn-secondary">
                      <FiBarChart2 /> Детали
                    </button>
                    
                    {isAdmin && course.created_by === user?.id && (
                      <button 
                        className="btn-secondary"
                        onClick={() => {
                          setSelectedCourse(course);
                          setShowManageModal(true);
                        }}
                      >
                        <FiEdit2 /> Управление
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <CoursesTable 
              courses={filteredCourses} 
              onViewCourse={handleViewCourse}
            />
          )}
        </>
      )}

      {/* Модальное окно создания курса */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Создание нового курса</h3>
              <button 
                className="close-button"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Название курса *</label>
                <input 
                  type="text" 
                  value={newCourse.title}
                  onChange={(e) => setNewCourse(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Введите название курса"
                />
              </div>
              
              <div className="form-group">
                <label>Описание</label>
                <textarea 
                  value={newCourse.description}
                  onChange={(e) => setNewCourse(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Опишите содержание курса"
                  rows="3"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Преподаватель</label>
                  <input 
                    type="text" 
                    value={newCourse.instructor || user?.name || ''}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, instructor: e.target.value }))}
                    placeholder="ФИО преподавателя"
                  />
                </div>
                
                <div className="form-group">
                  <label>Длительность (часов)</label>
                  <input 
                    type="number" 
                    value={newCourse.duration}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Категория</label>
                <select 
                  value={newCourse.category}
                  onChange={(e) => setNewCourse(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="programming">Программирование</option>
                  <option value="data_science">Data Science</option>
                  <option value="web">Веб-разработка</option>
                  <option value="mobile">Мобильная разработка</option>
                  <option value="design">Дизайн</option>
                </select>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Отмена
              </button>
              <button 
                className="btn-primary"
                onClick={handleCreateCourse}
                disabled={!newCourse.title.trim()}
              >
                Создать курс
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно просмотра курса */}
      {showViewModal && selectedCourse && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal wide-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedCourse.title}</h3>
              <button 
                className="close-button"
                onClick={() => setShowViewModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="course-info-full">
                <div className="info-section">
                  <h4>Описание курса</h4>
                  <p>{selectedCourse.description}</p>
                </div>
                
                <div className="info-grid">
                  <div className="info-item">
                    <FiUser />
                    <span><strong>Преподаватель:</strong> {selectedCourse.instructor}</span>
                  </div>
                  <div className="info-item">
                    <FiCalendar />
                    <span><strong>Дедлайн:</strong> {formatDate(selectedCourse.deadline)}</span>
                  </div>
                  <div className="info-item">
                    <FiBarChart2 />
                    <span><strong>Прогресс:</strong> {selectedCourse.progress}%</span>
                  </div>
                </div>
              </div>
              
              <div className="lectures-section">
                <h4>Лекции курса ({lectures.length})</h4>
                
                {lectures.length === 0 ? (
                  <div className="empty-lectures">
                    <p>Лекции еще не добавлены</p>
                  </div>
                ) : (
                  <div className="lectures-list">
                    {lectures.map(lecture => (
                      <div key={lecture.id} className="lecture-item">
                        <div className="lecture-info">
                          <div className="lecture-header">
                            <h5>
                              <span className="lecture-order">Лекция {lecture.order}</span>
                              {lecture.title}
                            </h5>
                            <span className="lecture-duration">{lecture.duration}</span>
                          </div>
                          <p className="lecture-description">{lecture.description}</p>
                          
                          {lecture.file_url && (
                            <div className="lecture-file">
                              <FiFileText />
                              <span className="file-name">{lecture.file_name}</span>
                              <span className="file-size">({lecture.file_size})</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="lecture-actions">
                          {lecture.file_url && (
                            <>
                              <button 
                                className="btn-icon"
                                onClick={() => handlePreviewFile(lecture)}
                                title="Просмотреть"
                              >
                                <FiEye />
                              </button>
                              <button 
                                className={`btn-icon ${downloadingFile === lecture.id ? 'loading' : ''}`}
                                onClick={() => handleDownloadFile(lecture)}
                                disabled={downloadingFile === lecture.id}
                                title="Скачать"
                              >
                                {downloadingFile === lecture.id ? (
                                  <span className="spinner"></span>
                                ) : (
                                  <FiDownload />
                                )}
                              </button>
                            </>
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
                onClick={() => setShowViewModal(false)}
              >
                Закрыть
              </button>
              {selectedCourse.status === 'available' && (
                <button 
                  className="btn-primary"
                  onClick={() => {
                    alert('Вы записаны на курс!');
                    setShowViewModal(false);
                  }}
                >
                  Записаться на курс
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно управления курсом */}
      {showManageModal && selectedCourse && (
        <div className="modal-overlay" onClick={() => setShowManageModal(false)}>
          <div className="modal wide-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Управление курсом: {selectedCourse.title}</h3>
              <button 
                className="close-button"
                onClick={() => setShowManageModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="manage-tabs">
                <button className="tab-button active">Лекции</button>
                <button className="tab-button">Практика</button>
                <button className="tab-button">Тесты</button>
                <button className="tab-button">Настройки</button>
              </div>
              
              <div className="lectures-section">
                <div className="section-header">
                  <h4>Лекции курса ({selectedCourse.lectures_total})</h4>
                  <button 
                    className="btn-primary small"
                    onClick={() => setShowAddLectureModal(true)}
                  >
                    <FiPlus /> Добавить лекцию
                  </button>
                </div>
                
                <div className="lectures-list">
                  {selectedCourse.lectures_total === 0 ? (
                    <div className="empty-lectures">
                      <p>Лекции еще не добавлены</p>
                    </div>
                  ) : (
                    <div className="lecture-item">
                      <div className="lecture-info">
                        <h5>Пример лекции</h5>
                        <p>После добавления лекции здесь появится список</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="course-stats">
                <h4>Статистика курса</h4>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">Студентов</span>
                    <span className="stat-value">0</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Прогресс (средний)</span>
                    <span className="stat-value">0%</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Лекций</span>
                    <span className="stat-value">{selectedCourse.lectures_total}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Практик</span>
                    <span className="stat-value">{selectedCourse.practice_total}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowManageModal(false)}
              >
                Закрыть
              </button>
              {!selectedCourse.is_published && (
                <button 
                  className="btn-primary"
                  onClick={() => {
                    handlePublishCourse(selectedCourse.id);
                    setShowManageModal(false);
                  }}
                >
                  Опубликовать курс
                </button>
              )}
              <button 
                className="btn-secondary delete"
                onClick={() => {
                  if (window.confirm('Удалить этот курс?')) {
                    handleDeleteCourse(selectedCourse.id);
                    setShowManageModal(false);
                  }
                }}
              >
                <FiTrash2 /> Удалить курс
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно добавления лекции */}
      {showAddLectureModal && selectedCourse && (
        <div className="modal-overlay" onClick={() => setShowAddLectureModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Добавить лекцию в курс</h3>
              <button 
                className="close-button"
                onClick={() => setShowAddLectureModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Название лекции *</label>
                <input 
                  type="text" 
                  value={newLecture.title}
                  onChange={(e) => setNewLecture(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Введите название лекции"
                />
              </div>
              
              <div className="form-group">
                <label>Описание</label>
                <textarea 
                  value={newLecture.description}
                  onChange={(e) => setNewLecture(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Краткое описание лекции"
                  rows="2"
                />
              </div>
              
              <div className="form-group">
                <label>Порядковый номер</label>
                <input 
                  type="number" 
                  value={newLecture.order}
                  onChange={(e) => setNewLecture(prev => ({ ...prev, order: parseInt(e.target.value) || 1 }))}
                  min="1"
                />
              </div>
              
              <div className="form-group">
                <label>Загрузить DOCX документ (опционально)</label>
                <input 
                  type="file"
                  accept=".docx,.doc"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      handleUploadDocument(file);
                    }
                  }}
                  disabled={uploadingFile}
                />
                {uploadingFile && (
                  <div className="uploading">Загрузка документа...</div>
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowAddLectureModal(false)}
                disabled={uploadingFile}
              >
                Отмена
              </button>
              <button 
                className="btn-primary"
                onClick={handleAddLecture}
                disabled={!newLecture.title.trim() || uploadingFile}
              >
                {uploadingFile ? 'Загрузка...' : 'Добавить лекцию'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursesPage;