/**
 * Email Compose v3
 * Proper Nylas v3 email composition with drafts and attachments
 */

'use client';

import { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { X, Minimize2, Maximize2, Paperclip, Send, Image, Link2, List, PenTool, Check, Heading1, Heading2, Heading3, Code, Clock, Eye, MousePointerClick } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useSignatures } from '@/lib/hooks/useSignatures';
import { SignatureService } from '@/lib/signatures/signature-service';
import EmailAutocomplete from '@/components/email/EmailAutocomplete';
import { URLInputDialog } from '@/components/ui/url-input-dialog';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { SignaturePromptModal } from '@/components/email/SignaturePromptModal';
import { ScheduleSendDialog } from '@/components/email/ScheduleSendDialog';
import { draftStorage } from '@/lib/localDraftStorage';
import { draftSyncService } from '@/lib/draftSyncService';

// Lazy load the AI toolbar to prevent SSR issues
const UnifiedAIToolbar = lazy(() =>
  import('@/components/ai/UnifiedAIToolbar').then(mod => ({ default: mod.UnifiedAIToolbar }))
);

interface EmailComposeV3Props {
  isOpen: boolean;
  onClose: () => void;
  replyTo?: {
    to: string;
    subject: string;
    messageId: string;
    body?: string;
  };
  type?: 'compose' | 'reply' | 'reply-all' | 'forward';
  accountId?: string;
  aiGeneratedReply?: string | null;
}

export function EmailComposeV3({ isOpen, onClose, replyTo, type = 'compose', accountId, aiGeneratedReply }: EmailComposeV3Props) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [showURLDialog, setShowURLDialog] = useState(false);
  const [showScheduleSendDialog, setShowScheduleSendDialog] = useState(false);

  // Form state
  const [to, setTo] = useState<Array<{ email: string; name?: string }>>(
    replyTo?.to ? [{ email: replyTo.to }] : []
  );
  const [cc, setCc] = useState<Array<{ email: string; name?: string }>>([]);
  const [bcc, setBcc] = useState<Array<{ email: string; name?: string }>>([]);
  const [subject, setSubject] = useState(replyTo?.subject || '');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [localDraftId, setLocalDraftId] = useState<string | null>(null);
  const [draftSyncStatus, setDraftSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'failed'>('idle');

  const [isHtmlMode, setIsHtmlMode] = useState(true);

  // Email tracking options
  const [trackOpens, setTrackOpens] = useState(true);
  const [trackClicks, setTrackClicks] = useState(true);

  // Signature state
  const { signatures, getApplicableSignature, renderSignature } = useSignatures();
  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(null);
  const [useSignature, setUseSignature] = useState(true);
  const [showSignatureDropdown, setShowSignatureDropdown] = useState(false);
  const [showSignaturePrompt, setShowSignaturePrompt] = useState(false);
  const [hideSignaturePromptPreference, setHideSignaturePromptPreference] = useState(false);
  const [skipSignatureCheck, setSkipSignatureCheck] = useState(false);

  // Load user preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await fetch('/api/user/preferences');
        if (response.ok) {
          const data = await response.json();
          if (data.preferences) {
            setHideSignaturePromptPreference(data.preferences.hideSignaturePrompt || false);
          }
        }
      } catch (error) {
        console.error('[EmailComposeV3] Failed to load preferences:', error);
      }
    };

    loadPreferences();
  }, []);

  // Auto-insert signature when compose opens
  useEffect(() => {
    if (isOpen && useSignature && !body && type === 'compose' && !replyTo) {
      const applicableSignature = getApplicableSignature(type, accountId);
      if (applicableSignature) {
        setSelectedSignatureId(applicableSignature.id);
        const renderedSignature = renderSignature(applicableSignature, {}, { emailAddress: to[0]?.email || '' });
        setBody('\n\n' + renderedSignature);
        setIsInitialized(true);
      }
    }
  }, [isOpen, type, accountId, useSignature]);

  // Track dirty state for unsaved changes warning
  useEffect(() => {
    if (to.length > 0 || subject.trim() || body.trim()) {
      setIsDirty(true);
    } else {
      setIsDirty(false);
    }
  }, [to, subject, body]);

  // Initialize body with quoted content for reply/forward
  useEffect(() => {
    if (isOpen && !isInitialized && replyTo && type !== 'compose') {
      let quotedBody = '';

      // Helper to create quoted reply header in HTML
      const createQuotedReplyHeader = (from: string, subject: string) => {
        return `
          <div style="border-left: 3px solid #ccc; padding-left: 10px; margin: 10px 0; color: #666;">
            <div style="font-size: 12px; margin-bottom: 8px;">
              <strong>------ Original Message -------</strong><br/>
              From: ${from || 'Unknown'}<br/>
              Subject: ${subject || '(No Subject)'}
            </div>
          </div>
        `;
      };

      if (type === 'reply' || type === 'reply-all') {
        // Start with AI-generated reply if provided, otherwise blank space
        if (aiGeneratedReply) {
          quotedBody += `<p>${aiGeneratedReply.replace(/\n/g, '<br/>')}</p><br/><br/>`;
        } else {
          quotedBody += '<p><br/></p><p><br/></p>';
        }

        // Add signature if enabled
        if (useSignature) {
          const applicableSignature = getApplicableSignature(type, accountId);
          if (applicableSignature) {
            setSelectedSignatureId(applicableSignature.id);
            const renderedSignature = renderSignature(applicableSignature, {}, { emailAddress: to[0]?.email || '' });
            quotedBody += renderedSignature + '<br/><br/>';
          }
        }

        // Add quoted reply header
        quotedBody += createQuotedReplyHeader(replyTo.to, replyTo.subject);

        // Add original message with formatting preserved
        if (replyTo.body) {
          // Wrap original body in a blockquote-style div with left border
          quotedBody += `
            <div style="border-left: 3px solid #ccc; padding-left: 10px; margin: 10px 0;">
              ${replyTo.body}
            </div>
          `;
        }
      } else if (type === 'forward') {
        // Start with blank space for forwarding message
        quotedBody += '<p><br/></p><p><br/></p>';

        quotedBody += `
          <div style="border-left: 3px solid #ccc; padding-left: 10px; margin: 10px 0; color: #666;">
            <div style="font-size: 12px; margin-bottom: 8px;">
              <strong>---------- Forwarded message ---------</strong><br/>
              From: ${replyTo.to}<br/>
              Subject: ${replyTo.subject}
            </div>
          </div>
        `;

        if (replyTo.body) {
          quotedBody += `
            <div style="border-left: 3px solid #ccc; padding-left: 10px; margin: 10px 0;">
              ${replyTo.body}
            </div>
          `;
        }

        if (useSignature) {
          const applicableSignature = getApplicableSignature(type, accountId);
          if (applicableSignature) {
            setSelectedSignatureId(applicableSignature.id);
            const renderedSignature = renderSignature(applicableSignature, {}, { emailAddress: to[0]?.email || '' });
            quotedBody += '<br/><br/>' + renderedSignature;
          }
        }
      }

      setBody(quotedBody);
      setIsInitialized(true);
    }
  }, [isOpen, replyTo, type, isInitialized, useSignature, aiGeneratedReply]);

  const insertSignature = (signature: any) => {
    if (!signature) return;
    const renderedSignature = renderSignature(signature, {}, { emailAddress: to[0]?.email || '' });
    const insertOptions = {
      type: type as any,
      quotedContent: replyTo?.body,
    };
    const newBody = SignatureService.insertSignature(
      body || '',
      renderedSignature,
      insertOptions
    );
    setBody(newBody);
  };

  const handleSignatureToggle = () => {
    const newUseSignature = !useSignature;
    setUseSignature(newUseSignature);

    if (newUseSignature) {
      const applicableSignature = selectedSignatureId
        ? signatures.find(s => s.id === selectedSignatureId)
        : getApplicableSignature(type, accountId);

      if (applicableSignature) {
        insertSignature(applicableSignature);
      }
    } else {
      const currentSignature = signatures.find(s => s.id === selectedSignatureId);
      if (currentSignature) {
        const renderedSignature = renderSignature(currentSignature, {}, { emailAddress: to[0]?.email || '' });
        const newBody = SignatureService.stripSignature(body, renderedSignature);
        setBody(newBody);
      }
    }
  };

  const handleSignatureChange = (signatureId: string) => {
    if (selectedSignatureId) {
      const oldSignature = signatures.find(s => s.id === selectedSignatureId);
      if (oldSignature) {
        const renderedOld = renderSignature(oldSignature, {}, { emailAddress: to[0]?.email || '' });
        const bodyWithoutOld = SignatureService.stripSignature(body, renderedOld);
        setBody(bodyWithoutOld);
      }
    }

    const newSignature = signatures.find(s => s.id === signatureId);
    if (newSignature) {
      setSelectedSignatureId(signatureId);
      insertSignature(newSignature);
    }

    setShowSignatureDropdown(false);
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const resetForm = () => {
    setTo([]);
    setCc([]);
    setBcc([]);
    setSubject('');
    setBody('');
    setAttachments([]);
    setIsInitialized(false);
    setIsDirty(false);
    setLastSaved(null);
    setShowCc(false);
    setShowBcc(false);
    setSkipSignatureCheck(false);
  };

  const handleSend = async () => {
    setValidationError(null);
    setSuccessMessage(null);

    // Validation
    if (to.length === 0 && cc.length === 0 && bcc.length === 0) {
      setValidationError('Please enter at least one recipient (To, Cc, or Bcc)');
      return;
    }

    const allRecipients = [...to, ...cc, ...bcc];
    const invalidEmails = allRecipients.filter(r => !isValidEmail(r.email));
    if (invalidEmails.length > 0) {
      setValidationError(`Invalid email addresses: ${invalidEmails.map(r => r.email).join(', ')}`);
      return;
    }

    if (!accountId) {
      setValidationError('No email account selected. Please select an account first.');
      return;
    }

    // Check for signature (skip if user explicitly chose to continue without one)
    if (signatures.length === 0 && !hideSignaturePromptPreference && !skipSignatureCheck && type === 'compose') {
      setShowSignaturePrompt(true);
      return;
    }

    // Allow empty body if there are attachments (e.g., voice messages)
    const hasContent = body.trim() || attachments.length > 0;
    if (!hasContent) {
      setValidationError('Email body cannot be empty');
      return;
    }

    // Warn about empty subject
    if (!subject || subject.trim() === '') {
      setValidationError('Warning: Email has no subject. Click Send again to confirm.');
      if (validationError?.includes('no subject')) {
        setValidationError(null);
      } else {
        return;
      }
    }

    setIsSending(true);

    try {
      console.log('[EmailComposeV3] Sending email via Nylas v3...');

      // Upload attachments first if any
      const uploadedAttachments = [];
      if (attachments.length > 0) {
        console.log(`[EmailComposeV3] Uploading ${attachments.length} attachment(s)...`);

        for (const file of attachments) {
          const formData = new FormData();
          formData.append('file', file);

          const uploadResponse = await fetch('/api/attachments/upload', {
            method: 'POST',
            body: formData,
          });

          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            uploadedAttachments.push({
              filename: file.name,
              url: uploadData.attachment.storageUrl,
              contentType: file.type,
              size: file.size,
            });
          } else {
            console.error('Failed to upload attachment:', file.name);
          }
        }
      }

      // Send via Nylas v3 API
      const response = await fetch('/api/nylas-v3/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          to: to.map(r => ({ email: r.email, name: r.name })),
          cc: cc.length > 0 ? cc.map(r => ({ email: r.email, name: r.name })) : undefined,
          bcc: bcc.length > 0 ? bcc.map(r => ({ email: r.email, name: r.name })) : undefined,
          subject,
          body,
          attachments: uploadedAttachments,
          replyToMessageId: replyTo?.messageId,
          trackOpens,
          trackClicks,
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('[EmailComposeV3] Email sent successfully');

        resetForm();
        onClose();

        // Trigger refresh
        window.dispatchEvent(new CustomEvent('refreshEmails'));
      } else {
        console.error('[EmailComposeV3] Failed to send email:', data.error);
        setValidationError(`Failed to send email: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[EmailComposeV3] Send error:', error);
      setValidationError('Failed to send email. Please check your connection and try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleScheduleSend = async (scheduledTime: Date) => {
    setValidationError(null);
    setSuccessMessage(null);

    // Basic validation
    if (to.length === 0 && cc.length === 0 && bcc.length === 0) {
      setValidationError('Please enter at least one recipient');
      return;
    }

    if (!accountId) {
      setValidationError('No email account selected');
      return;
    }

    try {
      console.log('[EmailComposeV3] Scheduling email for', scheduledTime);

      const response = await fetch('/api/emails/scheduled', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          toRecipients: to.map(r => ({ email: r.email, name: r.name })),
          cc: cc.length > 0 ? cc.map(r => ({ email: r.email, name: r.name })) : undefined,
          bcc: bcc.length > 0 ? bcc.map(r => ({ email: r.email, name: r.name })) : undefined,
          subject,
          bodyHtml: body,
          scheduledFor: scheduledTime.toISOString(),
          trackOpens,
          trackClicks,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(`Email scheduled for ${scheduledTime.toLocaleString()}`);
        setTimeout(() => {
          resetForm();
          onClose();
        }, 2000);
      } else {
        setValidationError(data.error || 'Failed to schedule email');
      }
    } catch (error) {
      console.error('[EmailComposeV3] Schedule send error:', error);
      setValidationError('Failed to schedule email. Please try again.');
    }
  };

  const handleSaveDraft = useCallback(async (silent = false) => {
    if (!accountId) {
      if (!silent) alert('No email account selected. Please select an account first.');
      return;
    }

    // Don't save completely empty drafts
    if (to.length === 0 && !subject.trim() && !body.trim()) {
      return;
    }

    setIsSavingDraft(true);

    try {
      if (!silent) console.log('[EmailComposeV3] Saving draft locally (instant)...');

      // Save draft locally FIRST (instant, no API call)
      const localDraft = draftStorage.save({
        grantId: accountId,
        to: to.map(r => ({ email: r.email, name: r.name })),
        cc: cc.length > 0 ? cc.map(r => ({ email: r.email, name: r.name })) : undefined,
        bcc: bcc.length > 0 ? bcc.map(r => ({ email: r.email, name: r.name })) : undefined,
        subject,
        body,
        replyToMessageId: replyTo?.messageId,
      });

      // Track the local draft ID
      setLocalDraftId(localDraft.id);
      setLastSaved(new Date());
      setIsDirty(false);
      setDraftSyncStatus('syncing');

      if (!silent) {
        console.log('[EmailComposeV3] ✅ Draft saved locally:', localDraft.id);
        setSuccessMessage('Draft saved locally, syncing to server...');
      }

      // Queue for background sync to Nylas (non-blocking)
      draftSyncService.queueForImmediateSync(localDraft.id).then((result) => {
        if (result.success) {
          console.log('[EmailComposeV3] ✅ Draft synced to Nylas successfully');
          setDraftSyncStatus('synced');
          if (!silent) {
            setSuccessMessage('Draft saved and synced');
            setTimeout(() => setSuccessMessage(null), 3000);
          }
          // Trigger refresh to update draft folder count
          window.dispatchEvent(new CustomEvent('refreshEmails'));
        } else {
          console.error('[EmailComposeV3] ⚠️ Draft sync failed:', result.error);
          setDraftSyncStatus('failed');
          if (!silent) {
            setSuccessMessage('Draft saved locally (will retry sync)');
            setTimeout(() => setSuccessMessage(null), 5000);
          }
        }
      });
    } catch (error) {
      console.error('[EmailComposeV3] Draft save error:', error);
      if (!silent) {
        setValidationError('Failed to save draft locally. Please try again.');
      }
    } finally {
      setIsSavingDraft(false);
    }
  }, [accountId, to, cc, bcc, subject, body, replyTo]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!isOpen || !isDirty || !accountId) return;

    const autoSaveInterval = setInterval(() => {
      handleSaveDraft(true);
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [isOpen, isDirty, accountId, handleSaveDraft]);

  // Save draft on browser close/navigation
  useEffect(() => {
    if (!isOpen || !isDirty || !accountId) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Save draft synchronously using sendBeacon or fetch with keepalive
      if (isDirty && accountId) {
        handleSaveDraft(true);
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isOpen, isDirty, accountId, handleSaveDraft]);

  const handleAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const MAX_SIZE = 25 * 1024 * 1024; // 25MB per file
      const MAX_TOTAL = 100 * 1024 * 1024; // 100MB total

      const oversized = files.filter(f => f.size > MAX_SIZE);
      if (oversized.length > 0) {
        alert(`❌ Some files are too large (max 25MB each):\n\n${oversized.map(f => `• ${f.name} (${formatFileSize(f.size)})`).join('\n')}`);
        return;
      }

      const currentTotalSize = attachments.reduce((sum, f) => sum + f.size, 0);
      const newTotalSize = files.reduce((sum, f) => sum + f.size, 0);
      if (currentTotalSize + newTotalSize > MAX_TOTAL) {
        alert(`❌ Total attachments would exceed 100MB limit\n\nCurrent: ${formatFileSize(currentTotalSize)}\nAdding: ${formatFileSize(newTotalSize)}\nMax: 100MB`);
        return;
      }

      setAttachments([...attachments, ...files]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleVoiceMessageAttachment = (file: File, duration: number) => {
    console.log('[EmailComposeV3] Attaching voice message:', file.name, duration);
    setAttachments([...attachments, file]);
  };

  const handleClose = async () => {
    if (isDirty && accountId) {
      await handleSaveDraft(true);
    }

    resetForm();
    onClose();
  };

  const handleBackdropClick = () => {
    if (isDirty) {
      if (confirm('You have unsaved changes. Save draft before closing?')) {
        handleSaveDraft(false).then(() => {
          resetForm();
          onClose();
        });
      } else {
        resetForm();
        onClose();
      }
    } else {
      resetForm();
      onClose();
    }
  };

  // Ctrl+Enter to send
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, to, subject, body, accountId, attachments]);

  const handleInsertLink = () => {
    setShowURLDialog(true);
  };

  const handleNeverShowSignaturePrompt = async () => {
    try {
      await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hideSignaturePrompt: true }),
      });
      setHideSignaturePromptPreference(true);
    } catch (error) {
      console.error('[EmailComposeV3] Failed to save preference:', error);
    }
  };

  const handleContinueWithoutSignature = () => {
    setShowSignaturePrompt(false);
    setSkipSignatureCheck(true);
    handleSend();
  };

  const handleURLSubmit = (url: string) => {
    setBody(body + ` ${url}`);
  };

  const handleInsertHeading = (level: 1 | 2 | 3) => {
    const hashes = '#'.repeat(level);
    setBody(body + `\n${hashes} Heading\n`);
  };

  const handleInsertCodeBlock = () => {
    setBody(body + '\n```\nCode here\n```\n');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDistanceToNow = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={handleBackdropClick} />

      {/* Centered modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none overflow-y-auto">
        <div
          className={cn(
            'bg-card border border-border shadow-2xl rounded-lg flex flex-col pointer-events-auto transition-all duration-300 my-auto',
            isMinimized && 'h-14 w-96',
            !isMinimized && !isFullscreen && 'max-h-[90vh] h-[700px] w-[900px]',
            isFullscreen && 'h-[calc(100vh-2rem)] w-[calc(100vw-2rem)]'
          )}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">
              {type === 'reply' && replyTo && `Re: ${replyTo.subject}`}
              {type === 'reply-all' && replyTo && `Re: ${replyTo.subject}`}
              {type === 'forward' && replyTo && `Fwd: ${replyTo.subject}`}
              {type === 'compose' && 'New Message'}
            </h3>
            {isMinimized && to.length > 0 && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                To: {to.map(r => r.email).join(', ')}
              </span>
            )}
            {lastSaved && !isMinimized && (
              <span className="text-xs text-muted-foreground">
                Saved {formatDistanceToNow(lastSaved)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!isMinimized && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsMinimized(true)}
                  title="Minimize"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </>
            )}
            {isMinimized && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsMinimized(false)}
                title="Restore"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleClose}
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Compose Form - Hidden when minimized */}
        {!isMinimized && (
          <>
            {/* Recipients */}
            <div className="p-4 space-y-2 border-b border-border">
              <div className="flex items-start gap-2">
                <Label className="w-12 text-sm text-muted-foreground pt-2">To</Label>
                <div className="flex-1">
                  <EmailAutocomplete
                    value={to}
                    onChange={setTo}
                    placeholder="Recipients"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  {!showCc && (
                    <button
                      onClick={() => setShowCc(true)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cc
                    </button>
                  )}
                  {!showBcc && (
                    <button
                      onClick={() => setShowBcc(true)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Bcc
                    </button>
                  )}
                </div>
              </div>

              {showCc && (
                <div className="flex items-start gap-2">
                  <Label className="w-12 text-sm text-muted-foreground pt-2">Cc</Label>
                  <div className="flex-1">
                    <EmailAutocomplete
                      value={cc}
                      onChange={setCc}
                      placeholder="Carbon copy"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 mt-2"
                    onClick={() => {
                      setShowCc(false);
                      setCc([]);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {showBcc && (
                <div className="flex items-start gap-2">
                  <Label className="w-12 text-sm text-muted-foreground pt-2">Bcc</Label>
                  <div className="flex-1">
                    <EmailAutocomplete
                      value={bcc}
                      onChange={setBcc}
                      placeholder="Blind carbon copy"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 mt-2"
                    onClick={() => {
                      setShowBcc(false);
                      setBcc([]);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Label className="w-12 text-sm text-muted-foreground">Subject</Label>
                <Input
                  type="text"
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30 overflow-x-auto">
              <Button
                variant={isHtmlMode ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => setIsHtmlMode(!isHtmlMode)}
                title="Toggle HTML/Plain Text"
              >
                {isHtmlMode ? 'HTML' : 'Plain'}
              </Button>
              <div className="w-px h-6 bg-border mx-1" />

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Heading 1"
                onClick={() => handleInsertHeading(1)}
                disabled={!isHtmlMode}
              >
                <Heading1 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Heading 2"
                onClick={() => handleInsertHeading(2)}
                disabled={!isHtmlMode}
              >
                <Heading2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Heading 3"
                onClick={() => handleInsertHeading(3)}
                disabled={!isHtmlMode}
              >
                <Heading3 className="h-4 w-4" />
              </Button>

              <div className="w-px h-6 bg-border mx-1" />

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Bullet list"
                onClick={() => setBody(body + '\n• ')}
                disabled={!isHtmlMode}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Code block"
                onClick={handleInsertCodeBlock}
                disabled={!isHtmlMode}
              >
                <Code className="h-4 w-4" />
              </Button>

              <div className="w-px h-6 bg-border mx-1" />

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Insert link"
                onClick={handleInsertLink}
              >
                <Link2 className="h-4 w-4" />
              </Button>
              <label title="Insert image">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAttachment}
                  className="hidden"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 cursor-pointer"
                  asChild
                >
                  <span>
                    <Image className="h-4 w-4" />
                  </span>
                </Button>
              </label>

              {/* Signature Controls */}
              {signatures.length > 0 && (
                <>
                  <div className="w-px h-6 bg-border mx-1" />
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn('h-8 w-8', useSignature && 'bg-accent')}
                      onClick={handleSignatureToggle}
                      title={useSignature ? 'Remove signature' : 'Add signature'}
                    >
                      <PenTool className="h-4 w-4" />
                      {useSignature && (
                        <Check className="h-2 w-2 absolute top-1 right-1 text-primary" />
                      )}
                    </Button>
                  </div>
                  {signatures.length > 1 && (
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => setShowSignatureDropdown(!showSignatureDropdown)}
                        title="Choose signature"
                      >
                        {selectedSignatureId
                          ? signatures.find(s => s.id === selectedSignatureId)?.name || 'Signature'
                          : 'Signature'}
                      </Button>
                      {showSignatureDropdown && (
                        <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[200px]">
                          {signatures
                            .filter(s => s.isActive)
                            .map(sig => (
                              <button
                                key={sig.id}
                                onClick={() => handleSignatureChange(sig.id)}
                                className={cn(
                                  'w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors',
                                  sig.id === selectedSignatureId && 'bg-accent'
                                )}
                              >
                                <div className="font-medium">{sig.name}</div>
                                {sig.isDefault && (
                                  <div className="text-xs text-muted-foreground">Default</div>
                                )}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Email Body - Rich Text Editor */}
            <div className="flex-1 overflow-y-auto">
              <RichTextEditor
                content={body}
                onChange={setBody}
                placeholder="Write your message..."
                className="border-0 h-full"
              />
            </div>

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="px-4 py-2 border-t border-border">
                <div className="text-xs font-medium mb-2">
                  Attachments ({attachments.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md text-xs"
                    >
                      <Paperclip className="h-3 w-3" />
                      <span className="max-w-[150px] truncate">{file.name}</span>
                      <span className="text-muted-foreground">
                        ({formatFileSize(file.size)})
                      </span>
                      <button
                        onClick={() => removeAttachment(index)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Composition Toolbar */}
            <Suspense fallback={
              <div className="p-3 border-t border-border bg-muted/10 text-center text-sm text-muted-foreground">
                Loading AI features...
              </div>
            }>
              <UnifiedAIToolbar
                subject={subject}
                body={body}
                onSubjectChange={setSubject}
                onBodyChange={setBody}
                recipientEmail={to.length > 0 ? to[0].email : undefined}
                recipientName={to.length > 0 ? to[0].name : undefined}
                userTier="free"
                onAttachVoiceMessage={handleVoiceMessageAttachment}
              />
            </Suspense>

            {/* Footer */}
            <div className="flex flex-col border-t border-border">
              {/* Success Message */}
              {successMessage && (
                <div className="px-3 pt-3">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                        {successMessage}
                      </p>
                    </div>
                    <button
                      onClick={() => setSuccessMessage(null)}
                      className="text-green-500 hover:text-green-700 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Validation Error */}
              {validationError && (
                <div className="px-3 pt-3">
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm text-red-800 dark:text-red-300 font-medium">
                        {validationError}
                      </p>
                    </div>
                    <button
                      onClick={() => setValidationError(null)}
                      className="text-red-500 hover:text-red-700 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Email Tracking Options */}
              <div className="flex items-center gap-4 px-3 py-2 border-t border-border bg-muted/30">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="track-opens"
                      checked={trackOpens}
                      onCheckedChange={(checked) => setTrackOpens(checked === true)}
                    />
                    <label
                      htmlFor="track-opens"
                      className="text-sm font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Track Opens
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="track-clicks"
                      checked={trackClicks}
                      onCheckedChange={(checked) => setTrackClicks(checked === true)}
                    />
                    <label
                      htmlFor="track-clicks"
                      className="text-sm font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <MousePointerClick className="h-3.5 w-3.5" />
                      Track Clicks
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <Button onClick={handleSend} className="gap-2" disabled={isSending || !accountId}>
                    <Send className="h-4 w-4" />
                    {isSending ? 'Sending...' : 'Send'}
                  </Button>
                  <Button
                    onClick={() => setShowScheduleSendDialog(true)}
                    variant="outline"
                    className="gap-2"
                    disabled={isSending || !accountId}
                  >
                    <Clock className="h-4 w-4" />
                    Schedule
                  </Button>
                <label>
                  <input
                    type="file"
                    multiple
                    onChange={handleAttachment}
                    className="hidden"
                  />
                  <Button variant="ghost" size="icon" className="cursor-pointer" asChild>
                    <span>
                      <Paperclip className="h-4 w-4" />
                    </span>
                  </Button>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSaveDraft(false)}
                  disabled={isSavingDraft || !accountId}
                >
                  {isSavingDraft ? 'Saving...' : 'Save Draft'}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClose}>
                  Discard
                </Button>
              </div>
            </div>
            </div>
          </>
        )}
      </div>
    </div>

    {/* URL Input Dialog */}
    <URLInputDialog
      isOpen={showURLDialog}
      onClose={() => setShowURLDialog(false)}
      onSubmit={handleURLSubmit}
      title="Insert Link"
      placeholder="https://example.com"
    />

    {/* Signature Prompt Modal */}
    <SignaturePromptModal
      isOpen={showSignaturePrompt}
      onClose={() => setShowSignaturePrompt(false)}
      onContinueWithoutSignature={handleContinueWithoutSignature}
      onNeverShowAgain={handleNeverShowSignaturePrompt}
    />

    {/* Schedule Send Dialog */}
    <ScheduleSendDialog
      isOpen={showScheduleSendDialog}
      onClose={() => setShowScheduleSendDialog(false)}
      onSchedule={handleScheduleSend}
    />
    </>
  );
}
