'use client';

import React, { useEffect } from 'react';
import { X, Minus, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useComposerStore } from '@/lib/composer/store';
import { RecipientFields } from './fields/RecipientFields';
import { SubjectField } from './fields/SubjectField';
import { SmartEditor } from './editor/SmartEditor';
import { AttachmentManager } from './attachments/AttachmentManager';
import { ActionBar } from './actions/ActionBar';

/**
 * ComposerWindow Component
 *
 * The main email composer window that integrates all composer components.
 * Supports three window modes:
 * - normal: Standard popup window
 * - minimized: Collapsed to title bar
 * - fullscreen: Full screen overlay
 */
export function ComposerWindow() {
  const isOpen = useComposerStore(state => state.isOpen);

  // Don't render if not open - early return before other hooks
  if (!isOpen) return null;

  return <ComposerWindowContent />;
}

function ComposerWindowContent() {
  const {
    windowMode,
    mode,
    toRecipients,
    ccRecipients,
    bccRecipients,
    showCc,
    showBcc,
    subject,
    bodyHtml,
    bodyText,
    attachments,
    isDirty,
    isSending,
    lastSaved,
    savingStatus,
    validationErrors,
    accountId,
    closeComposer,
    setWindowMode,
    addRecipient,
    removeRecipient,
    updateRecipient,
    toggleCc,
    toggleBcc,
    setSubject,
    setBody,
    addAttachment,
    removeAttachment,
    sendEmail,
    saveDraft,
    validateEmail,
    clearValidationError,
  } = useComposerStore();

  // Auto-save draft when content changes
  useEffect(() => {
    if (isDirty && savingStatus === 'idle') {
      const timeoutId = setTimeout(() => {
        saveDraft();
      }, 2000); // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timeoutId);
    }
  }, [isDirty, savingStatus, saveDraft]);

  const handleClose = () => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Do you want to discard them?');
      if (!confirmed) return;
    }
    closeComposer();
  };

  const handleMinimize = () => {
    setWindowMode('minimized');
  };

  const handleMaximize = () => {
    if (windowMode === 'fullscreen') {
      setWindowMode('normal');
    } else {
      setWindowMode('fullscreen');
    }
  };

  const handleSend = async () => {
    const isValid = validateEmail();
    if (isValid) {
      await sendEmail();
    }
  };

  const canSend = toRecipients.length > 0 && subject.trim() !== '' && bodyText.trim() !== '';

  // Window size classes based on mode
  const windowClasses = cn(
    'fixed bg-white dark:bg-gray-800 shadow-2xl rounded-lg flex flex-col overflow-hidden',
    'transition-all duration-200 ease-in-out',
    {
      // Normal mode: bottom-right popup
      'bottom-4 right-4 w-[600px] h-[700px]': windowMode === 'normal',
      // Minimized: small bar at bottom
      'bottom-4 right-4 w-[400px] h-14': windowMode === 'minimized',
      // Fullscreen: cover entire viewport
      'inset-0 w-full h-full rounded-none': windowMode === 'fullscreen',
    }
  );

  return (
    <>
      {/* Backdrop for fullscreen mode */}
      {windowMode === 'fullscreen' && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setWindowMode('normal')}
        />
      )}

      {/* Composer Window */}
      <div className={cn(windowClasses, 'z-50')} data-testid="composer-window">
        {/* Title Bar */}
        <div
          className={cn(
            'flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700',
            'bg-gray-50 dark:bg-gray-900'
          )}
          data-testid="composer-title-bar"
        >
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {mode === 'compose' && 'New Message'}
              {mode === 'reply' && 'Reply'}
              {mode === 'reply-all' && 'Reply All'}
              {mode === 'forward' && 'Forward'}
            </h2>
            {isDirty && savingStatus !== 'saving' && (
              <span className="text-xs text-gray-500" data-testid="unsaved-indicator">
                • Unsaved changes
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Minimize Button */}
            <button
              type="button"
              onClick={handleMinimize}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title="Minimize"
              data-testid="minimize-button"
            >
              <Minus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>

            {/* Maximize/Restore Button */}
            <button
              type="button"
              onClick={handleMaximize}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title={windowMode === 'fullscreen' ? 'Restore' : 'Maximize'}
              data-testid="maximize-button"
            >
              {windowMode === 'fullscreen' ? (
                <Minimize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
              title="Close"
              data-testid="close-button"
            >
              <X className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-red-600" />
            </button>
          </div>
        </div>

        {/* Composer Content - Hidden when minimized */}
        {windowMode !== 'minimized' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Composer Form */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                {/* Recipients */}
                <div className="space-y-2">
                  {/* To Field */}
                  <RecipientFields
                    label="To"
                    recipients={toRecipients}
                    onAdd={(recipient) => addRecipient('to', recipient)}
                    onRemove={(index) => removeRecipient('to', index)}
                    autoFocus
                    error={validationErrors.to}
                  />

                  {/* CC/BCC Toggle Buttons */}
                  <div className="flex gap-2">
                    {!showCc && (
                      <button
                        type="button"
                        onClick={toggleCc}
                        className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                      >
                        + Cc
                      </button>
                    )}
                    {!showBcc && (
                      <button
                        type="button"
                        onClick={toggleBcc}
                        className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                      >
                        + Bcc
                      </button>
                    )}
                  </div>

                  {/* CC Field */}
                  {showCc && (
                    <RecipientFields
                      label="Cc"
                      recipients={ccRecipients}
                      onAdd={(recipient) => addRecipient('cc', recipient)}
                      onRemove={(index) => removeRecipient('cc', index)}
                    />
                  )}

                  {/* BCC Field */}
                  {showBcc && (
                    <RecipientFields
                      label="Bcc"
                      recipients={bccRecipients}
                      onAdd={(recipient) => addRecipient('bcc', recipient)}
                      onRemove={(index) => removeRecipient('bcc', index)}
                    />
                  )}
                </div>

                {/* Subject */}
                <SubjectField
                  value={subject}
                  onChange={setSubject}
                  error={validationErrors.subject}
                />

                {/* Editor */}
                <SmartEditor
                  content={bodyHtml}
                  onChange={(html, text) => setBody(html, text)}
                />

                {/* Attachments */}
                <AttachmentManager
                  attachments={attachments}
                  onAdd={async (files) => {
                    for (const file of files) {
                      await addAttachment(file);
                    }
                  }}
                  onRemove={removeAttachment}
                />
              </div>
            </div>

            {/* Action Bar */}
            <ActionBar
              onSend={handleSend}
              onSaveDraft={saveDraft}
              onDiscard={handleClose}
              isSending={isSending}
              isSavingDraft={savingStatus === 'saving'}
              canSend={canSend}
              lastSaved={lastSaved}
            />
          </div>
        )}

        {/* Minimized Preview */}
        {windowMode === 'minimized' && (
          <div
            className="flex-1 flex items-center px-4 cursor-pointer"
            onClick={() => setWindowMode('normal')}
            data-testid="minimized-preview"
          >
            <div className="flex-1 text-sm text-gray-600 dark:text-gray-400 truncate">
              To: {toRecipients.map(r => r.email).join(', ') || 'No recipients'} •{' '}
              {subject || 'No subject'}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
