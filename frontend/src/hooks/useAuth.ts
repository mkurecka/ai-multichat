import { useState, useEffect } from 'react';
import { logout as apiLogout } from '../services/api';

interface User {
  name: string;
  email: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Get user info from token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({
          name: payload.name || payload.email,
          email: payload.email
        });
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }
  }, []);

  const logout = async () => {
    try {
      await apiLogout();
      localStorage.removeItem('token');
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return { user, logout };
}; 