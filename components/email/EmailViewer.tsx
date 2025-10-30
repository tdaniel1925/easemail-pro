'use client';

import { formatDate, formatFileSize, getInitials, generateAvatarColor } from '@/lib/utils';
import { X, Reply, ReplyAll, Forward, MoreVertical, Download, Star, Archive, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Email {
  id: string;
  from: { email: string; name: string };
  subject: string;
  body: string;
  receivedAt: Date;
  isStarred: boolean;
  hasAttachments: boolean;
  attachments: Array<{
    id: string;
    filename: string;
    size: number;
    contentType: string;
  }>;
}

interface EmailViewerProps {
  email: Email;
  onClose: () => void;
  onTogglePanel: () => void;
}

export function EmailViewer({ email, onClose, onTogglePanel }: EmailViewerProps) {
  const avatarColor = generateAvatarColor(email.from.email);

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{email.subject}</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Archive className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Sender Info */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0"
              style={{ backgroundColor: avatarColor }}
            >
              {getInitials(email.from.name)}
            </div>
            <div>
              <p className="font-medium">{email.from.name}</p>
              <p className="text-sm text-muted-foreground">{email.from.email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(email.receivedAt)}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Reply className="h-4 w-4 mr-2" />
              Reply
            </Button>
            <Button variant="outline" size="sm">
              <ReplyAll className="h-4 w-4 mr-2" />
              Reply All
            </Button>
            <Button variant="outline" size="sm">
              <Forward className="h-4 w-4 mr-2" />
              Forward
            </Button>
          </div>
        </div>
      </div>

      {/* Email Body */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div className="whitespace-pre-wrap">{email.body}</div>
        </div>

        {/* Attachments */}
        {email.hasAttachments && email.attachments.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-sm font-medium mb-3">
              Attachments ({email.attachments.length})
            </h3>
            <div className="space-y-2">
              {email.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                      {attachment.contentType.includes('pdf') ? (
                        <span className="text-red-500 font-semibold text-xs">PDF</span>
                      ) : attachment.contentType.includes('sheet') ? (
                        <span className="text-green-500 font-semibold text-xs">XLS</span>
                      ) : (
                        <span className="text-blue-500 font-semibold text-xs">FILE</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{attachment.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.size)}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reply Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Button className="flex-1">
            <Reply className="h-4 w-4 mr-2" />
            Reply
          </Button>
          <Button variant="outline" className="flex-1">
            <ReplyAll className="h-4 w-4 mr-2" />
            Reply All
          </Button>
          <Button variant="outline" className="flex-1">
            <Forward className="h-4 w-4 mr-2" />
            Forward
          </Button>
        </div>
      </div>
    </div>
  );
}


