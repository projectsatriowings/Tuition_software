import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Automatically reload the page when a new deployment invalidates cached chunks
window.addEventListener('vite:preloadError', (event) => {
  const lastReload = Number(sessionStorage.getItem('tuitionos_last_preload_reload') || '0');
  const now = Date.now();
  if (now - lastReload > 10000) {
    sessionStorage.setItem('tuitionos_last_preload_reload', String(now));
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
