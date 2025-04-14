import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const LoginPage = ({ googleClientId, redirectUri }) => {
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
    return (_jsxs("div", { style: { textAlign: 'center', marginTop: '50px' }, children: [_jsx("h1", { children: "AI Multichat Login" }), _jsx("button", { onClick: handleGoogleLoginClick, disabled: !googleClientId, children: "Login with Google" }), !googleClientId && _jsx("p", { style: { color: 'orange', marginTop: '10px' }, children: "Google Client ID not configured." })] }));
};
export default LoginPage;
