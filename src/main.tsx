import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-700.css';
import '@fontsource/poppins/latin-ext-400.css';
import '@fontsource/poppins/latin-ext-600.css';
import '@fontsource/poppins/devanagari-400.css';
import '@fontsource/poppins/devanagari-600.css';
import '@fontsource/cardo/latin-400.css';
import '@fontsource/cardo/latin-400-italic.css';
import '@fontsource/cardo/latin-700.css';
import './index.css';
import { App } from './app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
