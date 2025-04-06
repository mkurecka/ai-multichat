// frontend/src/index.tsx
// import '../app'; // Removed import causing Vite/Webpack conflict
import '../styles/app.css'; // Directly import necessary global styles
import './index.css';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // Changed from HashRouter
import App from './App';

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <BrowserRouter basename="/app"> {/* Changed from HashRouter, added basename */}
                <App />
            </BrowserRouter>
        </React.StrictMode>
    );
}
