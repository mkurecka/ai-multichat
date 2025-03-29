import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatWindow from '../ChatWindow';

const mockSendMessage = vi.fn();

describe('ChatWindow', () => {
  const defaultProps = {
    messages: [],
    selectedModels: ['gpt-4', 'claude-3-opus-20240229'],
    onSendMessage: mockSendMessage,
    isLoading: false,
  };

  beforeEach(() => {
    mockSendMessage.mockClear();
  });

  it('renders chat window with input and send button', () => {
    render(<ChatWindow {...defaultProps} />);
    
    expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('disables send button when input is empty', () => {
    render(<ChatWindow {...defaultProps} />);
    
    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  it('enables send button when input has text', async () => {
    render(<ChatWindow {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/type your message/i);
    await userEvent.type(input, 'Test message');
    
    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).not.toBeDisabled();
  });

  it('calls onSendMessage when form is submitted', async () => {
    render(<ChatWindow {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/type your message/i);
    await userEvent.type(input, 'Test message');
    
    const sendButton = screen.getByRole('button', { name: /send/i });
    await userEvent.click(sendButton);
    
    expect(mockSendMessage).toHaveBeenCalledWith('Test message');
    expect(input).toHaveValue('');
  });

  it('displays loading state when isLoading is true', () => {
    render(<ChatWindow {...defaultProps} isLoading={true} />);
    
    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();
    expect(screen.getByText(/sending/i)).toBeInTheDocument();
  });

  it('displays messages in the chat window', () => {
    const messages = [
      { role: 'user', content: 'Hello', modelId: 'gpt-4' },
      { role: 'assistant', content: 'Hi there!', modelId: 'gpt-4' },
    ];
    
    render(<ChatWindow {...defaultProps} messages={messages} />);
    
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });
}); 