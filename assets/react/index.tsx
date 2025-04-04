// frontend/src/index.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import App from './App'; // Reverted to default import
import Login from './components/Login';
import Callback from './components/Callback';
import CostsPage from './components/CostsPage';
import './index.css';
import { isAuthenticated } from './services/api';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    console.log('ProtectedRoute: Checking authentication');
    const isAuth = isAuthenticated();
    console.log('ProtectedRoute: isAuthenticated =', isAuth);
    
    if (isAuth) {
        console.log('ProtectedRoute: User is authenticated, rendering children');
        return <>{children}</>;
    } else {
        console.log('ProtectedRoute: User is not authenticated, redirecting to login');
        return <Navigate to="/login" />;
    }
};

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/app/callback" element={<Callback />} />
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <App />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/costs"
                    element={
                        <ProtectedRoute>
                            <CostsPage />
                        </ProtectedRoute>
                    }
                />
                {/* Redirect root to / */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    </StrictMode>
);
