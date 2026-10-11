import React from 'react';
import { createRoot } from 'react-dom/client';
import { initI18n } from './i18n';
import './index.css';
import App from './App';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

const host = document.getElementById('root');
if (!host) throw new Error('#root missing');

// Translations must be in place before the first render, or every label
// would flash its raw key.
void initI18n().then(() => {
  createRoot(host).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
});
