import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionError, setConnectionError] = useState(false);

  // Проверка соединения с сервером
  const checkConnection = async () => {
    try {
      await apiService.system.getHealth();
      setConnectionError(false);
      return true;
    } catch (err) {
      console.error('Ошибка соединения с сервером:', err);
      setConnectionError(true);
      return false;
    }
  };

  // Функция для загрузки пользователя
  const loadUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        const userData = await apiService.auth.getMe();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (err) {
      console.error('Ошибка загрузки пользователя:', err);
      // Если ошибка 401, очищаем токены
      if (err.response?.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        setUser(null);
      }
      setError('Ошибка загрузки профиля');
    } finally {
      setLoading(false);
    }
  }, []);

  // При монтировании проверяем соединение и загружаем пользователя
  useEffect(() => {
    const initialize = async () => {
      await checkConnection();
      await loadUser();
    };
    initialize();
  }, [loadUser]);

  // Функция логина
  const login = async (credentials) => {
    try {
      setError(null);
      
      // Проверяем соединение перед авторизацией
      const isConnected = await checkConnection();
      if (!isConnected) {
        setError('Нет соединения с сервером. Проверьте подключение к интернету.');
        return { success: false, error: 'Нет соединения с сервером' };
      }

      const response = await apiService.auth.login(credentials);
      
      if (response.user) {
        setUser(response.user);
        localStorage.setItem('user', JSON.stringify(response.user));
        setConnectionError(false);
      }
      
      return { success: true, data: response };
    } catch (err) {
      console.error('Ошибка авторизации:', err);
      
      let errorMessage = 'Ошибка авторизации';
      
      if (err.response) {
        // Сервер ответил с ошибкой
        if (err.response.status === 401) {
          errorMessage = 'Неверный email или пароль';
        } else if (err.response.status === 422) {
          errorMessage = 'Некорректные данные';
        } else if (err.response.status === 500) {
          errorMessage = 'Ошибка сервера';
        } else if (err.response.data?.detail) {
          errorMessage = err.response.data.detail;
        }
      } else if (err.request) {
        // Запрос был сделан, но ответ не получен
        errorMessage = 'Нет ответа от сервера. Проверьте подключение к интернету.';
        setConnectionError(true);
      } else {
        // Ошибка при настройке запроса
        errorMessage = 'Ошибка при отправке запроса';
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Функция регистрации
  const register = async (userData) => {
    try {
      setError(null);
      
      const isConnected = await checkConnection();
      if (!isConnected) {
        setError('Нет соединения с сервером');
        return { success: false, error: 'Нет соединения с сервером' };
      }

      const response = await apiService.auth.register(userData);
      return { success: true, data: response };
    } catch (err) {
      let errorMessage = 'Ошибка регистрации';
      
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.request) {
        errorMessage = 'Нет ответа от сервера';
        setConnectionError(true);
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Функция выхода
  const logout = async () => {
    try {
      await apiService.auth.logout();
    } catch (err) {
      console.error('Ошибка при выходе:', err);
    } finally {
      setUser(null);
      setError(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  };

  // Функция смены пароля
  const changePassword = async (passwordData) => {
    try {
      const response = await apiService.auth.changePassword(passwordData);
      return { success: true, data: response };
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Ошибка смены пароля';
      return { success: false, error: errorMessage };
    }
  };

  const value = {
    user,
    loading,
    error,
    connectionError,
    login,
    register,
    logout,
    changePassword,
    refreshUser: loadUser,
    checkConnection,
    setError,
    clearError: () => setError(null)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};