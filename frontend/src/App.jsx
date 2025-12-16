import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Публичные роуты */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          
          {/* Приватные роуты */}
          <Route path="/" element={<Dashboard />}>
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