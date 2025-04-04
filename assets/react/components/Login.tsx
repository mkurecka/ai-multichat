import React, { useState } from 'react';
import { MessageSquare, Zap, Shield, Users } from 'lucide-react';

const Login: React.FC = () => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Redirect to the backend Google OAuth endpoint
            window.location.href = `${backendUrl}/connect/google`;
        } catch (err) {
            setError('Failed to initiate login. Please try again.');
            setIsLoading(false);
        }
    };

    const features = [
        {
            icon: <MessageSquare className="w-6 h-6 text-blue-500" />,
            title: "Multi-Model Chat",
            description: "Compare responses from up to 16 different AI models simultaneously"
        },
        {
            icon: <Zap className="w-6 h-6 text-blue-500" />,
            title: "Real-time Streaming",
            description: "Get instant responses with real-time streaming from all models"
        },
        {
            icon: <Shield className="w-6 h-6 text-blue-500" />,
            title: "Secure & Private",
            description: "Your conversations are encrypted and never shared"
        },
        {
            icon: <Users className="w-6 h-6 text-blue-500" />,
            title: "Team Ready",
            description: "Perfect for teams and organizations"
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="flex flex-col md:flex-row">
                    {/* Left side - Features */}
                    <div className="md:w-1/2 p-8 bg-gradient-to-br from-blue-50 to-indigo-50">
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">AI MultiChat</h1>
                            <p className="text-gray-600">Compare multiple AI models in real-time</p>
                        </div>
                        
                        <div className="space-y-6">
                            {features.map((feature, index) => (
                                <div key={index} className="flex items-start space-x-4">
                                    <div className="flex-shrink-0">
                                        {feature.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                                        <p className="text-gray-600">{feature.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right side - Login */}
                    <div className="md:w-1/2 p-8">
                        <div className="max-w-md mx-auto">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
                                <p className="text-gray-600 mt-2">Sign in to continue to AI MultiChat</p>
                            </div>

                            {error && (
                                <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
                                    {error}
                                </div>
                            )}

                            <button 
                                onClick={handleGoogleLogin}
                                disabled={isLoading}
                                className={`w-full py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all duration-200
                                    ${isLoading 
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm'
                                    }`}
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                                </svg>
                                <span>{isLoading ? 'Signing in...' : 'Continue with Google'}</span>
                            </button>

                            <div className="mt-6 text-center text-sm text-gray-600">
                                By continuing, you agree to our{' '}
                                <a href="#" className="text-blue-600 hover:text-blue-800">Terms of Service</a>
                                {' '}and{' '}
                                <a href="#" className="text-blue-600 hover:text-blue-800">Privacy Policy</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;