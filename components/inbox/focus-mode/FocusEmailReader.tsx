/**
 * FocusEmailReader Component
 * Beautiful expanded email card for Focus Mode
 */

'use client';

import { useState } from 'react';
import { X, Reply, ReplyAll, Forward, Archive, Trash2, Star, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { sanitizeEmailHTML } from '@/lib/utils/email-html';

interface FocusEmailReaderProps {
  email: any;
  onClose: () => void;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
}

export function FocusEmailReader({
  email,
  onClose,
  onReply,
  onReplyAll,
  onForward,
  onArchive,
  onDelete,
}: FocusEmailReaderProps) {
  const [isStarred, setIsStarred] = useState(email.starred || false);

  // Extract sender info
  const senderInfo = (() => {
    if (Array.isArray(email.from) && email.from.length > 0) {
      const sender = email.from[0];
      return {
        name: sender.name || sender.email || 'Unknown Sender',
        email: sender.email || '',
      };
    }
    return { name: 'Unknown Sender', email: '' };
  })();

  // Format timestamp
  const formatTimestamp = () => {
    try {
      const timestamp = email.date;
      if (!timestamp) return 'Unknown';
      const date = new Date(timestamp * 1000);
      if (isNaN(date.getTime())) return 'Unknown';
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Unknown';
    }
  };

  const timeAgo = formatTimestamp();

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-8 animate-in">
      {/* Glassmorphic expanded card */}
      <div className="glass-card w-full max-w-5xl h-full max-h-[90vh] relative">
        {/* Glassmorphic background */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl border border-white/20 shadow-2xl" />

        {/* Close button - top right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-black/60 backdrop-blur-md hover:bg-black/80 border border-white/10 transition-all"
          title="Close (Esc)"
        >
          <X className="h-4 w-4 text-white" />
        </button>

        {/* Action bar - bottom center */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10">
            <button
              onClick={onReply}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Reply (R)"
            >
              <Reply className="h-4 w-4 text-white" />
            </button>
            <button
              onClick={onReplyAll}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Reply All"
            >
              <ReplyAll className="h-4 w-4 text-white" />
            </button>
            <button
              onClick={onForward}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Forward"
            >
              <Forward className="h-4 w-4 text-white" />
            </button>
            <div className="w-px h-6 bg-white/20 mx-1" />
            <button
              onClick={onArchive}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Archive (A)"
            >
              <Archive className="h-4 w-4 text-white" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        {/* Inner content card */}
        <div className="absolute inset-6 rounded-2xl bg-gradient-to-br from-neutral-900/98 to-neutral-950/98 overflow-hidden border border-white/10">
          <div className="h-full flex flex-col">
            {/* Email content with scroll */}
            <div className="flex-1 overflow-y-auto pt-8 px-12 pb-20">
              {/* Subject */}
              <h1 className="text-3xl font-bold text-white mb-6 leading-tight">
                {email.subject}
              </h1>

              {/* Sender info */}
              <div className="flex items-start justify-between mb-8 pb-6 border-b border-white/10">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-semibold text-xl flex-shrink-0">
                    {senderInfo.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Sender details */}
                  <div>
                    <div className="text-white font-semibold text-lg">
                      {senderInfo.name}
                    </div>
                    <div className="text-neutral-400 text-sm">
                      {senderInfo.email}
                    </div>
                    <div className="text-neutral-500 text-xs mt-1">
                      {timeAgo}
                    </div>
                  </div>
                </div>

                {/* Star button */}
                <button
                  onClick={() => setIsStarred(!isStarred)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    isStarred
                      ? "text-amber-400 bg-amber-500/20"
                      : "text-neutral-400 hover:text-amber-400 hover:bg-neutral-800"
                  )}
                >
                  <Star className={cn("h-5 w-5", isStarred && "fill-current")} />
                </button>
              </div>

              {/* Email body */}
              <div className="prose prose-invert prose-lg max-w-none">
                <div
                  className="text-neutral-200 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitizeEmailHTML(email.body || email.snippet || 'No content available', true) }}
                />
              </div>

              {/* Attachments */}
              {email.attachments && email.attachments.length > 0 && (
                <div className="mt-8 pt-8 border-t border-white/10">
                  <h3 className="text-white font-semibold mb-4">
                    Attachments ({email.attachments.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {email.attachments.map((attachment: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/10"
                      >
                        <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary text-xs font-bold">
                            {attachment.filename?.split('.').pop()?.toUpperCase() || 'FILE'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm truncate">
                            {attachment.filename || 'Unnamed file'}
                          </div>
                          <div className="text-neutral-500 text-xs">
                            {attachment.size ? `${Math.round(attachment.size / 1024)} KB` : 'Unknown size'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
