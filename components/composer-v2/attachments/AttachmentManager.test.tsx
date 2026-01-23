import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AttachmentManager } from './AttachmentManager';
import { EmailAttachment } from '@/lib/composer/types';

describe('AttachmentManager', () => {
  const mockOnAdd = vi.fn();
  const mockOnRemove = vi.fn();

  const defaultProps = {
    attachments: [] as EmailAttachment[],
    onAdd: mockOnAdd,
    onRemove: mockOnRemove,
  };

  const createMockFile = (name: string, size: number, type: string): File => {
    const file = new File(['a'.repeat(size)], name, { type });
    Object.defineProperty(file, 'size', { value: size });
    return file;
  };

  const createMockAttachment = (overrides?: Partial<EmailAttachment>): EmailAttachment => ({
    id: '1',
    filename: 'test.pdf',
    size: 1024,
    contentType: 'application/pdf',
    uploadStatus: 'completed',
    ...overrides,
  });

  beforeEach(() => {
    mockOnAdd.mockClear();
    mockOnRemove.mockClear();
  });

  describe('Rendering', () => {
    it('should render empty state', () => {
      render(<AttachmentManager {...defaultProps} />);
      expect(screen.getByTestId('attachment-manager')).toBeInTheDocument();
      expect(screen.getByText('Attach files')).toBeInTheDocument();
    });

    it('should render with attachments', () => {
      const attachments = [createMockAttachment()];
      render(<AttachmentManager {...defaultProps} attachments={attachments} />);

      expect(screen.getByTestId('attachment-list')).toBeInTheDocument();
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });

    it('should display file count and limits', () => {
      render(<AttachmentManager {...defaultProps} maxFiles={5} maxFileSize={10 * 1024 * 1024} />);
      expect(screen.getByText(/0\/5 files/)).toBeInTheDocument();
      expect(screen.getByText(/Max 10.0 MB per file/)).toBeInTheDocument();
    });

    it('should show drop zone', () => {
      render(<AttachmentManager {...defaultProps} />);
      expect(screen.getByTestId('drop-zone')).toBeInTheDocument();
    });

    it('should show add button', () => {
      render(<AttachmentManager {...defaultProps} />);
      expect(screen.getByTestId('add-attachment-button')).toBeInTheDocument();
    });
  });

  describe('File Selection via Browser', () => {
    it('should open file browser when clicking add button', async () => {
      render(<AttachmentManager {...defaultProps} />);
      const button = screen.getByTestId('add-attachment-button');
      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

      const clickSpy = vi.spyOn(fileInput, 'click');

      await userEvent.click(button);

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should handle file selection', async () => {
      render(<AttachmentManager {...defaultProps} />);
      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

      const file = createMockFile('test.pdf', 1024, 'application/pdf');

      await userEvent.upload(fileInput, file);

      expect(mockOnAdd).toHaveBeenCalledWith([file]);
    });

    it('should handle multiple file selection', async () => {
      render(<AttachmentManager {...defaultProps} />);
      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

      const files = [
        createMockFile('file1.pdf', 1024, 'application/pdf'),
        createMockFile('file2.jpg', 2048, 'image/jpeg'),
      ];

      await userEvent.upload(fileInput, files);

      expect(mockOnAdd).toHaveBeenCalledWith(files);
    });
  });

  describe('Drag and Drop', () => {
    it('should show drag state when dragging over', () => {
      render(<AttachmentManager {...defaultProps} />);
      const dropZone = screen.getByTestId('drop-zone');

      fireEvent.dragEnter(dropZone);

      expect(screen.getByText('Drop files here')).toBeInTheDocument();
    });

    it('should hide drag state when leaving', () => {
      render(<AttachmentManager {...defaultProps} />);
      const dropZone = screen.getByTestId('drop-zone');

      fireEvent.dragEnter(dropZone);
      expect(screen.getByText('Drop files here')).toBeInTheDocument();

      fireEvent.dragLeave(dropZone);
      expect(screen.getByText('Attach files')).toBeInTheDocument();
    });

    it('should handle file drop', () => {
      render(<AttachmentManager {...defaultProps} />);
      const dropZone = screen.getByTestId('drop-zone');

      const file = createMockFile('dropped.pdf', 1024, 'application/pdf');
      const dataTransfer = {
        files: [file],
      };

      fireEvent.drop(dropZone, { dataTransfer });

      expect(mockOnAdd).toHaveBeenCalledWith([file]);
    });

    it('should not trigger drag state when disabled', () => {
      render(<AttachmentManager {...defaultProps} disabled />);
      const dropZone = screen.getByTestId('drop-zone');

      fireEvent.dragEnter(dropZone);

      expect(screen.queryByText('Drop files here')).not.toBeInTheDocument();
    });

    it('should not handle drop when disabled', () => {
      render(<AttachmentManager {...defaultProps} disabled />);
      const dropZone = screen.getByTestId('drop-zone');

      const file = createMockFile('dropped.pdf', 1024, 'application/pdf');
      const dataTransfer = {
        files: [file],
      };

      fireEvent.drop(dropZone, { dataTransfer });

      expect(mockOnAdd).not.toHaveBeenCalled();
    });
  });

  describe('File Validation', () => {
    it('should reject files exceeding size limit', async () => {
      render(<AttachmentManager {...defaultProps} maxFileSize={1024} />);
      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

      const file = createMockFile('large.pdf', 2048, 'application/pdf');

      await userEvent.upload(fileInput, file);

      expect(mockOnAdd).not.toHaveBeenCalled();
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByText(/exceeds.*limit/)).toBeInTheDocument();
    });

    it('should reject when max files limit reached', async () => {
      const attachments = [
        createMockAttachment({ id: '1' }),
        createMockAttachment({ id: '2' }),
      ];
      render(<AttachmentManager {...defaultProps} attachments={attachments} maxFiles={2} />);
      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

      const file = createMockFile('extra.pdf', 1024, 'application/pdf');

      await userEvent.upload(fileInput, file);

      expect(mockOnAdd).not.toHaveBeenCalled();
      expect(screen.getByText(/Maximum 2 files allowed/)).toBeInTheDocument();
    });

    it('should validate allowed file types', async () => {
      render(<AttachmentManager {...defaultProps} allowedTypes={['image/*', 'application/pdf']} />);
      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

      const invalidFile = createMockFile('test.mp3', 1024, 'audio/mpeg');

      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      await waitFor(() => {
        expect(mockOnAdd).not.toHaveBeenCalled();
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });
    });

    it('should accept valid file types with wildcard', async () => {
      render(<AttachmentManager {...defaultProps} allowedTypes={['image/*']} />);
      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

      const validFile = createMockFile('test.jpg', 1024, 'image/jpeg');

      await userEvent.upload(fileInput, validFile);

      expect(mockOnAdd).toHaveBeenCalledWith([validFile]);
    });

    it('should clear error after timeout', async () => {
      vi.useFakeTimers();

      try {
        render(<AttachmentManager {...defaultProps} maxFileSize={1024} />);
        const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

        const file = createMockFile('large.pdf', 2048, 'application/pdf');

        fireEvent.change(fileInput, { target: { files: [file] } });

        // Error should be visible
        expect(screen.getByTestId('error-message')).toBeInTheDocument();

        // Advance timers past the 5000ms timeout
        vi.advanceTimersByTime(5000);

        // Use act to flush updates
        await vi.runAllTimersAsync();

        // Error should be cleared
        expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('Attachment Display', () => {
    it('should display file name and size', () => {
      const attachments = [createMockAttachment({ filename: 'document.pdf', size: 2048 })];
      render(<AttachmentManager {...defaultProps} attachments={attachments} />);

      expect(screen.getByText('document.pdf')).toBeInTheDocument();
      expect(screen.getByText('2.0 KB')).toBeInTheDocument();
    });

    it('should show upload progress', () => {
      const attachments = [
        createMockAttachment({
          uploadStatus: 'uploading',
          uploadProgress: 45,
        }),
      ];
      render(<AttachmentManager {...defaultProps} attachments={attachments} />);

      expect(screen.getByTestId('upload-progress')).toHaveTextContent('45%');
      expect(screen.getByTestId('progress-bar')).toHaveStyle({ width: '45%' });
    });

    it('should show upload error', () => {
      const attachments = [
        createMockAttachment({
          uploadStatus: 'error',
          error: 'Network error',
        }),
      ];
      render(<AttachmentManager {...defaultProps} attachments={attachments} />);

      expect(screen.getByTestId('upload-error')).toHaveTextContent('Network error');
    });

    it('should show default error message if none provided', () => {
      const attachments = [
        createMockAttachment({
          uploadStatus: 'error',
        }),
      ];
      render(<AttachmentManager {...defaultProps} attachments={attachments} />);

      expect(screen.getByTestId('upload-error')).toHaveTextContent('Upload failed');
    });

    it('should display correct file icons for different types', () => {
      const attachments = [
        createMockAttachment({ id: '1', contentType: 'image/jpeg' }),
        createMockAttachment({ id: '2', contentType: 'video/mp4' }),
        createMockAttachment({ id: '3', contentType: 'audio/mpeg' }),
        createMockAttachment({ id: '4', contentType: 'application/pdf' }),
      ];
      render(<AttachmentManager {...defaultProps} attachments={attachments} />);

      const items = screen.getAllByTestId('attachment-item');
      expect(items).toHaveLength(4);
    });
  });

  describe('File Size Formatting', () => {
    it('should format bytes', () => {
      const attachments = [createMockAttachment({ size: 500 })];
      render(<AttachmentManager {...defaultProps} attachments={attachments} />);
      expect(screen.getByText('500 B')).toBeInTheDocument();
    });

    it('should format kilobytes', () => {
      const attachments = [createMockAttachment({ size: 2048 })];
      render(<AttachmentManager {...defaultProps} attachments={attachments} />);
      expect(screen.getByText('2.0 KB')).toBeInTheDocument();
    });

    it('should format megabytes', () => {
      const attachments = [createMockAttachment({ size: 5 * 1024 * 1024 })];
      render(<AttachmentManager {...defaultProps} attachments={attachments} />);
      expect(screen.getByText('5.0 MB')).toBeInTheDocument();
    });
  });

  describe('Remove Attachment', () => {
    it('should call onRemove when clicking remove button', () => {
      const attachments = [createMockAttachment({ id: 'test-123' })];
      render(<AttachmentManager {...defaultProps} attachments={attachments} />);

      const removeButton = screen.getByTestId('remove-attachment');
      fireEvent.click(removeButton);

      expect(mockOnRemove).toHaveBeenCalledWith('test-123');
    });

    it('should not show remove button when disabled', () => {
      const attachments = [createMockAttachment()];
      render(<AttachmentManager {...defaultProps} attachments={attachments} disabled />);

      expect(screen.queryByTestId('remove-attachment')).not.toBeInTheDocument();
    });

    it('should have accessible title on remove button', () => {
      const attachments = [createMockAttachment({ filename: 'document.pdf' })];
      render(<AttachmentManager {...defaultProps} attachments={attachments} />);

      const removeButton = screen.getByTestId('remove-attachment');
      expect(removeButton).toHaveAttribute('title', 'Remove document.pdf');
    });
  });

  describe('Disabled State', () => {
    it('should disable add button when disabled', () => {
      render(<AttachmentManager {...defaultProps} disabled />);
      const button = screen.getByTestId('add-attachment-button');
      expect(button).toBeDisabled();
    });

    it('should disable add button when max files reached', () => {
      const attachments = [
        createMockAttachment({ id: '1' }),
        createMockAttachment({ id: '2' }),
      ];
      render(<AttachmentManager {...defaultProps} attachments={attachments} maxFiles={2} />);

      const button = screen.getByTestId('add-attachment-button');
      expect(button).toBeDisabled();
    });

    it('should disable file input when disabled', () => {
      render(<AttachmentManager {...defaultProps} disabled />);
      const fileInput = screen.getByTestId('file-input');
      expect(fileInput).toBeDisabled();
    });

    it('should not open file browser when disabled', () => {
      render(<AttachmentManager {...defaultProps} disabled />);
      const button = screen.getByTestId('add-attachment-button');

      // Button should be disabled, so click won't work
      expect(button).toBeDisabled();
    });
  });

  describe('Multiple Attachments', () => {
    it('should render multiple attachments', () => {
      const attachments = [
        createMockAttachment({ id: '1', filename: 'file1.pdf' }),
        createMockAttachment({ id: '2', filename: 'file2.jpg' }),
        createMockAttachment({ id: '3', filename: 'file3.doc' }),
      ];
      render(<AttachmentManager {...defaultProps} attachments={attachments} />);

      expect(screen.getByText('file1.pdf')).toBeInTheDocument();
      expect(screen.getByText('file2.jpg')).toBeInTheDocument();
      expect(screen.getByText('file3.doc')).toBeInTheDocument();
    });

    it('should update button text when attachments exist', () => {
      const attachments = [createMockAttachment()];
      render(<AttachmentManager {...defaultProps} attachments={attachments} />);

      expect(screen.getByText('Add more files')).toBeInTheDocument();
    });
  });

  describe('File Input Reset', () => {
    it('should reset file input after selection to allow same file again', () => {
      render(<AttachmentManager {...defaultProps} />);
      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

      const file = createMockFile('test.pdf', 1024, 'application/pdf');

      fireEvent.change(fileInput, { target: { files: [file] } });

      // Input should be reset after onChange
      expect(fileInput.value).toBe('');
    });
  });
});
