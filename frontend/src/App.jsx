import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';

// Основные страницы
import ChatPage from './pages/ChatPage';
import MaterialsPage from './pages/MaterialsPage';
import ProgressPage from './pages/ProgressPage';
import CoursesPage from './pages/CoursesPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';

// Новые страницы
import DocumentsPage from './pages/DocumentsPage';
import SearchPage from './pages/SearchPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SystemStatusPage from './pages/SystemStatusPage';

// Компоненты для вложенных роутов
import ChatHistory from './components/chat/ChatHistory';
import DocumentUpload from './components/documents/DocumentUpload';

import './styles/App.css';

// Компонент для защиты приватных маршрутов
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    // Показываем индикатор загрузки
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }
  
  // Если пользователь не авторизован, перенаправляем на страницу входа
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Если пользователь авторизован, отображаем запрошенный компонент
  return children;
};

// Компонент для публичных маршрутов (только для неавторизованных)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }
  
  // Если пользователь уже авторизован, перенаправляем на главную
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Публичные роуты - доступны только неавторизованным */}
          <Route path="/login" element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } />
          <Route path="/forgot-password" element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          } />
          <Route path="/reset-password/:token" element={
            <PublicRoute>
              <ResetPasswordPage />
            </PublicRoute>
          } />
          
          {/* Приватные роуты - доступны только авторизованным */}
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }>
            {/* Индексный роут без дочерних */}
            <Route index element={<Navigate to="/chat" />} />
            
            {/* Основные роуты */}
            <Route path="chat/:chatId?" element={<ChatPage />} />
            <Route path="chat/history" element={<ChatHistory />} />
            
            {/* Документы */}
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="documents/upload" element={<DocumentUpload />} />
            
            {/* Поиск */}
            <Route path="search" element={<SearchPage />} />
            
            {/* Обучение */}
            <Route path="materials" element={<MaterialsPage />} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="progress" element={<ProgressPage />} />
            
            {/* Аналитика */}
            <Route path="analytics" element={<AnalyticsPage />} />
            
            {/* Система */}
            <Route path="system/status" element={<SystemStatusPage />} />
            
            {/* Пользователь */}
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
            
            {/* 404 */}
            <Route path="*" element={
              <div className="page-container">
                <div className="not-found">
                  <h2>404 - Страница не найдена</h2>
                  <p>Запрошенная страница не существует</p>
                  <a href="/" className="btn-primary">На главную</a>
                </div>
              </div>
            } />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;