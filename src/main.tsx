import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Browser shim for process.env
if (typeof (window as any).process === 'undefined') {
  (window as any).process = {
    env: {
      NEXT_PUBLIC_VERSION: '1.0.0',
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
