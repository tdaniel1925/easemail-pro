/**
 * Complete Email Composer with All AI Features
 * 
 * Integration example showing how to use:
 * - AI Write
 * - AI Remix
 * - Dictate
 * - Voice Message
 */

'use client';

import { useState, useRef } from 'react';
import { Send, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UnifiedAIToolbar } from '@/components/ai/UnifiedAIToolbar';
import { useDictationUsage } from '@/lib/ai/dictation-usage';
import { formatFileSize, formatDuration } from '@/lib/ai/voice-message-service';

export function CompleteEmailComposer() {
  // Email state
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<Array<{
    file: File;
    name: string;
    size: number;
    type: 'file' | 'voice';
    duration?: number;
  }>>([]);

  // UI state
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get user tier for dictation
  const { tier } = useDictationUsage();

  // Handle voice message attachment
  const handleVoiceAttachment = (file: File, duration: number) => {
    setAttachments(prev => [
      ...prev,
      {
        file,
        name: file.name,
        size: file.size,
        type: 'voice',
        duration,
      },
    ]);
  };

  // Handle file attachments
  const handleFileAttachment = (files: FileList | null) => {
    if (!files) return;

    const newAttachments = Array.from(files).map(file => ({
      file,
      name: file.name,
      size: file.size,
      type: 'file' as const,
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Send email
  const handleSend = async () => {
    if (!to || !subject || !body) {
      alert('Please fill in all fields');
      return;
    }

    setIsSending(true);
    try {
      // TODO: Implement actual email sending
      console.log('Sending email:', { to, subject, body, attachments });
      
      // Simulate sending
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Clear form
      setTo('');
      setSubject('');
      setBody('');
      setAttachments([]);
      
      alert('Email sent successfully!');
    } catch (error) {
      console.error('Failed to send email:', error);
      alert('Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        {/* Header */}
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-xl font-bold">Compose Email</h2>
          <p className="text-sm text-gray-600">
            Use AI to write, remix, dictate, or record voice messages
          </p>
        </div>

        {/* Email Fields */}
        <div className="p-6 space-y-4">
          {/* To */}
          <div>
            <label className="block text-sm font-medium mb-2">To</label>
            <Input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium mb-2">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium mb-2">Message</label>
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Type your message or use AI features below..."
            />
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Attachments</label>
              <div className="space-y-2">
                {attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {attachment.type === 'voice' ? '🎙️' : '📎'}
                      </span>
                      <div>
                        <div className="font-medium text-sm">{attachment.name}</div>
                        <div className="text-xs text-gray-600">
                          {formatFileSize(attachment.size)}
                          {attachment.duration && ` • ${formatDuration(attachment.duration)}`}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Toolbar */}
        <UnifiedAIToolbar
          subject={subject}
          body={body}
          onSubjectChange={setSubject}
          onBodyChange={setBody}
          recipientEmail={to}
          userTier={tier}
          onAttachVoiceMessage={handleVoiceAttachment}
        />

        {/* Footer Actions */}
        <div className="border-t border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Regular File Attachment */}
            <input
              type="file"
              multiple
              onChange={(e) => handleFileAttachment(e.target.files)}
              className="hidden"
              id="file-input"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Paperclip className="w-4 h-4 mr-2" />
              Attach Files
            </Button>
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={isSending || !to || !subject || !body}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSending ? 'Sending...' : 'Send Email'}
          </Button>
        </div>
      </div>

      {/* Feature Info */}
      <div className="mt-6 grid grid-cols-4 gap-4 text-center text-sm">
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl mb-2">✨</div>
          <div className="font-medium">AI Write</div>
          <div className="text-xs text-gray-600">Generate emails</div>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl mb-2">🎨</div>
          <div className="font-medium">AI Remix</div>
          <div className="text-xs text-gray-600">Transform drafts</div>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="text-2xl mb-2">🎤</div>
          <div className="font-medium">Dictate</div>
          <div className="text-xs text-gray-600">Speech-to-text</div>
        </div>
        <div className="p-4 bg-orange-50 rounded-lg">
          <div className="text-2xl mb-2">🎙️</div>
          <div className="font-medium">Voice Message</div>
          <div className="text-xs text-gray-600">Record audio</div>
        </div>
      </div>
    </div>
  );
}

