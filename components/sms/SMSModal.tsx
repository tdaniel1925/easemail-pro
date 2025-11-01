/**
 * SMS Modal Component
 * Beautiful, enterprise-grade SMS sending interface
 */

'use client';

import React, { useState, useEffect } from 'react';
import { X, Send, MessageSquare, Loader2, AlertCircle, CheckCircle2, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calculateSMSSegments } from '@/lib/sms/character-counter';
import { formatPhoneByCountry } from '@/lib/utils/phone';

interface SMSModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: {
    id: string;
    name: string;
    phoneNumber: string;
  } | null;
  onSuccess?: () => void;
}

export function SMSModal({ isOpen, onClose, contact, onSuccess }: SMSModalProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setMessage('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen || !contact) return null;

  const segments = calculateSMSSegments(message);
  const formattedPhone = formatPhoneByCountry(contact.phoneNumber);
  const maxSegments = 10;
  const isOverLimit = segments.messageCount > maxSegments;
  const costEstimate = (segments.messageCount * 0.05).toFixed(2);

  const handleSend = async () => {
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    if (isOverLimit) {
      setError(`Message exceeds ${maxSegments} segment limit`);
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          toPhone: contact.phoneNumber,
          message: message.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 2000);
      } else {
        setError(data.error || 'Failed to send SMS');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Send SMS
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Phone className="h-3.5 w-3.5" />
                <span>{formattedPhone}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contact Info */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
          <div className="text-sm">
            <span className="text-gray-600 dark:text-gray-400">To: </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {contact.name}
            </span>
          </div>
        </div>

        {/* Message Input */}
        <div className="p-6 space-y-4">
          <div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className={`w-full h-32 px-4 py-3 bg-white dark:bg-gray-800 border ${
                isOverLimit
                  ? 'border-red-300 dark:border-red-700'
                  : 'border-gray-300 dark:border-gray-700'
              } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
              disabled={isSending || success}
            />
            
            {/* Character Counter */}
            <div className="flex items-center justify-between mt-2 text-xs">
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <span>
                  {segments.characterCount} / {segments.perSegment * segments.messageCount} chars
                </span>
                <span className={isOverLimit ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                  {segments.messageCount} segment{segments.messageCount !== 1 ? 's' : ''}
                </span>
                <span className="text-gray-400">
                  {segments.encoding === 'gsm7' ? 'GSM-7' : 'Unicode'}
                </span>
              </div>
              <div className="font-medium text-gray-900 dark:text-white">
                ${costEstimate}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-300">
                SMS sent successfully!
              </p>
            </div>
          )}

          {/* Info Note */}
          {!error && !success && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Messages over 160 characters are split into multiple SMS. Emojis count as 2-4 characters.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || success || !message.trim() || isOverLimit}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Sent
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send SMS
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

