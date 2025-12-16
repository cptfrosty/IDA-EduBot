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
  const loadUser = useCallback(async (forceReload = false) => {
    try {
      const token = localStorage.getItem('access_token');
      
      // Если токена нет, выходим
      if (!token) {
        setUser(null);
        setLoading(false);
        return null;
      }
      
      // Если пользователь уже загружен и не требуется принудительная перезагрузка
      const savedUser = localStorage.getItem('user');
      if (savedUser && !forceReload) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          // Не устанавливаем loading = false здесь, ждем свежие данные
        } catch (e) {
          console.error('Ошибка парсинга сохраненного пользователя:', e);
        }
      }
      
      // Проверяем, что apiService существует
      if (!apiService?.auth?.getMe) {
        console.error('apiService не инициализирован');
        setLoading(false);
        return null;
      }
      
      // Загружаем данные пользователя с сервера
      const userData = await apiService.auth.getMe();
      
      // Проверяем, что данные пришли
      if (userData && (userData.id || userData.user_id || userData.email)) {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        return userData;
      } else {
        console.warn('Некорректные данные пользователя от сервера:', userData);
        // Не очищаем токен, может быть временная проблема сервера
        return null;
      }
      
    } catch (err) {
      console.error('Ошибка загрузки пользователя:', err);
      
      // Обработка различных ошибок
      if (err.response?.status === 401) {
        // Неавторизован - очищаем токены
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        setUser(null);
        setError('Сессия истекла. Пожалуйста, войдите снова.');
      } else if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        // Проблемы с сетью - не очищаем токен
        setError('Нет соединения с сервером. Проверьте подключение.');
        setConnectionError(true);
        
        // Показываем сохраненного пользователя если есть
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);
          } catch (e) {
            // ignore
          }
        }
      } else {
        // Другие ошибки - не очищаем токен сразу
        setError('Ошибка загрузки профиля');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []); // Убрали зависимость от user

  // При монтировании проверяем соединение и загружаем пользователя
  useEffect(() => {
  let isMounted = true;
  
  const initialize = async () => {
    try {
      await checkConnection();
      
      const token = localStorage.getItem('access_token');
      if (!token) {
        if (isMounted) {
          setLoading(false);
          setUser(null);
        }
        return;
      }
      
      // Показываем сохраненного пользователя сразу
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          if (isMounted) {
            setUser(parsedUser);
          }
        } catch (e) {
          console.error('Ошибка парсинга сохраненного пользователя:', e);
        }
      }
      
      // Пробуем загрузить свежие данные
      if (apiService?.auth?.getMe) {
        try {
          const userData = await apiService.auth.getMe();
          if (isMounted && userData) {
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          }
        } catch (err) {
          console.error('Ошибка загрузки пользователя:', err);
          
          // Только при 401 очищаем токен
          if (err.response?.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            if (isMounted) {
              setUser(null);
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Ошибка инициализации:', error);
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };
  
  initialize();
  
  return () => {
    isMounted = false;
  };
}, []); // Пустой массив зависимостей - запускается только при монтировании

  // Остальные функции без изменений
  const login = async (credentials) => {
    try {
      setError(null);
      
      const isConnected = await checkConnection();
      if (!isConnected) {
        setError('Нет соединения с сервером. Проверьте подключение к интернету.');
        return { success: false, error: 'Нет соединения с сервером' };
      }

      const response = await apiService.auth.login(credentials);
      
      if (response.access_token) {
        localStorage.setItem('access_token', response.access_token);
        
        if (response.refresh_token) {
          localStorage.setItem('refresh_token', response.refresh_token);
        }
        
        // Загружаем пользователя
        const userData = await loadUser(true);
        
        setConnectionError(false);
        return { 
          success: true, 
          data: response,
          user: userData 
        };
      } else {
        throw new Error('Токен не получен от сервера');
      }
      
    } catch (err) {
      console.error('Ошибка авторизации:', err);
      
      let errorMessage = 'Ошибка авторизации';
      
      if (err.response) {
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
        errorMessage = 'Нет ответа от сервера. Проверьте подключение к интернету.';
        setConnectionError(true);
      } else {
        errorMessage = err.message || 'Ошибка при отправке запроса';
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

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

  const value = {
    user,
    loading,
    error,
    connectionError,
    login,
    logout,
    loadUser, // экспортируем для ручного вызова
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