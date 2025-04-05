import { LogOut, DollarSign, MessageSquare, MessageCircle, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.roles?.includes('ROLE_ADMIN') || false;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <MessageSquare className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-xl font-semibold text-gray-900">AI MultiChat</span>
          </div>

          <div className="flex items-center space-x-4">
            {location.pathname === '/costs' && (
              <button
                onClick={() => navigate('/')}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                title="Return to chat"
              >
                <MessageCircle className="h-5 w-5 text-gray-600" />
              </button>
            )}
            {location.pathname === '/' && (
              <button
                onClick={() => navigate('/costs')}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                title="View costs"
              >
                <DollarSign className="h-5 w-5 text-gray-600" />
              </button>
            )}
            
            {isAdmin && (
              <a
                href="/admin"
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                title="Admin Dashboard"
              >
                <Settings className="h-5 w-5 text-gray-600" />
              </a>
            )}
            
            <span className="text-gray-700">{user?.name}</span>
            
            <button
              onClick={handleLogout}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <LogOut className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}; 