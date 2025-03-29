import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModelSelector from '../ModelSelector';

const mockOnModelSelect = vi.fn();

describe('ModelSelector', () => {
  const defaultProps = {
    models: [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: 'OpenAI GPT-4',
        pricing: {
          prompt: 0.03,
          completion: 0.06,
          unit: '1K tokens'
        }
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        description: 'Anthropic Claude 3 Opus',
        pricing: {
          prompt: 0.015,
          completion: 0.075,
          unit: '1K tokens'
        }
      }
    ],
    selectedModels: ['gpt-4'],
    onModelSelect: mockOnModelSelect,
  };

  beforeEach(() => {
    mockOnModelSelect.mockClear();
  });

  it('renders all available models', () => {
    render(<ModelSelector {...defaultProps} />);
    
    expect(screen.getByText('GPT-4')).toBeInTheDocument();
    expect(screen.getByText('Claude 3 Opus')).toBeInTheDocument();
  });

  it('displays model descriptions', () => {
    render(<ModelSelector {...defaultProps} />);
    
    expect(screen.getByText('OpenAI GPT-4')).toBeInTheDocument();
    expect(screen.getByText('Anthropic Claude 3 Opus')).toBeInTheDocument();
  });

  it('shows pricing information', () => {
    render(<ModelSelector {...defaultProps} />);
    
    expect(screen.getByText(/0.03/)).toBeInTheDocument();
    expect(screen.getByText(/0.06/)).toBeInTheDocument();
    expect(screen.getByText(/0.015/)).toBeInTheDocument();
    expect(screen.getByText(/0.075/)).toBeInTheDocument();
  });

  it('marks selected models as checked', () => {
    render(<ModelSelector {...defaultProps} />);
    
    const gpt4Checkbox = screen.getByRole('checkbox', { name: /gpt-4/i });
    expect(gpt4Checkbox).toBeChecked();
    
    const claudeCheckbox = screen.getByRole('checkbox', { name: /claude 3 opus/i });
    expect(claudeCheckbox).not.toBeChecked();
  });

  it('calls onModelSelect when a model is toggled', async () => {
    render(<ModelSelector {...defaultProps} />);
    
    const claudeCheckbox = screen.getByRole('checkbox', { name: /claude 3 opus/i });
    await userEvent.click(claudeCheckbox);
    
    expect(mockOnModelSelect).toHaveBeenCalledWith('claude-3-opus-20240229', true);
  });

  it('disables models when max selection is reached', () => {
    const props = {
      ...defaultProps,
      selectedModels: ['gpt-4', 'claude-3-opus-20240229'],
      maxSelection: 2
    };
    
    render(<ModelSelector {...props} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(checkbox => {
      expect(checkbox).toBeDisabled();
    });
  });
}); 