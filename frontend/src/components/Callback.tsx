import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Callback: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token'); // Adjust based on how your backend sends the token

        if (token) {
            localStorage.setItem('token', token);
            navigate('/');
        } else {
            console.error('No token found in callback');
            navigate('/login');
        }
    }, [navigate]);

    return <div>Processing login...</div>;
};

export default Callback;