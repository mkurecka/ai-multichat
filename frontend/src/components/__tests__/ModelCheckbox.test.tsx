import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import ModelCheckbox from '../ModelCheckbox';

describe('ModelCheckbox', () => {
  const mockModel = {
    id: '1',
    name: 'GPT-4',
    selected: true,
  };

  it('renders model name correctly', () => {
    render(<ModelCheckbox model={mockModel} onToggle={() => {}} />);
    expect(screen.getByText('GPT-4')).toBeInTheDocument();
  });

  it('shows selected state correctly', () => {
    render(<ModelCheckbox model={mockModel} onToggle={() => {}} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-blue-100', 'text-blue-700');
    expect(screen.getByTestId('check-icon')).toBeInTheDocument();
  });

  it('shows unselected state correctly', () => {
    const unselectedModel = { ...mockModel, selected: false };
    render(<ModelCheckbox model={unselectedModel} onToggle={() => {}} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-gray-100', 'text-gray-700');
    expect(screen.queryByTestId('check-icon')).not.toBeInTheDocument();
  });

  it('calls onToggle when clicked', () => {
    const mockOnToggle = vi.fn();
    render(<ModelCheckbox model={mockModel} onToggle={mockOnToggle} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(mockOnToggle).toHaveBeenCalledTimes(1);
  });
}); 