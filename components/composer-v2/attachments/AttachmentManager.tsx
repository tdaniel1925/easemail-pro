'use client';

import React, { useRef, DragEvent, ChangeEvent } from 'react';
import { Paperclip, X, File, Image as ImageIcon, FileText, Video, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EmailAttachment } from '@/lib/composer/types';

interface AttachmentManagerProps {
  attachments: EmailAttachment[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  allowedTypes?: string[];
  disabled?: boolean;
  className?: string;
}

/**
 * AttachmentManager Component
 *
 * Handles file attachments with:
 * - Drag & drop support
 * - File browser
 * - Progress tracking
 * - File type validation
 * - Size validation
 * - Preview icons
 */
export function AttachmentManager({
  attachments,
  onAdd,
  onRemove,
  maxFileSize = 25 * 1024 * 1024, // 25MB default
  maxFiles = 10,
  allowedTypes,
  disabled = false,
  className,
}: AttachmentManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get icon based on file type
  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) return ImageIcon;
    if (contentType.startsWith('video/')) return Video;
    if (contentType.startsWith('audio/')) return Music;
    if (contentType.includes('pdf') || contentType.includes('document')) return FileText;
    return File;
  };

  // Validate files
  const validateFiles = (files: File[]): { valid: File[]; error?: string } => {
    // Check max files
    if (attachments.length + files.length > maxFiles) {
      return {
        valid: [],
        error: `Maximum ${maxFiles} files allowed`,
      };
    }

    const validFiles: File[] = [];

    for (const file of files) {
      // Check file size
      if (file.size > maxFileSize) {
        return {
          valid: [],
          error: `File "${file.name}" exceeds ${formatFileSize(maxFileSize)} limit`,
        };
      }

      // Check file type
      if (allowedTypes && allowedTypes.length > 0) {
        const isAllowed = allowedTypes.some(type => {
          if (type.endsWith('/*')) {
            const baseType = type.replace('/*', '');
            return file.type.startsWith(baseType);
          }
          return file.type === type;
        });

        if (!isAllowed) {
          return {
            valid: [],
            error: `File type "${file.type}" not allowed`,
          };
        }
      }

      validFiles.push(file);
    }

    return { valid: validFiles };
  };

  // Handle file selection
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const { valid, error: validationError } = validateFiles(fileArray);

    if (validationError) {
      setError(validationError);
      setTimeout(() => setError(null), 5000);
      return;
    }

    setError(null);
    onAdd(valid);
  };

  // Handle drag events
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    handleFiles(e.dataTransfer.files);
  };

  // Handle file input change
  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Open file browser
  const openFileBrowser = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={cn('space-y-2', className)} data-testid="attachment-manager">
      {/* Attachment List */}
      {attachments.length > 0 && (
        <div className="space-y-2" data-testid="attachment-list">
          {attachments.map((attachment) => {
            const Icon = getFileIcon(attachment.contentType);
            const isUploading = attachment.uploadStatus === 'uploading';
            const hasError = attachment.uploadStatus === 'error';

            return (
              <div
                key={attachment.id}
                className={cn(
                  'flex items-center gap-3 p-3 border rounded-md bg-gray-50 dark:bg-gray-900',
                  hasError && 'border-red-500 bg-red-50 dark:bg-red-900/20'
                )}
                data-testid="attachment-item"
              >
                {/* Icon */}
                <Icon className="w-5 h-5 text-gray-500 flex-shrink-0" />

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {attachment.filename}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{formatFileSize(attachment.size)}</span>
                    {isUploading && attachment.uploadProgress !== undefined && (
                      <span data-testid="upload-progress">
                        {attachment.uploadProgress}%
                      </span>
                    )}
                    {hasError && (
                      <span className="text-red-600" data-testid="upload-error">
                        {attachment.error || 'Upload failed'}
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {isUploading && attachment.uploadProgress !== undefined && (
                    <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${attachment.uploadProgress}%` }}
                        data-testid="progress-bar"
                      />
                    </div>
                  )}
                </div>

                {/* Remove Button */}
                {!disabled && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemove(attachment.id)}
                    className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                    title={`Remove ${attachment.filename}`}
                    data-testid="remove-attachment"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          className="p-3 border border-red-500 bg-red-50 dark:bg-red-900/20 rounded-md text-sm text-red-600 dark:text-red-400"
          data-testid="error-message"
        >
          {error}
        </div>
      )}

      {/* Drop Zone / Add Button */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-md p-4 transition-colors',
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-700',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        data-testid="drop-zone"
      >
        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={openFileBrowser}
            disabled={disabled || attachments.length >= maxFiles}
            className="flex items-center gap-2"
            data-testid="add-attachment-button"
          >
            <Paperclip className="w-4 h-4" />
            <span>
              {isDragging
                ? 'Drop files here'
                : attachments.length > 0
                ? 'Add more files'
                : 'Attach files'}
            </span>
          </Button>

          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
            accept={allowedTypes?.join(',')}
            disabled={disabled}
            data-testid="file-input"
          />
        </div>

        {/* Helper Text */}
        <p className="text-xs text-gray-500 text-center mt-2">
          {attachments.length}/{maxFiles} files • Max {formatFileSize(maxFileSize)} per file
        </p>
      </div>
    </div>
  );
}
