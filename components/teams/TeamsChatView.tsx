/**
 * Teams Chat View Component
 * Displays messages in a Teams chat with compose functionality
 * Supports reactions, edit/delete, reply-to threading, and presence
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Send,
  Paperclip,
  MoreHorizontal,
  User,
  Users,
  Video,
  Loader2,
  Check,
  CheckCheck,
  AlertCircle,
  ExternalLink,
  Edit2,
  Trash2,
  Smile,
  Reply,
  X,
  Pin,
  BellOff,
  Bell,
  Circle,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn, getInitials, generateAvatarColor } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { sanitizeEmailHTML } from '@/lib/utils/email-html';

// Teams supported reactions
const TEAMS_REACTIONS = [
  { emoji: '👍', type: 'like', label: 'Like' },
  { emoji: '❤️', type: 'heart', label: 'Love' },
  { emoji: '😂', type: 'laugh', label: 'Laugh' },
  { emoji: '😮', type: 'surprised', label: 'Surprised' },
  { emoji: '😢', type: 'sad', label: 'Sad' },
  { emoji: '😠', type: 'angry', label: 'Angry' },
];

interface TeamsMessage {
  id: string;
  teamsMessageId: string;
  senderId: string;
  senderName: string | null;
  senderEmail: string | null;
  body: string | null;
  bodyType: string;
  messageType: string;
  importance: string;
  hasAttachments: boolean;
  attachments: Array<{
    id: string;
    name: string;
    contentType: string;
    contentUrl?: string;
  }> | null;
  mentions: Array<{
    id: number;
    mentionText: string;
    mentioned: { user?: { id: string; displayName: string } };
  }> | null;
  reactions: Array<{
    reactionType: string;
    user: { id: string; displayName: string };
    createdAt: string;
  }> | null;
  isRead: boolean;
  isDeleted: boolean;
  isEdited: boolean;
  teamsCreatedAt: string | null;
  replyToMessageId: string | null;
}

interface TeamsChat {
  id: string;
  teamsChatId: string;
  chatType: 'oneOnOne' | 'group' | 'meeting';
  topic: string | null;
  participants: Array<{
    id: string;
    displayName: string;
    email?: string;
  }> | null;
  otherParticipantName: string | null;
  otherParticipantEmail: string | null;
  webUrl: string | null;
  isPinned?: boolean;
  isMuted?: boolean;
}

interface PresenceStatus {
  id: string;
  availability: string;
  activity: string;
}

interface TeamsChatViewProps {
  chat: TeamsChat;
  onBack: () => void;
  currentUserId?: string;
  teamsAccountId?: string;
}

export function TeamsChatView({ chat, onBack, currentUserId, teamsAccountId }: TeamsChatViewProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<TeamsMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [replyingTo, setReplyingTo] = useState<TeamsMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<TeamsMessage | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteConfirmMessage, setDeleteConfirmMessage] = useState<TeamsMessage | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [presence, setPresence] = useState<Record<string, PresenceStatus>>({});
  const [chatSettings, setChatSettings] = useState({ isPinned: chat.isPinned, isMuted: chat.isMuted });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    markAsRead();
    fetchPresence();
    fetchChatSettings();
  }, [chat.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/teams/chats/${chat.id}/messages`);
      const data = await response.json();

      if (data.messages) {
        setMessages(data.messages);
        setHasMore(data.pagination?.hasMore || false);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await fetch(`/api/teams/chats/${chat.id}/messages`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAsRead' }),
      });
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  };

  const fetchPresence = async () => {
    if (!chat.participants?.length) return;

    try {
      const userIds = chat.participants.map(p => p.id).filter(Boolean);
      if (!userIds.length) return;

      const response = await fetch(
        `/api/teams/presence?userIds=${userIds.join(',')}&accountId=${teamsAccountId || ''}`
      );
      const data = await response.json();

      if (data.presence) {
        const presenceMap: Record<string, PresenceStatus> = {};
        data.presence.forEach((p: PresenceStatus) => {
          presenceMap[p.id] = p;
        });
        setPresence(presenceMap);
      }
    } catch (error) {
      console.error('Error fetching presence:', error);
    }
  };

  const fetchChatSettings = async () => {
    try {
      const response = await fetch(`/api/teams/chats/${chat.id}/settings`);
      const data = await response.json();
      if (data.settings) {
        setChatSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching chat settings:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const response = await fetch(`/api/teams/chats/${chat.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newMessage,
          contentType: 'html',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNewMessage('');
        setReplyingTo(null);
        await fetchMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    if (e.key === 'Escape') {
      setReplyingTo(null);
    }
  };

  const handleAddReaction = async (messageId: string, reactionType: string) => {
    try {
      const response = await fetch(
        `/api/teams/chats/${chat.id}/messages/${messageId}/reactions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reactionType }),
        }
      );

      if (response.ok) {
        await fetchMessages();
      } else {
        toast({ title: 'Error', description: 'Failed to add reaction', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
      toast({ title: 'Error', description: 'Failed to add reaction', variant: 'destructive' });
    }
  };

  const handleRemoveReaction = async (messageId: string, reactionType: string) => {
    try {
      const response = await fetch(
        `/api/teams/chats/${chat.id}/messages/${messageId}/reactions?reactionType=${reactionType}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        await fetchMessages();
      } else {
        toast({ title: 'Error', description: 'Failed to remove reaction', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error removing reaction:', error);
      toast({ title: 'Error', description: 'Failed to remove reaction', variant: 'destructive' });
    }
  };

  const handleEditMessage = async () => {
    if (!editingMessage || !editContent.trim()) return;

    try {
      const response = await fetch(`/api/teams/chats/${chat.id}/messages`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'editMessage',
          messageId: editingMessage.id,
          content: editContent,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setEditingMessage(null);
        setEditContent('');
        await fetchMessages();
        toast({ title: 'Success', description: 'Message edited' });
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to edit message', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error editing message:', error);
      toast({ title: 'Error', description: 'Failed to edit message', variant: 'destructive' });
    }
  };

  const handleDeleteMessage = async () => {
    if (!deleteConfirmMessage) return;

    try {
      const response = await fetch(
        `/api/teams/chats/${chat.id}/messages?messageId=${deleteConfirmMessage.id}`,
        { method: 'DELETE' }
      );

      const data = await response.json();
      if (data.success) {
        setDeleteConfirmMessage(null);
        await fetchMessages();
        toast({ title: 'Success', description: 'Message deleted' });
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to delete message', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({ title: 'Error', description: 'Failed to delete message', variant: 'destructive' });
    }
  };

  const handleTogglePin = async () => {
    try {
      const response = await fetch(`/api/teams/chats/${chat.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pin', value: !chatSettings.isPinned }),
      });

      if (response.ok) {
        setChatSettings(prev => ({ ...prev, isPinned: !prev.isPinned }));
        toast({ title: 'Success', description: chatSettings.isPinned ? 'Chat unpinned' : 'Chat pinned' });
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast({ title: 'Error', description: 'Failed to update chat', variant: 'destructive' });
    }
  };

  const handleToggleMute = async () => {
    try {
      const response = await fetch(`/api/teams/chats/${chat.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mute', value: !chatSettings.isMuted }),
      });

      if (response.ok) {
        setChatSettings(prev => ({ ...prev, isMuted: !prev.isMuted }));
        toast({ title: 'Success', description: chatSettings.isMuted ? 'Notifications enabled' : 'Chat muted' });
      }
    } catch (error) {
      console.error('Error toggling mute:', error);
      toast({ title: 'Error', description: 'Failed to update chat', variant: 'destructive' });
    }
  };

  const getChatDisplayName = (): string => {
    if (chat.chatType === 'oneOnOne') {
      return chat.otherParticipantName || 'Unknown';
    }
    if (chat.topic) {
      return chat.topic;
    }
    if (chat.participants && chat.participants.length > 0) {
      return chat.participants.map(p => p.displayName).join(', ');
    }
    return chat.chatType === 'meeting' ? 'Meeting Chat' : 'Group Chat';
  };

  const getChatIcon = () => {
    switch (chat.chatType) {
      case 'oneOnOne':
        return <User className="h-5 w-5" />;
      case 'group':
        return <Users className="h-5 w-5" />;
      case 'meeting':
        return <Video className="h-5 w-5" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  const getPresenceColor = (availability: string) => {
    switch (availability?.toLowerCase()) {
      case 'available':
        return 'bg-green-500';
      case 'busy':
      case 'donotdisturb':
        return 'bg-red-500';
      case 'away':
      case 'berightback':
        return 'bg-yellow-500';
      case 'offline':
      default:
        return 'bg-gray-400';
    }
  };

  const formatMessageDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    }
    return format(date, 'MMMM d, yyyy');
  };

  const formatMessageTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    return format(new Date(dateStr), 'h:mm a');
  };

  const getReplyToMessage = (replyToId: string | null) => {
    if (!replyToId) return null;
    return messages.find(m => m.teamsMessageId === replyToId);
  };

  const renderMessageContent = (message: TeamsMessage) => {
    if (message.isDeleted) {
      return (
        <span className="italic text-muted-foreground">This message has been deleted</span>
      );
    }

    if (message.bodyType === 'html' && message.body) {
      return (
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizeEmailHTML(message.body, true) }}
        />
      );
    }

    return <p className="whitespace-pre-wrap">{message.body}</p>;
  };

  const groupMessagesByDate = (messages: TeamsMessage[]) => {
    const groups: { date: string; messages: TeamsMessage[] }[] = [];
    let currentDate = '';

    messages.forEach(message => {
      const messageDate = message.teamsCreatedAt
        ? formatMessageDate(message.teamsCreatedAt)
        : '';

      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({ date: messageDate, messages: [message] });
      } else {
        groups[groups.length - 1].messages.push(message);
      }
    });

    return groups;
  };

  const groupReactions = (reactions: TeamsMessage['reactions']) => {
    if (!reactions) return [];
    const grouped: Record<string, { count: number; users: string[] }> = {};
    reactions.forEach(r => {
      if (!grouped[r.reactionType]) {
        grouped[r.reactionType] = { count: 0, users: [] };
      }
      grouped[r.reactionType].count++;
      grouped[r.reactionType].users.push(r.user.displayName);
    });
    return Object.entries(grouped).map(([type, data]) => ({
      type,
      emoji: TEAMS_REACTIONS.find(r => r.type === type)?.emoji || type,
      ...data,
    }));
  };

  const displayName = getChatDisplayName();
  const initials = getInitials(displayName);
  const avatarColor = generateAvatarColor(displayName);

  // Get other participant's presence for 1:1 chats
  const otherParticipant = chat.participants?.find(p => p.id !== currentUserId);
  const otherPresence = otherParticipant ? presence[otherParticipant.id] : null;

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="lg:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="relative">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
              style={{ backgroundColor: avatarColor }}
            >
              {chat.chatType === 'oneOnOne' ? initials : getChatIcon()}
            </div>
            {/* Presence indicator for 1:1 chats */}
            {chat.chatType === 'oneOnOne' && otherPresence && (
              <div
                className={cn(
                  'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background',
                  getPresenceColor(otherPresence.availability)
                )}
                title={otherPresence.availability}
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold truncate">{displayName}</h2>
              {chatSettings.isPinned && <Pin className="h-3 w-3 text-muted-foreground" />}
              {chatSettings.isMuted && <BellOff className="h-3 w-3 text-muted-foreground" />}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {chat.chatType === 'oneOnOne'
                ? otherPresence?.availability || chat.otherParticipantEmail
                : `${chat.participants?.length || 0} members`}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleTogglePin}>
                <Pin className="h-4 w-4 mr-2" />
                {chatSettings.isPinned ? 'Unpin chat' : 'Pin chat'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleMute}>
                {chatSettings.isMuted ? (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    Enable notifications
                  </>
                ) : (
                  <>
                    <BellOff className="h-4 w-4 mr-2" />
                    Mute chat
                  </>
                )}
              </DropdownMenuItem>
              {chat.webUrl && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => window.open(chat.webUrl!, '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in Teams
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-medium mb-4"
                style={{ backgroundColor: avatarColor }}
              >
                {chat.chatType === 'oneOnOne' ? initials : getChatIcon()}
              </div>
              <h3 className="font-medium mb-1">{displayName}</h3>
              <p className="text-sm text-muted-foreground">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            groupMessagesByDate(messages).map((group, groupIndex) => (
              <div key={groupIndex}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-4">
                  <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                    {group.date}
                  </div>
                </div>

                {/* Messages in this date group */}
                {group.messages.map((message) => {
                  const isOwnMessage = message.senderId === currentUserId;
                  const senderInitials = getInitials(message.senderName || 'U');
                  const senderColor = generateAvatarColor(message.senderName || 'User');
                  const replyToMessage = getReplyToMessage(message.replyToMessageId);
                  const groupedReactions = groupReactions(message.reactions);
                  const isHovered = hoveredMessageId === message.id;

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        'flex gap-3 mb-3 group relative',
                        isOwnMessage && 'flex-row-reverse'
                      )}
                      onMouseEnter={() => setHoveredMessageId(message.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                    >
                      {/* Avatar */}
                      {(chat.chatType !== 'oneOnOne' || !isOwnMessage) && (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                          style={{ backgroundColor: senderColor }}
                        >
                          {senderInitials}
                        </div>
                      )}

                      {/* Message bubble */}
                      <div className="max-w-[70%]">
                        {/* Reply preview */}
                        {replyToMessage && (
                          <div
                            className={cn(
                              'text-xs px-3 py-1 mb-1 rounded-t-lg border-l-2 border-[#6264A7]',
                              isOwnMessage ? 'bg-[#6264A7]/20 text-white/80' : 'bg-muted/50'
                            )}
                          >
                            <span className="font-medium">{replyToMessage.senderName}</span>
                            <p className="truncate opacity-70">
                              {replyToMessage.body?.substring(0, 50)}...
                            </p>
                          </div>
                        )}

                        <div
                          className={cn(
                            'rounded-lg px-4 py-2',
                            isOwnMessage
                              ? 'bg-[#6264A7] text-white'
                              : 'bg-muted',
                            message.importance === 'high' && 'border-l-4 border-orange-500',
                            message.importance === 'urgent' && 'border-l-4 border-red-500'
                          )}
                        >
                          {/* Sender name (for group chats) */}
                          {chat.chatType !== 'oneOnOne' && !isOwnMessage && (
                            <p className="text-xs font-medium mb-1 opacity-75">
                              {message.senderName}
                            </p>
                          )}

                          {/* Importance indicator */}
                          {message.importance !== 'normal' && (
                            <div className="flex items-center gap-1 text-xs mb-1">
                              <AlertCircle className="h-3 w-3" />
                              <span className="capitalize">{message.importance}</span>
                            </div>
                          )}

                          {/* Message content */}
                          <div
                            className={cn(
                              'text-sm',
                              isOwnMessage && '[&_a]:text-white [&_a]:underline'
                            )}
                          >
                            {renderMessageContent(message)}
                          </div>

                          {/* Attachments */}
                          {message.hasAttachments && message.attachments && (
                            <div className="mt-2 space-y-1">
                              {message.attachments.map(attachment => (
                                <div
                                  key={attachment.id}
                                  className={cn(
                                    'flex items-center gap-2 text-xs p-2 rounded',
                                    isOwnMessage ? 'bg-white/10' : 'bg-background'
                                  )}
                                >
                                  <Paperclip className="h-3 w-3" />
                                  <span className="truncate">{attachment.name}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Reactions */}
                          {groupedReactions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {groupedReactions.map((reaction) => (
                                <Tooltip key={reaction.type}>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() =>
                                        handleRemoveReaction(message.id, reaction.type)
                                      }
                                      className={cn(
                                        'text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1 hover:opacity-80 transition-opacity',
                                        isOwnMessage
                                          ? 'bg-white/20'
                                          : 'bg-muted-foreground/20'
                                      )}
                                    >
                                      <span>{reaction.emoji}</span>
                                      {reaction.count > 1 && (
                                        <span>{reaction.count}</span>
                                      )}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {reaction.users.join(', ')}
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                            </div>
                          )}

                          {/* Time and status */}
                          <div
                            className={cn(
                              'flex items-center gap-1 mt-1 text-xs',
                              isOwnMessage
                                ? 'text-white/70 justify-end'
                                : 'text-muted-foreground'
                            )}
                          >
                            {message.isEdited && <span>(edited)</span>}
                            <span>{formatMessageTime(message.teamsCreatedAt)}</span>
                          </div>
                        </div>

                        {/* Message actions (hover menu) */}
                        {isHovered && !message.isDeleted && (
                          <div
                            className={cn(
                              'absolute top-0 flex items-center gap-1 bg-background border rounded-lg shadow-sm p-1',
                              isOwnMessage ? 'left-0' : 'right-0'
                            )}
                          >
                            {/* Reaction picker */}
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <Smile className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-2" align="start">
                                <div className="flex gap-1">
                                  {TEAMS_REACTIONS.map(reaction => (
                                    <button
                                      key={reaction.type}
                                      onClick={() => {
                                        handleAddReaction(message.id, reaction.type);
                                      }}
                                      className="text-xl hover:scale-125 transition-transform p-1"
                                      title={reaction.label}
                                    >
                                      {reaction.emoji}
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>

                            {/* Reply */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => setReplyingTo(message)}
                                >
                                  <Reply className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Reply</TooltipContent>
                            </Tooltip>

                            {/* Edit (own messages only) */}
                            {isOwnMessage && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => {
                                      setEditingMessage(message);
                                      setEditContent(message.body || '');
                                    }}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>
                            )}

                            {/* Delete (own messages only) */}
                            {isOwnMessage && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => setDeleteConfirmMessage(message)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply preview */}
        {replyingTo && (
          <div className="px-4 py-2 border-t bg-muted/50 flex items-center gap-2">
            <Reply className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">Replying to {replyingTo.senderName}</p>
              <p className="text-xs text-muted-foreground truncate">{replyingTo.body}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setReplyingTo(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Compose */}
        <div className="p-4 border-t">
          <div className="flex items-end gap-2">
            <Textarea
              placeholder="Type a message..."
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[40px] max-h-[120px] resize-none"
              rows={1}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSending}
              className="bg-[#6264A7] hover:bg-[#6264A7]/90"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Edit Message Dialog */}
        <Dialog open={!!editingMessage} onOpenChange={() => setEditingMessage(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit message</DialogTitle>
              <DialogDescription>Make changes to your message.</DialogDescription>
            </DialogHeader>
            <Textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="min-h-[100px]"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingMessage(null)}>
                Cancel
              </Button>
              <Button onClick={handleEditMessage} disabled={!editContent.trim()}>
                Save changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirmMessage} onOpenChange={() => setDeleteConfirmMessage(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete message?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. The message will be deleted for everyone in the chat.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmMessage(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteMessage}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
