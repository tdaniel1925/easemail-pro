'use client';

import React from 'react';
import { Send, Clock, Save, Trash2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ActionBarProps {
  onSend: () => void;
  onSchedule?: () => void;
  onSaveDraft?: () => void;
  onDiscard?: () => void;
  isSending?: boolean;
  isSavingDraft?: boolean;
  canSend?: boolean;
  lastSaved?: Date;
  className?: string;
  showSchedule?: boolean;
  showDraft?: boolean;
  showDiscard?: boolean;
}

/**
 * ActionBar Component
 *
 * Primary actions for the composer:
 * - Send email
 * - Schedule send
 * - Save draft
 * - Discard
 */
export function ActionBar({
  onSend,
  onSchedule,
  onSaveDraft,
  onDiscard,
  isSending = false,
  isSavingDraft = false,
  canSend = true,
  lastSaved,
  className,
  showSchedule = true,
  showDraft = true,
  showDiscard = true,
}: ActionBarProps) {
  const formatLastSaved = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);

    if (seconds < 10) return 'Saved just now';
    if (seconds < 60) return `Saved ${seconds}s ago`;
    if (minutes === 1) return 'Saved 1 min ago';
    if (minutes < 60) return `Saved ${minutes} mins ago`;

    return `Saved at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900',
        className
      )}
      data-testid="action-bar"
    >
      {/* Left Side - Secondary Actions */}
      <div className="flex items-center gap-2">
        {/* Draft Status */}
        {showDraft && lastSaved && !isSavingDraft && (
          <p className="text-xs text-gray-500" data-testid="draft-status">
            {formatLastSaved(lastSaved)}
          </p>
        )}

        {isSavingDraft && (
          <p className="text-xs text-gray-500" data-testid="saving-status">
            Saving...
          </p>
        )}

        {/* Save Draft Button */}
        {showDraft && onSaveDraft && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onSaveDraft}
            disabled={isSavingDraft}
            className="text-gray-600 hover:text-gray-900"
            data-testid="save-draft-button"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
        )}

        {/* Discard Button */}
        {showDiscard && onDiscard && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDiscard}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            data-testid="discard-button"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Discard
          </Button>
        )}
      </div>

      {/* Right Side - Primary Actions */}
      <div className="flex items-center gap-2">
        {/* Schedule Send */}
        {showSchedule && onSchedule && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSchedule}
            disabled={isSending || !canSend}
            data-testid="schedule-button"
          >
            <Clock className="w-4 h-4 mr-2" />
            Schedule
          </Button>
        )}

        {/* Send Button with Dropdown */}
        <div className="flex items-center gap-0">
          <Button
            type="button"
            onClick={onSend}
            disabled={isSending || !canSend}
            className="rounded-r-none"
            data-testid="send-button"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSending ? 'Sending...' : 'Send'}
          </Button>

          {/* Send Options Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                disabled={isSending || !canSend}
                className="rounded-l-none border-l border-l-white/20 px-2"
                data-testid="send-options-trigger"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" data-testid="send-options-menu">
              <DropdownMenuItem onClick={onSend} data-testid="send-now-option">
                <Send className="w-4 h-4 mr-2" />
                Send Now
              </DropdownMenuItem>
              {onSchedule && (
                <DropdownMenuItem onClick={onSchedule} data-testid="schedule-option">
                  <Clock className="w-4 h-4 mr-2" />
                  Schedule Send
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
