import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecipientFields } from './RecipientFields';
import { EmailRecipient } from '@/lib/composer/types';

describe('RecipientFields', () => {
  const mockOnAdd = vi.fn();
  const mockOnRemove = vi.fn();

  const defaultProps = {
    label: 'To',
    recipients: [] as EmailRecipient[],
    onAdd: mockOnAdd,
    onRemove: mockOnRemove,
  };

  beforeEach(() => {
    mockOnAdd.mockClear();
    mockOnRemove.mockClear();
  });

  describe('Rendering', () => {
    it('should render with label', () => {
      render(<RecipientFields {...defaultProps} />);
      expect(screen.getByText('To')).toBeInTheDocument();
    });

    it('should render placeholder when empty', () => {
      render(<RecipientFields {...defaultProps} placeholder="Enter email" />);
      expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument();
    });

    it('should render existing recipients as tags', () => {
      const recipients = [
        { email: 'john@example.com' },
        { email: 'jane@example.com', name: 'Jane Doe' },
      ];
      render(<RecipientFields {...defaultProps} recipients={recipients} />);

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    it('should hide placeholder when recipients exist', () => {
      const recipients = [{ email: 'john@example.com' }];
      render(<RecipientFields {...defaultProps} recipients={recipients} placeholder="Enter email" />);

      const input = screen.getByTestId('recipient-input');
      expect(input).not.toHaveAttribute('placeholder', 'Enter email');
    });
  });

  describe('Adding Recipients', () => {
    it('should add valid email on Enter key', async () => {
      render(<RecipientFields {...defaultProps} />);
      const input = screen.getByTestId('recipient-input');

      await userEvent.type(input, 'test@example.com{Enter}');

      expect(mockOnAdd).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(input).toHaveValue('');
    });

    it('should add valid email on comma', async () => {
      render(<RecipientFields {...defaultProps} />);
      const input = screen.getByTestId('recipient-input');

      await userEvent.type(input, 'test@example.com,');

      expect(mockOnAdd).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(input).toHaveValue('');
    });

    it('should add valid email on blur', async () => {
      render(<RecipientFields {...defaultProps} />);
      const input = screen.getByTestId('recipient-input');

      await userEvent.type(input, 'test@example.com');
      fireEvent.blur(input);

      expect(mockOnAdd).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('should trim whitespace from email', async () => {
      render(<RecipientFields {...defaultProps} />);
      const input = screen.getByTestId('recipient-input');

      await userEvent.type(input, '  test@example.com  {Enter}');

      expect(mockOnAdd).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('should not add empty email', async () => {
      render(<RecipientFields {...defaultProps} />);
      const input = screen.getByTestId('recipient-input');

      await userEvent.type(input, '{Enter}');

      expect(mockOnAdd).not.toHaveBeenCalled();
    });
  });

  describe('Email Validation', () => {
    it('should show error for invalid email', async () => {
      render(<RecipientFields {...defaultProps} />);
      const input = screen.getByTestId('recipient-input');

      await userEvent.type(input, 'invalid-email{Enter}');

      expect(mockOnAdd).not.toHaveBeenCalled();
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    });

    it('should show error for email without @', async () => {
      render(<RecipientFields {...defaultProps} />);
      const input = screen.getByTestId('recipient-input');

      await userEvent.type(input, 'notemail.com{Enter}');

      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    });

    it('should show error for email without domain', async () => {
      render(<RecipientFields {...defaultProps} />);
      const input = screen.getByTestId('recipient-input');

      await userEvent.type(input, 'user@{Enter}');

      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    });

    it('should clear validation error when typing', async () => {
      render(<RecipientFields {...defaultProps} />);
      const input = screen.getByTestId('recipient-input');

      await userEvent.type(input, 'invalid{Enter}');
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();

      await userEvent.type(input, 'a');
      expect(screen.queryByText('Invalid email address')).not.toBeInTheDocument();
    });

    it('should show error for duplicate email', async () => {
      const recipients = [{ email: 'john@example.com' }];
      render(<RecipientFields {...defaultProps} recipients={recipients} />);
      const input = screen.getByTestId('recipient-input');

      await userEvent.type(input, 'john@example.com{Enter}');

      expect(mockOnAdd).not.toHaveBeenCalled();
      expect(screen.getByText('Email already added')).toBeInTheDocument();
    });

    it('should handle duplicate check case-insensitively', async () => {
      const recipients = [{ email: 'john@example.com' }];
      render(<RecipientFields {...defaultProps} recipients={recipients} />);
      const input = screen.getByTestId('recipient-input');

      await userEvent.type(input, 'JOHN@EXAMPLE.COM{Enter}');

      expect(mockOnAdd).not.toHaveBeenCalled();
      expect(screen.getByText('Email already added')).toBeInTheDocument();
    });
  });

  describe('Removing Recipients', () => {
    it('should remove recipient when clicking X button', async () => {
      const recipients = [{ email: 'john@example.com' }];
      render(<RecipientFields {...defaultProps} recipients={recipients} />);

      const removeButton = screen.getByTestId('remove-recipient');
      await userEvent.click(removeButton);

      expect(mockOnRemove).toHaveBeenCalledWith(0);
    });

    it('should remove last recipient on Backspace when input is empty', async () => {
      const recipients = [
        { email: 'john@example.com' },
        { email: 'jane@example.com' },
      ];
      render(<RecipientFields {...defaultProps} recipients={recipients} />);
      const input = screen.getByTestId('recipient-input');

      await userEvent.click(input);
      await userEvent.keyboard('{Backspace}');

      expect(mockOnRemove).toHaveBeenCalledWith(1);
    });

    it('should not remove recipient on Backspace when input has value', async () => {
      const recipients = [{ email: 'john@example.com' }];
      render(<RecipientFields {...defaultProps} recipients={recipients} />);
      const input = screen.getByTestId('recipient-input');

      await userEvent.type(input, 'test{Backspace}');

      expect(mockOnRemove).not.toHaveBeenCalled();
    });
  });

  describe('Paste Support', () => {
    it('should add multiple emails from comma-separated paste', async () => {
      render(<RecipientFields {...defaultProps} />);
      const input = screen.getByTestId('recipient-input');

      const pasteData = 'john@example.com,jane@example.com,bob@example.com';
      await userEvent.click(input);
      await userEvent.paste(pasteData);

      expect(mockOnAdd).toHaveBeenCalledTimes(3);
      expect(mockOnAdd).toHaveBeenCalledWith({ email: 'john@example.com' });
      expect(mockOnAdd).toHaveBeenCalledWith({ email: 'jane@example.com' });
      expect(mockOnAdd).toHaveBeenCalledWith({ email: 'bob@example.com' });
    });

    it('should add multiple emails from semicolon-separated paste', async () => {
      render(<RecipientFields {...defaultProps} />);
      const input = screen.getByTestId('recipient-input');

      const pasteData = 'john@example.com;jane@example.com';
      await userEvent.click(input);
      await userEvent.paste(pasteData);

      expect(mockOnAdd).toHaveBeenCalledTimes(2);
    });

    it('should add multiple emails from newline-separated paste', async () => {
      render(<RecipientFields {...defaultProps} />);
      const input = screen.getByTestId('recipient-input');

      const pasteData = 'john@example.com\njane@example.com';
      await userEvent.click(input);
      await userEvent.paste(pasteData);

      expect(mockOnAdd).toHaveBeenCalledTimes(2);
    });

    it('should skip invalid emails in paste', async () => {
      render(<RecipientFields {...defaultProps} />);
      const input = screen.getByTestId('recipient-input');

      const pasteData = 'john@example.com,invalid-email,jane@example.com';
      await userEvent.click(input);
      await userEvent.paste(pasteData);

      expect(mockOnAdd).toHaveBeenCalledTimes(2);
      expect(mockOnAdd).not.toHaveBeenCalledWith({ email: 'invalid-email' });
    });

    it('should not add duplicates in paste', async () => {
      const recipients = [{ email: 'john@example.com' }];
      render(<RecipientFields {...defaultProps} recipients={recipients} />);
      const input = screen.getByTestId('recipient-input');

      const pasteData = 'john@example.com,jane@example.com';
      await userEvent.click(input);
      await userEvent.paste(pasteData);

      expect(mockOnAdd).toHaveBeenCalledTimes(1);
      expect(mockOnAdd).toHaveBeenCalledWith({ email: 'jane@example.com' });
    });
  });

  describe('Disabled State', () => {
    it('should disable input when disabled prop is true', () => {
      render(<RecipientFields {...defaultProps} disabled />);
      const input = screen.getByTestId('recipient-input');

      expect(input).toBeDisabled();
    });

    it('should not show remove buttons when disabled', () => {
      const recipients = [{ email: 'john@example.com' }];
      render(<RecipientFields {...defaultProps} recipients={recipients} disabled />);

      expect(screen.queryByTestId('remove-recipient')).not.toBeInTheDocument();
    });

    it('should have disabled styling when disabled', () => {
      render(<RecipientFields {...defaultProps} disabled />);
      const container = screen.getByTestId('recipient-field-to');

      expect(container).toHaveClass('opacity-50');
    });
  });

  describe('External Error', () => {
    it('should display external error', () => {
      render(<RecipientFields {...defaultProps} error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should show error styling when external error exists', () => {
      render(<RecipientFields {...defaultProps} error="Error" />);
      const container = screen.getByTestId('recipient-field-to');

      expect(container).toHaveClass('border-red-500');
    });

    it('should prioritize external error over validation error', async () => {
      render(<RecipientFields {...defaultProps} error="External error" />);
      const input = screen.getByTestId('recipient-input');

      await userEvent.type(input, 'invalid{Enter}');

      expect(screen.getByText('External error')).toBeInTheDocument();
      expect(screen.queryByText('Invalid email address')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label for remove button', () => {
      const recipients = [{ email: 'john@example.com' }];
      render(<RecipientFields {...defaultProps} recipients={recipients} />);

      const removeButton = screen.getByLabelText('Remove john@example.com');
      expect(removeButton).toBeInTheDocument();
    });

    it('should focus input on container click', async () => {
      render(<RecipientFields {...defaultProps} />);
      const container = screen.getByTestId('recipient-field-to');
      const input = screen.getByTestId('recipient-input');

      await userEvent.click(container);

      expect(input).toHaveFocus();
    });

    it('should support autofocus', () => {
      render(<RecipientFields {...defaultProps} autoFocus />);
      const input = screen.getByTestId('recipient-input');

      // autoFocus is a boolean prop, not an attribute string
      expect(input).toHaveFocus();
    });
  });
});
