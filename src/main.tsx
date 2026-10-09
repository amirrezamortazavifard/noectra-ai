import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Browser shim for process.env
if (typeof (window as any).process === 'undefined') {
  (window as any).process = {
    env: {
      NEXT_PUBLIC_VERSION: '1.1.1',
      NODE_ENV: 'production',
    },
  };
}

// Transparently route /api requests to local Axum server on port 3001
const originalFetch = window.fetch;
window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
  if (typeof input === 'string' && input.startsWith('/api')) {
    input = `http://127.0.0.1:3001${input}`;
  } else if (input instanceof URL && input.pathname.startsWith('/api')) {
    input = new URL(`http://127.0.0.1:3001${input.pathname}${input.search}`);
  }
  return originalFetch(input, init);
};

// Enforce native desktop app feel: disable default browser context menu & dev shortcuts
if (typeof window !== 'undefined') {
  window.addEventListener(
    'contextmenu',
    (e) => {
      e.preventDefault();
    },
    { capture: true },
  );

  window.addEventListener(
    'keydown',
    (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const key = e.key;

      if (
        key === 'F12' ||
        (isCtrlOrCmd && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(key)) ||
        (isCtrlOrCmd && ['u', 'U', 'r', 'R', 'p', 'P'].includes(key)) ||
        (!isCtrlOrCmd && key === 'F5')
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    { capture: true },
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
