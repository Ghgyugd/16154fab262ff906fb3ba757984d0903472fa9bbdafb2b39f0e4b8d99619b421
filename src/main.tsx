import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

/**
 * Dev-only: HMR websocket noise inside sandboxed iframes.
 *
 * Scoped to import.meta.env.DEV so production never swallows errors. Only
 * HMR transport messages are filtered - every other error, including genuine
 * runtime failures, is left to propagate to error reporting.
 */
if (import.meta.env.DEV && typeof window !== 'undefined') {
  const isHmrNoise = (text: string) =>
    text.includes('[vite]') ||
    text.includes('WebSocket') ||
    text.includes('failed to connect') ||
    text.includes('closed without opened');

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason as { message?: string } | undefined;
    const text = reason?.message ?? String(event.reason ?? '');
    if (isHmrNoise(text)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);