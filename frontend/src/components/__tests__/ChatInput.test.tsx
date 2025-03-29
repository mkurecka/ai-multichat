import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import ChatInput from '../ChatInput';

describe('ChatInput', () => {
  const mockOnSendMessage = vi.fn();

  it('renders input field correctly', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} disabled={false} selectedModels={['1']} />);
    
    expect(screen.getByPlaceholderText('Type your message here...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows disabled state when no models selected', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} disabled={true} selectedModels={[]} />);
    
    expect(screen.getByPlaceholderText('Select at least one model to start chatting')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('handles message input correctly', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} disabled={false} selectedModels={['1']} />);
    
    const input = screen.getByPlaceholderText('Type your message here...');
    fireEvent.change(input, { target: { value: 'Test message' } });
    
    expect(input).toHaveValue('Test message');
  });

  it('submits message on button click', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} disabled={false} selectedModels={['1']} />);
    
    const input = screen.getByPlaceholderText('Type your message here...');
    fireEvent.change(input, { target: { value: 'Test message' } });
    
    const submitButton = screen.getByRole('button');
    fireEvent.click(submitButton);
    
    expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
    expect(input).toHaveValue('');
  });

  it('submits message on Enter key press', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} disabled={false} selectedModels={['1']} />);
    
    const input = screen.getByPlaceholderText('Type your message here...');
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 13, charCode: 13 });
    
    expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
    expect(input).toHaveValue('');
  });

  it('does not submit empty message', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} disabled={false} selectedModels={['1']} />);
    
    const submitButton = screen.getByRole('button');
    fireEvent.click(submitButton);
    
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('does not submit message when disabled', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} disabled={true} selectedModels={[]} />);
    
    const input = screen.getByPlaceholderText('Select at least one model to start chatting');
    fireEvent.change(input, { target: { value: 'Test message' } });
    
    const submitButton = screen.getByRole('button');
    fireEvent.click(submitButton);
    
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });
}); 