import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Callback: React.FC = () => {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        console.log('Callback component mounted');
        console.log('Full URL:', window.location.href);
        
        // Get the full URL and extract the token
        const fullUrl = window.location.href;
        const tokenMatch = fullUrl.match(/token=([^&]+)/);
        const token = tokenMatch ? tokenMatch[1] : null;
        
        console.log('Extracted token:', token);
        
        // Check for error parameter
        const errorParam = new URLSearchParams(window.location.search).get('error');
        console.log('Error parameter:', errorParam);

        if (errorParam) {
            setError(errorParam);
            setTimeout(() => navigate('/login'), 3000);
            return;
        }

        if (token) {
            console.log('Token found, storing in localStorage');
            // Store the token in localStorage
            localStorage.setItem('token', token);
            
            // Verify token was stored
            const storedToken = localStorage.getItem('token');
            console.log('Verifying token storage:', storedToken ? 'Token stored successfully' : 'Token storage failed');
            
            console.log('Redirecting to /');
            // Redirect to the main app
            navigate('/');
        } else {
            console.log('No token found in callback');
            setError('No token found in callback');
            setTimeout(() => navigate('/login'), 3000);
        }
    }, [navigate]);

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="p-8 bg-white rounded-lg shadow-md">
                    <p className="text-red-500">Error: {error}</p>
                    <p>Redirecting to login page...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="p-8 bg-white rounded-lg shadow-md">
                <p className="text-lg">Processing login...</p>
                <div className="mt-4 w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full w-3/4 animate-pulse"></div>
                </div>
            </div>
        </div>
    );
};

export default Callback;