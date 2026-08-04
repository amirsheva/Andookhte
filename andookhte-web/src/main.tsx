import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// ثبت سرویس‌ورکر برای قابلیت نصب (PWA) — فقط در حالت تولید
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* نصب‌نشدن سرویس‌ورکر نباید اپ را متوقف کند */
    });
  });
}
