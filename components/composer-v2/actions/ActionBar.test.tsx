import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionBar } from './ActionBar';

describe('ActionBar', () => {
  const mockOnSend = vi.fn();
  const mockOnSchedule = vi.fn();
  const mockOnSaveDraft = vi.fn();
  const mockOnDiscard = vi.fn();

  const defaultProps = {
    onSend: mockOnSend,
  };

  beforeEach(() => {
    mockOnSend.mockClear();
    mockOnSchedule.mockClear();
    mockOnSaveDraft.mockClear();
    mockOnDiscard.mockClear();
  });

  describe('Rendering', () => {
    it('should render action bar', () => {
      render(<ActionBar {...defaultProps} />);
      expect(screen.getByTestId('action-bar')).toBeInTheDocument();
    });

    it('should render send button by default', () => {
      render(<ActionBar {...defaultProps} />);
      expect(screen.getByTestId('send-button')).toBeInTheDocument();
      expect(screen.getByText('Send')).toBeInTheDocument();
    });

    it('should render send options dropdown trigger', () => {
      render(<ActionBar {...defaultProps} />);
      expect(screen.getByTestId('send-options-trigger')).toBeInTheDocument();
    });

    it('should show schedule button when onSchedule provided', () => {
      render(<ActionBar {...defaultProps} onSchedule={mockOnSchedule} />);
      expect(screen.getByTestId('schedule-button')).toBeInTheDocument();
    });

    it('should hide schedule button when showSchedule is false', () => {
      render(<ActionBar {...defaultProps} onSchedule={mockOnSchedule} showSchedule={false} />);
      expect(screen.queryByTestId('schedule-button')).not.toBeInTheDocument();
    });

    it('should show save draft button when onSaveDraft provided', () => {
      render(<ActionBar {...defaultProps} onSaveDraft={mockOnSaveDraft} />);
      expect(screen.getByTestId('save-draft-button')).toBeInTheDocument();
    });

    it('should hide save draft button when showDraft is false', () => {
      render(<ActionBar {...defaultProps} onSaveDraft={mockOnSaveDraft} showDraft={false} />);
      expect(screen.queryByTestId('save-draft-button')).not.toBeInTheDocument();
    });

    it('should show discard button when onDiscard provided', () => {
      render(<ActionBar {...defaultProps} onDiscard={mockOnDiscard} />);
      expect(screen.getByTestId('discard-button')).toBeInTheDocument();
    });

    it('should hide discard button when showDiscard is false', () => {
      render(<ActionBar {...defaultProps} onDiscard={mockOnDiscard} showDiscard={false} />);
      expect(screen.queryByTestId('discard-button')).not.toBeInTheDocument();
    });
  });

  describe('Send Action', () => {
    it('should call onSend when clicking send button', async () => {
      render(<ActionBar {...defaultProps} />);
      const sendButton = screen.getByTestId('send-button');

      await userEvent.click(sendButton);

      expect(mockOnSend).toHaveBeenCalledTimes(1);
    });

    it('should show "Sending..." when isSending is true', () => {
      render(<ActionBar {...defaultProps} isSending />);
      expect(screen.getByText('Sending...')).toBeInTheDocument();
    });

    it('should disable send button when isSending', () => {
      render(<ActionBar {...defaultProps} isSending />);
      const sendButton = screen.getByTestId('send-button');
      expect(sendButton).toBeDisabled();
    });

    it('should disable send button when canSend is false', () => {
      render(<ActionBar {...defaultProps} canSend={false} />);
      const sendButton = screen.getByTestId('send-button');
      expect(sendButton).toBeDisabled();
    });

    it('should enable send button when canSend is true', () => {
      render(<ActionBar {...defaultProps} canSend={true} />);
      const sendButton = screen.getByTestId('send-button');
      expect(sendButton).not.toBeDisabled();
    });

    it('should disable send options when isSending', () => {
      render(<ActionBar {...defaultProps} isSending />);
      const optionsTrigger = screen.getByTestId('send-options-trigger');
      expect(optionsTrigger).toBeDisabled();
    });

    it('should disable send options when canSend is false', () => {
      render(<ActionBar {...defaultProps} canSend={false} />);
      const optionsTrigger = screen.getByTestId('send-options-trigger');
      expect(optionsTrigger).toBeDisabled();
    });
  });

  describe('Send Options Menu', () => {
    it('should open send options menu on click', async () => {
      render(<ActionBar {...defaultProps} onSchedule={mockOnSchedule} />);
      const trigger = screen.getByTestId('send-options-trigger');

      await userEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByTestId('send-options-menu')).toBeInTheDocument();
      });
    });

    it('should show "Send Now" option in menu', async () => {
      render(<ActionBar {...defaultProps} />);
      const trigger = screen.getByTestId('send-options-trigger');

      await userEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByTestId('send-now-option')).toBeInTheDocument();
      });
    });

    it('should show "Schedule Send" option when onSchedule provided', async () => {
      render(<ActionBar {...defaultProps} onSchedule={mockOnSchedule} />);
      const trigger = screen.getByTestId('send-options-trigger');

      await userEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByTestId('schedule-option')).toBeInTheDocument();
      });
    });

    it('should not show "Schedule Send" option when onSchedule not provided', async () => {
      render(<ActionBar {...defaultProps} />);
      const trigger = screen.getByTestId('send-options-trigger');

      await userEvent.click(trigger);

      await waitFor(() => {
        expect(screen.queryByTestId('schedule-option')).not.toBeInTheDocument();
      });
    });

    it('should call onSend when clicking "Send Now" option', async () => {
      render(<ActionBar {...defaultProps} />);
      const trigger = screen.getByTestId('send-options-trigger');

      await userEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByTestId('send-now-option')).toBeInTheDocument();
      });

      const sendNowOption = screen.getByTestId('send-now-option');
      await userEvent.click(sendNowOption);

      expect(mockOnSend).toHaveBeenCalledTimes(1);
    });

    it('should call onSchedule when clicking "Schedule Send" option', async () => {
      render(<ActionBar {...defaultProps} onSchedule={mockOnSchedule} />);
      const trigger = screen.getByTestId('send-options-trigger');

      await userEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByTestId('schedule-option')).toBeInTheDocument();
      });

      const scheduleOption = screen.getByTestId('schedule-option');
      await userEvent.click(scheduleOption);

      expect(mockOnSchedule).toHaveBeenCalledTimes(1);
    });
  });

  describe('Schedule Action', () => {
    it('should call onSchedule when clicking schedule button', async () => {
      render(<ActionBar {...defaultProps} onSchedule={mockOnSchedule} />);
      const scheduleButton = screen.getByTestId('schedule-button');

      await userEvent.click(scheduleButton);

      expect(mockOnSchedule).toHaveBeenCalledTimes(1);
    });

    it('should disable schedule button when isSending', () => {
      render(<ActionBar {...defaultProps} onSchedule={mockOnSchedule} isSending />);
      const scheduleButton = screen.getByTestId('schedule-button');
      expect(scheduleButton).toBeDisabled();
    });

    it('should disable schedule button when canSend is false', () => {
      render(<ActionBar {...defaultProps} onSchedule={mockOnSchedule} canSend={false} />);
      const scheduleButton = screen.getByTestId('schedule-button');
      expect(scheduleButton).toBeDisabled();
    });
  });

  describe('Save Draft Action', () => {
    it('should call onSaveDraft when clicking save draft button', async () => {
      render(<ActionBar {...defaultProps} onSaveDraft={mockOnSaveDraft} />);
      const saveDraftButton = screen.getByTestId('save-draft-button');

      await userEvent.click(saveDraftButton);

      expect(mockOnSaveDraft).toHaveBeenCalledTimes(1);
    });

    it('should disable save draft button when isSavingDraft', () => {
      render(<ActionBar {...defaultProps} onSaveDraft={mockOnSaveDraft} isSavingDraft />);
      const saveDraftButton = screen.getByTestId('save-draft-button');
      expect(saveDraftButton).toBeDisabled();
    });

    it('should show "Saving..." when isSavingDraft is true', () => {
      render(<ActionBar {...defaultProps} onSaveDraft={mockOnSaveDraft} isSavingDraft />);
      expect(screen.getByTestId('saving-status')).toBeInTheDocument();
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('should not show draft status when isSavingDraft', () => {
      const lastSaved = new Date();
      render(<ActionBar {...defaultProps} onSaveDraft={mockOnSaveDraft} lastSaved={lastSaved} isSavingDraft />);

      expect(screen.queryByTestId('draft-status')).not.toBeInTheDocument();
    });
  });

  describe('Draft Status', () => {
    it('should show "Saved just now" for recent saves', () => {
      const lastSaved = new Date();
      render(<ActionBar {...defaultProps} onSaveDraft={mockOnSaveDraft} lastSaved={lastSaved} />);

      expect(screen.getByText('Saved just now')).toBeInTheDocument();
    });

    it('should show seconds for saves under 1 minute', () => {
      const lastSaved = new Date(Date.now() - 30000); // 30 seconds ago
      render(<ActionBar {...defaultProps} onSaveDraft={mockOnSaveDraft} lastSaved={lastSaved} />);

      expect(screen.getByText(/Saved \d+s ago/)).toBeInTheDocument();
    });

    it('should show "1 min ago" for saves around 1 minute', () => {
      const lastSaved = new Date(Date.now() - 70000); // 70 seconds ago
      render(<ActionBar {...defaultProps} onSaveDraft={mockOnSaveDraft} lastSaved={lastSaved} />);

      expect(screen.getByText('Saved 1 min ago')).toBeInTheDocument();
    });

    it('should show minutes for saves under 1 hour', () => {
      const lastSaved = new Date(Date.now() - 5 * 60000); // 5 minutes ago
      render(<ActionBar {...defaultProps} onSaveDraft={mockOnSaveDraft} lastSaved={lastSaved} />);

      expect(screen.getByText('Saved 5 mins ago')).toBeInTheDocument();
    });

    it('should show time for saves over 1 hour', () => {
      const lastSaved = new Date(Date.now() - 2 * 3600000); // 2 hours ago
      render(<ActionBar {...defaultProps} onSaveDraft={mockOnSaveDraft} lastSaved={lastSaved} />);

      expect(screen.getByText(/Saved at \d+:\d+/)).toBeInTheDocument();
    });

    it('should not show draft status when lastSaved is not provided', () => {
      render(<ActionBar {...defaultProps} onSaveDraft={mockOnSaveDraft} />);
      expect(screen.queryByTestId('draft-status')).not.toBeInTheDocument();
    });

    it('should not show draft status when showDraft is false', () => {
      const lastSaved = new Date();
      render(<ActionBar {...defaultProps} onSaveDraft={mockOnSaveDraft} lastSaved={lastSaved} showDraft={false} />);
      expect(screen.queryByTestId('draft-status')).not.toBeInTheDocument();
    });
  });

  describe('Discard Action', () => {
    it('should call onDiscard when clicking discard button', async () => {
      render(<ActionBar {...defaultProps} onDiscard={mockOnDiscard} />);
      const discardButton = screen.getByTestId('discard-button');

      await userEvent.click(discardButton);

      expect(mockOnDiscard).toHaveBeenCalledTimes(1);
    });

    it('should have red styling for discard button', () => {
      render(<ActionBar {...defaultProps} onDiscard={mockOnDiscard} />);
      const discardButton = screen.getByTestId('discard-button');

      expect(discardButton).toHaveClass('text-red-600');
    });
  });

  describe('Layout', () => {
    it('should have left and right sections', () => {
      render(<ActionBar {...defaultProps} onSaveDraft={mockOnSaveDraft} onDiscard={mockOnDiscard} />);
      const actionBar = screen.getByTestId('action-bar');

      expect(actionBar).toHaveClass('justify-between');
    });

    it('should render secondary actions on the left', () => {
      render(<ActionBar {...defaultProps} onSaveDraft={mockOnSaveDraft} onDiscard={mockOnDiscard} />);

      const saveDraftButton = screen.getByTestId('save-draft-button');
      const discardButton = screen.getByTestId('discard-button');
      const actionBar = screen.getByTestId('action-bar');

      const leftSection = actionBar.firstChild;
      expect(leftSection).toContainElement(saveDraftButton);
      expect(leftSection).toContainElement(discardButton);
    });

    it('should render primary actions on the right', () => {
      render(<ActionBar {...defaultProps} onSchedule={mockOnSchedule} />);

      const sendButton = screen.getByTestId('send-button');
      const scheduleButton = screen.getByTestId('schedule-button');
      const actionBar = screen.getByTestId('action-bar');

      const rightSection = actionBar.lastChild;
      expect(rightSection).toContainElement(sendButton);
      expect(rightSection).toContainElement(scheduleButton);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button labels', () => {
      render(<ActionBar {...defaultProps} onSchedule={mockOnSchedule} onSaveDraft={mockOnSaveDraft} onDiscard={mockOnDiscard} />);

      expect(screen.getByText('Send')).toBeInTheDocument();
      expect(screen.getByText('Schedule')).toBeInTheDocument();
      expect(screen.getByText('Save Draft')).toBeInTheDocument();
      expect(screen.getByText('Discard')).toBeInTheDocument();
    });

    it('should have proper button types', () => {
      render(<ActionBar {...defaultProps} />);
      const sendButton = screen.getByTestId('send-button');

      expect(sendButton).toHaveAttribute('type', 'button');
    });
  });
});
