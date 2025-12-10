import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { FiMail, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Введите email');
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Введите корректный email');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      await apiService.auth.requestPasswordReset(email);
      setIsSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка отправки запроса');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <FiCheckCircle className="success-icon" />
            <h1>Проверьте вашу почту</h1>
            <p>Инструкции по сбросу пароля отправлены на {email}</p>
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
          <h1>Восстановление пароля</h1>
          <p>Введите email, указанный при регистрации</p>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="email">
              <FiMail /> Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Введите ваш email"
              disabled={isSubmitting}
            />
          </div>
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Отправка...' : 'Отправить инструкции'}
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

export default ForgotPasswordPage;