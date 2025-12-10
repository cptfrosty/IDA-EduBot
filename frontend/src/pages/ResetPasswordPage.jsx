import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { FiLock, FiArrowLeft, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

const ResetPasswordPage = () => {
  const { token } = useParams();
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Очищаем ошибку при изменении поля
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    setError('');
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.newPassword) {
      newErrors.newPassword = 'Введите новый пароль';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Пароль должен быть не менее 6 символов';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Подтвердите пароль';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      await apiService.auth.confirmPasswordReset({
        token: token || '',
        new_password: formData.newPassword
      });
      
      setIsSuccess(true);
      
      // Автоматический редирект через 3 секунды
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка сброса пароля');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <FiCheckCircle className="success-icon" />
            <h1>Пароль успешно изменен!</h1>
            <p>Вы будете перенаправлены на страницу входа через 3 секунды</p>
          </div>
          
          <div className="auth-actions">
            <Link to="/login" className="btn-primary">
              <FiArrowLeft /> Вернуться к входу
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Сброс пароля</h1>
          <p>Введите новый пароль для вашего аккаунта</p>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="error-message">
              <FiAlertCircle />
              <span>{error}</span>
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="newPassword">
              <FiLock /> Новый пароль
            </label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="Введите новый пароль"
              disabled={isSubmitting}
              className={errors.newPassword ? 'error' : ''}
            />
            {errors.newPassword && (
              <div className="field-error">{errors.newPassword}</div>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">
              <FiLock /> Подтвердите пароль
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Повторите новый пароль"
              disabled={isSubmitting}
              className={errors.confirmPassword ? 'error' : ''}
            />
            {errors.confirmPassword && (
              <div className="field-error">{errors.confirmPassword}</div>
            )}
          </div>
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="spinner small"></div>
                Изменение...
              </>
            ) : (
              'Изменить пароль'
            )}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>
            <Link to="/login">
              <FiArrowLeft /> Вернуться к входу
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;