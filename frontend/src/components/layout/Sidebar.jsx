import React from 'react';
import { NavLink } from 'react-router-dom';
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
  FiArchive
} from 'react-icons/fi';

const Sidebar = () => {
  const mainMenuItems = [
    { path: '/chat', icon: <FiMessageSquare />, label: 'Диалог с ИИ' },
    { path: '/chat/history', icon: <FiArchive />, label: 'История чатов' },
    { path: '/search', icon: <FiSearch />, label: 'Поиск по документам' },
  ];

  const documentsMenuItems = [
    { path: '/documents', icon: <FiFileText />, label: 'Все документы' },
    { path: '/documents/upload', icon: <FiDatabase />, label: 'Загрузить' },
  ];

  const learningMenuItems = [
    { path: '/materials', icon: <FiBook />, label: 'Материалы' },
    { path: '/courses', icon: <FiBookOpen />, label: 'Курсы' },
    { path: '/progress', icon: <FiTrendingUp />, label: 'Прогресс' },
  ];

  const analyticsMenuItems = [
    { path: '/analytics', icon: <FiBarChart2 />, label: 'Аналитика', exact: true },
    { path: '/analytics/queries', icon: <FiSearch />, label: 'Запросы' },
    { path: '/analytics/documents', icon: <FiFileText />, label: 'Документы' },
    { path: '/analytics/usage', icon: <FiTrendingUp />, label: 'Использование' },
  ];

  const systemMenuItems = [
    { path: '/profile', icon: <FiUser />, label: 'Профиль' },
    { path: '/settings', icon: <FiSettings />, label: 'Настройки' },
    { path: '/system/status', icon: <FiHome />, label: 'Статус системы' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <FiMessageSquare />
          <span>AI Assistant</span>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        
        {/* Основное меню */}
        <div className="nav-section">
          <h4 className="section-title">Основное</h4>
          <ul>
            {mainMenuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.exact}
                  className={({ isActive }) => 
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Документы */}
        <div className="nav-section">
          <h4 className="section-title">Документы</h4>
          <ul>
            {documentsMenuItems.map((item) => (
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
          </ul>
        </div>

        {/* Обучение */}
        <div className="nav-section">
          <h4 className="section-title">Обучение</h4>
          <ul>
            {learningMenuItems.map((item) => (
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
          </ul>
        </div>

        {/* Аналитика */}
        <div className="nav-section">
          <h4 className="section-title">Аналитика</h4>
          <ul>
            {analyticsMenuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.exact}
                  className={({ isActive }) => 
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Система */}
        <div className="nav-section">
          <h4 className="section-title">Система</h4>
          <ul>
            {systemMenuItems.map((item) => (
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
          </ul>
        </div>

      </nav>
    </aside>
  );
};

export default Sidebar;