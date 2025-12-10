import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/App.css';
import { FiAlertCircle, FiCheckCircle, FiWifi, FiWifiOff } from 'react-icons/fi';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  
  const { login, error, connectionError, checkConnection, clearError } = useAuth();
  const navigate = useNavigate();

  // Очищаем ошибки при изменении полей
  useEffect(() => {
    clearError();
    setFormErrors({});
  }, [email, password, clearError]);

  // Проверка валидации формы
  const validateForm = () => {
    const errors = {};
    
    if (!email.trim()) {
      errors.email = 'Email обязателен';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Некорректный email';
    }
    
    if (!password) {
      errors.password = 'Пароль обязателен';
    } else if (password.length < 6) {
      errors.password = 'Пароль должен быть не менее 6 символов';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    // Проверяем соединение
    const isConnected = await checkConnection();
    if (!isConnected) {
      setIsSubmitting(false);
      return;
    }
    
    const result = await login({ email, password });
    
    if (result.success) {
      navigate('/');
    }
    
    setIsSubmitting(false);
  };

  const handleTestConnection = async () => {
    await checkConnection();
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>AI Learning Assistant</h1>
          <p>Войдите в систему для продолжения</p>
          
          {/* Индикатор соединения */}
          <div className={`connection-status ${connectionError ? 'error' : 'success'}`}>
            {connectionError ? (
              <>
                <FiWifiOff />
                <span>Нет соединения с сервером</span>
                <button 
                  onClick={handleTestConnection}
                  className="btn-test-connection"
                >
                  Проверить
                </button>
              </>
            ) : (
              <>
                <FiWifi />
                <span>Соединение с сервером установлено</span>
              </>
            )}
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          {/* Общая ошибка */}
          {error && (
            <div className="error-message">
              <FiAlertCircle />
              <span>{error}</span>
            </div>
          )}
          
          {/* Поле Email */}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Введите ваш email"
              className={formErrors.email ? 'error' : ''}
              disabled={isSubmitting}
            />
            {formErrors.email && (
              <div className="field-error">{formErrors.email}</div>
            )}
          </div>
          
          {/* Поле Пароль */}
          <div className="form-group">
            <div className="password-label">
              <label htmlFor="password">Пароль</label>
              <button
                type="button"
                className="btn-show-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Скрыть' : 'Показать'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите ваш пароль"
              className={formErrors.password ? 'error' : ''}
              disabled={isSubmitting}
            />
            {formErrors.password && (
              <div className="field-error">{formErrors.password}</div>
            )}
          </div>
          
          {/* Кнопка входа */}
          <button 
            type="submit" 
            className="login-button"
            disabled={isSubmitting || connectionError}
          >
            {isSubmitting ? (
              <>
                <div className="spinner"></div>
                Вход...
              </>
            ) : (
              'Войти'
            )}
          </button>
          
          {/* Демо-креденшелы для тестирования */}
          <div className="demo-credentials">
            <p className="demo-title">Для тестирования:</p>
            <div className="demo-cred">
              <span>Email:</span>
              <code>test@example.com</code>
            </div>
            <div className="demo-cred">
              <span>Пароль:</span>
              <code>test123</code>
            </div>
          </div>
        </form>
        
        <div className="login-footer">
          <p>Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
          <p>
            <Link to="/forgot-password">Забыли пароль?</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;