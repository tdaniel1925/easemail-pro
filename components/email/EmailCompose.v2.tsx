'use client';

/**
 * EmailCompose V2 Wrapper
 *
 * Wraps the new Composer V2 to match the old EmailCompose interface
 * This allows us to swap composers without changing all call sites
 */

import { useEffect } from 'react';
import { ComposerWindow } from '@/components/composer-v2/ComposerWindow';
import { useComposerStore } from '@/lib/composer/store';

interface EmailComposeProps {
  isOpen: boolean;
  onClose: () => void;
  replyTo?: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    messageId: string;
    body?: string;
    attachments?: Array<{
      id: string;
      filename: string;
      url: string;
    }>;
  };
  composeType?: 'compose' | 'reply' | 'reply-all' | 'forward';
  aiReplyText?: string | null;
  draft?: {
    id: string;
    toRecipients: Array<{ email: string; name?: string }>;
    cc?: Array<{ email: string; name?: string }>;
    bcc?: Array<{ email: string; name?: string }>;
    subject: string;
    bodyText: string;
    bodyHtml: string;
    attachments?: any[];
  };
  selectedDbAccountId?: string;
}

export default function EmailCompose({
  isOpen,
  onClose,
  replyTo,
  composeType = 'compose',
  aiReplyText,
  draft,
  selectedDbAccountId,
}: EmailComposeProps) {
  const { openComposer, closeComposer, setBody, setSubject, addRecipient, accountId: storeAccountId } = useComposerStore();

  // Sync external isOpen state with store
  useEffect(() => {
    if (isOpen && !useComposerStore.getState().isOpen) {
      // Build reply context if provided
      const replyContext = replyTo ? {
        to: replyTo.to,
        cc: replyTo.cc,
        bcc: replyTo.bcc,
        subject: replyTo.subject,
        messageId: replyTo.messageId,
        body: replyTo.body,
        // Don't pass attachments for now - type mismatch (old format vs new)
        // Attachments in replies need to be re-downloaded from the original message
      } : undefined;

      // Open composer with the right mode
      openComposer(composeType, replyContext, selectedDbAccountId);

      // If draft provided, populate fields
      if (draft) {
        draft.toRecipients.forEach(r => addRecipient('to', r));
        draft.cc?.forEach(r => addRecipient('cc', r));
        draft.bcc?.forEach(r => addRecipient('bcc', r));
        setSubject(draft.subject);
        setBody(draft.bodyHtml, draft.bodyText);
      }

      // If AI reply text provided, set it as body
      if (aiReplyText) {
        setBody(`<p>${aiReplyText}</p>`, aiReplyText);
      }
    } else if (!isOpen && useComposerStore.getState().isOpen) {
      closeComposer();
    }
  }, [isOpen, composeType, replyTo, draft, aiReplyText, selectedDbAccountId]);

  // Sync store close with external onClose
  useEffect(() => {
    const unsubscribe = useComposerStore.subscribe((state) => {
      if (!state.isOpen && isOpen) {
        onClose();
      }
    });

    return unsubscribe;
  }, [isOpen, onClose]);

  return <ComposerWindow />;
}
