import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ClerkProvider } from '@clerk/clerk-react';
import ErrorBoundary from './ErrorBoundary.jsx';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      {PUBLISHABLE_KEY ? (
        <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
          <App />
        </ClerkProvider>
      ) : (
        <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif', color: '#fff' }}>
          <h1>🔐 Autenticação Necessária</h1>
          <p>Crie um projeto no <a href="https://clerk.com" style={{ color: '#2563eb' }} target="_blank">Clerk.com</a> e coloque sua chave <code>VITE_CLERK_PUBLISHABLE_KEY</code> no arquivo <code>.env</code> na raiz do projeto para prosseguir.</p>
        </div>
      )}
    </ErrorBoundary>
  </React.StrictMode>,
);