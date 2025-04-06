import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Callback: React.FC = () => {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        console.log('Callback component mounted');
        console.log('Callback component mounted');
        console.log('Current search params:', window.location.search);

        // Use URLSearchParams to extract token and error
        const searchParams = new URLSearchParams(window.location.search);
        const token = searchParams.get('token');
        const errorParam = searchParams.get('error');

        console.log('Extracted token via URLSearchParams:', token);
        console.log('Extracted error via URLSearchParams:', errorParam);

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
