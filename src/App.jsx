import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import InsertData from './pages/InsertData';
import './index.css';

function Navigation() {
  const location = useLocation();
  
  return (
    <nav style={{ display: 'flex', gap: '15px', padding: '15px 20px', background: 'var(--header-bg)', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
      <Link 
        to="/" 
        className={location.pathname === '/' ? 'btn btn-primary' : 'btn btn-secondary'}
        style={{ background: location.pathname === '/' ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: 'white', border: location.pathname === '/' ? 'none' : '1px solid rgba(255,255,255,0.3)', textDecoration: 'none' }}
      >
        <i className="fa-solid fa-chart-line"></i> Dashboard Principal
      </Link>
      <Link 
        to="/inserir" 
        className={location.pathname === '/inserir' ? 'btn btn-primary' : 'btn btn-secondary'}
        style={{ background: location.pathname === '/inserir' ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: 'white', border: location.pathname === '/inserir' ? 'none' : '1px solid rgba(255,255,255,0.3)', textDecoration: 'none' }}
      >
        <i className="fa-solid fa-plus-circle"></i> Inserir Dados
      </Link>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div>
        <Navigation />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inserir" element={<InsertData />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
