import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import {
  getModels,
  getChatHistory,
  sendMessageToModels,
  refreshModels,
  isAuthenticated,
  checkTokenRefresh,
  getThreadHistory,
  logout,
  createThread,
} from '../api';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('getModels', () => {
    it('fetches models successfully', async () => {
      const mockModels = [{ id: '1', name: 'GPT-4' }];
      mockedAxios.get.mockResolvedValueOnce({ data: mockModels });

      const result = await getModels();
      expect(result).toEqual(mockModels);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/models');
    });

    it('handles error when fetching models', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Failed to fetch'));

      await expect(getModels()).rejects.toThrow('Failed to fetch');
    });
  });

  describe('getChatHistory', () => {
    it('fetches chat history successfully', async () => {
      const mockHistory = [{ id: '1', title: 'Test Chat' }];
      mockedAxios.get.mockResolvedValueOnce({ data: mockHistory });

      const result = await getChatHistory();
      expect(result).toEqual(mockHistory);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/chat/history');
    });

    it('handles error when fetching chat history', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Failed to fetch'));

      await expect(getChatHistory()).rejects.toThrow('Failed to fetch');
    });
  });

  describe('sendMessageToModels', () => {
    it('sends message successfully', async () => {
      const mockResponse = { data: { messages: [] } };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await sendMessageToModels([], 'test message', ['1']);
      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/chat', {
        messages: [],
        prompt: 'test message',
        modelIds: ['1'],
      });
    });

    it('handles error when sending message', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Failed to send'));

      await expect(sendMessageToModels([], 'test message', ['1'])).rejects.toThrow('Failed to send');
    });
  });

  describe('refreshModels', () => {
    it('refreshes models successfully', async () => {
      const mockModels = [{ id: '1', name: 'GPT-4' }];
      mockedAxios.post.mockResolvedValueOnce({ data: mockModels });

      const result = await refreshModels();
      expect(result).toEqual(mockModels);
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/models/refresh');
    });

    it('handles error when refreshing models', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Failed to refresh'));

      await expect(refreshModels()).rejects.toThrow('Failed to refresh');
    });
  });

  describe('isAuthenticated', () => {
    it('returns true when token exists and is valid', () => {
      localStorage.setItem('token', 'valid.token.here');
      expect(isAuthenticated()).toBe(true);
    });

    it('returns false when token is missing', () => {
      expect(isAuthenticated()).toBe(false);
    });

    it('returns false when token is expired', () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MTYyMzkwMjIsImlhdCI6MTUxNjIzOTAyMn0.4Adcj3UFYzPUVaVF43FmMze0x28YqD5Qp0q9VQqX9Xk';
      localStorage.setItem('token', expiredToken);
      expect(isAuthenticated()).toBe(false);
    });
  });

  describe('checkTokenRefresh', () => {
    it('refreshes token successfully', async () => {
      const mockResponse = { data: { token: 'new.token.here' } };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      await checkTokenRefresh();
      expect(localStorage.getItem('token')).toBe('new.token.here');
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/token/refresh');
    });

    it('handles error when refreshing token', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Failed to refresh'));

      await expect(checkTokenRefresh()).rejects.toThrow('Failed to refresh');
    });
  });

  describe('getThreadHistory', () => {
    it('fetches thread history successfully', async () => {
      const mockHistory = [{ id: '1', messages: [] }];
      mockedAxios.get.mockResolvedValueOnce({ data: mockHistory });

      const result = await getThreadHistory('thread-1');
      expect(result).toEqual(mockHistory);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/chat/thread/thread-1');
    });

    it('handles error when fetching thread history', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Failed to fetch'));

      await expect(getThreadHistory('thread-1')).rejects.toThrow('Failed to fetch');
    });
  });

  describe('logout', () => {
    it('logs out successfully', async () => {
      localStorage.setItem('token', 'test.token');
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

      await logout();
      expect(localStorage.getItem('token')).toBeNull();
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/logout');
    });

    it('handles error when logging out', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Failed to logout'));

      await expect(logout()).rejects.toThrow('Failed to logout');
    });
  });

  describe('createThread', () => {
    it('creates thread successfully', async () => {
      const mockThread = { id: '1', title: 'New Thread' };
      mockedAxios.post.mockResolvedValueOnce({ data: mockThread });

      const result = await createThread();
      expect(result).toEqual(mockThread);
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/chat/thread');
    });

    it('handles error when creating thread', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Failed to create'));

      await expect(createThread()).rejects.toThrow('Failed to create');
    });
  });
}); 