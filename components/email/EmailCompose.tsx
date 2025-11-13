'use client';

import { useState, useEffect, Suspense, lazy, useCallback, useRef } from 'react';
import { X, Minimize2, Maximize2, Paperclip, Send, Image, Link2, List, PenTool, Check, Heading1, Heading2, Heading3, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useSignatures } from '@/lib/hooks/useSignatures';
import { SignatureService } from '@/lib/signatures/signature-service';
import EmailAutocomplete from '@/components/email/EmailAutocomplete';
import { URLInputDialog } from '@/components/ui/url-input-dialog';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { SignaturePromptModal } from '@/components/email/SignaturePromptModal';
import { formatDistanceToNow } from 'date-fns';

// Lazy load the AI toolbar to prevent SSR issues
const UnifiedAIToolbar = lazy(() =>
  import('@/components/ai/UnifiedAIToolbar').then(mod => ({ default: mod.UnifiedAIToolbar }))
);

interface Draft {
  id: string;
  toRecipients: Array<{ email: string; name?: string }>;
  cc?: Array<{ email: string; name?: string }>;
  bcc?: Array<{ email: string; name?: string }>;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  attachments?: any[];
  replyToEmailId?: string | null;
  replyType?: string | null;
}

interface EmailComposeProps {
  isOpen: boolean;
  onClose: () => void;
  replyTo?: {
    to: string;
    subject: string;
    messageId: string;
    body?: string;
    attachments?: Array<{
      id: string;
      filename: string;
      size: number;
      contentType: string;
      url?: string;
    }>;
  };
  type?: 'compose' | 'reply' | 'reply-all' | 'forward';
  accountId?: string;
  draft?: Draft;
}

export default function EmailCompose({ isOpen, onClose, replyTo, type = 'compose', accountId, draft }: EmailComposeProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [showURLDialog, setShowURLDialog] = useState(false);
  
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
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null); // Draft save indicator
  const [isDirty, setIsDirty] = useState(false); // Track if compose has unsaved changes
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null); // Track current draft ID for deletion after send
  const [isFirstChange, setIsFirstChange] = useState(true); // Track first change for instant save
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle'); // Save status indicator

  // Refs for debouncing
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const saveRetryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Text formatting state - REMOVED (they don't actually work)
  const [isHtmlMode, setIsHtmlMode] = useState(true); // HTML vs Plain text mode

  // Signature state
  const { signatures, getApplicableSignature, renderSignature } = useSignatures();
  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(null);
  const [useSignature, setUseSignature] = useState(true);
  const [showSignatureDropdown, setShowSignatureDropdown] = useState(false);
  const [showSignaturePrompt, setShowSignaturePrompt] = useState(false);
  const [hideSignaturePromptPreference, setHideSignaturePromptPreference] = useState(false);

  // Load user preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await fetch('/api/user/preferences');
        if (response.ok) {
          const data = await response.json();
          console.log('[Preferences] Loaded:', data.preferences);
          if (data.preferences) {
            setHideSignaturePromptPreference(data.preferences.hideSignaturePrompt || false);
          }
        } else {
          console.log('[Preferences] No preferences found or error:', response.status);
        }
      } catch (error) {
        console.error('[Preferences] Failed to load:', error);
      }
    };

    loadPreferences();
  }, []);

  // Debug: Log signatures on mount/change
  useEffect(() => {
    console.log('[EmailCompose] Signatures loaded:', signatures.length, signatures);
  }, [signatures]);

  // Auto-insert signature when compose opens
  useEffect(() => {
    if (isOpen && useSignature && !body && !isInitialized) {
      const applicableSignature = getApplicableSignature(type, accountId);
      if (applicableSignature) {
        setSelectedSignatureId(applicableSignature.id);

        // Render signature with template variables
        const renderedSignature = renderSignature(applicableSignature, {}, { emailAddress: to[0]?.email || '' });

        // Add 2 blank lines at the top for typing space, then signature
        setBody('\n\n' + renderedSignature);
        setIsInitialized(true);
      }
    }
  }, [isOpen, type, accountId, useSignature, body, isInitialized, getApplicableSignature, renderSignature, to]);

  // Track dirty state for unsaved changes warning
  useEffect(() => {
    if (to.length > 0 || subject.trim() || body.trim()) {
      setIsDirty(true);
    } else {
      setIsDirty(false);
    }
  }, [to, subject, body]);

  // Load draft data when resuming a draft
  useEffect(() => {
    if (isOpen && draft && !isInitialized) {
      console.log('[EmailCompose] Loading draft:', draft);

      // Store draft ID for deletion after send
      setCurrentDraftId(draft.id);

      // Pre-populate all form fields from draft
      setTo(draft.toRecipients || []);
      setCc(draft.cc || []);
      setBcc(draft.bcc || []);
      setSubject(draft.subject || '');
      setBody(draft.bodyHtml || draft.bodyText || '');

      // Show CC/BCC fields if they have data
      setShowCc(Boolean(draft.cc && draft.cc.length > 0));
      setShowBcc(Boolean(draft.bcc && draft.bcc.length > 0));

      setIsInitialized(true);
      console.log('[EmailCompose] Draft loaded successfully');
    }
  }, [isOpen, draft, isInitialized]);

  // Load attachments when forwarding an email with attachments
  useEffect(() => {
    const loadForwardAttachments = async () => {
      if (isOpen && type === 'forward' && replyTo?.attachments && replyTo.attachments.length > 0 && attachments.length === 0) {
        console.log('[EmailCompose] Loading attachments for forward:', replyTo.attachments);

        // Download each attachment and add to attachments array
        const downloadedFiles: File[] = [];

        for (const attachment of replyTo.attachments) {
          try {
            // Fetch the attachment from the v3 API with query parameters
            if (!accountId) continue; // Skip if no account ID
            const params = new URLSearchParams({
              accountId: accountId,
              messageId: replyTo.messageId,
              attachmentId: attachment.id,
            });
            const response = await fetch(`/api/nylas-v3/messages/download/attachment?${params.toString()}`);

            if (response.ok) {
              const blob = await response.blob();
              const file = new File([blob], attachment.filename, { type: attachment.contentType });
              downloadedFiles.push(file);
              console.log('[EmailCompose] Downloaded attachment:', attachment.filename);
            } else {
              console.error('[EmailCompose] Failed to download attachment:', attachment.filename);
            }
          } catch (error) {
            console.error('[EmailCompose] Error downloading attachment:', attachment.filename, error);
          }
        }

        if (downloadedFiles.length > 0) {
          setAttachments(downloadedFiles);
          console.log('[EmailCompose] Loaded', downloadedFiles.length, 'attachments for forward');
        }
      }
    };

    loadForwardAttachments();
  }, [isOpen, type, replyTo, attachments.length]);

  // Initialize body with quoted content for reply/forward
  useEffect(() => {
    if (isOpen && !isInitialized && replyTo && type !== 'compose') {
      // Start with 2 blank lines for typing space
      let quotedBody = '<div><br/></div><div><br/></div>';

      if (type === 'reply' || type === 'reply-all') {
        // Add signature on the 3rd line (after 2 blank lines)
        if (useSignature) {
          const applicableSignature = getApplicableSignature(type, accountId);
          if (applicableSignature) {
            setSelectedSignatureId(applicableSignature.id);
            const renderedSignature = renderSignature(applicableSignature, {}, { emailAddress: to[0]?.email || '' });
            quotedBody += `<div>${renderedSignature}</div>`;
          }
        }

        // Add spacing before quoted content
        quotedBody += '<div><br/></div><div><br/></div>';

        // Format as quoted reply with HTML preserved
        quotedBody += '<div style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 5px; color: #666;">';
        quotedBody += '<div style="font-weight: bold; margin-bottom: 10px;">------- Original Message -------</div>';
        quotedBody += `<div><strong>From:</strong> ${replyTo.to}</div>`;
        quotedBody += `<div><strong>Subject:</strong> ${replyTo.subject}</div>`;
        quotedBody += '<div><br/></div>';

        // Keep original HTML formatting
        if (replyTo.body) {
          quotedBody += `<div>${replyTo.body}</div>`;
        }

        quotedBody += '</div>'; // Close blockquote div
      } else if (type === 'forward') {
        // Add signature on the 3rd line (after 2 blank lines)
        if (useSignature) {
          const applicableSignature = getApplicableSignature(type, accountId);
          if (applicableSignature) {
            setSelectedSignatureId(applicableSignature.id);
            const renderedSignature = renderSignature(applicableSignature, {}, { emailAddress: to[0]?.email || '' });
            quotedBody += `<div>${renderedSignature}</div>`;
          }
        }

        // Add spacing before forwarded content
        quotedBody += '<div><br/></div><div><br/></div>';

        // Format as forwarded message with HTML preserved
        quotedBody += '<div style="border: 1px solid #ddd; padding: 15px; border-radius: 5px; background-color: #f9f9f9;">';
        quotedBody += '<div style="font-weight: bold; margin-bottom: 10px; color: #333;">---------- Forwarded message ---------</div>';
        quotedBody += `<div><strong>From:</strong> ${replyTo.to}</div>`;
        quotedBody += `<div><strong>Subject:</strong> ${replyTo.subject}</div>`;
        quotedBody += '<div><br/></div>';

        // Keep original HTML formatting
        if (replyTo.body) {
          quotedBody += `<div>${replyTo.body}</div>`;
        }

        quotedBody += '</div>'; // Close forward div
      }

      setBody(quotedBody);
      setIsInitialized(true);
    }
  }, [isOpen, replyTo, type, isInitialized, useSignature]);

  const insertSignature = (signature: any) => {
    if (!signature) return;

    // Render signature with template variables
    const renderedSignature = renderSignature(signature, {}, { emailAddress: to[0]?.email || '' });

    // Insert signature based on email type
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
      // Add signature
      const applicableSignature = selectedSignatureId
        ? signatures.find(s => s.id === selectedSignatureId)
        : getApplicableSignature(type, accountId);
      
      if (applicableSignature) {
        insertSignature(applicableSignature);
      }
    } else {
      // Remove signature
      const currentSignature = signatures.find(s => s.id === selectedSignatureId);
      if (currentSignature) {
        const renderedSignature = renderSignature(currentSignature, {}, { emailAddress: to[0]?.email || '' });
        const newBody = SignatureService.stripSignature(body, renderedSignature);
        setBody(newBody);
      }
    }
  };

  const handleSignatureChange = (signatureId: string) => {
    // Remove old signature
    if (selectedSignatureId) {
      const oldSignature = signatures.find(s => s.id === selectedSignatureId);
      if (oldSignature) {
        const renderedOld = renderSignature(oldSignature, {}, { emailAddress: to[0]?.email || '' });
        const bodyWithoutOld = SignatureService.stripSignature(body, renderedOld);
        setBody(bodyWithoutOld);
      }
    }

    // Insert new signature
    const newSignature = signatures.find(s => s.id === signatureId);
    if (newSignature) {
      setSelectedSignatureId(signatureId);
      insertSignature(newSignature);
    }

    setShowSignatureDropdown(false);
  };

  // Helper function to validate email addresses
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Helper function to reset form state
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
    setCurrentDraftId(null); // Clear draft ID
  };

  const handleSend = async () => {
    // Clear previous validation errors
    setValidationError(null);

    // Debug logging
    console.log('[EmailCompose] Validation check:');
    console.log('  - to:', to);
    console.log('  - cc:', cc);
    console.log('  - bcc:', bcc);
    console.log('  - to.length:', to.length);
    console.log('  - cc.length:', cc.length);
    console.log('  - bcc.length:', bcc.length);

    // Validation - check if at least ONE recipient exists (to, cc, OR bcc)
    if (to.length === 0 && cc.length === 0 && bcc.length === 0) {
      setValidationError('Please enter at least one recipient (To, Cc, or Bcc)');
      return;
    }

    // Validate email addresses
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

    // Check for signature - show prompt if no signatures exist and user hasn't hidden it
    console.log('[EmailCompose] Signature check:', {
      signaturesCount: signatures.length,
      hidePrompt: hideSignaturePromptPreference,
      type: type,
      showPrompt: signatures.length === 0 && !hideSignaturePromptPreference && type === 'compose'
    });
    
    if (signatures.length === 0 && !hideSignaturePromptPreference && type === 'compose') {
      console.log('[EmailCompose] ✅ Showing signature prompt');
      setShowSignaturePrompt(true);
      return;
    }

    // Warn about empty subject (but allow sending)
    if (!subject || subject.trim() === '') {
      setValidationError('Warning: Email has no subject. Click Send again to confirm.');
      // Allow them to click Send again to proceed
      if (validationError?.includes('no subject')) {
        setValidationError(null); // Clear warning and proceed
      } else {
        return;
      }
    }

    setIsSending(true);

    try {
      console.log('📤 Sending email...');
      console.log('📎 Current attachments array:', attachments);
      console.log('📎 Attachments length:', attachments.length);

      // Upload attachments first if any
      const uploadedAttachments = [];
      if (attachments.length > 0) {
        console.log(`📎 Uploading ${attachments.length} attachment(s)...`);
        
        for (const file of attachments) {
          console.log('📎 Processing file:', file.name, file.size, 'bytes');
          const formData = new FormData();
          formData.append('file', file);
          
          console.log('📎 About to call /api/attachments/upload for:', file.name);
          const uploadResponse = await fetch('/api/attachments/upload', {
            method: 'POST',
            body: formData,
          });
          
          console.log('📎 Upload response status:', uploadResponse.status);
          
          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            console.log('📎 Upload successful:', uploadData);
            uploadedAttachments.push({
              filename: file.name,
              url: uploadData.attachment.storageUrl,
              contentType: file.type,
              size: file.size,
            });
          } else {
            const errorText = await uploadResponse.text();
            console.error('Failed to upload attachment:', file.name, errorText);
          }
        }
        
        console.log(`[Attach] Uploaded attachment(s)`);
      }

      const response = await fetch('/api/nylas/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          to: to.map(r => r.email).join(', '),
          cc: cc.length > 0 ? cc.map(r => r.email).join(', ') : undefined,
          bcc: bcc.length > 0 ? bcc.map(r => r.email).join(', ') : undefined,
          subject,
          body,
          attachments: uploadedAttachments,
          replyToEmailId: replyTo?.messageId,
          draftId: currentDraftId, // Pass draft ID for deletion after send
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('[Email] Email sent successfully:', data.emailId);
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-[100] animate-in slide-in-from-top';
        successMessage.textContent = '✓ Email sent successfully!';
        document.body.appendChild(successMessage);
        setTimeout(() => successMessage.remove(), 3000);
        
        // Reset form state before closing
        resetForm();
        onClose();
        
        // Trigger refresh of email list
        window.dispatchEvent(new CustomEvent('refreshEmails'));
      } else {
        console.error('❌ Failed to send email:', data.error);
        alert(`Failed to send email: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Send error:', error);
      alert('Failed to send email. Please check your connection and try again.');
    } finally {
      setIsSending(false);
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
    setSavingStatus('saving');

    try {
      if (!silent) console.log('💾 Saving draft...');

      // Use PUT if we have a draft ID (update), otherwise POST (create)
      const method = currentDraftId ? 'PUT' : 'POST';
      const requestBody: any = {
        accountId,
        to: to.map(r => r.email).join(', ') || '', // Allow empty recipients
        cc: cc.length > 0 ? cc.map(r => r.email).join(', ') : undefined,
        bcc: bcc.length > 0 ? bcc.map(r => r.email).join(', ') : undefined,
        subject,
        bodyText: body,
        bodyHtml: body, // Could be enhanced with HTML conversion
        attachments: [],
        replyToEmailId: replyTo?.messageId,
        replyType: type,
      };

      // Add draft ID for PUT requests
      if (currentDraftId) {
        requestBody.draftId = currentDraftId;
      }

      const response = await fetch('/api/nylas-v3/drafts', {
        method: 'POST', // Always POST for v3 (handles both create and update)
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        if (!silent) console.log('[Draft] Draft saved:', data.draftId);

        // Store draft ID for future updates
        if (!currentDraftId && data.draftId) {
          setCurrentDraftId(data.draftId);
        }

        // Update last saved time
        setLastSaved(new Date());
        setIsDirty(false);
        setSavingStatus('saved');
        setIsFirstChange(false); // Mark that first save is complete

        // Clear saved status after 2 seconds
        setTimeout(() => {
          setSavingStatus('idle');
        }, 2000);

        if (!silent) {
          // Show success message for manual saves
          const successMessage = document.createElement('div');
          successMessage.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-[100] animate-in slide-in-from-top';
          successMessage.textContent = '✓ Draft saved successfully!';
          document.body.appendChild(successMessage);
          setTimeout(() => successMessage.remove(), 3000);
        }
      } else {
        setSavingStatus('error');
        // Retry after 5 seconds
        if (silent) {
          saveRetryTimerRef.current = setTimeout(() => {
            console.log('[Draft] Retrying save after error...');
            handleSaveDraft(true);
          }, 5000);
        }
        if (!silent) alert(`Failed to save draft: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Draft save error:', error);
      setSavingStatus('error');

      // Retry after 5 seconds for auto-saves
      if (silent) {
        saveRetryTimerRef.current = setTimeout(() => {
          console.log('[Draft] Retrying save after error...');
          handleSaveDraft(true);
        }, 5000);
      }

      if (!silent) alert('Failed to save draft. Please try again.');
    } finally {
      setIsSavingDraft(false);
    }
  }, [accountId, to, cc, bcc, subject, body, replyTo, type]);

  // Debounced auto-save with instant first save
  useEffect(() => {
    if (!isOpen || !isDirty || !accountId) return;

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If this is the first change, save immediately (Outlook behavior)
    if (isFirstChange) {
      console.log('[Draft] First change detected - saving immediately');
      handleSaveDraft(true);
      return;
    }

    // Otherwise, debounce: save 3 seconds after last change
    debounceTimerRef.current = setTimeout(() => {
      console.log('[Draft] Debounced auto-save triggered');
      handleSaveDraft(true);
    }, 3000); // 3 seconds after last change

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isOpen, isDirty, accountId, to, cc, bcc, subject, body, isFirstChange, handleSaveDraft]);

  // Periodic auto-save backup (every 3 seconds) to ensure drafts are saved even without changes
  useEffect(() => {
    if (!isOpen || !isDirty || !accountId) return;

    const autoSaveInterval = setInterval(() => {
      console.log('[Draft] Periodic auto-save triggered');
      handleSaveDraft(true); // Silent auto-save
    }, 3000); // Every 3 seconds

    return () => clearInterval(autoSaveInterval);
  }, [isOpen, isDirty, accountId, handleSaveDraft]);

  const handleAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const MAX_SIZE = 25 * 1024 * 1024; // 25MB per file
      const MAX_TOTAL = 100 * 1024 * 1024; // 100MB total
      
      // Check individual file sizes
      const oversized = files.filter(f => f.size > MAX_SIZE);
      if (oversized.length > 0) {
        alert(`❌ Some files are too large (max 25MB each):\n\n${oversized.map(f => `• ${f.name} (${formatFileSize(f.size)})`).join('\n')}`);
        return;
      }
      
      // Check total size
      const currentTotalSize = attachments.reduce((sum, f) => sum + f.size, 0);
      const newTotalSize = files.reduce((sum, f) => sum + f.size, 0);
      if (currentTotalSize + newTotalSize > MAX_TOTAL) {
        alert(`❌ Total attachments would exceed 100MB limit\n\nCurrent: ${formatFileSize(currentTotalSize)}\nAdding: ${formatFileSize(newTotalSize)}\nMax: 100MB`);
        return;
      }

      setAttachments([...attachments, ...files]);

      // Trigger immediate save when attachment is added (Outlook behavior)
      setIsDirty(true);
      setTimeout(() => {
        if (accountId) {
          console.log('[Draft] Attachment added - saving immediately');
          handleSaveDraft(true);
        }
      }, 100); // Small delay to ensure state is updated
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleVoiceMessageAttachment = (file: File, duration: number) => {
    console.log('Attaching voice message:', file.name, duration);
    setAttachments([...attachments, file]);
  };

  // Handle close with auto-save
  const handleClose = async () => {
    if (isDirty && accountId) {
      // Auto-save draft before closing
      await handleSaveDraft(true);
    }
    
    // Reset form and close
    resetForm();
    onClose();
  };

  // Handle backdrop click with confirmation
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

  // Save draft before browser navigation/close
  useEffect(() => {
    if (!isOpen) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && accountId) {
        // Attempt to save draft using sendBeacon (works even after page unload starts)
        const draftData = {
          accountId,
          to: to.map(r => r.email).join(', '),
          cc: cc.length > 0 ? cc.map(r => r.email).join(', ') : undefined,
          bcc: bcc.length > 0 ? bcc.map(r => r.email).join(', ') : undefined,
          subject,
          bodyText: body,
          bodyHtml: body,
          attachments: [],
          replyToEmailId: replyTo?.messageId,
          replyType: type,
        };

        // Use sendBeacon for reliable delivery during page unload
        const blob = new Blob([JSON.stringify(draftData)], { type: 'application/json' });
        navigator.sendBeacon('/api/nylas/drafts', blob);

        // Show browser confirmation dialog
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isOpen, isDirty, accountId, to, cc, bcc, subject, body, replyTo, type]);

  const handleInsertLink = () => {
    setShowURLDialog(true);
  };

  // Signature prompt handlers
  const handleNeverShowSignaturePrompt = async () => {
    try {
      await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hideSignaturePrompt: true }),
      });
      setHideSignaturePromptPreference(true);
      console.log('[EmailCompose] Signature prompt hidden permanently');
    } catch (error) {
      console.error('[EmailCompose] Failed to save preference:', error);
    }
  };

  const handleContinueWithoutSignature = () => {
    console.log('[EmailCompose] Continuing without signature');
    setShowSignaturePrompt(false);
    // Retry sending
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={cn(
            'bg-card border border-border shadow-2xl rounded-lg flex flex-col pointer-events-auto transition-all duration-300',
            isMinimized && 'h-14 w-96',
            !isMinimized && !isFullscreen && 'h-[700px] w-[900px]',
            isFullscreen && 'h-[calc(100vh-2rem)] w-[calc(100vw-2rem)]'
          )}
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => {
            // Save when focus leaves the compose window
            if (isDirty && accountId && !e.currentTarget.contains(e.relatedTarget as Node)) {
              console.log('[Draft] Focus lost - saving draft');
              handleSaveDraft(true);
            }
          }}
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
            {!isMinimized && (
              <span className="text-xs flex items-center gap-1">
                {savingStatus === 'saving' && (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    <span className="text-blue-600">Saving...</span>
                  </>
                )}
                {savingStatus === 'saved' && lastSaved && (
                  <>
                    <Check className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">Saved {formatDistanceToNow(lastSaved)} ago</span>
                  </>
                )}
                {savingStatus === 'error' && (
                  <span className="text-red-600">Save failed - retrying...</span>
                )}
                {savingStatus === 'idle' && lastSaved && (
                  <span className="text-muted-foreground">Last saved {formatDistanceToNow(lastSaved)} ago</span>
                )}
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
              {/* HTML/Plain Toggle */}
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

              {/* Removed: Bold/Italic/Underline buttons (don't actually work without rich text editor) */}

              {/* Headings */}
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

              {/* List & Code */}
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

              {/* Link & Image */}
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

              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <Button onClick={handleSend} className="gap-2" disabled={isSending || !accountId}>
                    <Send className="h-4 w-4" />
                    {isSending ? 'Sending...' : 'Send'}
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
    </>
  );
}


