import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  FiMessageSquare, 
  FiBook, 
  FiTrendingUp, 
  FiBookOpen, 
  FiUser,
  FiSettings,
  FiFileText,
  FiSearch,
  FiBarChart2,
  FiDatabase,
  FiHome,
  FiArchive,
  FiLogOut,
  FiUsers,
  FiTool,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // Получаем роль пользователя
  const userRole = user?.role || 'student';
  const isAdmin = userRole === 'admin';
  const isTeacher = userRole === 'teacher';
  
  // Определяем, какие меню показывать в зависимости от роли
  const getMenuItems = () => {
    // Общие пункты для всех пользователей
    const commonItems = [
      { path: '/chat', icon: <FiMessageSquare />, label: 'Диалог с ИИ' },
      { path: '/chat/history', icon: <FiArchive />, label: 'История чатов' },
      { path: '/search', icon: <FiSearch />, label: 'Поиск по документам' },
    ];
    
    // Для обучения (все пользователи)
    const learningItems = [
      { path: '/materials', icon: <FiBook />, label: 'Материалы' },
      { path: '/courses', icon: <FiBookOpen />, label: 'Курсы' },
      { path: '/progress', icon: <FiTrendingUp />, label: 'Прогресс' },
    ];
    
    // Системные пункты (все пользователи)
    const systemItems = [
      { path: '/profile', icon: <FiUser />, label: 'Профиль' },
      { path: '/settings', icon: <FiSettings />, label: 'Настройки' },
    ];
    
    // Для админов и учителей
    const adminTeacherItems = (isAdmin || isTeacher) ? [
      { path: '/documents', icon: <FiFileText />, label: 'Все документы' },
      { path: '/documents/upload', icon: <FiDatabase />, label: 'Загрузить' },
    ] : [];
    
    // Только для админов
    const adminOnlyItems = isAdmin ? [
      { path: '/analytics', icon: <FiBarChart2 />, label: 'Аналитика' },
      { path: '/system/status', icon: <FiHome />, label: 'Статус системы' },
      { path: '/admin/users', icon: <FiUsers />, label: 'Пользователи' },
      { path: '/admin/settings', icon: <FiTool />, label: 'Настройки системы' },
    ] : [];
    
    // Группируем по разделам
    const sections = [];
    
    // Основное меню
    if (commonItems.length > 0) {
      sections.push({
        title: "Основное",
        items: commonItems
      });
    }
    
    // Документы (для админов и учителей)
    if (adminTeacherItems.length > 0) {
      sections.push({
        title: "Документы",
        items: adminTeacherItems
      });
    }
    
    // Обучение
    if (learningItems.length > 0) {
      sections.push({
        title: "Обучение",
        items: learningItems
      });
    }
    
    // Аналитика и администрирование (только для админов)
    if (adminOnlyItems.length > 0) {
      // Разделяем аналитику и админские инструменты
      const analyticsItems = adminOnlyItems.filter(item => 
        item.path.includes('/analytics') || item.path.includes('/system/status')
      );
      const adminToolsItems = adminOnlyItems.filter(item => 
        item.path.includes('/admin/')
      );
      
      if (analyticsItems.length > 0) {
        sections.push({
          title: "Аналитика",
          items: analyticsItems
        });
      }
      
      if (adminToolsItems.length > 0) {
        sections.push({
          title: "Администрирование",
          items: adminToolsItems
        });
      }
    }
    
    // Система
    sections.push({
      title: "Система",
      items: systemItems,
      showLogout: true
    });
    
    return sections;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuSections = getMenuItems();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <FiMessageSquare />
          <span>AI Assistant</span>
        </div>
        
        {/* Информация о пользователе */}
        {user && (
          <div className="user-info">
            <div className="user-name">
              {user.first_name || user.email?.split('@')[0] || 'Пользователь'}
            </div>
            <div className={`user-role role-${userRole}`}>
              {userRole === 'admin' && 'Администратор'}
              {userRole === 'teacher' && 'Преподаватель'}
              {userRole === 'student' && 'Студент'}
            </div>
          </div>
        )}
      </div>
      
      <nav className="sidebar-nav">
        {menuSections.map((section, index) => (
          <div className="nav-section" key={index}>
            <h4 className="section-title">{section.title}</h4>
            <ul>
              {section.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) => 
                      `nav-link ${isActive ? 'active' : ''}`
                    }
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </NavLink>
                </li>
              ))}
              
              {/* Добавляем кнопку выхода только в последнем разделе */}
              {section.showLogout && (
                <>
                  <li className="nav-divider"></li>
                  <li>
                    <button 
                      onClick={handleLogout}
                      className="nav-link logout-link"
                    >
                      <span className="nav-icon"><FiLogOut /></span>
                      <span className="nav-label">Выйти</span>
                    </button>
                  </li>
                </>
              )}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;