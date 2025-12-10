import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ProfileContent from '../components/profile/ProfileContent';

const ProfilePage = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    difficulty: 'intermediate',
    notifications: true,
    theme: 'light',
    language: 'ru',
    autoSave: true,
    fontSize: 'medium'
  });

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!user) return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Профиль пользователя</h2>
        <p>Управление персональными данными и настройками</p>
      </div>

      <div className="profile-container">
        <div className="profile-left">
          <ProfileContent user={user} />
          
          <div className="usage-statistics">
            <h3>Статистика использования</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">45</div>
                <div className="stat-label">Часов обучения</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">127</div>
                <div className="stat-label">Вопросов задано</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">23</div>
                <div className="stat-label">Материалов изучено</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">4.7</div>
                <div className="stat-label">Средняя оценка</div>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-right">
          <div className="settings-card">
            <h3>Настройки системы</h3>
            
            <div className="setting-group">
              <label>Сложность материала</label>
              <select 
                value={settings.difficulty}
                onChange={(e) => handleSettingChange('difficulty', e.target.value)}
                className="setting-select"
              >
                <option value="beginner">Начинающий</option>
                <option value="intermediate">Средний</option>
                <option value="advanced">Продвинутый</option>
              </select>
            </div>

            <div className="setting-group">
              <label>Размер шрифта</label>
              <select 
                value={settings.fontSize}
                onChange={(e) => handleSettingChange('fontSize', e.target.value)}
                className="setting-select"
              >
                <option value="small">Маленький</option>
                <option value="medium">Средний</option>
                <option value="large">Крупный</option>
              </select>
            </div>

            <div className="setting-group">
              <label>Язык интерфейса</label>
              <select 
                value={settings.language}
                onChange={(e) => handleSettingChange('language', e.target.value)}
                className="setting-select"
              >
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="setting-group checkbox-group">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={settings.notifications}
                  onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                />
                <span>Уведомления по email</span>
              </label>
            </div>

            <div className="setting-group checkbox-group">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={settings.autoSave}
                  onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
                />
                <span>Автосохранение прогресса</span>
              </label>
            </div>

            <div className="setting-group">
              <label>Тема интерфейса</label>
              <div className="theme-selector">
                <button 
                  className={`theme-option ${settings.theme === 'light' ? 'active' : ''}`}
                  onClick={() => handleSettingChange('theme', 'light')}
                >
                  Светлая
                </button>
                <button 
                  className={`theme-option ${settings.theme === 'dark' ? 'active' : ''}`}
                  onClick={() => handleSettingChange('theme', 'dark')}
                >
                  Темная
                </button>
              </div>
            </div>

            <div className="settings-actions">
              <button className="save-button">
                Сохранить настройки
              </button>
              <button className="reset-button">
                Сбросить к стандартным
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;