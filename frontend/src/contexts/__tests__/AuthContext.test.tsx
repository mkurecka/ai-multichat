import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { AuthProvider, useAuth } from '../AuthContext';
import { isAuthenticated, checkTokenRefresh } from '../../services/api';

// Mock the API services
vi.mock('../../services/api', () => ({
  isAuthenticated: vi.fn(),
  checkTokenRefresh: vi.fn(),
}));

describe('AuthContext', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/picture.jpg',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('provides authentication state', async () => {
    (isAuthenticated as any).mockReturnValue(true);
    (checkTokenRefresh as any).mockResolvedValue(true);

    const TestComponent = () => {
      const { isAuthenticated } = useAuth();
      return <div>{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Authenticated')).toBeInTheDocument();
    });
  });

  it('handles login', async () => {
    const mockToken = 'test.token.here';
    (isAuthenticated as any).mockReturnValue(false);
    (checkTokenRefresh as any).mockResolvedValue(true);

    const TestComponent = () => {
      const { login } = useAuth();
      return <button onClick={() => login(mockToken)}>Login</button>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe(mockToken);
    });
  });

  it('handles logout', async () => {
    (isAuthenticated as any).mockReturnValue(true);
    (checkTokenRefresh as any).mockResolvedValue(true);

    const TestComponent = () => {
      const { logout } = useAuth();
      return <button onClick={logout}>Logout</button>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    localStorage.setItem('token', 'test.token');
    fireEvent.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  it('handles token refresh', async () => {
    (isAuthenticated as any).mockReturnValue(true);
    (checkTokenRefresh as any).mockResolvedValue(true);

    const TestComponent = () => {
      const { refreshToken } = useAuth();
      return <button onClick={refreshToken}>Refresh Token</button>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Refresh Token'));

    await waitFor(() => {
      expect(checkTokenRefresh).toHaveBeenCalled();
    });
  });

  it('handles authentication errors', async () => {
    (isAuthenticated as any).mockReturnValue(false);
    (checkTokenRefresh as any).mockRejectedValue(new Error('Auth failed'));

    const TestComponent = () => {
      const { isAuthenticated } = useAuth();
      return <div>{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Not Authenticated')).toBeInTheDocument();
    });
  });

  it('provides user information', async () => {
    (isAuthenticated as any).mockReturnValue(true);
    (checkTokenRefresh as any).mockResolvedValue(true);

    const TestComponent = () => {
      const { user } = useAuth();
      return <div>{user?.name || 'No user'}</div>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No user')).toBeInTheDocument();
    });
  });
}); 