'use client';

import { useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  ContextMenuShortcut,
} from '@/components/ui/context-menu';
import {
  Reply,
  ReplyAll,
  Forward,
  Archive,
  Trash2,
  Mail,
  MailOpen,
  Star,
  Tag,
  FolderInput,
  Clock,
  Printer,
  Download,
  Ban,
  BellOff,
  Link2Off,
  Copy,
  ExternalLink,
} from 'lucide-react';

export interface EmailContextMenuProps {
  children: React.ReactNode;
  email: {
    id: string;
    from?: string;
    fromName?: string;
    fromEmail?: string;
    subject?: string;
    isRead?: boolean;
    isStarred?: boolean;
    starred?: boolean;
    threadId?: string;
  };
  accountId: string;
  folders?: Array<{ id: string; name: string }>;
  onAction?: (action: string, data?: any) => void;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onMarkRead?: () => void;
  onMarkUnread?: () => void;
  onStar?: () => void;
  onUnstar?: () => void;
  onSnooze?: () => void;
  onMoveToFolder?: (folderId: string) => void;
  onAddLabel?: () => void;
  onBlockSender?: () => void;
  onUnsubscribe?: () => void;
  onMuteThread?: () => void;
  onPrint?: () => void;
  onDownloadEml?: () => void;
}

export function EmailContextMenu({
  children,
  email,
  accountId,
  folders = [],
  onAction,
  onReply,
  onReplyAll,
  onForward,
  onArchive,
  onDelete,
  onMarkRead,
  onMarkUnread,
  onStar,
  onUnstar,
  onSnooze,
  onMoveToFolder,
  onAddLabel,
  onBlockSender,
  onUnsubscribe,
  onMuteThread,
  onPrint,
  onDownloadEml,
}: EmailContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Helper to determine if email is starred (handle both property names)
  const isStarred = email.isStarred ?? email.starred ?? false;
  const isRead = email.isRead ?? false;

  const handleAction = (action: string, data?: any) => {
    onAction?.(action, data);
    setIsOpen(false);
  };

  return (
    <ContextMenu onOpenChange={setIsOpen}>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        {/* Reply Actions */}
        <ContextMenuItem onClick={onReply}>
          <Reply className="mr-2 h-4 w-4" />
          Reply
          <ContextMenuShortcut>R</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={onReplyAll}>
          <ReplyAll className="mr-2 h-4 w-4" />
          Reply All
          <ContextMenuShortcut>A</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={onForward}>
          <Forward className="mr-2 h-4 w-4" />
          Forward
          <ContextMenuShortcut>F</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Read/Unread */}
        <ContextMenuItem onClick={() => {
          if (isRead) {
            onMarkUnread?.() ?? handleAction('markUnread');
          } else {
            onMarkRead?.() ?? handleAction('markRead');
          }
        }}>
          {isRead ? (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Mark as Unread
            </>
          ) : (
            <>
              <MailOpen className="mr-2 h-4 w-4" />
              Mark as Read
            </>
          )}
          <ContextMenuShortcut>U</ContextMenuShortcut>
        </ContextMenuItem>

        {/* Star */}
        <ContextMenuItem onClick={() => {
          if (isStarred) {
            onUnstar?.() ?? handleAction('unstar');
          } else {
            onStar?.() ?? handleAction('star');
          }
        }}>
          <Star className={`mr-2 h-4 w-4 ${isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          {isStarred ? 'Remove Star' : 'Add Star'}
          <ContextMenuShortcut>S</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Snooze */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Clock className="mr-2 h-4 w-4" />
            Snooze
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuItem onClick={() => handleAction('snooze', { time: 'laterToday' })}>
              Later Today
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleAction('snooze', { time: 'tomorrow' })}>
              Tomorrow
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleAction('snooze', { time: 'thisWeekend' })}>
              This Weekend
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleAction('snooze', { time: 'nextWeek' })}>
              Next Week
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => handleAction('snooze', { time: 'custom' })}>
              Pick Date & Time...
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        {/* Labels */}
        <ContextMenuItem onClick={() => handleAction('openLabels')}>
          <Tag className="mr-2 h-4 w-4" />
          Labels
          <ContextMenuShortcut>L</ContextMenuShortcut>
        </ContextMenuItem>

        {/* Move to Folder */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <FolderInput className="mr-2 h-4 w-4" />
            Move to
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            {folders.length > 0 ? (
              folders.map((folder) => (
                <ContextMenuItem
                  key={folder.id}
                  onClick={() => handleAction('moveTo', { folderId: folder.id, folderName: folder.name })}
                >
                  {folder.name}
                </ContextMenuItem>
              ))
            ) : (
              <>
                <ContextMenuItem onClick={() => handleAction('moveTo', { folderName: 'archive' })}>
                  Archive
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleAction('moveTo', { folderName: 'spam' })}>
                  Spam
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleAction('moveTo', { folderName: 'trash' })}>
                  Trash
                </ContextMenuItem>
              </>
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />

        {/* Archive & Delete */}
        <ContextMenuItem onClick={() => onArchive?.() ?? handleAction('archive')}>
          <Archive className="mr-2 h-4 w-4" />
          Archive
          <ContextMenuShortcut>E</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onDelete?.() ?? handleAction('delete')} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
          <ContextMenuShortcut>#</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Mute Conversation */}
        {email.threadId && (
          <ContextMenuItem onClick={() => onMuteThread?.() ?? handleAction('muteConversation')}>
            <BellOff className="mr-2 h-4 w-4" />
            Mute Conversation
            <ContextMenuShortcut>M</ContextMenuShortcut>
          </ContextMenuItem>
        )}

        {/* Block Sender */}
        <ContextMenuItem onClick={() => onBlockSender?.() ?? handleAction('blockSender')}>
          <Ban className="mr-2 h-4 w-4" />
          Block Sender
        </ContextMenuItem>

        {/* Unsubscribe */}
        <ContextMenuItem onClick={() => onUnsubscribe?.() ?? handleAction('unsubscribe')}>
          <Link2Off className="mr-2 h-4 w-4" />
          Unsubscribe
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Print */}
        <ContextMenuItem onClick={() => onPrint?.() ?? handleAction('print')}>
          <Printer className="mr-2 h-4 w-4" />
          Print
          <ContextMenuShortcut>P</ContextMenuShortcut>
        </ContextMenuItem>

        {/* Download as .eml */}
        <ContextMenuItem onClick={() => onDownloadEml?.() ?? handleAction('downloadEml')}>
          <Download className="mr-2 h-4 w-4" />
          Download as .eml
        </ContextMenuItem>

        {/* Copy Link */}
        <ContextMenuItem onClick={() => handleAction('copyLink')}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Link to Email
        </ContextMenuItem>

        {/* Open in New Tab */}
        <ContextMenuItem onClick={() => handleAction('openInNewTab')}>
          <ExternalLink className="mr-2 h-4 w-4" />
          Open in New Tab
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
