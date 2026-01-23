'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SubjectFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  error?: string;
  maxLength?: number;
  showCharCount?: boolean;
  onGenerateAI?: () => void;
  isGeneratingAI?: boolean;
}

/**
 * SubjectField Component
 *
 * Email subject input with:
 * - Character counter
 * - AI suggestion button
 * - Validation
 * - Length warnings
 */
export function SubjectField({
  value,
  onChange,
  placeholder = 'Subject',
  className,
  autoFocus = false,
  disabled = false,
  error,
  maxLength = 200,
  showCharCount = true,
  onGenerateAI,
  isGeneratingAI = false,
}: SubjectFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Calculate character count and warning
  useEffect(() => {
    const length = value.length;

    if (length === 0) {
      setWarningMessage(null);
    } else if (length < 20) {
      setWarningMessage('Subject is quite short');
    } else if (length > 100) {
      setWarningMessage('Long subjects may be truncated in mobile');
    } else {
      setWarningMessage(null);
    }
  }, [value]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Enforce max length
    if (maxLength && newValue.length > maxLength) {
      return;
    }

    onChange(newValue);
  };

  const charCount = value.length;
  const isNearLimit = charCount > maxLength * 0.8;

  return (
    <div className={cn('space-y-1', className)}>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Subject
      </label>

      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={cn(
            'w-full px-3 py-2 border rounded-md text-sm transition-colors',
            'focus:outline-none focus:ring-2',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-700 focus:ring-blue-500',
            disabled && 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800',
            onGenerateAI && 'pr-12' // Make room for AI button
          )}
          autoFocus={autoFocus}
          disabled={disabled}
          maxLength={maxLength}
          data-testid="subject-input"
        />

        {/* AI Generate Button */}
        {onGenerateAI && !disabled && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onGenerateAI}
            disabled={isGeneratingAI}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
            title="Generate subject with AI"
            data-testid="ai-generate-button"
          >
            <Sparkles
              className={cn(
                'w-4 h-4',
                isGeneratingAI && 'animate-spin'
              )}
            />
          </Button>
        )}
      </div>

      {/* Info row: Character count + Warning/Error */}
      <div className="flex items-center justify-between text-xs">
        {/* Left: Error or Warning */}
        <div className="flex-1">
          {error && (
            <p className="text-red-600 dark:text-red-400" data-testid="error-message">
              {error}
            </p>
          )}
          {!error && warningMessage && isFocused && (
            <p className="text-yellow-600 dark:text-yellow-400" data-testid="warning-message">
              {warningMessage}
            </p>
          )}
        </div>

        {/* Right: Character count */}
        {showCharCount && (isFocused || isNearLimit) && (
          <p
            className={cn(
              'text-gray-500 dark:text-gray-400',
              isNearLimit && 'text-orange-600 dark:text-orange-400 font-medium'
            )}
            data-testid="char-count"
          >
            {charCount}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
}
