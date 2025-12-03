'use client';

import { useState, useEffect, Suspense, lazy, useCallback, useRef } from 'react';
import { X, Minimize2, Maximize2, Paperclip, Send, Image, Link2, List, PenTool, Check, Heading1, Heading2, Heading3, Code, Sparkles, Plus, ChevronDown } from 'lucide-react';
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
import { SignatureEditorModal, SignatureFormData } from '@/components/signatures/SignatureEditorModal';
import { useAccount } from '@/contexts/AccountContext';
import { formatDistanceToNow } from 'date-fns';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/use-toast';

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
    cc?: string; // ✅ Added for reply-all support
    bcc?: string; // ✅ Added for completeness
    subject: string;
    messageId: string; // Can be database UUID or provider message ID
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
  const { confirm, Dialog } = useConfirm();
  const { toast } = useToast();
  const { accounts } = useAccount();

  // Debug: Log accountId prop and sync selectedAccountId
  useEffect(() => {
    if (isOpen) {
      console.log('[EmailCompose] Opened with accountId:', accountId, 'Type:', typeof accountId);
      if (!accountId) {
        console.error('[EmailCompose] ❌ No accountId provided! Draft saving will be disabled.');
      }
      // Sync selectedAccountId with prop when composer opens
      setSelectedAccountId(accountId);
    }
  }, [isOpen, accountId]);

  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [showURLDialog, setShowURLDialog] = useState(false);
  
  // ✅ FIX: Initialize recipients based on compose type (reply/reply-all/forward)
  // Handles both single email strings and comma-separated lists
  const parseEmailField = (field: string | undefined): Array<{ email: string; name?: string }> => {
    if (!field) return [];

    // Split by comma and parse each email
    return field
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0)
      .map(email => ({ email }));
  };

  const initializeRecipients = () => {
    if (!replyTo) return { to: [], cc: [], bcc: [] };

    if (type === 'reply') {
      // Reply: Only reply to the sender
      return {
        to: parseEmailField(replyTo.to),
        cc: [],
        bcc: []
      };
    } else if (type === 'reply-all') {
      // Reply-All: Parse comma-separated lists for To and CC
      // ✅ OUTLOOK BEHAVIOR: Exclude current user from CC list
      const ccList = parseEmailField(replyTo.cc);
      const toList = parseEmailField(replyTo.to);

      // Get current user's email from replyTo (the original message's recipient)
      // We'll filter it out from CC after fetching account info
      return {
        to: toList,
        cc: ccList,
        bcc: []
      };
    } else if (type === 'forward') {
      // Forward: No recipients pre-filled
      return {
        to: [],
        cc: [],
        bcc: []
      };
    } else {
      return { to: [], cc: [], bcc: [] };
    }
  };

  const initialRecipients = initializeRecipients();

  // Form state
  const [to, setTo] = useState<Array<{ email: string; name?: string }>>(initialRecipients.to);
  const [cc, setCc] = useState<Array<{ email: string; name?: string }>>(initialRecipients.cc);
  const [bcc, setBcc] = useState<Array<{ email: string; name?: string }>>(initialRecipients.bcc);
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
  const [skipSignatureCheck, setSkipSignatureCheck] = useState(false); // Skip signature check on retry
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(accountId); // Account to send from
  const [showFromDropdown, setShowFromDropdown] = useState(false); // From account dropdown
  const dropdownRef = useRef<HTMLDivElement>(null); // Ref for dropdown click-away

  // Refs for debouncing
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const saveRetryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isAIUpdatingRef = useRef<boolean>(false); // Track AI updates to skip auto-save
  const isSavingRef = useRef<boolean>(false); // Track save operation to prevent send race

  // Text formatting state - REMOVED (they don't actually work)
  const [isHtmlMode, setIsHtmlMode] = useState(true); // HTML vs Plain text mode

  // Signature state
  const { signatures, loading: signaturesLoading, getApplicableSignature, renderSignature, loadSignatures } = useSignatures();
  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(null);
  const [useSignature, setUseSignature] = useState(true);
  const [showSignatureDropdown, setShowSignatureDropdown] = useState(false);
  const [showSignaturePrompt, setShowSignaturePrompt] = useState(false);
  const [hideSignaturePromptPreference, setHideSignaturePromptPreference] = useState(false);
  const [showSignatureEditor, setShowSignatureEditor] = useState(false);

  // ✅ FIX: Reset recipients when replyTo changes (when modal reopens with new email)
  useEffect(() => {
    if (isOpen && replyTo) {
      const newRecipients = initializeRecipients();
      console.log('[EmailCompose] Reinitializing recipients from replyTo:', {
        to: newRecipients.to,
        cc: newRecipients.cc,
        replyToData: replyTo
      });
      setTo(newRecipients.to);
      setCc(newRecipients.cc);
      setBcc(newRecipients.bcc);
      setSubject(replyTo.subject || '');
    }
  }, [isOpen, replyTo?.messageId]); // Re-run when modal opens or email changes

  // ✅ FIX: Show CC/BCC fields if they have initial recipients
  useEffect(() => {
    if (cc.length > 0) {
      setShowCc(true);
    }
    if (bcc.length > 0) {
      setShowBcc(true);
    }
  }, [cc, bcc]); // Update when recipients change

  // ✅ OUTLOOK BEHAVIOR: Exclude current user's email from reply-all CC list
  useEffect(() => {
    if (type === 'reply-all' && accountId && cc.length > 0) {
      const fetchAndFilterCC = async () => {
        try {
          const response = await fetch(`/api/accounts/${selectedAccountId || accountId}`);
          if (response.ok) {
            const data = await response.json();
            const currentUserEmail = data.account?.email?.toLowerCase();

            if (currentUserEmail) {
              // Filter out current user's email from CC list
              const filteredCC = cc.filter(
                recipient => recipient.email.toLowerCase() !== currentUserEmail
              );

              if (filteredCC.length !== cc.length) {
                console.log('[Reply-All] Filtered out current user email from CC:', currentUserEmail);
                setCc(filteredCC);
              }
            }
          }
        } catch (error) {
          console.error('[Reply-All] Failed to fetch account email:', error);
        }
      };

      fetchAndFilterCC();
    }
  }, [type, selectedAccountId, accountId]); // Only run when type or accountId changes

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
    console.log('[EmailCompose] State check:', { isOpen, signaturesLoading, body: body.length, isInitialized, useSignature });
  }, [signatures, isOpen, signaturesLoading, body, isInitialized, useSignature]);

  // Click-away listener for dropdown
  useEffect(() => {
    const handleClickAway = (event: MouseEvent) => {
      if (showFromDropdown && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowFromDropdown(false);
      }
    };

    if (showFromDropdown) {
      document.addEventListener('mousedown', handleClickAway);
      return () => document.removeEventListener('mousedown', handleClickAway);
    }
  }, [showFromDropdown]);

  // Auto-insert signature when compose opens
  // ✅ FIX: Wait for signatures to load before trying to insert
  useEffect(() => {
    // Debug all conditions
    console.log('[EmailCompose] Signature insert check:', {
      isOpen,
      useSignature,
      bodyEmpty: !body,
      bodyLength: body.length,
      isInitialized,
      signaturesLoading,
      signaturesCount: signatures.length,
    });

    if (isOpen && useSignature && !body && !isInitialized && !signaturesLoading && signatures.length > 0) {
      const applicableSignature = getApplicableSignature(type, accountId);
      console.log('[EmailCompose] Applicable signature:', applicableSignature?.name || 'NONE');

      if (applicableSignature) {
        setSelectedSignatureId(applicableSignature.id);

        // Render signature with template variables
        const renderedSignature = renderSignature(applicableSignature, {}, { emailAddress: to[0]?.email || '' });

        // Add 2 blank paragraphs with <br> at the top for typing space, then signature
        // Using <p><br></p> ensures they render as visible blank lines
        const blankLinesHtml = '<p><br></p><p><br></p>';
        setBody(blankLinesHtml + renderedSignature);
        setIsInitialized(true);
        console.log('[EmailCompose] ✅ Auto-inserted signature:', applicableSignature.name);
      } else {
        console.log('[EmailCompose] ❌ No applicable signature found');
      }
    }
  }, [isOpen, type, accountId, useSignature, body, isInitialized, signaturesLoading, signatures, getApplicableSignature, renderSignature, to]);

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
        const failedAttachments: string[] = [];

        for (const attachment of replyTo.attachments) {
          try {
            // Fetch the attachment from the v3 API with query parameters
            if (!selectedAccountId) continue; // Skip if no account ID
            const params = new URLSearchParams({
              accountId: selectedAccountId,
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
              failedAttachments.push(attachment.filename);
            }
          } catch (error) {
            console.error('[EmailCompose] Error downloading attachment:', attachment.filename, error);
            failedAttachments.push(attachment.filename);
          }
        }

        if (downloadedFiles.length > 0) {
          setAttachments(downloadedFiles);
          console.log('[EmailCompose] Loaded', downloadedFiles.length, 'attachments for forward');
        }

        // Show notification if some attachments failed
        if (failedAttachments.length > 0) {
          toast({
            title: 'Attachment Download Failed',
            description: `Failed to download ${failedAttachments.length} attachment(s): ${failedAttachments.join(', ')}`,
            variant: 'destructive',
          });
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

        // Format as quoted reply with proper blockquote semantic HTML
        quotedBody += '<blockquote style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 5px; color: #666; margin-top: 10px; margin-bottom: 10px;">';
        quotedBody += '<div style="font-weight: bold; margin-bottom: 10px;">------- Original Message -------</div>';
        quotedBody += `<div><strong>From:</strong> ${replyTo.to}</div>`;
        quotedBody += `<div><strong>Subject:</strong> ${replyTo.subject}</div>`;
        quotedBody += '<div><br/></div>';

        // Keep original HTML formatting
        if (replyTo.body) {
          quotedBody += `<div>${replyTo.body}</div>`;
        }

        quotedBody += '</blockquote>';
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

        // Format as forwarded message with proper blockquote semantic HTML
        quotedBody += '<blockquote style="border: 1px solid #ddd; padding: 15px; border-radius: 5px; background-color: #f9f9f9; margin-top: 10px; margin-bottom: 10px;">';
        quotedBody += '<div style="font-weight: bold; margin-bottom: 10px; color: #333;">---------- Forwarded message ---------</div>';
        quotedBody += `<div><strong>From:</strong> ${replyTo.to}</div>`;
        quotedBody += `<div><strong>Subject:</strong> ${replyTo.subject}</div>`;
        quotedBody += '<div><br/></div>';

        // Keep original HTML formatting
        if (replyTo.body) {
          quotedBody += `<div>${replyTo.body}</div>`;
        }

        quotedBody += '</blockquote>';
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
    // More robust email validation
    // Allows: letters, numbers, dots, hyphens, underscores, plus signs
    // Requires: @ symbol, domain with at least one dot
    // Prevents: spaces, leading/trailing dots, consecutive dots
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(email)) {
      return false;
    }

    // Additional checks
    const [localPart, domain] = email.split('@');

    // Check for consecutive dots
    if (localPart.includes('..') || domain.includes('..')) {
      return false;
    }

    // Check for leading/trailing dots in local part
    if (localPart.startsWith('.') || localPart.endsWith('.')) {
      return false;
    }

    // Check domain has at least 2 characters before TLD
    const domainParts = domain.split('.');
    if (domainParts[0].length < 2) {
      return false;
    }

    return true;
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
    setSkipSignatureCheck(false); // Reset skip flag
  };

  const handleSend = async (skipSignature: boolean = false) => {
    // Wait for any in-flight save to complete
    if (isSavingRef.current) {
      console.log('[Send] ⏳ Waiting for save to complete...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check again after waiting
      if (isSavingRef.current) {
        console.log('[Send] ⚠️ Save still in progress, waiting longer...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

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

    if (!selectedAccountId) {
      setValidationError('No email account selected. Please select an account first.');
      return;
    }

    // Debug: Log accountId being sent
    console.log('[EmailCompose] Account ID:', selectedAccountId, 'Type:', typeof selectedAccountId);

    // Check for signature - show prompt if no signatures exist and user hasn't hidden it
    // Skip this check if user already clicked "Continue without signature" (skipSignature param)
    console.log('[EmailCompose] Signature check:', {
      signaturesCount: signatures.length,
      hidePrompt: hideSignaturePromptPreference,
      type: type,
      skipSignature: skipSignature,
      showPrompt: signatures.length === 0 && !hideSignaturePromptPreference && type === 'compose' && !skipSignature
    });

    if (signatures.length === 0 && !hideSignaturePromptPreference && type === 'compose' && !skipSignature) {
      console.log('[EmailCompose] ✅ Showing signature prompt');
      setShowSignaturePrompt(true);
      return;
    }

    // Warn about empty subject with confirmation dialog
    if (!subject || subject.trim() === '') {
      const confirmed = await confirm({
        title: 'No Subject',
        message: 'This email has no subject line. Are you sure you want to send it?',
        confirmText: 'Send Anyway',
        cancelText: 'Cancel',
      });

      if (!confirmed) {
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

          try {
            // Add timeout wrapper (60 seconds max per attachment)
            const uploadPromise = fetch('/api/attachments/upload', {
              method: 'POST',
              body: formData,
            });

            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Upload timeout')), 60000)
            );

            const uploadResponse = await Promise.race([uploadPromise, timeoutPromise]) as Response;

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
              toast({
                title: 'Attachment Upload Failed',
                description: `Failed to upload ${file.name}. Continuing without this attachment.`,
                variant: 'destructive',
              });
            }
          } catch (error) {
            console.error('❌ Attachment upload error/timeout:', file.name, error);
            toast({
              title: 'Attachment Upload Error',
              description: `Failed to upload ${file.name} (timeout or error). Continuing without this attachment.`,
              variant: 'destructive',
            });
          }
        }

        console.log(`[Attach] Uploaded ${uploadedAttachments.length}/${attachments.length} attachment(s)`);
      }

      const response = await fetch('/api/nylas/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: selectedAccountId,
          to: to.map(r => r.email).join(', '),
          cc: cc.length > 0 ? cc.map(r => r.email).join(', ') : undefined,
          bcc: bcc.length > 0 ? bcc.map(r => r.email).join(', ') : undefined,
          subject,
          body,
          attachments: uploadedAttachments,
          replyToEmailId: replyTo?.messageId, // Provider message ID or database UUID
          draftId: currentDraftId, // Pass draft ID for deletion after send
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('[Email] Email sent successfully:', data.emailId);

        // Show success message
        toast({
          title: 'Email Sent',
          description: 'Your email has been sent successfully.',
        });

        // Reset form state before closing
        resetForm();
        onClose();

        // Trigger refresh of email list
        window.dispatchEvent(new CustomEvent('refreshEmails'));
      } else {
        console.error('❌ Failed to send email:', data.error);
        toast({
          title: 'Failed to Send Email',
          description: data.error || 'Unknown error',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('❌ Send error:', error);
      toast({
        title: 'Send Error',
        description: 'Failed to send email. Please check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveDraft = useCallback(async (silent = false) => {
    console.log('[Draft Save] Called with:', { silent, accountId: selectedAccountId, to: to.length, subject: subject.length, body: body.length });

    // Check if send is in progress
    if (isSending) {
      console.log('[Draft Save] ⏭️ Skipping auto-save - send in progress');
      return;
    }

    if (!selectedAccountId) {
      console.log('[Draft Save] ❌ No accountId, aborting');
      if (!silent) {
        toast({
          title: 'No Account Selected',
          description: 'Please select an email account first.',
          variant: 'destructive',
        });
      }
      return;
    }

    // Don't save drafts without actual text content
    // Strip HTML tags and check if there's real text (excluding just whitespace/blank lines)
    const strippedBody = body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

    if (to.length === 0 && !subject.trim() && !strippedBody) {
      console.log('[Draft Save] ❌ Empty draft (no to/subject/body text), skipping save');
      return;
    }

    console.log('[Draft Save] ✅ Validation passed, proceeding with save...');
    setIsSavingDraft(true);
    setSavingStatus('saving');
    isSavingRef.current = true; // Set saving flag

    try {
      if (!silent) {
        console.log('💾 Saving draft...');
        console.log('[Draft] Account ID being sent:', selectedAccountId, 'Type:', typeof selectedAccountId);
      }

      // Build request body
      const requestBody: any = {
        accountId: selectedAccountId,
        to: to.map(r => r.email).join(', ') || '', // Allow empty recipients
        cc: cc.length > 0 ? cc.map(r => r.email).join(', ') : undefined,
        bcc: bcc.length > 0 ? bcc.map(r => r.email).join(', ') : undefined,
        subject,
        body: body, // API expects 'body', not 'bodyText' or 'bodyHtml'
        attachments: [],
        replyToEmailId: replyTo?.messageId, // Provider message ID or database UUID
        replyType: type,
      };

      // Add draft ID if updating an existing draft
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

        // Trigger refresh to update draft folder count
        window.dispatchEvent(new CustomEvent('refreshEmails'));

        // Clear saved status after 2 seconds
        setTimeout(() => {
          setSavingStatus('idle');
        }, 2000);

        if (!silent) {
          toast({
            title: 'Draft Saved',
            description: 'Your draft has been saved successfully.',
          });
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
        if (!silent) {
          toast({
            title: 'Failed to Save Draft',
            description: data.error || 'Unknown error',
            variant: 'destructive',
          });
        }
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

      if (!silent) {
        toast({
          title: 'Draft Save Error',
          description: 'Failed to save draft. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSavingDraft(false);
      isSavingRef.current = false; // Clear saving flag
    }
  }, [selectedAccountId, to, cc, bcc, subject, body, replyTo, type, isSending, toast]);

  // Debounced auto-save with instant first save
  useEffect(() => {
    if (!isOpen || !isDirty || !selectedAccountId) return;

    // ✅ FIX: Skip auto-save if AI is updating the content
    if (isAIUpdatingRef.current) {
      console.log('[Draft] Skipping auto-save - AI is updating content');
      isAIUpdatingRef.current = false; // Reset flag
      return;
    }

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
  }, [isOpen, isDirty, selectedAccountId, to, cc, bcc, subject, body, isFirstChange, handleSaveDraft]);

  const handleAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const MAX_SIZE = 25 * 1024 * 1024; // 25MB per file
      const MAX_TOTAL = 100 * 1024 * 1024; // 100MB total

      // Check individual file sizes
      const oversized = files.filter(f => f.size > MAX_SIZE);
      if (oversized.length > 0) {
        const oversizedList = oversized.map(f => `${f.name} (${formatFileSize(f.size)})`).join(', ');
        toast({
          title: 'Files Too Large',
          description: `Some files exceed 25MB limit: ${oversizedList}`,
          variant: 'destructive',
        });
        return;
      }

      // Check total size
      const currentTotalSize = attachments.reduce((sum, f) => sum + f.size, 0);
      const newTotalSize = files.reduce((sum, f) => sum + f.size, 0);
      if (currentTotalSize + newTotalSize > MAX_TOTAL) {
        toast({
          title: 'Attachment Limit Exceeded',
          description: `Total attachments would exceed 100MB limit. Current: ${formatFileSize(currentTotalSize)}, Adding: ${formatFileSize(newTotalSize)}.`,
          variant: 'destructive',
        });
        return;
      }

      setAttachments([...attachments, ...files]);

      // Trigger immediate save when attachment is added (Outlook behavior)
      setIsDirty(true);
      setTimeout(() => {
        if (selectedAccountId) {
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
    if (isDirty && selectedAccountId) {
      const confirmed = await confirm({
        title: 'Discard Draft?',
        message: 'Do you want to save this draft or discard it?',
        confirmText: 'Save Draft',
        cancelText: 'Discard',
      });

      if (confirmed) {
        // Save draft before closing
        await handleSaveDraft(false);
      }
    }

    // Reset form and close
    resetForm();
    onClose();
  };

  // Handle backdrop click with confirmation
  const handleBackdropClick = async () => {
    if (isDirty) {
      const confirmed = await confirm({
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Save draft before closing?',
        confirmText: 'Save Draft',
        cancelText: 'Discard',
        variant: 'warning',
      });

      if (confirmed) {
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
  }, [isOpen, to, subject, body, selectedAccountId, attachments]);

  // Save draft before browser navigation/close
  useEffect(() => {
    if (!isOpen) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && selectedAccountId) {
        // Attempt to save draft using sendBeacon (works even after page unload starts)
        const draftData = {
          accountId: selectedAccountId,
          to: to.map(r => r.email).join(', '),
          cc: cc.length > 0 ? cc.map(r => r.email).join(', ') : undefined,
          bcc: bcc.length > 0 ? bcc.map(r => r.email).join(', ') : undefined,
          subject,
          body: body, // API expects 'body', not 'bodyText' or 'bodyHtml'
          attachments: [],
          replyToEmailId: replyTo?.messageId, // Provider message ID or database UUID
          replyType: type,
          draftId: currentDraftId, // Include draft ID for updates
        };

        // Use sendBeacon for reliable delivery during page unload
        const blob = new Blob([JSON.stringify(draftData)], { type: 'application/json' });
        navigator.sendBeacon('/api/nylas-v3/drafts', blob);

        // Show browser confirmation dialog
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isOpen, isDirty, selectedAccountId, to, cc, bcc, subject, body, replyTo, type]);

  const handleInsertLink = () => {
    setShowURLDialog(true);
  };

  // Signature prompt handlers
  const handleNeverShowSignaturePrompt = async () => {
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hideSignaturePrompt: true }),
      });

      if (response.ok) {
        setHideSignaturePromptPreference(true);
        console.log('[EmailCompose] Signature prompt hidden permanently');
      } else {
        console.error('[EmailCompose] Failed to save preference - response not ok');
      }
    } catch (error) {
      console.error('[EmailCompose] Failed to save preference:', error);
    }
  };

  const handleContinueWithoutSignature = () => {
    console.log('[EmailCompose] Continuing without signature - proceeding with send');
    setShowSignaturePrompt(false);
    // Call handleSend with skipSignature=true to bypass signature check
    handleSend(true);
  };

  // Handle saving a new signature from the badge
  const handleSaveNewSignature = async (data: SignatureFormData) => {
    try {
      const response = await fetch('/api/signatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          isDefault: true, // Make it default since it's their first signature
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save signature');
      }

      const result = await response.json();
      console.log('[EmailCompose] ✅ New signature created:', result.signature?.name);

      // Reload signatures
      await loadSignatures();

      // Close modal
      setShowSignatureEditor(false);

      // Insert the new signature into the body
      if (result.signature) {
        const renderedSignature = renderSignature(result.signature, {}, { emailAddress: to[0]?.email || '' });
        const blankLinesHtml = '<p><br></p><p><br></p>';

        // If body is empty or just blank lines, set with signature
        const strippedBody = body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
        if (!strippedBody) {
          setBody(blankLinesHtml + renderedSignature);
        } else {
          // Append signature to existing content
          setBody(body + blankLinesHtml + renderedSignature);
        }

        setSelectedSignatureId(result.signature.id);
        setUseSignature(true);
      }

      toast({
        title: 'Signature Created',
        description: 'Your signature has been created and added to this email.',
      });
    } catch (error) {
      console.error('Error saving signature:', error);
      throw error;
    }
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
            if (isDirty && selectedAccountId && !e.currentTarget.contains(e.relatedTarget as Node)) {
              console.log('[Draft] Focus lost - saving draft');
              handleSaveDraft(true);
            }
          }}
        >
        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b border-border bg-muted/30">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-xs">
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
          <div className="flex items-center gap-0.5">
            {!isMinimized && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsMinimized(true)}
                  title="Minimize"
                >
                  <Minimize2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
              </>
            )}
            {isMinimized && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsMinimized(false)}
                title="Restore"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleClose}
              title="Close"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Compose Form - Hidden when minimized */}
        {!isMinimized && (
          <>
            {/* Recipients */}
            <div className="p-2 space-y-1.5 border-b border-border">
              {/* From Field - Account Selector */}
              {accounts && accounts.length > 1 && (
                <div className="flex items-start gap-1.5">
                  <Label className="w-10 text-xs text-muted-foreground pt-1.5">From</Label>
                  <div className="flex-1 relative" ref={dropdownRef}>
                    <button
                      onClick={() => setShowFromDropdown(!showFromDropdown)}
                      className="flex items-center justify-between w-full px-2 py-1.5 text-xs border border-input rounded-md hover:bg-accent transition-colors"
                    >
                      <span className="truncate">
                        {selectedAccountId
                          ? accounts.find(a => a.id === selectedAccountId)?.emailAddress || 'Select account'
                          : 'Select account'}
                      </span>
                      <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
                    </button>
                    {showFromDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-card border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                        {accounts.map((account) => (
                          <button
                            key={account.id}
                            onClick={() => {
                              setSelectedAccountId(account.id);
                              setShowFromDropdown(false);
                            }}
                            className={cn(
                              'w-full text-left px-2 py-1.5 text-xs hover:bg-accent transition-colors',
                              account.id === selectedAccountId && 'bg-accent'
                            )}
                          >
                            <div className="font-medium">{account.emailAddress}</div>
                            {account.emailProvider && (
                              <div className="text-[10px] text-muted-foreground">{account.emailProvider}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-1.5">
                <Label className="w-10 text-xs text-muted-foreground pt-1.5">To</Label>
                <div className="flex-1">
                  <EmailAutocomplete
                    value={to}
                    onChange={setTo}
                    placeholder="Recipients"
                  />
                </div>
                <div className="flex gap-1.5 pt-1.5">
                  {!showCc && (
                    <button
                      onClick={() => setShowCc(true)}
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      Cc
                    </button>
                  )}
                  {!showBcc && (
                    <button
                      onClick={() => setShowBcc(true)}
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      Bcc
                    </button>
                  )}
                </div>
              </div>

              {showCc && (
                <div className="flex items-start gap-1.5">
                  <Label className="w-10 text-xs text-muted-foreground pt-1.5">Cc</Label>
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
                    className="h-5 w-5 mt-1.5"
                    onClick={() => {
                      setShowCc(false);
                      setCc([]);
                    }}
                  >
                    <X className="h-2.5 w-2.5" />
                  </Button>
                </div>
              )}

              {showBcc && (
                <div className="flex items-start gap-1.5">
                  <Label className="w-10 text-xs text-muted-foreground pt-1.5">Bcc</Label>
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
                    className="h-5 w-5 mt-1.5"
                    onClick={() => {
                      setShowBcc(false);
                      setBcc([]);
                    }}
                  >
                    <X className="h-2.5 w-2.5" />
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <Label className="w-10 text-xs text-muted-foreground">Subject</Label>
                <Input
                  type="text"
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="flex-1 h-7 text-xs border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-0.5 p-1.5 border-b border-border bg-muted/30 overflow-x-auto">
              {/* HTML/Plain Toggle */}
              <Button
                variant={isHtmlMode ? 'default' : 'outline'}
                size="sm"
                className="h-6 text-[10px] px-1.5"
                onClick={() => setIsHtmlMode(!isHtmlMode)}
                title="Toggle HTML/Plain Text"
              >
                {isHtmlMode ? 'HTML' : 'Plain'}
              </Button>
              <div className="w-px h-5 bg-border mx-0.5" />

              {/* Removed: Bold/Italic/Underline buttons (don't actually work without rich text editor) */}

              {/* Headings */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                title="Heading 1"
                onClick={() => handleInsertHeading(1)}
                disabled={!isHtmlMode}
              >
                <Heading1 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                title="Heading 2"
                onClick={() => handleInsertHeading(2)}
                disabled={!isHtmlMode}
              >
                <Heading2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                title="Heading 3"
                onClick={() => handleInsertHeading(3)}
                disabled={!isHtmlMode}
              >
                <Heading3 className="h-3 w-3" />
              </Button>

              <div className="w-px h-5 bg-border mx-0.5" />

              {/* List & Code */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                title="Bullet list"
                onClick={() => setBody(body + '\n• ')}
                disabled={!isHtmlMode}
              >
                <List className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                title="Code block"
                onClick={handleInsertCodeBlock}
                disabled={!isHtmlMode}
              >
                <Code className="h-3 w-3" />
              </Button>

              <div className="w-px h-5 bg-border mx-0.5" />

              {/* Link & Image */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                title="Insert link"
                onClick={handleInsertLink}
              >
                <Link2 className="h-3 w-3" />
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
                  className="h-6 w-6 cursor-pointer"
                  asChild
                >
                  <span>
                    <Image className="h-3 w-3" />
                  </span>
                </Button>
              </label>

              {/* Signature Controls */}
              {signatures.length > 0 ? (
                <>
                  <div className="w-px h-5 bg-border mx-0.5" />
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn('h-6 w-6', useSignature && 'bg-accent')}
                      onClick={handleSignatureToggle}
                      title={useSignature ? 'Remove signature' : 'Add signature'}
                    >
                      <PenTool className="h-3 w-3" />
                      {useSignature && (
                        <Check className="h-2 w-2 absolute top-0.5 right-0.5 text-primary" />
                      )}
                    </Button>
                  </div>
                  {signatures.length > 1 && (
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-[10px]"
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
              ) : !signaturesLoading && !hideSignaturePromptPreference && (
                <>
                  {/* Add Signature Badge - Shows when user has no signatures */}
                  <div className="w-px h-6 bg-border mx-1" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs gap-1.5 border-dashed border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
                    onClick={() => setShowSignatureEditor(true)}
                    title="Create your email signature"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Add Signature
                  </Button>
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

            {/* Inline Signature Badge - Shows below editor when user has no signatures */}
            {!signaturesLoading && signatures.length === 0 && !hideSignaturePromptPreference && (
              <div className="px-4 py-3 border-t border-dashed border-primary/30 bg-primary/5">
                <button
                  onClick={() => setShowSignatureEditor(true)}
                  className="flex items-center gap-3 w-full text-left group"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <PenTool className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      Add your email signature
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Make your emails more professional with a custom signature
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="h-3.5 w-3.5" />
                    Create
                  </div>
                </button>
              </div>
            )}

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
                onSubjectChange={(newSubject) => {
                  isAIUpdatingRef.current = true; // Set flag before AI updates
                  setSubject(newSubject);
                }}
                onBodyChange={(newBody) => {
                  isAIUpdatingRef.current = true; // Set flag before AI updates
                  setBody(newBody);
                }}
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
                <div className="px-2 pt-2">
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded flex items-start gap-1.5">
                    <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs text-red-800 dark:text-red-300 font-medium">
                        {validationError}
                      </p>
                    </div>
                    <button
                      onClick={() => setValidationError(null)}
                      className="text-red-500 hover:text-red-700 flex-shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-1.5">
                  {/* Send Button with Dropdown */}
                  <div className="relative">
                    <div className="flex">
                      <Button
                        onClick={() => handleSend()}
                        className="gap-1.5 rounded-r-none h-7 px-2 text-xs"
                        disabled={isSending || !selectedAccountId}
                      >
                        <Send className="h-3 w-3" />
                        {isSending ? 'Sending...' : 'Send'}
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          const dropdown = document.getElementById('send-dropdown');
                          if (dropdown) {
                            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                          }
                        }}
                        className="rounded-l-none border-l px-1.5 h-7"
                        disabled={isSending || !selectedAccountId}
                        title="More send options"
                      >
                        <span className="text-[10px]">▼</span>
                      </Button>
                    </div>
                    <div
                      id="send-dropdown"
                      className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[160px]"
                      style={{ display: 'none' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={async () => {
                          await handleSend();
                          // Archive the original email if this is a reply
                          if (replyTo && replyTo.messageId) {
                            try {
                              await fetch(`/api/nylas-v3/messages/${replyTo.messageId}/archive`, {
                                method: 'POST',
                              });
                            } catch (err) {
                              console.error('Failed to archive:', err);
                            }
                          }
                          document.getElementById('send-dropdown')!.style.display = 'none';
                        }}
                        className="w-full text-left px-2 py-1.5 text-xs hover:bg-accent transition-colors"
                        disabled={isSending}
                      >
                        Send & Archive
                      </button>
                      <button
                        onClick={async () => {
                          await handleSend();
                          // Delete the original email if this is a reply
                          if (replyTo && replyTo.messageId) {
                            try {
                              await fetch(`/api/nylas-v3/messages/${replyTo.messageId}`, {
                                method: 'DELETE',
                              });
                            } catch (err) {
                              console.error('Failed to delete:', err);
                            }
                          }
                          document.getElementById('send-dropdown')!.style.display = 'none';
                        }}
                        className="w-full text-left px-2 py-1.5 text-xs hover:bg-accent transition-colors border-t"
                        disabled={isSending}
                      >
                        Send & Delete
                      </button>
                    </div>
                  </div>
                <label>
                  <input
                    type="file"
                    multiple
                    onChange={handleAttachment}
                    className="hidden"
                  />
                  <Button variant="ghost" size="icon" className="cursor-pointer h-6 w-6" asChild>
                    <span>
                      <Paperclip className="h-3 w-3" />
                    </span>
                  </Button>
                </label>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSaveDraft(false)}
                  disabled={isSavingDraft || !selectedAccountId}
                  className="h-6 px-2 text-xs"
                >
                  {isSavingDraft ? 'Saving...' : 'Save Draft'}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClose} className="h-6 px-2 text-xs">
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

    {/* Signature Editor Modal - For creating new signature from badge */}
    <SignatureEditorModal
      isOpen={showSignatureEditor}
      onClose={() => setShowSignatureEditor(false)}
      onSave={handleSaveNewSignature}
      accounts={accounts || []}
    />

    {/* Confirm Dialog */}
    <Dialog />
    </>
  );
}


