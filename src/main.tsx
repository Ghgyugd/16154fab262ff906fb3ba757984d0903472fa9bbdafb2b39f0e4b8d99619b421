// Suppress noisy Vite dev server WebSocket disconnect errors & development mode notices in AI Studio iFrame
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = event.reason ? String(event.reason?.message || event.reason) : '';
    if (
      reasonStr.includes('WebSocket') ||
      reasonStr.includes('failed to connect') ||
      reasonStr.includes('closed without opened')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (msg.includes('WebSocket') || msg.includes('[vite]') || msg.includes('websocket')) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  // Filter development-only console notices
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const msg = args[0] ? String(args[0]) : '';
    if (
      msg.includes('Clerk: Clerk has been loaded with development keys') ||
      msg.includes('WebSocket')
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
