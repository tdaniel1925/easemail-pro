import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComposerWindow } from './ComposerWindow';
import { useComposerStore } from '@/lib/composer/store';

// Mock window.confirm
const mockConfirm = vi.fn();
global.confirm = mockConfirm;

describe('ComposerWindow', () => {
  beforeEach(() => {
    mockConfirm.mockClear();
    // Reset store before each test
    act(() => {
      useComposerStore.getState().resetComposer();
    });
  });

  afterEach(() => {
    // Clean up store after each test
    act(() => {
      useComposerStore.getState().resetComposer();
    });
  });

  describe('Rendering', () => {
    it('should not render when composer is closed', () => {
      render(<ComposerWindow />);
      expect(screen.queryByTestId('composer-window')).not.toBeInTheDocument();
    });

    it('should render when composer is open', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
      });

      render(<ComposerWindow />);
      expect(screen.getByTestId('composer-window')).toBeInTheDocument();
    });

    it('should render title bar', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
      });

      render(<ComposerWindow />);
      expect(screen.getByTestId('composer-title-bar')).toBeInTheDocument();
    });

    it('should show correct title for compose mode', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
      });

      render(<ComposerWindow />);
      expect(screen.getByText('New Message')).toBeInTheDocument();
    });

    it('should show correct title for reply mode', () => {
      act(() => {
        useComposerStore.getState().openComposer('reply');
      });

      render(<ComposerWindow />);
      expect(screen.getByText('Reply')).toBeInTheDocument();
    });

    it('should show correct title for reply-all mode', () => {
      act(() => {
        useComposerStore.getState().openComposer('reply-all');
      });

      render(<ComposerWindow />);
      expect(screen.getByText('Reply All')).toBeInTheDocument();
    });

    it('should show correct title for forward mode', () => {
      act(() => {
        useComposerStore.getState().openComposer('forward');
      });

      render(<ComposerWindow />);
      expect(screen.getByText('Forward')).toBeInTheDocument();
    });
  });

  describe('Window Controls', () => {
    it('should render minimize button', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
      });

      render(<ComposerWindow />);
      expect(screen.getByTestId('minimize-button')).toBeInTheDocument();
    });

    it('should render maximize button', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
      });

      render(<ComposerWindow />);
      expect(screen.getByTestId('maximize-button')).toBeInTheDocument();
    });

    it('should render close button', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
      });

      render(<ComposerWindow />);
      expect(screen.getByTestId('close-button')).toBeInTheDocument();
    });

    it('should minimize window when clicking minimize button', async () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
      });

      render(<ComposerWindow />);
      const minimizeButton = screen.getByTestId('minimize-button');

      await userEvent.click(minimizeButton);

      expect(useComposerStore.getState().windowMode).toBe('minimized');
    });

    it('should maximize window when clicking maximize button', async () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
      });

      render(<ComposerWindow />);
      const maximizeButton = screen.getByTestId('maximize-button');

      await userEvent.click(maximizeButton);

      expect(useComposerStore.getState().windowMode).toBe('fullscreen');
    });

    it('should restore window from fullscreen when clicking maximize button', async () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
        useComposerStore.getState().setWindowMode('fullscreen');
      });

      render(<ComposerWindow />);
      const maximizeButton = screen.getByTestId('maximize-button');

      await userEvent.click(maximizeButton);

      expect(useComposerStore.getState().windowMode).toBe('normal');
    });

    it('should close window when clicking close button without changes', async () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
      });

      render(<ComposerWindow />);
      const closeButton = screen.getByTestId('close-button');

      await userEvent.click(closeButton);

      expect(useComposerStore.getState().isOpen).toBe(false);
    });

    it('should confirm before closing with unsaved changes', async () => {
      mockConfirm.mockReturnValue(true);

      act(() => {
        useComposerStore.getState().openComposer('compose');
        useComposerStore.getState().setSubject('Test'); // Make it dirty
      });

      render(<ComposerWindow />);
      const closeButton = screen.getByTestId('close-button');

      await userEvent.click(closeButton);

      expect(mockConfirm).toHaveBeenCalled();
      expect(useComposerStore.getState().isOpen).toBe(false);
    });

    it('should not close when user cancels confirmation', async () => {
      mockConfirm.mockReturnValue(false);

      act(() => {
        useComposerStore.getState().openComposer('compose');
        useComposerStore.getState().setSubject('Test'); // Make it dirty
      });

      render(<ComposerWindow />);
      const closeButton = screen.getByTestId('close-button');

      await userEvent.click(closeButton);

      expect(mockConfirm).toHaveBeenCalled();
      expect(useComposerStore.getState().isOpen).toBe(true);
    });
  });

  describe('Window Modes', () => {
    it('should render in normal mode by default', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
      });

      const { container } = render(<ComposerWindow />);
      const window = container.querySelector('[data-testid="composer-window"]');

      expect(window).toHaveClass('w-[600px]');
      expect(window).toHaveClass('h-[700px]');
    });

    it('should render in minimized mode when minimized', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
        useComposerStore.getState().setWindowMode('minimized');
      });

      const { container } = render(<ComposerWindow />);
      const window = container.querySelector('[data-testid="composer-window"]');

      expect(window).toHaveClass('w-[400px]');
      expect(window).toHaveClass('h-14');
    });

    it('should render in fullscreen mode when maximized', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
        useComposerStore.getState().setWindowMode('fullscreen');
      });

      const { container } = render(<ComposerWindow />);
      const window = container.querySelector('[data-testid="composer-window"]');

      expect(window).toHaveClass('inset-0');
      expect(window).toHaveClass('w-full');
      expect(window).toHaveClass('h-full');
    });

    it('should hide composer content when minimized', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
        useComposerStore.getState().setWindowMode('minimized');
      });

      render(<ComposerWindow />);

      expect(screen.queryByTestId('recipient-fields')).not.toBeInTheDocument();
      expect(screen.queryByTestId('subject-field')).not.toBeInTheDocument();
      expect(screen.queryByTestId('smart-editor')).not.toBeInTheDocument();
    });

    it('should show minimized preview when minimized', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
        useComposerStore.getState().setWindowMode('minimized');
      });

      render(<ComposerWindow />);

      expect(screen.getByTestId('minimized-preview')).toBeInTheDocument();
    });

    it('should restore from minimized when clicking preview', async () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
        useComposerStore.getState().setWindowMode('minimized');
      });

      render(<ComposerWindow />);
      const preview = screen.getByTestId('minimized-preview');

      await userEvent.click(preview);

      expect(useComposerStore.getState().windowMode).toBe('normal');
    });

    it('should show backdrop in fullscreen mode', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
        useComposerStore.getState().setWindowMode('fullscreen');
      });

      const { container } = render(<ComposerWindow />);
      const backdrop = container.querySelector('.bg-black\\/50');

      expect(backdrop).toBeInTheDocument();
    });

    it('should not show backdrop in normal mode', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
      });

      const { container } = render(<ComposerWindow />);
      const backdrop = container.querySelector('.bg-black\\/50');

      expect(backdrop).not.toBeInTheDocument();
    });
  });

  describe('Composer Components Integration', () => {
    it('should render TO recipient field', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
      });

      render(<ComposerWindow />);
      expect(screen.getByTestId('recipient-field-to')).toBeInTheDocument();
    });

    it('should render subject input', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
      });

      render(<ComposerWindow />);
      expect(screen.getByPlaceholderText(/subject/i)).toBeInTheDocument();
    });

    it('should render editor', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
      });

      const { container } = render(<ComposerWindow />);
      // TipTap editor should be present
      const editor = container.querySelector('.ProseMirror');
      expect(editor).toBeInTheDocument();
    });

    it('should render AttachmentManager', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
      });

      render(<ComposerWindow />);
      expect(screen.getByTestId('attachment-manager')).toBeInTheDocument();
    });

    it('should render ActionBar', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
      });

      render(<ComposerWindow />);
      expect(screen.getByTestId('action-bar')).toBeInTheDocument();
    });
  });

  describe('Send Functionality', () => {
    it('should disable send button when no recipients', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
        useComposerStore.getState().setSubject('Test');
        useComposerStore.getState().setBody('<p>Body</p>', 'Body');
      });

      render(<ComposerWindow />);
      const sendButton = screen.getByTestId('send-button');

      expect(sendButton).toBeDisabled();
    });

    it('should disable send button when no subject', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
        useComposerStore.getState().addRecipient('to', { email: 'test@example.com' });
        useComposerStore.getState().setBody('<p>Body</p>', 'Body');
      });

      render(<ComposerWindow />);
      const sendButton = screen.getByTestId('send-button');

      expect(sendButton).toBeDisabled();
    });

    it('should disable send button when no body', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
        useComposerStore.getState().addRecipient('to', { email: 'test@example.com' });
        useComposerStore.getState().setSubject('Test');
      });

      render(<ComposerWindow />);
      const sendButton = screen.getByTestId('send-button');

      expect(sendButton).toBeDisabled();
    });

    it('should enable send button when all required fields filled', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
        useComposerStore.getState().addRecipient('to', { email: 'test@example.com' });
        useComposerStore.getState().setSubject('Test');
        useComposerStore.getState().setBody('<p>Body</p>', 'Body');
      });

      render(<ComposerWindow />);
      const sendButton = screen.getByTestId('send-button');

      expect(sendButton).not.toBeDisabled();
    });
  });

  describe('Unsaved Changes Indicator', () => {
    it('should not show unsaved indicator initially', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
      });

      render(<ComposerWindow />);
      expect(screen.queryByTestId('unsaved-indicator')).not.toBeInTheDocument();
    });

    it('should show unsaved indicator when content changes', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
        useComposerStore.getState().setSubject('Test');
      });

      render(<ComposerWindow />);
      expect(screen.getByTestId('unsaved-indicator')).toBeInTheDocument();
      expect(screen.getByText('• Unsaved changes')).toBeInTheDocument();
    });

    it('should hide unsaved indicator when saving', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
        useComposerStore.getState().setSubject('Test');
        useComposerStore.setState({ savingStatus: 'saving' });
      });

      render(<ComposerWindow />);
      expect(screen.queryByTestId('unsaved-indicator')).not.toBeInTheDocument();
    });
  });

  describe('Minimized Preview', () => {
    it('should show recipients in minimized preview', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
        useComposerStore.getState().addRecipient('to', { email: 'test1@example.com' });
        useComposerStore.getState().addRecipient('to', { email: 'test2@example.com' });
        useComposerStore.getState().setWindowMode('minimized');
      });

      render(<ComposerWindow />);
      expect(screen.getByText(/test1@example.com, test2@example.com/)).toBeInTheDocument();
    });

    it('should show subject in minimized preview', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
        useComposerStore.getState().setSubject('Test Subject');
        useComposerStore.getState().setWindowMode('minimized');
      });

      render(<ComposerWindow />);
      expect(screen.getByText(/Test Subject/)).toBeInTheDocument();
    });

    it('should show placeholder when no recipients', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
        useComposerStore.getState().setWindowMode('minimized');
      });

      render(<ComposerWindow />);
      expect(screen.getByText(/No recipients/)).toBeInTheDocument();
    });

    it('should show placeholder when no subject', () => {
      act(() => {
        useComposerStore.getState().openComposer('compose');
        useComposerStore.getState().setWindowMode('minimized');
      });

      render(<ComposerWindow />);
      expect(screen.getByText(/No subject/)).toBeInTheDocument();
    });
  });
});
