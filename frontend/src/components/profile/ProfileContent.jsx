import React, { useState } from 'react';
import { FiEdit2, FiSave, FiX } from 'react-icons/fi';

const ProfileContent = ({ user }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user.name,
    email: user.email,
    phone: '+7 (999) 123-45-67',
    university: 'Московский Государственный Университет',
    faculty: 'Факультет Вычислительной Математики и Кибернетики',
    year: '3 курс'
  });

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setIsEditing(false);
    // Здесь будет логика сохранения данных
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <div className="profile-content">
      <div className="profile-header">
        <div className="avatar-section">
          <img src={user.avatar} alt={user.name} className="profile-avatar-large" />
          {isEditing ? (
            <button className="avatar-upload">Изменить фото</button>
          ) : null}
        </div>
        
        <div className="profile-info">
          {isEditing ? (
            <input
              type="text"
              value={profileData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="editable-input"
            />
          ) : (
            <h2>{profileData.name}</h2>
          )}
          <p className="user-email">{profileData.email}</p>
          <p className="user-role">{user.role === 'student' ? 'Студент' : 'Преподаватель'}</p>
        </div>

        <div className="profile-actions">
          {isEditing ? (
            <>
              <button onClick={handleSave} className="btn-primary">
                <FiSave /> Сохранить
              </button>
              <button onClick={handleCancel} className="btn-secondary">
                <FiX /> Отмена
              </button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} className="btn-primary">
              <FiEdit2 /> Редактировать профиль
            </button>
          )}
        </div>
      </div>

      <div className="profile-details">
        <div className="detail-section">
          <h3>Контактная информация</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Телефон:</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="editable-input"
                />
              ) : (
                <span>{profileData.phone}</span>
              )}
            </div>
            <div className="detail-item">
              <label>Университет:</label>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.university}
                  onChange={(e) => handleInputChange('university', e.target.value)}
                  className="editable-input"
                />
              ) : (
                <span>{profileData.university}</span>
              )}
            </div>
            <div className="detail-item">
              <label>Факультет:</label>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.faculty}
                  onChange={(e) => handleInputChange('faculty', e.target.value)}
                  className="editable-input"
                />
              ) : (
                <span>{profileData.faculty}</span>
              )}
            </div>
            <div className="detail-item">
              <label>Курс:</label>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.year}
                  onChange={(e) => handleInputChange('year', e.target.value)}
                  className="editable-input"
                />
              ) : (
                <span>{profileData.year}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileContent;