export const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  picture: 'https://example.com/picture.jpg',
};

export const mockAuth = {
  isAuthenticated: true,
  user: mockUser,
  login: jest.fn(),
  logout: jest.fn(),
  getToken: jest.fn().mockResolvedValue('mock-token'),
};

export const useAuth = () => mockAuth; 