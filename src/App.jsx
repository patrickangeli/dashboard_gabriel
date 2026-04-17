import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, SignIn, UserButton } from "@clerk/clerk-react";
import Dashboard from './pages/Dashboard';
import InsertData from './pages/InsertData';
import './index.css';

function Navigation() {
  const location = useLocation();
  const isDashboard = location.pathname === '/';
  
  return (
    <nav style={{ position: 'absolute', width: '100%', zIndex: 10, display: 'flex', gap: '15px', padding: '15px 20px', background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ display: 'flex', flex: 1 }}></div>
      <div style={{ display: 'flex', gap: '15px' }}>
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
      </div>
      <div style={{ display: 'flex', flex: 1, justifyContent: 'flex-end' }}>
        <UserButton />
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div>
        <SignedIn>
          <Navigation />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inserir" element={<InsertData />} />
          </Routes>
        </SignedIn>
        
        <SignedOut>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-color)' }}>
            <SignIn />
          </div>
        </SignedOut>
      </div>
    </BrowserRouter>
  );
}

export default App;
