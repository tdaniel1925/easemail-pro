'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Send,
  X,
  Paperclip,
  Image,
  Smile,
  AlignLeft,
  Loader2,
} from 'lucide-react';

interface EmailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  replyTo?: {
    email: string;
    subject: string;
    messageId: string;
  };
  accountId: string;
  mode?: 'compose' | 'reply' | 'replyAll' | 'forward';
}

export default function EmailComposer({
  isOpen,
  onClose,
  replyTo,
  accountId,
  mode = 'compose',
}: EmailComposerProps) {
  const [to, setTo] = useState(replyTo?.email || '');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(
    replyTo?.subject
      ? mode === 'forward'
        ? `Fwd: ${replyTo.subject}`
        : `Re: ${replyTo.subject}`
      : ''
  );
  const [body, setBody] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  const handleSend = async () => {
    if (!to || !subject || !body) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/nylas/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          to: to.split(',').map(email => ({ email: email.trim() })),
          cc: cc ? cc.split(',').map(email => ({ email: email.trim() })) : undefined,
          bcc: bcc ? bcc.split(',').map(email => ({ email: email.trim() })) : undefined,
          subject,
          body,
          replyToMessageId: replyTo?.messageId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        onClose();
        // Reset form
        setTo('');
        setCc('');
        setBcc('');
        setSubject('');
        setBody('');
        setAttachments([]);
      } else {
        alert(data.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Send error:', error);
      alert('Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === 'compose' && 'New Message'}
            {mode === 'reply' && 'Reply'}
            {mode === 'replyAll' && 'Reply All'}
            {mode === 'forward' && 'Forward'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* To */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="to">To</Label>
              <div className="flex gap-2">
                {!showCc && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCc(true)}
                  >
                    Cc
                  </Button>
                )}
                {!showBcc && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBcc(true)}
                  >
                    Bcc
                  </Button>
                )}
              </div>
            </div>
            <Input
              id="to"
              type="email"
              placeholder="recipient@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
            />
          </div>

          {/* Cc */}
          {showCc && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="cc">Cc</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCc(false);
                    setCc('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Input
                id="cc"
                type="email"
                placeholder="cc@example.com"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
              />
            </div>
          )}

          {/* Bcc */}
          {showBcc && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="bcc">Bcc</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowBcc(false);
                    setBcc('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Input
                id="bcc"
                type="email"
                placeholder="bcc@example.com"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
              />
            </div>
          )}

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              type="text"
              placeholder="Email subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              placeholder="Write your message..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="resize-none"
              required
            />
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <Label>Attachments</Label>
              <div className="space-y-1">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                  >
                    <span className="text-sm truncate">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          {/* Formatting Tools */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" title="Attach file">
              <label htmlFor="file-upload" className="cursor-pointer">
                <Paperclip className="h-4 w-4" />
              </label>
              <input
                id="file-upload"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </Button>
            <Button variant="ghost" size="icon" title="Insert image" disabled>
              <Image className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Insert emoji" disabled>
              <Smile className="h-4 w-4" />
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSending}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={isSending}>
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
