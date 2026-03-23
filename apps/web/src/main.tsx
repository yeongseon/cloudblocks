import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './app/index.css';
import App from './app/App.tsx';
import { ErrorBoundary } from './shared/ui/ErrorBoundary.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
