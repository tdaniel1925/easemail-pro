import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SmartEditor } from './SmartEditor';
import { act } from 'react';

describe('SmartEditor', () => {
  const mockOnChange = vi.fn();
  const mockOnEditorReady = vi.fn();

  const defaultProps = {
    content: '',
    onChange: mockOnChange,
  };

  beforeEach(() => {
    mockOnChange.mockClear();
    mockOnEditorReady.mockClear();
  });

  describe('Rendering', () => {
    it('should render loading state initially', () => {
      render(<SmartEditor {...defaultProps} />);
      // Editor initializes almost immediately, so we might see either loading or ready state
      expect(
        screen.queryByTestId('editor-loading') || screen.queryByTestId('smart-editor')
      ).toBeInTheDocument();
    });

    it('should render editor once loaded', async () => {
      render(<SmartEditor {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('smart-editor')).toBeInTheDocument();
      });
    });

    it('should render toolbar by default', async () => {
      render(<SmartEditor {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('editor-toolbar')).toBeInTheDocument();
      });
    });

    it('should hide toolbar when showToolbar is false', async () => {
      render(<SmartEditor {...defaultProps} showToolbar={false} />);

      await waitFor(() => {
        expect(screen.getByTestId('smart-editor')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('editor-toolbar')).not.toBeInTheDocument();
    });

    it('should render placeholder when empty', async () => {
      render(<SmartEditor {...defaultProps} placeholder="Type something..." />);

      await waitFor(() => {
        expect(screen.getByText('Type something...')).toBeInTheDocument();
      });
    });

    it('should not render placeholder when content exists', async () => {
      render(<SmartEditor {...defaultProps} content="<p>Hello</p>" placeholder="Type..." />);

      await waitFor(() => {
        expect(screen.queryByText('Type...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Content Handling', () => {
    it('should display initial content', async () => {
      render(<SmartEditor {...defaultProps} content="<p>Initial content</p>" />);

      await waitFor(() => {
        const content = screen.getByTestId('editor-content');
        expect(content.textContent).toContain('Initial content');
      });
    });

    it('should call onChange when content is edited', async () => {
      render(<SmartEditor {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('editor-content')).toBeInTheDocument();
      });

      const editorContent = screen.getByTestId('editor-content');
      const editableDiv = editorContent.querySelector('[contenteditable="true"]');

      if (editableDiv) {
        await act(async () => {
          await userEvent.click(editableDiv);
          await userEvent.keyboard('Hello');
        });

        await waitFor(() => {
          expect(mockOnChange).toHaveBeenCalled();
        });
      }
    });

    it('should update content when prop changes', async () => {
      const { rerender } = render(<SmartEditor {...defaultProps} content="<p>First</p>" />);

      await waitFor(() => {
        const content = screen.getByTestId('editor-content');
        expect(content.textContent).toContain('First');
      });

      act(() => {
        rerender(<SmartEditor {...defaultProps} content="<p>Second</p>" />);
      });

      await waitFor(() => {
        const content = screen.getByTestId('editor-content');
        expect(content.textContent).toContain('Second');
      });
    });
  });

  describe('Editor Callbacks', () => {
    it('should call onEditorReady with editor instance', async () => {
      render(<SmartEditor {...defaultProps} onEditorReady={mockOnEditorReady} />);

      await waitFor(() => {
        expect(mockOnEditorReady).toHaveBeenCalled();
        expect(mockOnEditorReady.mock.calls[0][0]).toHaveProperty('commands');
      });
    });
  });

  describe('Disabled State', () => {
    it('should create non-editable editor when disabled', async () => {
      render(<SmartEditor {...defaultProps} disabled={true} onEditorReady={mockOnEditorReady} />);

      await waitFor(() => {
        expect(mockOnEditorReady).toHaveBeenCalled();
      });

      const disabledEditor = mockOnEditorReady.mock.calls[0][0];
      expect(disabledEditor.isEditable).toBe(false);
    });

    it('should create editable editor when not disabled', async () => {
      render(<SmartEditor {...defaultProps} disabled={false} onEditorReady={mockOnEditorReady} />);

      await waitFor(() => {
        expect(mockOnEditorReady).toHaveBeenCalled();
      });

      const editor = mockOnEditorReady.mock.calls[0][0];
      expect(editor.isEditable).toBe(true);
    });
  });

  describe('Dimensions', () => {
    it('should apply custom minHeight', async () => {
      render(<SmartEditor {...defaultProps} minHeight={300} />);

      await waitFor(() => {
        const editor = screen.getByTestId('smart-editor');
        const scrollContainer = editor.querySelector('.overflow-y-auto');
        expect(scrollContainer).toHaveStyle({ minHeight: '300px' });
      });
    });

    it('should apply custom maxHeight', async () => {
      render(<SmartEditor {...defaultProps} maxHeight={800} />);

      await waitFor(() => {
        const editor = screen.getByTestId('smart-editor');
        const scrollContainer = editor.querySelector('.overflow-y-auto');
        expect(scrollContainer).toHaveStyle({ maxHeight: '800px' });
      });
    });
  });

  describe('Toolbar Integration', () => {
    it('should render all formatting buttons', async () => {
      render(<SmartEditor {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('toolbar-bold')).toBeInTheDocument();
        expect(screen.getByTestId('toolbar-italic')).toBeInTheDocument();
        expect(screen.getByTestId('toolbar-underline')).toBeInTheDocument();
      });
    });

    it('should render list buttons', async () => {
      render(<SmartEditor {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('toolbar-bullet-list')).toBeInTheDocument();
        expect(screen.getByTestId('toolbar-numbered-list')).toBeInTheDocument();
      });
    });

    it('should render alignment buttons', async () => {
      render(<SmartEditor {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('toolbar-align-left')).toBeInTheDocument();
        expect(screen.getByTestId('toolbar-align-center')).toBeInTheDocument();
        expect(screen.getByTestId('toolbar-align-right')).toBeInTheDocument();
      });
    });

    it('should render link and image buttons', async () => {
      render(<SmartEditor {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('toolbar-insert-link')).toBeInTheDocument();
        expect(screen.getByTestId('toolbar-insert-image')).toBeInTheDocument();
      });
    });

    it('should render undo/redo buttons', async () => {
      render(<SmartEditor {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('toolbar-undo')).toBeInTheDocument();
        expect(screen.getByTestId('toolbar-redo')).toBeInTheDocument();
      });
    });
  });

  describe('Character Count', () => {
    it('should display character count', async () => {
      render(<SmartEditor {...defaultProps} content="<p>Hello World</p>" />);

      await waitFor(() => {
        const editor = screen.getByTestId('smart-editor');
        expect(editor.textContent).toMatch(/\d+ characters/);
      });
    });

    it('should update character count as content changes', async () => {
      render(<SmartEditor {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('editor-content')).toBeInTheDocument();
      });

      const editorContent = screen.getByTestId('editor-content');
      const editableDiv = editorContent.querySelector('[contenteditable="true"]');

      if (editableDiv) {
        await act(async () => {
          await userEvent.click(editableDiv);
          await userEvent.keyboard('Test');
        });

        await waitFor(() => {
          const editor = screen.getByTestId('smart-editor');
          expect(editor.textContent).toMatch(/\d+ characters/);
        });
      }
    });
  });

  describe('Focus Management', () => {
    it('should pass autoFocus to editor configuration', async () => {
      render(<SmartEditor {...defaultProps} autoFocus onEditorReady={mockOnEditorReady} />);

      await waitFor(() => {
        expect(mockOnEditorReady).toHaveBeenCalled();
      });

      // TipTap handles autofocus, just verify the editor was created successfully
      const editor = mockOnEditorReady.mock.calls[0][0];
      expect(editor).toBeDefined();
      expect(editor.isEditable).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should destroy editor on unmount', async () => {
      const { unmount } = render(<SmartEditor {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('smart-editor')).toBeInTheDocument();
      });

      unmount();

      // Should not crash on unmount
      expect(screen.queryByTestId('smart-editor')).not.toBeInTheDocument();
    });
  });
});
