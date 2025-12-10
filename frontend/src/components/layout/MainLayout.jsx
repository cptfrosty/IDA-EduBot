import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import '../../styles/App.css';

const MainLayout = ({ children }) => {
  return (
    <div className="app-container">
      <Header />
      <div className="main-content">
        <Sidebar />
        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;