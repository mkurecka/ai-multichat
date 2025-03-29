import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from './test-utils';
import App from './App';
import { getModels, getChatHistory, sendMessageToModels, isAuthenticated, checkTokenRefresh } from './services/api';

// Mock the API services
vi.mock('./services/api', () => ({
  getModels: vi.fn(),
  getChatHistory: vi.fn(),
  sendMessageToModels: vi.fn(),
  isAuthenticated: vi.fn(),
  checkTokenRefresh: vi.fn(),
  createThread: vi.fn(),
  getThreadHistory: vi.fn(),
  logout: vi.fn(),
}));

// Mock the router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('App', () => {
  const mockModels = [
    { id: '1', name: 'GPT-4', selected: false },
    { id: '2', name: 'Claude', selected: false },
  ];

  const mockChatHistory = [
    {
      id: '1',
      title: 'Test Chat',
      messages: [],
      selectedModels: ['1'],
    },
  ];

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Setup default mock implementations
    (isAuthenticated as any).mockReturnValue(true);
    (checkTokenRefresh as any).mockResolvedValue(true);
    (getModels as any).mockResolvedValue(mockModels);
    (getChatHistory as any).mockResolvedValue(mockChatHistory);
  });

  it('renders the app with initial state', async () => {
    render(<App />);

    // Wait for initial data loading
    await waitFor(() => {
      expect(screen.getByText('Select models to start chatting')).toBeInTheDocument();
    });

    // Check if models are rendered
    expect(screen.getByText('GPT-4')).toBeInTheDocument();
    expect(screen.getByText('Claude')).toBeInTheDocument();
  });

  it('handles model selection', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('GPT-4')).toBeInTheDocument();
    });

    // Click on a model to select it
    fireEvent.click(screen.getByText('GPT-4'));

    // Check if the model is selected
    expect(screen.getByText('GPT-4')).toHaveClass('bg-blue-100');
  });

  it('handles sending a message', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('GPT-4')).toBeInTheDocument();
    });

    // Select a model
    fireEvent.click(screen.getByText('GPT-4'));

    // Type and send a message
    const input = screen.getByPlaceholderText('Type your message here...');
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 13, charCode: 13 });

    // Verify that sendMessageToModels was called
    await waitFor(() => {
      expect(sendMessageToModels).toHaveBeenCalledWith(
        expect.any(Array),
        'Test message',
        expect.any(Array)
      );
    });
  });

  it('shows chat history', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Test Chat')).toBeInTheDocument();
    });
  });

  it('handles starting a new chat', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('New Chat')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Chat'));

    // Verify that the message input is empty and ready for new chat
    const input = screen.getByPlaceholderText('Type your message here...');
    expect(input).toHaveValue('');
  });

  it('handles authentication failure', async () => {
    (isAuthenticated as any).mockReturnValue(false);
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument();
    });
  });
}); 