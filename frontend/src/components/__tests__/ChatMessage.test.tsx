import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test-utils';
import ChatMessage from '../ChatMessage';

describe('ChatMessage', () => {
  const mockUserMessage = {
    id: '1',
    role: 'user',
    content: 'Hello',
    threadId: 'thread-1',
  };

  const mockAssistantMessage = {
    id: '2',
    role: 'assistant',
    content: 'Hi there!',
    modelId: '1',
    threadId: 'thread-1',
    usage: {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    },
  };

  it('renders user message correctly', () => {
    render(<ChatMessage message={mockUserMessage} />);

    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('renders assistant message correctly', () => {
    render(<ChatMessage message={mockAssistantMessage} modelName="GPT-4" />);

    expect(screen.getByText('GPT-4')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
    expect(screen.getByText('30 tokens')).toBeInTheDocument();
    expect(screen.getByText('(10 prompt + 20 completion)')).toBeInTheDocument();
  });

  it('renders assistant message without model name', () => {
    render(<ChatMessage message={mockAssistantMessage} />);

    expect(screen.getByText('Assistant')).toBeInTheDocument();
  });

  it('renders assistant message without usage stats', () => {
    const messageWithoutUsage = {
      ...mockAssistantMessage,
      usage: undefined,
    };

    render(<ChatMessage message={messageWithoutUsage} />);

    expect(screen.getByText('Assistant')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
    expect(screen.queryByText('tokens')).not.toBeInTheDocument();
  });
}); 