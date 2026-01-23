import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubjectField } from './SubjectField';

describe('SubjectField', () => {
  const mockOnChange = vi.fn();
  const mockOnGenerateAI = vi.fn();

  const defaultProps = {
    value: '',
    onChange: mockOnChange,
  };

  beforeEach(() => {
    mockOnChange.mockClear();
    mockOnGenerateAI.mockClear();
  });

  describe('Rendering', () => {
    it('should render with label', () => {
      render(<SubjectField {...defaultProps} />);
      expect(screen.getByText('Subject')).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(<SubjectField {...defaultProps} placeholder="Enter subject" />);
      expect(screen.getByPlaceholderText('Enter subject')).toBeInTheDocument();
    });

    it('should render with initial value', () => {
      render(<SubjectField {...defaultProps} value="Test Subject" />);
      const input = screen.getByTestId('subject-input');
      expect(input).toHaveValue('Test Subject');
    });

    it('should not show character count by default when unfocused', () => {
      render(<SubjectField {...defaultProps} value="Test" />);
      expect(screen.queryByTestId('char-count')).not.toBeInTheDocument();
    });
  });

  describe('Input Handling', () => {
    it('should call onChange when typing', async () => {
      render(<SubjectField {...defaultProps} />);
      const input = screen.getByTestId('subject-input');

      await userEvent.type(input, 'New Subject');

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('should update value on change', async () => {
      const { rerender } = render(<SubjectField {...defaultProps} value="" />);
      const input = screen.getByTestId('subject-input');

      await userEvent.type(input, 'T');
      rerender(<SubjectField {...defaultProps} value="T" />);

      expect(input).toHaveValue('T');
    });

    it('should support autofocus', () => {
      render(<SubjectField {...defaultProps} autoFocus />);
      const input = screen.getByTestId('subject-input');

      expect(input).toHaveFocus();
    });

    it('should disable input when disabled prop is true', () => {
      render(<SubjectField {...defaultProps} disabled />);
      const input = screen.getByTestId('subject-input');

      expect(input).toBeDisabled();
    });
  });

  describe('Character Count', () => {
    it('should show character count when focused', async () => {
      render(<SubjectField {...defaultProps} value="Test" />);
      const input = screen.getByTestId('subject-input');

      await userEvent.click(input);

      expect(screen.getByTestId('char-count')).toBeInTheDocument();
      expect(screen.getByText('4/200')).toBeInTheDocument();
    });

    it('should hide character count when unfocused (below 80% limit)', async () => {
      render(<SubjectField {...defaultProps} value="Test" />);
      const input = screen.getByTestId('subject-input');

      await userEvent.click(input);
      expect(screen.getByTestId('char-count')).toBeInTheDocument();

      fireEvent.blur(input);
      expect(screen.queryByTestId('char-count')).not.toBeInTheDocument();
    });

    it('should show character count even when unfocused if near limit', () => {
      const longValue = 'a'.repeat(170); // Over 80% of 200
      render(<SubjectField {...defaultProps} value={longValue} maxLength={200} />);

      expect(screen.getByTestId('char-count')).toBeInTheDocument();
      expect(screen.getByText('170/200')).toBeInTheDocument();
    });

    it('should highlight character count when near limit', () => {
      const longValue = 'a'.repeat(170);
      render(<SubjectField {...defaultProps} value={longValue} maxLength={200} />);
      const charCount = screen.getByTestId('char-count');

      expect(charCount).toHaveClass('text-orange-600');
    });

    it('should not show character count if showCharCount is false', async () => {
      render(<SubjectField {...defaultProps} value="Test" showCharCount={false} />);
      const input = screen.getByTestId('subject-input');

      await userEvent.click(input);

      expect(screen.queryByTestId('char-count')).not.toBeInTheDocument();
    });

    it('should use custom maxLength', async () => {
      render(<SubjectField {...defaultProps} value="Test" maxLength={50} />);
      const input = screen.getByTestId('subject-input');

      await userEvent.click(input);

      expect(screen.getByText('4/50')).toBeInTheDocument();
    });
  });

  describe('Length Validation', () => {
    it('should enforce max length', async () => {
      const { rerender } = render(<SubjectField {...defaultProps} value="" maxLength={10} />);
      const input = screen.getByTestId('subject-input') as HTMLInputElement;

      // Type 20 characters
      for (let i = 1; i <= 20; i++) {
        await userEvent.type(input, String(i % 10));
        // Simulate the component respecting maxLength
        if (i <= 10) {
          rerender(<SubjectField {...defaultProps} value={input.value} maxLength={10} />);
        }
      }

      // The HTML maxLength attribute should prevent typing beyond 10
      expect(input.maxLength).toBe(10);
    });

    it('should not allow typing beyond maxLength', async () => {
      const value = 'a'.repeat(200);
      render(<SubjectField {...defaultProps} value={value} maxLength={200} />);
      const input = screen.getByTestId('subject-input');

      await userEvent.type(input, 'x');

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should show warning for short subject when focused', async () => {
      render(<SubjectField {...defaultProps} value="Hi" />);
      const input = screen.getByTestId('subject-input');

      await userEvent.click(input);

      expect(screen.getByText('Subject is quite short')).toBeInTheDocument();
    });

    it('should show warning for long subject when focused', async () => {
      const longValue = 'a'.repeat(110);
      render(<SubjectField {...defaultProps} value={longValue} />);
      const input = screen.getByTestId('subject-input');

      await userEvent.click(input);

      expect(screen.getByText('Long subjects may be truncated in mobile')).toBeInTheDocument();
    });

    it('should not show warning for optimal length', async () => {
      render(<SubjectField {...defaultProps} value="This is a good subject line" />);
      const input = screen.getByTestId('subject-input');

      await userEvent.click(input);

      expect(screen.queryByTestId('warning-message')).not.toBeInTheDocument();
    });

    it('should hide warning when unfocused', async () => {
      render(<SubjectField {...defaultProps} value="Hi" />);
      const input = screen.getByTestId('subject-input');

      await userEvent.click(input);
      expect(screen.getByText('Subject is quite short')).toBeInTheDocument();

      fireEvent.blur(input);
      expect(screen.queryByTestId('warning-message')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message', () => {
      render(<SubjectField {...defaultProps} error="Subject is required" />);
      expect(screen.getByText('Subject is required')).toBeInTheDocument();
    });

    it('should show error styling', () => {
      render(<SubjectField {...defaultProps} error="Error" />);
      const input = screen.getByTestId('subject-input');

      expect(input).toHaveClass('border-red-500');
    });

    it('should prioritize error over warning', async () => {
      render(<SubjectField {...defaultProps} value="Hi" error="Custom error" />);
      const input = screen.getByTestId('subject-input');

      await userEvent.click(input);

      expect(screen.getByText('Custom error')).toBeInTheDocument();
      expect(screen.queryByText('Subject is quite short')).not.toBeInTheDocument();
    });
  });

  describe('AI Generation', () => {
    it('should render AI generate button when onGenerateAI provided', () => {
      render(<SubjectField {...defaultProps} onGenerateAI={mockOnGenerateAI} />);
      expect(screen.getByTestId('ai-generate-button')).toBeInTheDocument();
    });

    it('should not render AI button when onGenerateAI not provided', () => {
      render(<SubjectField {...defaultProps} />);
      expect(screen.queryByTestId('ai-generate-button')).not.toBeInTheDocument();
    });

    it('should call onGenerateAI when AI button clicked', async () => {
      render(<SubjectField {...defaultProps} onGenerateAI={mockOnGenerateAI} />);
      const aiButton = screen.getByTestId('ai-generate-button');

      await userEvent.click(aiButton);

      expect(mockOnGenerateAI).toHaveBeenCalledTimes(1);
    });

    it('should disable AI button when isGeneratingAI is true', () => {
      render(
        <SubjectField
          {...defaultProps}
          onGenerateAI={mockOnGenerateAI}
          isGeneratingAI={true}
        />
      );
      const aiButton = screen.getByTestId('ai-generate-button');

      expect(aiButton).toBeDisabled();
    });

    it('should not show AI button when disabled', () => {
      render(
        <SubjectField
          {...defaultProps}
          onGenerateAI={mockOnGenerateAI}
          disabled={true}
        />
      );

      expect(screen.queryByTestId('ai-generate-button')).not.toBeInTheDocument();
    });

    it('should show spinning animation when generating', () => {
      render(
        <SubjectField
          {...defaultProps}
          onGenerateAI={mockOnGenerateAI}
          isGeneratingAI={true}
        />
      );
      const aiButton = screen.getByTestId('ai-generate-button');
      const icon = aiButton.querySelector('svg');

      expect(icon).toHaveClass('animate-spin');
    });
  });

  describe('Accessibility', () => {
    it('should have proper label association', () => {
      render(<SubjectField {...defaultProps} />);
      const label = screen.getByText('Subject');
      const input = screen.getByTestId('subject-input');

      expect(label).toBeInTheDocument();
      expect(input).toBeInTheDocument();
    });

    it('should have title for AI button', () => {
      render(<SubjectField {...defaultProps} onGenerateAI={mockOnGenerateAI} />);
      const aiButton = screen.getByTestId('ai-generate-button');

      expect(aiButton).toHaveAttribute('title', 'Generate subject with AI');
    });
  });

  describe('Focus Management', () => {
    it('should track focus state', async () => {
      render(<SubjectField {...defaultProps} value="Test" />);
      const input = screen.getByTestId('subject-input');

      // Initially unfocused - no char count
      expect(screen.queryByTestId('char-count')).not.toBeInTheDocument();

      // Focus - show char count
      await userEvent.click(input);
      expect(screen.getByTestId('char-count')).toBeInTheDocument();

      // Blur - hide char count
      fireEvent.blur(input);
      expect(screen.queryByTestId('char-count')).not.toBeInTheDocument();
    });
  });
});
