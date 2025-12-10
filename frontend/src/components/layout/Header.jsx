import React from 'react';
import { useAuth } from '../../context/AuthContext';

const Header = () => {
  const { user } = useAuth();

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="logo">AI Learning Assistant</h1>
        <nav className="main-nav">
          <a href="#help">Помощь</a>
          <a href="#docs">Документация</a>
          <a href="#support">Поддержка</a>
        </nav>
      </div>
      
      <div className="header-right">
        {user && (
          <div className="user-profile">
            <img src={user.avatar} alt={user.name} className="user-avatar" />
            <span className="user-name">{user.name}</span>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;