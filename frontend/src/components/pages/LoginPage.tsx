import React from 'react';

interface LoginPageProps {
  googleClientId: string | undefined;
  redirectUri: string;
}

const LoginPage: React.FC<LoginPageProps> = ({ googleClientId, redirectUri }) => {

  const handleGoogleLoginClick = () => {
    if (!googleClientId) {
      alert("Google Client ID is not configured."); // Simple alert for now
      return;
    }
    const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'email profile openid',
      // Add prompt='select_account' if you want the user to always choose an account
      // prompt: 'select_account',
    });
    window.location.href = `${googleAuthUrl}?${params.toString()}`;
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>AI Multichat Login</h1>
      {/* Add any error display logic here if needed */}
      <button onClick={handleGoogleLoginClick} disabled={!googleClientId}>
        Login with Google
      </button>
      {!googleClientId && <p style={{ color: 'orange', marginTop: '10px' }}>Google Client ID not configured.</p>}
      {/* You might add other login methods here later */}
    </div>
  );
};

export default LoginPage; 