// frontend/src/index.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import App from './App'; // Reverted to default import
import Login from './components/Login';
import Callback from './components/Callback';
import CostsPage from './components/CostsPage';
import './index.css';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? <>{children}</> : <Navigate to="/app/login" />;
};

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <Router>
            <Routes>
                <Route path="/app/login" element={<Login />} />
                <Route path="/app/callback" element={<Callback />} />
                <Route
                    path="/app"
                    element={
                        <ProtectedRoute>
                            <App />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/app/costs"
                    element={
                        <ProtectedRoute>
                            <CostsPage />
                        </ProtectedRoute>
                    }
                />
                {/* Redirect root to /app */}
                <Route path="/" element={<Navigate to="/app" />} />
            </Routes>
        </Router>
    </StrictMode>
);
