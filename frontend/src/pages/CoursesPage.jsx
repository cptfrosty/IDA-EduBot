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
  FiFileText,
  FiUsers,
  FiX
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import CoursesTable from '../components/courses/CoursesTable';
import CourseViewModal from '../components/courses/CourseViewModal';
import { apiService } from '../services/api';
import { FiFolder, FiPackage } from 'react-icons/fi';

const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [viewMode, setViewMode] = useState('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAddLectureModal, setShowAddLectureModal] = useState(false);
  const [showAddStudentsModal, setShowAddStudentsModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [downloadingFile, setDownloadingFile] = useState(null);
  const [students, setStudents] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  
  const [disciplines, setDisciplines] = useState([]);
  const [showCreateDisciplineModal, setShowCreateDisciplineModal] = useState(false);
  const [showSelectDisciplineModal, setShowSelectDisciplineModal] = useState(false);
  const [newDiscipline, setNewDiscipline] = useState({
    name: '',
    code: '',
    department: '',
    description: '',
    credits: 3,
    hours_total: 36,
    hours_lecture: 18,
    hours_practice: 18,
    difficulty_level: 'intermediate',
    is_active: true
  });

  const [newCourse, setNewCourse] = useState({
    discipline_id: '', // ДОБАВЬТЕ ЭТО ПОЛЕ
    title: '',
    description: '',
    semester: '',
    instructor_id: '',
    start_date: '',
    end_date: '',
    max_students: 30,
    classroom: '',
    status: 'planned'
  });

  const [newLecture, setNewLecture] = useState({
    title: '',
    description: '',
    material_type: 'lecture',
    course_id: '',
    uploader_id: '',
    file: null,
    estimated_duration: 60
  });

  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { user } = useAuth();
  const userRole = user?.role || 'student';
  const isAdmin = userRole === 'admin';
  const isInstructor = userRole === 'instructor' || isAdmin;

  useEffect(() => {
    loadCourses();
    loadDisciplines();
  }, []);

  // Добавьте в useEffect:
  useEffect(() => {
    if (isInstructor) {
      loadDisciplines();
    }
  }, [isInstructor]);

  useEffect(() => {
    filterCourses();
  }, [courses, activeTab]);

  // Функции для работы с дисциплинами:
  const loadDisciplines = async () => {
    try {
      const response = await apiService.courses.getDisciplines();
      
      if (response.data && Array.isArray(response.data)) {
        // Преобразуем все ID в строки
        const formattedDisciplines = response.data.map(discipline => ({
          ...discipline,
          discipline_id: String(discipline.discipline_id)
        }));
        
        setDisciplines(formattedDisciplines);
        
        // Если есть дисциплины и не выбрана, выбираем первую
        if (formattedDisciplines.length > 0 && !newCourse.discipline_id) {
          setNewCourse(prev => ({ 
            ...prev, 
            discipline_id: formattedDisciplines[0].discipline_id 
          }));
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки дисциплин:', error);
    }
  };

  const handleCreateDiscipline = async () => {
    if (!newDiscipline.name.trim() || !newDiscipline.code.trim() || !newDiscipline.department.trim()) {
      alert('Заполните обязательные поля: название, код и кафедра');
      return;
    }

    try {
      console.log('Создание дисциплины:', newDiscipline);
      const response = await apiService.courses.createDiscipline(newDiscipline);
      
      if (response.data) {
        alert(response.data.message || 'Дисциплина успешно создана!');
        setShowCreateDisciplineModal(false);
        setNewDiscipline({
          name: '',
          code: '',
          department: '',
          description: '',
          credits: 3,
          hours_total: 36,
          hours_lecture: 18,
          hours_practice: 18,
          difficulty_level: 'intermediate',
          is_active: true
        });
        await loadDisciplines();
      }
    } catch (error) {
      console.error('Ошибка создания дисциплины:', error);
      alert(error.response?.data?.detail || 'Ошибка при создании дисциплины');
    }
  };

  const loadCourses = async () => {
    try {
      setLoading(true);
      console.log('Загрузка курсов...');
      
      const response = await apiService.courses.getCourses();
      console.log('Ответ от API:', response.data);
      
      const data = response.data || [];
      
      // Фильтруем курсы в зависимости от роли пользователя
      let userCourses = data;
      
      if (userRole === 'student') {
        // Для студента показываем курсы, на которые он записан
        userCourses = data.filter(course => {
          // Если у курса есть массив студентов, проверяем наличие текущего пользователя
          if (course.students && Array.isArray(course.students)) {
            return course.students.some(s => s.user_id === user?.user_id);
          }
          // Если нет массива студентов, проверяем другие поля
          return course.student_ids && course.student_ids.includes(user?.user_id);
        });
      } else if (userRole === 'instructor') {
        // Для преподавателя показываем его курсы
        userCourses = data.filter(course => 
          course.instructor_id === user?.user_id|| course.assistant_id === user?.user_id
        );
      }
      
      console.log('Отфильтрованные курсы:', userCourses);
      setCourses(userCourses);
    } catch (error) {
      console.error('Ошибка загрузки курсов:', error);
      
      if (error.response?.status === 401) {
        alert('Сессия истекла. Пожалуйста, войдите снова.');
      } else if (error.response?.status === 404) {
        console.error('Эндпоинт /courses не найден. Проверьте настройки API.');
        alert('Функция загрузки курсов временно недоступна.');
      } else {
        alert('Не удалось загрузить курсы. Проверьте подключение к серверу.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadCourseLectures = async (courseId) => {
    try {
      console.log('Загрузка лекций для курса:', courseId);
      const response = await apiService.materials.getCourseMaterials(courseId);
      
      const data = response.data || [];
      // Фильтруем только лекции
      const lectures = data.filter(material => 
        material.material_type === 'lecture' || material.material_type === 'presentation'
      );
      console.log('Загруженные лекции:', lectures);
      return lectures;
    } catch (error) {
      console.error('Ошибка загрузки лекций:', error);
      return [];
    }
  };

  const loadCourseStudents = async (courseId) => {
    try {
      console.log('Загрузка студентов для курса:', courseId);
      const response = await apiService.courses.getCourseStudents(courseId);
      console.log('Загруженные студенты:', response.data);
      return response.data || [];
    } catch (error) {
      console.error('Ошибка загрузки студентов:', error);
      return [];
    }
  };

  const loadAvailableStudents = async () => {
    try {
      console.log('Загрузка доступных студентов...');
      const response = await apiService.users.getStudents();
      console.log('Доступные студенты:', response.data);
      setAvailableStudents(response.data || []);
    } catch (error) {
      console.error('Ошибка загрузки студентов:', error);
      alert('Не удалось загрузить список студентов');
      setAvailableStudents([]);
    }
  };

  const handleViewCourse = async (course) => {
    console.log('Просмотр курса:', course);
    setSelectedCourse(course);
    try {
      const courseId = course.course_id || course.id;
      const [courseLectures, courseStudents] = await Promise.all([
        loadCourseLectures(courseId),
        loadCourseStudents(courseId)
      ]);
      setLectures(courseLectures);
      setStudents(courseStudents);
      setShowViewModal(true);
    } catch (error) {
      console.error('Ошибка загрузки данных курса:', error);
      alert('Не удалось загрузить данные курса');
    }
  };

  const handleDownloadFile = async (lecture) => {
    if (!lecture.file_path) {
      alert('Файл не прикреплен к лекции');
      return;
    }

    const materialId = lecture.material_id || lecture.id;
    setDownloadingFile(materialId);
    
    try {
      const response = await apiService.materials.downloadMaterial(materialId);
      
      if (response.data) {
        // Создаем blob из данных
        const blob = new Blob([response.data], { type: response.headers['content-type'] });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = lecture.original_filename || `lecture_${materialId}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        alert(`Файл "${lecture.original_filename || 'lecture.docx'}" успешно скачан!`);
      }
    } catch (error) {
      console.error('Ошибка скачивания файла:', error);
      
      // Альтернативный способ скачивания
      if (lecture.file_path) {
        const link = document.createElement('a');
        link.href = lecture.file_path;
        link.download = lecture.original_filename || 'lecture.docx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('Ошибка при скачивании файла');
      }
    } finally {
      setDownloadingFile(null);
    }
  };

  const handlePreviewFile = (lecture) => {
    if (!lecture.file_path) {
      alert('Файл не прикреплен к лекции');
      return;
    }
    
    // Открываем файл в новой вкладке
    window.open(lecture.file_path, '_blank');
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
        filtered = courses.filter(course => 
          course.status === 'planned' || course.status === 'active'
        );
        break;
      case 'draft':
        filtered = isInstructor ? courses.filter(course => course.status === 'planned') : [];
        break;
      default:
        filtered = courses;
    }
    
    setFilteredCourses(filtered);
  };

  const handleCreateCourse = async (selectedDisciplineId = null) => {
    try {
      console.log('newCourse.discipline_id:', newCourse.discipline_id);
      console.log('selectedDisciplineId:', selectedDisciplineId);
      console.log('Тип newCourse.discipline_id:', typeof newCourse.discipline_id);
      console.log('Тип selectedDisciplineId:', typeof selectedDisciplineId);
      
      // Базовые проверки
      if (!newCourse.title?.trim()) {
        alert('Введите название курса');
        return;
      }
      if (!newCourse.semester?.trim()) {
        alert('Введите семестр');
        return;
      }
      if (!newCourse.start_date) {
        alert('Выберите дату начала');
        return;
      }
      if (!newCourse.end_date) {
        alert('Выберите дату окончания');
        return;
      }

      // Определяем ID пользователя
      const userId = user?.user_id;
      
      if (!userId) {
        alert('Не удалось определить ID пользователя. Пользователь не авторизован.');
        return;
      }

      // Определяем ID дисциплины - исправляем проблему с объектом
      let disciplineId = '';
      
      if (selectedDisciplineId) {
        // Если передан selectedDisciplineId, берем его
        disciplineId = String(selectedDisciplineId);
      } else if (newCourse.discipline_id) {
        // Иначе берем из newCourse
        disciplineId = String(newCourse.discipline_id);
      }
      
      // Проверяем, что это не объект
      if (disciplineId === '[object Object]' || disciplineId.includes('[object')) {
        console.error('discipline_id является объектом, а не строкой:', disciplineId);
        
        // Если есть дисциплины, берем ID первой
        if (disciplines.length > 0) {
          disciplineId = String(disciplines[0].discipline_id);
          console.log('Используем дисциплину из списка:', disciplineId);
        } else {
          alert('Ошибка: дисциплина не выбрана или выбрана некорректно');
          return;
        }
      }
      
      // Проверяем формат UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(disciplineId)) {
        console.error('Некорректный формат UUID для дисциплины:', disciplineId);
        
        // Если есть дисциплины, берем первую
        if (disciplines.length > 0) {
          disciplineId = String(disciplines[0].discipline_id);
          console.log('Используем первую дисциплину из списка:', disciplineId);
        } else {
          alert('Некорректный ID дисциплины. Выберите дисциплину из списка.');
          return;
        }
      }

      // Создаем чистый объект
      const courseData = {
        discipline_id: disciplineId,
        title: String(newCourse.title).trim(),
        semester: String(newCourse.semester).trim(),
        instructor_id: String(userId),
        start_date: String(newCourse.start_date),
        end_date: String(newCourse.end_date),
        max_students: Number(newCourse.max_students) || 30,
        classroom: String(newCourse.classroom || ''),
        status: String(newCourse.status || 'planned'),
        description: String(newCourse.description || ''),
        assistant_id: null,
        schedule_json: null,
        current_students: 0
      };

      console.log('Отправляемые данные курса:', courseData);
      
      // Отправляем запрос
      const response = await apiService.courses.createCourse(courseData);
      
      // Обработка успешного ответа
      if (response.data) {
        alert(response.data.message || 'Курс успешно создан!');
        
        // Сброс формы
        setShowCreateModal(false);
        setNewCourse({
          discipline_id: '',
          title: '',
          description: '',
          semester: '',
          instructor_id: '',
          start_date: '',
          end_date: '',
          max_students: 30,
          classroom: '',
          status: 'planned'
        });
        
        // Обновляем список курсов
        await loadCourses();
      }
      
    } catch (error) {
      console.error('Ошибка создания курса:', error);
      console.error('Детали ошибки:', error.response?.data);
      
      alert(error.response?.data?.detail || 'Ошибка при создании курса');
    }
  };

  const generateTempUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот курс? Все лекции и материалы также будут удалены.')) {
      return;
    }
    
    try {
      await apiService.courses.deleteCourse(courseId);
      
      setCourses(prev => prev.filter(course => 
        (course.course_id || course.id) !== courseId
      ));
      alert('Курс успешно удален!');
    } catch (error) {
      console.error('Ошибка удаления курса:', error);
      alert('Ошибка при удалении курса');
    }
  };

  const handlePublishCourse = async (courseId) => {
    try {
      await apiService.courses.publishCourse(courseId);
      
      setCourses(prev => prev.map(course => 
        (course.course_id || course.id) === courseId
          ? { ...course, status: 'active' } 
          : course
      ));
      alert('Курс опубликован!');
    } catch (error) {
      console.error('Ошибка публикации курса:', error);
      alert('Ошибка при публикации курса');
    }
  };

  const handleAddLecture = async () => {

    console.log('handleAddLecture - user:', user);
    console.log('handleAddLecture - user.user_id:', user?.user_id);

    if (!newLecture.title.trim()) {
      alert('Введите название лекции');
      return;
    }

    if (!selectedCourse) return;

    // Проверяем, что пользователь существует
    if (!user?.user_id) {
      alert('Пользователь не авторизован');
      return;
    }

    try {
      const formData = new FormData();
      const courseId = selectedCourse.course_id || selectedCourse.id;
      
      console.log('User ID:', user.user_id); // Добавьте для отладки
      console.log('User object:', user); // Добавьте для отладки
      
      formData.append('course_id', courseId);
      formData.append('title', newLecture.title);
      formData.append('description', newLecture.description || '');
      formData.append('material_type', 'lecture');
      formData.append('uploader_id', user.user_id);
      formData.append('estimated_duration', newLecture.estimated_duration.toString());
      
      if (newLecture.file) {
        formData.append('file', newLecture.file);
      }

      console.log('Добавление лекции для курса:', courseId);
      console.log('FormData contents:');
      
      // Для отладки - выводим содержимое FormData
      for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }
      
      const response = await apiService.materials.createMaterial(formData);
      
      if (response.data) {
        alert(response.data.message || 'Лекция добавлена!');
        setNewLecture({
          title: '',
          description: '',
          material_type: 'lecture',
          course_id: '',
          uploader_id: user.user_id,
          file: null,
          estimated_duration: 60
        });
        setShowAddLectureModal(false);
        
        // Обновляем список лекций
        if (showViewModal) {
          const updatedLectures = await loadCourseLectures(courseId);
          setLectures(updatedLectures);
        }
        
        // Обновляем информацию о курсе
        await loadCourses();
      }
    } catch (error) {
      console.error('Ошибка добавления лекции:', error);
      console.error('Детали ошибки:', error.response?.data);
      console.error('Статус ошибки:', error.response?.status);
      
      if (error.response?.status === 400) {
        alert(`Ошибка создания материала: ${error.response.data.detail}`);
      } else if (error.response?.status === 422) {
        alert('Ошибка валидации. Проверьте данные формы.');
      } else if (error.response?.data?.detail) {
        alert(`Ошибка: ${error.response.data.detail}`);
      } else {
        alert('Ошибка при добавлении лекции');
      }
    }
  };

  const handleUploadDocument = async (file) => {
    if (!file) return;
    
    setUploadingFile(true);
    setUploadProgress(0);
    
    try {
      // Имитация прогресса загрузки
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 20;
        });
      }, 300);

      setTimeout(() => {
        clearInterval(interval);
        setUploadingFile(false);
        setUploadProgress(0);
        setNewLecture(prev => ({ ...prev, file }));
      }, 1500);
    } catch (error) {
      console.error('Ошибка загрузки документа:', error);
      setUploadingFile(false);
      setUploadProgress(0);
      alert('Ошибка при загрузке документа');
    }
  };

  const handleAddStudents = async () => {
    if (!selectedCourse) return;
    
    if (selectedStudentIds.length === 0) {
      alert('Выберите хотя бы одного студента');
      return;
    }

    try {
      const courseId = selectedCourse.course_id || selectedCourse.id;
      const response = await apiService.courses.enrollStudents(courseId, selectedStudentIds);
      
      if (response.data) {
        alert(response.data.message || 'Студенты успешно добавлены на курс!');
        setShowAddStudentsModal(false);
        setSelectedStudentIds([]);
        
        // Обновляем список студентов
        const updatedStudents = await loadCourseStudents(courseId);
        setStudents(updatedStudents);
        
        // Обновляем информацию о курсе
        await loadCourses();
      }
    } catch (error) {
      console.error('Ошибка добавления студентов:', error);
      alert('Ошибка при добавлении студентов');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Не указана';
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
          
          {isInstructor && (
            <div className="create-buttons">
              <button 
                className="btn-secondary"
                onClick={() => setShowCreateDisciplineModal(true)}
                title="Создать дисциплину"
              >
                <FiFolder /> Дисциплина
              </button>
              <button 
                className="btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                <FiPlus /> Курс
              </button>
            </div>
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
        {isInstructor && (
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
            {isInstructor && activeTab === 'draft' ? 'Создайте первый черновик курса' :
             'Начните изучение нового курса для отслеживания прогресса'}
          </p>
          {isInstructor && (
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
                <div key={course.course_id || course.id} className="course-card">
                  <div className="course-header">
                    <div className="course-title">
                      <h3>{course.title}</h3>
                      {isInstructor && course.instructor_id === user?.user_id && (
                        <span className="course-badge">Ваш курс</span>
                      )}
                      <span className="course-category">
                        Семестр: {course.semester}
                      </span>
                    </div>
                    
                    <div className="course-header-actions">
                      <span className={`course-status ${course.status}`}>
                        {getStatusText(course.status)}
                      </span>
                      
                      {isInstructor && (course.instructor_id === user?.user_id || course.assistant_id === user?.user_id) && (
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
                                handleViewCourse(course);
                                document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
                              }}
                            >
                              <FiEye /> Просмотреть
                            </button>
                            <button 
                              className="dropdown-item"
                              onClick={() => {
                                setSelectedCourse(course);
                                setShowAddStudentsModal(true);
                                loadAvailableStudents();
                                document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
                              }}
                            >
                              <FiUsers /> Добавить студентов
                            </button>
                            {course.status === 'planned' && (
                              <button 
                                className="dropdown-item"
                                onClick={() => {
                                  handlePublishCourse(course.course_id || course.id);
                                  document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
                                }}
                              >
                                <FiCheckCircle /> Опубликовать
                              </button>
                            )}
                            <button 
                              className="dropdown-item delete"
                              onClick={() => {
                                handleDeleteCourse(course.course_id || course.id);
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
                    <p>{course.description || 'Описание отсутствует'}</p>
                  </div>
                  
                  <div className="course-info">
                    <div className="info-item">
                      <FiUser />
                      <span>Преподаватель: {course.instructor_name || 'Не указан'}</span>
                    </div>
                    <div className="info-item">
                      <FiCalendar />
                      <span>До {formatDate(course.end_date)}</span>
                    </div>
                  </div>
                  
                  {(course.status === 'active' || course.status === 'completed') && (
                    <div className="course-progress">
                      <div className="progress-header">
                        <span>Прогресс</span>
                        <span>{course.progress || 0}%</span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${course.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="course-components">
                    <div className="component">
                      <FiBookOpen />
                      <span>Лекции: {course.lectures_count || 0}</span>
                    </div>
                    <div className="component">
                      <FiUsers />
                      <span>Студентов: {course.current_students || 0}/{course.max_students || 30}</span>
                    </div>
                  </div>
                  
                  <div className="course-actions">
                    <button 
                      className="btn-primary"
                      onClick={() => handleViewCourse(course)}
                    >
                      <FiEye /> {course.status === 'active' ? 'Продолжить' : 
                       course.status === 'planned' ? 'Просмотреть' : 
                       course.status === 'completed' ? 'Просмотреть' : 'Редактировать'}
                    </button>
                    
                    {isInstructor && (course.instructor_id === user?.user_id || course.assistant_id === user?.user_id) && (
                      <button 
                        className="btn-secondary"
                        onClick={() => {
                          setSelectedCourse(course);
                          setShowAddLectureModal(true);
                        }}
                      >
                        <FiPlus /> Добавить лекцию
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
              userRole={userRole}
              userId={user?.user_id}
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
                <FiX />
              </button>
            </div>

            <div className="modal-body">

              <div className="form-group">
                <label>Дисциплина *</label>
                <select 
                  value={typeof newCourse.discipline_id === 'string' ? newCourse.discipline_id : ''}
                  onChange={(e) => {
                    console.log('Выбрано значение:', e.target.value);
                    console.log('Тип значения:', typeof e.target.value);
                    
                    // Убедимся, что сохраняем строку
                    setNewCourse(prev => ({ 
                      ...prev, 
                      discipline_id: String(e.target.value) 
                    }));
                  }}
                  className="form-select"
                  required
                >
                  <option value="">-- Выберите дисциплину --</option>
                  {disciplines.map(discipline => (
                    <option 
                      key={String(discipline.discipline_id)} 
                      value={String(discipline.discipline_id)}
                    >
                      {discipline.name} ({discipline.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Название курса *</label>
                <input 
                  type="text" 
                  value={newCourse.title}
                  onChange={(e) => setNewCourse(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Введите название курса"
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label>Описание</label>
                <textarea 
                  value={newCourse.description}
                  onChange={(e) => setNewCourse(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Опишите содержание курса"
                  rows="3"
                  className="form-textarea"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Семестр *</label>
                  <input 
                    type="text" 
                    value={newCourse.semester}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, semester: e.target.value }))}
                    placeholder="Например: Весна 2024"
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>Аудитория</label>
                  <input 
                    type="text" 
                    value={newCourse.classroom}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, classroom: e.target.value }))}
                    placeholder="Номер аудитории"
                    className="form-input"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Дата начала *</label>
                  <input 
                    type="date" 
                    value={newCourse.start_date}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, start_date: e.target.value }))}
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>Дата окончания *</label>
                  <input 
                    type="date" 
                    value={newCourse.end_date}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, end_date: e.target.value }))}
                    className="form-input"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Максимальное количество студентов</label>
                  <input 
                    type="number" 
                    value={newCourse.max_students}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, max_students: parseInt(e.target.value) || 30 }))}
                    min="1"
                    max="200"
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>Статус</label>
                  <select 
                    value={newCourse.status}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, status: e.target.value }))}
                    className="form-select"
                  >
                    <option value="planned">Запланирован</option>
                    <option value="active">Активный</option>
                  </select>
                </div>
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
                disabled={!newCourse.title.trim() || !newCourse.semester.trim() || !newCourse.start_date || !newCourse.end_date}
              >
                Создать курс
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно создания дисциплины */}
      {showCreateDisciplineModal && (
        <div className="modal-overlay" onClick={() => setShowCreateDisciplineModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Создание новой дисциплины</h3>
              <button 
                className="close-button"
                onClick={() => setShowCreateDisciplineModal(false)}
              >
                <FiX />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Название дисциплины *</label>
                <input 
                  type="text" 
                  value={newDiscipline.name}
                  onChange={(e) => setNewDiscipline(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Например: Программирование на Python"
                  className="form-input"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Код дисциплины *</label>
                  <input 
                    type="text" 
                    value={newDiscipline.code}
                    onChange={(e) => setNewDiscipline(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="Например: CS101"
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>Кафедра/Факультет *</label>
                  <input 
                    type="text" 
                    value={newDiscipline.department}
                    onChange={(e) => setNewDiscipline(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="Например: Кафедра информатики"
                    className="form-input"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Описание</label>
                <textarea 
                  value={newDiscipline.description}
                  onChange={(e) => setNewDiscipline(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Описание дисциплины"
                  rows="3"
                  className="form-textarea"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Количество кредитов</label>
                  <input 
                    type="number" 
                    value={newDiscipline.credits}
                    onChange={(e) => setNewDiscipline(prev => ({ ...prev, credits: parseInt(e.target.value) || 3 }))}
                    min="1"
                    max="10"
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>Общее количество часов</label>
                  <input 
                    type="number" 
                    value={newDiscipline.hours_total}
                    onChange={(e) => setNewDiscipline(prev => ({ ...prev, hours_total: parseInt(e.target.value) || 36 }))}
                    min="1"
                    className="form-input"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Часы лекций</label>
                  <input 
                    type="number" 
                    value={newDiscipline.hours_lecture}
                    onChange={(e) => setNewDiscipline(prev => ({ ...prev, hours_lecture: parseInt(e.target.value) || 18 }))}
                    min="0"
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>Часы практики</label>
                  <input 
                    type="number" 
                    value={newDiscipline.hours_practice}
                    onChange={(e) => setNewDiscipline(prev => ({ ...prev, hours_practice: parseInt(e.target.value) || 18 }))}
                    min="0"
                    className="form-input"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Уровень сложности</label>
                  <select 
                    value={newDiscipline.difficulty_level}
                    onChange={(e) => setNewDiscipline(prev => ({ ...prev, difficulty_level: e.target.value }))}
                    className="form-select"
                  >
                    <option value="beginner">Начинающий</option>
                    <option value="intermediate">Средний</option>
                    <option value="advanced">Продвинутый</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Статус</label>
                  <select 
                    value={newDiscipline.is_active}
                    onChange={(e) => setNewDiscipline(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
                    className="form-select"
                  >
                    <option value="true">Активна</option>
                    <option value="false">Неактивна</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowCreateDisciplineModal(false)}
              >
                Отмена
              </button>
              <button 
                className="btn-primary"
                onClick={handleCreateDiscipline}
                disabled={!newDiscipline.name.trim() || !newDiscipline.code.trim() || !newDiscipline.department.trim()}
              >
                Создать дисциплину
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно выбора дисциплины для курса */}
      {showSelectDisciplineModal && (
        <div className="modal-overlay" onClick={() => setShowSelectDisciplineModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Выберите дисциплину для курса</h3>
              <button 
                className="close-button"
                onClick={() => setShowSelectDisciplineModal(false)}
              >
                <FiX />
              </button>
            </div>
            
            <div className="modal-body">
              {disciplines.length === 0 ? (
                <div className="empty-state">
                  <FiFolder size={48} />
                  <h4>Нет доступных дисциплин</h4>
                  <p>Сначала создайте дисциплину, затем создайте курс в ней</p>
                  <button 
                    className="btn-primary"
                    onClick={() => {
                      setShowSelectDisciplineModal(false);
                      setShowCreateDisciplineModal(true);
                    }}
                  >
                    Создать дисциплину
                  </button>
                </div>
              ) : (
                <div className="disciplines-list">
                  <h4>Выберите дисциплину:</h4>
                  <div className="disciplines-grid">
                    {disciplines.map(discipline => (
                      <div 
                        key={discipline.discipline_id}
                        className="discipline-card"
                        onClick={() => handleCreateCourse(discipline.discipline_id)}
                      >
                        <div className="discipline-icon">
                          <FiPackage />
                        </div>
                        <div className="discipline-info">
                          <h5>{discipline.name}</h5>
                          <p className="discipline-code">Код: {discipline.code}</p>
                          <p className="discipline-department">{discipline.department}</p>
                          <p className="discipline-description">
                            {discipline.description || 'Нет описания'}
                          </p>
                          <div className="discipline-meta">
                            <span>Кредиты: {discipline.credits || 3}</span>
                            <span>•</span>
                            <span>Часов: {discipline.hours_total || 36}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowSelectDisciplineModal(false)}
              >
                Отмена
              </button>
              <button 
                className="btn-primary"
                onClick={() => {
                  setShowSelectDisciplineModal(false);
                  setShowCreateDisciplineModal(true);
                }}
              >
                Создать новую дисциплину
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно просмотра курса */}
      {showViewModal && selectedCourse && (
        <CourseViewModal
          course={selectedCourse}
          lectures={lectures}
          students={students}
          onClose={() => setShowViewModal(false)}
          onDownload={handleDownloadFile}
          onPreview={handlePreviewFile}
          downloadingFile={downloadingFile}
          isInstructor={isInstructor}
          onAddLecture={() => {
            setShowViewModal(false);
            setShowAddLectureModal(true);
          }}
          onAddStudents={() => {
            setShowViewModal(false);
            setShowAddStudentsModal(true);
            loadAvailableStudents();
          }}
        />
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
                <FiX />
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
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label>Описание</label>
                <textarea 
                  value={newLecture.description}
                  onChange={(e) => setNewLecture(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Краткое описание лекции"
                  rows="2"
                  className="form-textarea"
                />
              </div>
              
              <div className="form-group">
                <label>Оценочная длительность (минут)</label>
                <input 
                  type="number" 
                  value={newLecture.estimated_duration}
                  onChange={(e) => setNewLecture(prev => ({ ...prev, estimated_duration: parseInt(e.target.value) || 60 }))}
                  min="1"
                  max="240"
                  className="form-input"
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
                  className="form-input"
                />
                {uploadingFile && (
                  <div className="uploading">
                    <div className="upload-progress">
                      <div 
                        className="progress-bar"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <div>Загрузка документа... {uploadProgress}%</div>
                  </div>
                )}
                {newLecture.file && !uploadingFile && (
                  <div className="file-selected">
                    Выбран файл: {newLecture.file.name}
                  </div>
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

      {/* Модальное окно добавления студентов */}
      {showAddStudentsModal && selectedCourse && (
        <div className="modal-overlay" onClick={() => setShowAddStudentsModal(false)}>
          <div className="modal wide-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Добавить студентов на курс</h3>
              <button 
                className="close-button"
                onClick={() => setShowAddStudentsModal(false)}
              >
                <FiX />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="students-list">
                <h4>Доступные студенты</h4>
                {availableStudents.length === 0 ? (
                  <p>Нет доступных студентов для добавления</p>
                ) : (
                  <div className="students-grid">
                    {availableStudents.map(student => {
                      const isSelected = selectedStudentIds.includes(student.user_id);
                      const isAlreadyEnrolled = students.some(s => s.user_id === student.user_id);
                      
                      return (
                        <div 
                          key={student.user_id} 
                          className={`student-card ${isSelected ? 'selected' : ''} ${isAlreadyEnrolled ? 'disabled' : ''}`}
                          onClick={() => {
                            if (!isAlreadyEnrolled) {
                              setSelectedStudentIds(prev =>
                                isSelected
                                  ? prev.filter(id => id !== student.user_id)
                                  : [...prev, student.user_id]
                              );
                            }
                          }}
                        >
                          <div className="student-avatar">
                            {student.name?.charAt(0) || 'С'}
                          </div>
                          <div className="student-info">
                            <div className="student-name">{student.name || 'Без имени'}</div>
                            <div className="student-email">{student.email}</div>
                            <div className="student-group">{student.group || 'Группа не указана'}</div>
                          </div>
                          {isAlreadyEnrolled && (
                            <div className="already-enrolled">Уже записан</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {selectedStudentIds.length > 0 && (
                  <div className="selected-summary">
                    <h5>Выбрано студентов: {selectedStudentIds.length}</h5>
                    <div className="selected-list">
                      {availableStudents
                        .filter(student => selectedStudentIds.includes(student.user_id))
                        .map(student => (
                          <span key={student.user_id} className="selected-tag">
                            {student.name}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStudentIds(prev => prev.filter(id => id !== student.user_id));
                              }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => {
                  setShowAddStudentsModal(false);
                  setSelectedStudentIds([]);
                }}
              >
                Отмена
              </button>
              <button 
                className="btn-primary"
                onClick={handleAddStudents}
                disabled={selectedStudentIds.length === 0}
              >
                Добавить выбранных студентов
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursesPage;