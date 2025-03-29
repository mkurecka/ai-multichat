import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { api } from '../api';

vi.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getModels', () => {
    it('fetches models successfully', async () => {
      const mockResponse = {
        data: [
          {
            id: 'gpt-4',
            name: 'GPT-4',
            description: 'OpenAI GPT-4',
            pricing: {
              prompt: 0.03,
              completion: 0.06,
              unit: '1K tokens'
            }
          }
        ]
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await api.getModels();

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/models');
    });

    it('handles error when fetching models', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Failed to fetch models'));

      await expect(api.getModels()).rejects.toThrow('Failed to fetch models');
    });
  });

  describe('sendMessage', () => {
    it('sends message successfully', async () => {
      const mockResponse = {
        data: {
          responses: [
            {
              content: 'Test response',
              modelId: 'gpt-4',
              usage: {
                prompt_tokens: 10,
                completion_tokens: 20,
                total_tokens: 30
              }
            }
          ]
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await api.sendMessage('Test message', ['gpt-4'], 'thread-123');

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/chat', {
        message: 'Test message',
        models: ['gpt-4'],
        threadId: 'thread-123'
      });
    });

    it('handles error when sending message', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Failed to send message'));

      await expect(api.sendMessage('Test message', ['gpt-4'], 'thread-123'))
        .rejects.toThrow('Failed to send message');
    });
  });

  describe('getThreadHistory', () => {
    it('fetches thread history successfully', async () => {
      const mockResponse = {
        data: {
          messages: [
            { role: 'user', content: 'Hello', modelId: 'gpt-4' },
            { role: 'assistant', content: 'Hi there!', modelId: 'gpt-4' }
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await api.getThreadHistory('thread-123');

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/chat/thread/thread-123');
    });

    it('handles error when fetching thread history', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Failed to fetch thread history'));

      await expect(api.getThreadHistory('thread-123'))
        .rejects.toThrow('Failed to fetch thread history');
    });
  });

  describe('createThread', () => {
    it('creates thread successfully', async () => {
      const mockResponse = {
        data: {
          threadId: 'thread-123',
          title: 'New Thread'
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await api.createThread();

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/chat/thread');
    });

    it('handles error when creating thread', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Failed to create thread'));

      await expect(api.createThread()).rejects.toThrow('Failed to create thread');
    });
  });
}); 