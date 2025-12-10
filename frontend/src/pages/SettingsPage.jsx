import React, { useState } from 'react';
import { FiBell, FiGlobe, FiEye, FiVolume2, FiSave, FiDownload } from 'react-icons/fi';

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    // Уведомления
    emailNotifications: true,
    pushNotifications: false,
    soundNotifications: true,
    reminderFrequency: 'daily',
    
    // Конфиденциальность
    showProfile: true,
    showProgress: true,
    showCourses: false,
    
    // Интерфейс
    language: 'ru',
    theme: 'light',
    fontSize: 'medium',
    animationSpeed: 'normal',
    
    // Учебные настройки
    autoSave: true,
    downloadMaterials: true,
    offlineMode: false,
    difficultyLevel: 'intermediate',
    
    // Данные
    exportFormat: 'json',
    autoBackup: true,
    backupFrequency: 'weekly'
  });

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
    alert('Настройки сохранены!');
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'ai-assistant-settings.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleReset = () => {
    if (window.confirm('Вы уверены, что хотите сбросить все настройки к значениям по умолчанию?')) {
      setSettings({
        emailNotifications: true,
        pushNotifications: false,
        soundNotifications: true,
        reminderFrequency: 'daily',
        showProfile: true,
        showProgress: true,
        showCourses: false,
        language: 'ru',
        theme: 'light',
        fontSize: 'medium',
        animationSpeed: 'normal',
        autoSave: true,
        downloadMaterials: true,
        offlineMode: false,
        difficultyLevel: 'intermediate',
        exportFormat: 'json',
        autoBackup: true,
        backupFrequency: 'weekly'
      });
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Настройки системы</h2>
        <p>Настройте параметры работы приложения под свои потребности</p>
      </div>

      <div className="settings-container">
        <div className="settings-actions-bar">
          <button onClick={handleSave} className="btn-primary">
            <FiSave /> Сохранить все настройки
          </button>
          <button onClick={handleExport} className="btn-secondary">
            <FiDownload /> Экспорт настроек
          </button>
          <button onClick={handleReset} className="btn-danger">
            Сбросить к стандартным
          </button>
        </div>

        <div className="settings-sections">
          {/* Секция уведомлений */}
          <div className="settings-section">
            <div className="section-header">
              <FiBell className="section-icon" />
              <h3>Уведомления</h3>
            </div>
            <div className="settings-group">
              <div className="setting-item">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={settings.emailNotifications}
                    onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                  />
                  <span>Email уведомления</span>
                </label>
                <p className="setting-description">Получать уведомления на электронную почту</p>
              </div>

              <div className="setting-item">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={settings.pushNotifications}
                    onChange={(e) => handleSettingChange('pushNotifications', e.target.checked)}
                  />
                  <span>Push-уведомления в браузере</span>
                </label>
                <p className="setting-description">Показывать уведомления в браузере</p>
              </div>

              <div className="setting-item">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={settings.soundNotifications}
                    onChange={(e) => handleSettingChange('soundNotifications', e.target.checked)}
                  />
                  <span>Звуковые уведомления</span>
                </label>
                <p className="setting-description">Проигрывать звук при новых сообщениях</p>
              </div>

              <div className="setting-item">
                <label>Частота напоминаний</label>
                <select 
                  value={settings.reminderFrequency}
                  onChange={(e) => handleSettingChange('reminderFrequency', e.target.value)}
                  className="setting-select"
                >
                  <option value="never">Никогда</option>
                  <option value="daily">Ежедневно</option>
                  <option value="weekly">Еженедельно</option>
                  <option value="monthly">Ежемесячно</option>
                </select>
              </div>
            </div>
          </div>

          {/* Секция конфиденциальности */}
          <div className="settings-section">
            <div className="section-header">
              <FiEye className="section-icon" />
              <h3>Конфиденциальность</h3>
            </div>
            <div className="settings-group">
              <div className="setting-item">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={settings.showProfile}
                    onChange={(e) => handleSettingChange('showProfile', e.target.checked)}
                  />
                  <span>Показывать профиль другим пользователям</span>
                </label>
              </div>

              <div className="setting-item">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={settings.showProgress}
                    onChange={(e) => handleSettingChange('showProgress', e.target.checked)}
                  />
                  <span>Показывать прогресс обучения</span>
                </label>
              </div>

              <div className="setting-item">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={settings.showCourses}
                    onChange={(e) => handleSettingChange('showCourses', e.target.checked)}
                  />
                  <span>Показывать пройденные курсы</span>
                </label>
              </div>
            </div>
          </div>

          {/* Секция интерфейса */}
          <div className="settings-section">
            <div className="section-header">
              <FiGlobe className="section-icon" />
              <h3>Интерфейс и язык</h3>
            </div>
            <div className="settings-group">
              <div className="setting-item">
                <label>Язык интерфейса</label>
                <select 
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  className="setting-select"
                >
                  <option value="ru">Русский</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>

              <div className="setting-item">
                <label>Тема оформления</label>
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
                  <button 
                    className={`theme-option ${settings.theme === 'auto' ? 'active' : ''}`}
                    onClick={() => handleSettingChange('theme', 'auto')}
                  >
                    Авто
                  </button>
                </div>
              </div>

              <div className="setting-item">
                <label>Размер шрифта</label>
                <div className="option-buttons">
                  <button 
                    className={`option-button ${settings.fontSize === 'small' ? 'active' : ''}`}
                    onClick={() => handleSettingChange('fontSize', 'small')}
                  >
                    Мелкий
                  </button>
                  <button 
                    className={`option-button ${settings.fontSize === 'medium' ? 'active' : ''}`}
                    onClick={() => handleSettingChange('fontSize', 'medium')}
                  >
                    Средний
                  </button>
                  <button 
                    className={`option-button ${settings.fontSize === 'large' ? 'active' : ''}`}
                    onClick={() => handleSettingChange('fontSize', 'large')}
                  >
                    Крупный
                  </button>
                </div>
              </div>

              <div className="setting-item">
                <label>Скорость анимаций</label>
                <div className="option-buttons">
                  <button 
                    className={`option-button ${settings.animationSpeed === 'slow' ? 'active' : ''}`}
                    onClick={() => handleSettingChange('animationSpeed', 'slow')}
                  >
                    Медленно
                  </button>
                  <button 
                    className={`option-button ${settings.animationSpeed === 'normal' ? 'active' : ''}`}
                    onClick={() => handleSettingChange('animationSpeed', 'normal')}
                  >
                    Нормально
                  </button>
                  <button 
                    className={`option-button ${settings.animationSpeed === 'fast' ? 'active' : ''}`}
                    onClick={() => handleSettingChange('animationSpeed', 'fast')}
                  >
                    Быстро
                  </button>
                  <button 
                    className={`option-button ${settings.animationSpeed === 'off' ? 'active' : ''}`}
                    onClick={() => handleSettingChange('animationSpeed', 'off')}
                  >
                    Выкл
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Секция учебных настроек */}
          <div className="settings-section">
            <div className="section-header">
              <FiVolume2 className="section-icon" />
              <h3>Учебные настройки</h3>
            </div>
            <div className="settings-group">
              <div className="setting-item">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={settings.autoSave}
                    onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
                  />
                  <span>Автосохранение прогресса</span>
                </label>
                <p className="setting-description">Автоматически сохранять прогресс каждые 5 минут</p>
              </div>

              <div className="setting-item">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={settings.downloadMaterials}
                    onChange={(e) => handleSettingChange('downloadMaterials', e.target.checked)}
                  />
                  <span>Загружать материалы для офлайн-доступа</span>
                </label>
              </div>

              <div className="setting-item">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={settings.offlineMode}
                    onChange={(e) => handleSettingChange('offlineMode', e.target.checked)}
                  />
                  <span>Офлайн-режим</span>
                </label>
                <p className="setting-description">Работать без подключения к интернету</p>
              </div>

              <div className="setting-item">
                <label>Уровень сложности материалов</label>
                <select 
                  value={settings.difficultyLevel}
                  onChange={(e) => handleSettingChange('difficultyLevel', e.target.value)}
                  className="setting-select"
                >
                  <option value="beginner">Начинающий</option>
                  <option value="intermediate">Средний</option>
                  <option value="advanced">Продвинутый</option>
                  <option value="expert">Эксперт</option>
                </select>
              </div>
            </div>
          </div>

          {/* Секция данных */}
          <div className="settings-section">
            <div className="section-header">
              <FiSave className="section-icon" />
              <h3>Данные и резервное копирование</h3>
            </div>
            <div className="settings-group">
              <div className="setting-item">
                <label>Формат экспорта данных</label>
                <select 
                  value={settings.exportFormat}
                  onChange={(e) => handleSettingChange('exportFormat', e.target.value)}
                  className="setting-select"
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF</option>
                  <option value="xlsx">Excel</option>
                </select>
              </div>

              <div className="setting-item">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={settings.autoBackup}
                    onChange={(e) => handleSettingChange('autoBackup', e.target.checked)}
                  />
                  <span>Автоматическое резервное копирование</span>
                </label>
              </div>

              {settings.autoBackup && (
                <div className="setting-item">
                  <label>Частота резервного копирования</label>
                  <select 
                    value={settings.backupFrequency}
                    onChange={(e) => handleSettingChange('backupFrequency', e.target.value)}
                    className="setting-select"
                  >
                    <option value="daily">Ежедневно</option>
                    <option value="weekly">Еженедельно</option>
                    <option value="monthly">Ежемесячно</option>
                  </select>
                </div>
              )}

              <div className="setting-item">
                <label>Очистка данных</label>
                <div className="danger-actions">
                  <button className="btn-danger" onClick={() => alert('Функция в разработке')}>
                    Удалить историю чата
                  </button>
                  <button className="btn-danger" onClick={() => alert('Функция в разработке')}>
                    Удать все данные
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;