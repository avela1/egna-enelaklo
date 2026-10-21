import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@egna-enelaklo/design-tokens/tokens.css';
import './styles/index.css';
import { App } from './app/App';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element #root was not found in index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
