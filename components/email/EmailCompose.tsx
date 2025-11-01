'use client';

import { useState, useEffect, Suspense, lazy } from 'react';
import { X, Minimize2, Maximize2, Paperclip, Send, Image, Link2, Bold, Italic, Underline, List, PenTool, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useSignatures } from '@/lib/hooks/useSignatures';
import { SignatureService } from '@/lib/signatures/signature-service';

// Lazy load the AI toolbar to prevent SSR issues
const UnifiedAIToolbar = lazy(() => 
  import('@/components/ai/UnifiedAIToolbar').then(mod => ({ default: mod.UnifiedAIToolbar }))
);

interface EmailComposeProps {
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
}

export default function EmailCompose({ isOpen, onClose, replyTo, type = 'compose', accountId }: EmailComposeProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  
  // Form state
  const [to, setTo] = useState(replyTo?.to || '');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(replyTo?.subject || '');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Text formatting state
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  // Signature state
  const { signatures, getApplicableSignature, renderSignature } = useSignatures();
  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(null);
  const [useSignature, setUseSignature] = useState(true);
  const [showSignatureDropdown, setShowSignatureDropdown] = useState(false);

  // Auto-insert signature when compose opens (for new compose only)
  useEffect(() => {
    if (isOpen && useSignature && !body && type === 'compose' && !replyTo) {
      const applicableSignature = getApplicableSignature(type, accountId);
      if (applicableSignature) {
        setSelectedSignatureId(applicableSignature.id);
        
        // Render signature with template variables
        const renderedSignature = renderSignature(applicableSignature, {}, { emailAddress: to });
        
        // Add 2 blank lines at the top for typing space, then signature
        setBody('\n\n' + renderedSignature);
        setIsInitialized(true);
      }
    }
  }, [isOpen, type, accountId, useSignature]);

  // Initialize body with quoted content for reply/forward
  useEffect(() => {
    if (isOpen && !isInitialized && replyTo && type !== 'compose') {
      let quotedBody = '\n\n'; // Start with 2 blank lines for typing
      
      // Helper function to strip HTML and convert to plain text
      const stripHtml = (html: string) => {
        if (!html) return '';
        
        // Create a temporary div to parse HTML
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        
        // Remove script and style tags completely (including their content)
        const scripts = tmp.querySelectorAll('script, style');
        scripts.forEach(script => script.remove());
        
        // Get text content and preserve line breaks
        let text = tmp.textContent || tmp.innerText || '';
        
        // Clean up excessive whitespace
        text = text.replace(/\n\s*\n\s*\n/g, '\n\n'); // Max 2 consecutive newlines
        text = text.trim();
        
        return text;
      };
      
      // Get plain text version of the original message
      let originalMessageText = '';
      if (replyTo.body) {
        // Check if it's HTML or plain text
        if (replyTo.body.includes('<html') || replyTo.body.includes('<body') || replyTo.body.includes('<div')) {
          originalMessageText = stripHtml(replyTo.body);
        } else {
          originalMessageText = replyTo.body;
        }
      }
      
      if (type === 'reply' || type === 'replyAll') {
        // Add signature before quoted content for replies
        if (useSignature) {
          const applicableSignature = getApplicableSignature(type, accountId);
          if (applicableSignature) {
            setSelectedSignatureId(applicableSignature.id);
            const renderedSignature = renderSignature(applicableSignature, {}, { emailAddress: to });
            quotedBody += renderedSignature + '\n\n';
          }
        }
        
        // Format as quoted reply
        quotedBody += '------- Original Message -------\n';
        quotedBody += `From: ${replyTo.to}\n`;
        quotedBody += `Subject: ${replyTo.subject}\n\n`;
        
        if (originalMessageText) {
          // Add '>' before each line for traditional email quoting
          const quotedLines = originalMessageText
            .split('\n')
            .map(line => `> ${line}`)
            .join('\n');
          quotedBody += quotedLines;
        }
      } else if (type === 'forward') {
        // Format as forwarded message
        quotedBody += '---------- Forwarded message ---------\n';
        quotedBody += `From: ${replyTo.to}\n`;
        quotedBody += `Subject: ${replyTo.subject}\n\n`;
        
        if (originalMessageText) {
          quotedBody += originalMessageText;
        }
        
        // Add signature at bottom for forwards
        if (useSignature) {
          const applicableSignature = getApplicableSignature(type, accountId);
          if (applicableSignature) {
            setSelectedSignatureId(applicableSignature.id);
            const renderedSignature = renderSignature(applicableSignature, {}, { emailAddress: to });
            quotedBody += '\n\n' + renderedSignature;
          }
        }
      }
      
      setBody(quotedBody);
      setIsInitialized(true);
    }
  }, [isOpen, replyTo, type, isInitialized, useSignature]);

  const insertSignature = (signature: any) => {
    if (!signature) return;

    // Render signature with template variables
    const renderedSignature = renderSignature(signature, {}, { emailAddress: to });

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
        const renderedSignature = renderSignature(currentSignature, {}, { emailAddress: to });
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
        const renderedOld = renderSignature(oldSignature, {}, { emailAddress: to });
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

  if (!isOpen) return null;

  const handleSend = async () => {
    // Validation
    if (!to || to.trim() === '') {
      alert('Please enter at least one recipient');
      return;
    }

    if (!accountId) {
      alert('No email account selected. Please select an account first.');
      return;
    }

    if (!subject || subject.trim() === '') {
      if (!confirm('Send email without a subject?')) {
        return;
      }
    }

    setIsSending(true);

    try {
      console.log('📤 Sending email...');

      const response = await fetch('/api/nylas/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          to,
          cc: cc || undefined,
          bcc: bcc || undefined,
          subject,
          body,
          attachments: [], // TODO: Implement attachment upload
          replyToEmailId: replyTo?.messageId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Email sent successfully:', data.emailId);
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-[100] animate-in slide-in-from-top';
        successMessage.textContent = '✓ Email sent successfully!';
        document.body.appendChild(successMessage);
        setTimeout(() => successMessage.remove(), 3000);
        
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

  const handleSaveDraft = async () => {
    if (!accountId) {
      alert('No email account selected. Please select an account first.');
      return;
    }

    if (!to || to.trim() === '') {
      alert('Please enter at least one recipient before saving draft');
      return;
    }

    setIsSavingDraft(true);

    try {
      console.log('💾 Saving draft...');
      
      const response = await fetch('/api/nylas/drafts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          to,
          cc,
          bcc,
          subject,
          bodyText: body,
          bodyHtml: body, // Could be enhanced with HTML conversion
          attachments: [],
          replyToEmailId: replyTo?.messageId,
          replyType: type,
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Draft saved:', data.draftId);
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-[100] animate-in slide-in-from-top';
        successMessage.textContent = '✓ Draft saved successfully!';
        document.body.appendChild(successMessage);
        setTimeout(() => successMessage.remove(), 3000);
      } else {
        alert(`Failed to save draft: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Draft save error:', error);
      alert('Failed to save draft. Please try again.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setAttachments([...attachments, ...files]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleVoiceMessageAttachment = (file: File, duration: number) => {
    console.log('Attaching voice message:', file.name, duration);
    setAttachments([...attachments, file]);
  };

  const handleInsertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      setBody(body + ` ${url}`);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      {/* Centered modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={cn(
            'bg-card border border-border shadow-2xl rounded-lg flex flex-col pointer-events-auto transition-all duration-300',
            isMinimized && 'h-14 w-96',
            !isMinimized && !isFullscreen && 'h-[600px] w-[700px]',
            isFullscreen && 'h-[calc(100vh-2rem)] w-[calc(100vw-2rem)]'
          )}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">
              {replyTo ? `Reply to ${replyTo.to}` : 'New Message'}
            </h3>
            {isMinimized && to && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                To: {to}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!isMinimized && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
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
              <div className="flex items-center gap-2">
                <Label className="w-12 text-sm text-muted-foreground">To</Label>
                <Input
                  type="email"
                  placeholder="Recipients"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <div className="flex gap-2">
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
                <div className="flex items-center gap-2">
                  <Label className="w-12 text-sm text-muted-foreground">Cc</Label>
                  <Input
                    type="email"
                    placeholder="Carbon copy"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setShowCc(false);
                      setCc('');
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {showBcc && (
                <div className="flex items-center gap-2">
                  <Label className="w-12 text-sm text-muted-foreground">Bcc</Label>
                  <Input
                    type="email"
                    placeholder="Blind carbon copy"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setShowBcc(false);
                      setBcc('');
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
            <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30">
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-8 w-8', isBold && 'bg-accent')}
                onClick={() => setIsBold(!isBold)}
                title="Bold (Ctrl+B)"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-8 w-8', isItalic && 'bg-accent')}
                onClick={() => setIsItalic(!isItalic)}
                title="Italic (Ctrl+I)"
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-8 w-8', isUnderline && 'bg-accent')}
                onClick={() => setIsUnderline(!isUnderline)}
                title="Underline (Ctrl+U)"
              >
                <Underline className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-1" />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                title="Bullet list"
                onClick={() => setBody(body + '\n• ')}
              >
                <List className="h-4 w-4" />
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

            {/* Email Body */}
            <div className="flex-1 p-4 overflow-y-auto">
              <textarea
                placeholder="Write your message..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className={cn(
                  'w-full h-full resize-none bg-transparent border-0 focus:outline-none text-sm',
                  isBold && 'font-bold',
                  isItalic && 'italic',
                  isUnderline && 'underline'
                )}
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
                recipientEmail={to}
                userTier="free"
                onAttachVoiceMessage={handleVoiceMessageAttachment}
              />
            </Suspense>

            {/* Footer */}
            <div className="flex items-center justify-between p-3 border-t border-border">
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
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft || !accountId}
                >
                  {isSavingDraft ? 'Saving...' : 'Save Draft'}
                </Button>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Discard
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
}


