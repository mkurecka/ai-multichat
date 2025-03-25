// frontend/src/index.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import App from './App.tsx';
import Login from './components/Login.tsx';
import Callback from './components/Callback.tsx';
import './index.css';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? <>{children}</> : <Navigate to="/login" />;
};

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/callback" element={<Callback />} />
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <App />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </Router>
    </StrictMode>
);