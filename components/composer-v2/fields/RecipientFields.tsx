'use client';

import React, { useState, useRef, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmailRecipient } from '@/lib/composer/types';

interface RecipientFieldsProps {
  label: string;
  recipients: EmailRecipient[];
  onAdd: (recipient: EmailRecipient) => void;
  onRemove: (index: number) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  error?: string;
}

/**
 * RecipientFields Component
 *
 * Handles email recipient input with:
 * - Email validation
 * - Tag-based display
 * - Keyboard shortcuts (Enter to add, Backspace to remove)
 * - Copy/paste support for multiple emails
 */
export function RecipientFields({
  label,
  recipients,
  onAdd,
  onRemove,
  placeholder = 'Enter email address',
  className,
  autoFocus = false,
  disabled = false,
  error,
}: RecipientFieldsProps) {
  const [inputValue, setInputValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Simple email validation regex
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Add recipient from input
  const addRecipient = (email: string) => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setValidationError('Invalid email address');
      return;
    }

    // Check for duplicates
    if (recipients.some(r => r.email.toLowerCase() === trimmedEmail.toLowerCase())) {
      setValidationError('Email already added');
      return;
    }

    onAdd({ email: trimmedEmail });
    setInputValue('');
    setValidationError(null);
  };

  // Handle keyboard events
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addRecipient(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && recipients.length > 0) {
      // Remove last recipient if input is empty
      onRemove(recipients.length - 1);
    }
  };

  // Handle blur event (add email when focus leaves)
  const handleBlur = () => {
    if (inputValue.trim()) {
      addRecipient(inputValue);
    }
  };

  // Handle paste event (support pasting multiple emails)
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');

    // Check if multiple emails (separated by comma, semicolon, or newline)
    const emails = pastedText.split(/[,;\n\r]+/).map(email => email.trim()).filter(Boolean);

    if (emails.length > 1) {
      e.preventDefault();
      emails.forEach(email => {
        if (isValidEmail(email)) {
          if (!recipients.some(r => r.email.toLowerCase() === email.toLowerCase())) {
            onAdd({ email });
          }
        }
      });
      setInputValue('');
      setValidationError(null);
    }
  };

  // Focus input when clicking on container
  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const displayError = error || validationError;

  return (
    <div className={cn('space-y-1', className)}>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>

      <div
        className={cn(
          'flex flex-wrap items-center gap-2 min-h-[42px] px-3 py-2 border rounded-md bg-white dark:bg-gray-900 cursor-text transition-colors',
          displayError
            ? 'border-red-500 focus-within:ring-2 focus-within:ring-red-500'
            : 'border-gray-300 dark:border-gray-700 focus-within:ring-2 focus-within:ring-blue-500',
          disabled && 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
        )}
        onClick={handleContainerClick}
        data-testid={`recipient-field-${label.toLowerCase()}`}
      >
        {/* Recipient tags */}
        {recipients.map((recipient, index) => (
          <div
            key={index}
            className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm"
            data-testid="recipient-tag"
          >
            <span>{recipient.name || recipient.email}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(index);
                }}
                className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 transition-colors"
                aria-label={`Remove ${recipient.email}`}
                data-testid="remove-recipient"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}

        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setValidationError(null);
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onPaste={handlePaste}
          placeholder={recipients.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[200px] outline-none bg-transparent text-sm"
          autoFocus={autoFocus}
          disabled={disabled}
          data-testid="recipient-input"
        />
      </div>

      {/* Error message */}
      {displayError && (
        <p className="text-sm text-red-600 dark:text-red-400" data-testid="error-message">
          {displayError}
        </p>
      )}
    </div>
  );
}
