import React from 'react';

const Login: React.FC = () => {
    const handleGoogleLogin = () => {
        window.location.href = 'http://localhost:8000/login'; // Symfony backend's Google OAuth login route
    };

    return (
        <div className="login">
            <h2>Login to MultiChat</h2>
            <button onClick={handleGoogleLogin}>Login with Google</button>
        </div>
    );
};

export default Login;