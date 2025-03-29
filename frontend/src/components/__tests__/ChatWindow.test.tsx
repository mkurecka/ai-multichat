import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import ChatWindow from '../ChatWindow';

const mockModels = [
  { id: '1', name: 'GPT-4', selected: true },
  { id: '2', name: 'Claude', selected: true },
];

const mockMessages = [
  {
    id: '1',
    role: 'user',
    content: 'Hello',
    threadId: 'thread-1',
  },
  {
    id: '2',
    role: 'assistant',
    content: 'Hi there!',
    modelId: '1',
    threadId: 'thread-1',
  },
];

describe('ChatWindow', () => {
  const mockOnModelToggle = vi.fn();
  const mockOnSendMessage = vi.fn();

  it('renders empty state when no messages', () => {
    render(
      <ChatWindow
        messages={[]}
        models={mockModels}
        onModelToggle={mockOnModelToggle}
        onSendMessage={mockOnSendMessage}
      />
    );

    expect(screen.getByText('No messages yet')).toBeInTheDocument();
    expect(screen.getByText('Select models and start chatting to see responses')).toBeInTheDocument();
  });

  it('renders messages correctly', () => {
    render(
      <ChatWindow
        messages={mockMessages}
        models={mockModels}
        onModelToggle={mockOnModelToggle}
        onSendMessage={mockOnSendMessage}
      />
    );

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('shows active models', () => {
    render(
      <ChatWindow
        messages={mockMessages}
        models={mockModels}
        onModelToggle={mockOnModelToggle}
        onSendMessage={mockOnSendMessage}
      />
    );

    expect(screen.getByText('Active models:')).toBeInTheDocument();
    expect(screen.getByText('GPT-4')).toBeInTheDocument();
    expect(screen.getByText('Claude')).toBeInTheDocument();
  });

  it('calls onModelToggle when model is clicked', () => {
    render(
      <ChatWindow
        messages={mockMessages}
        models={mockModels}
        onModelToggle={mockOnModelToggle}
        onSendMessage={mockOnSendMessage}
      />
    );

    const modelButton = screen.getByText('GPT-4');
    fireEvent.click(modelButton);
    expect(mockOnModelToggle).toHaveBeenCalledWith('1');
  });

  it('calls onSendMessage when message is sent', () => {
    render(
      <ChatWindow
        messages={mockMessages}
        models={mockModels}
        onModelToggle={mockOnModelToggle}
        onSendMessage={mockOnSendMessage}
      />
    );

    const input = screen.getByPlaceholderText(/type your message/i);
    fireEvent.change(input, { target: { value: 'New message' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 13, charCode: 13 });

    expect(mockOnSendMessage).toHaveBeenCalledWith(mockMessages, 'New message');
  });
}); 