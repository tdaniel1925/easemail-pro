/**
 * Teams Chat View Component
 * Displays messages in a Teams chat with compose functionality
 */

'use client';

import { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, getInitials, generateAvatarColor } from '@/lib/utils';

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
}

interface TeamsChatViewProps {
  chat: TeamsChat;
  onBack: () => void;
  currentUserId?: string;
}

export function TeamsChatView({ chat, onBack, currentUserId }: TeamsChatViewProps) {
  const [messages, setMessages] = useState<TeamsMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    markAsRead();
  }, [chat.id]);

  useEffect(() => {
    // Scroll to bottom when messages change
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
        // Refresh messages to get the sent message
        await fetchMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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

  const renderMessageContent = (message: TeamsMessage) => {
    if (message.isDeleted) {
      return (
        <span className="italic text-muted-foreground">This message has been deleted</span>
      );
    }

    // Handle HTML content
    if (message.bodyType === 'html' && message.body) {
      return (
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: message.body }}
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

  const displayName = getChatDisplayName();
  const initials = getInitials(displayName);
  const avatarColor = generateAvatarColor(displayName);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="lg:hidden">
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
          style={{ backgroundColor: avatarColor }}
        >
          {chat.chatType === 'oneOnOne' ? initials : getChatIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">{displayName}</h2>
          <p className="text-sm text-muted-foreground truncate">
            {chat.chatType === 'oneOnOne'
              ? chat.otherParticipantEmail
              : `${chat.participants?.length || 0} members`}
          </p>
        </div>

        {chat.webUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(chat.webUrl!, '_blank')}
            className="flex items-center gap-1"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="hidden sm:inline">Open in Teams</span>
          </Button>
        )}
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
              {group.messages.map((message, messageIndex) => {
                const isOwnMessage = message.senderId === currentUserId;
                const senderInitials = getInitials(message.senderName || 'U');
                const senderColor = generateAvatarColor(message.senderName || 'User');

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3 mb-3",
                      isOwnMessage && "flex-row-reverse"
                    )}
                  >
                    {/* Avatar (only show for other users in group/meeting chats) */}
                    {(chat.chatType !== 'oneOnOne' || !isOwnMessage) && (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                        style={{ backgroundColor: senderColor }}
                      >
                        {senderInitials}
                      </div>
                    )}

                    {/* Message bubble */}
                    <div
                      className={cn(
                        "max-w-[70%] rounded-lg px-4 py-2",
                        isOwnMessage
                          ? "bg-[#6264A7] text-white"
                          : "bg-muted"
                      )}
                    >
                      {/* Sender name (for group chats) */}
                      {chat.chatType !== 'oneOnOne' && !isOwnMessage && (
                        <p className="text-xs font-medium mb-1 opacity-75">
                          {message.senderName}
                        </p>
                      )}

                      {/* Message content */}
                      <div className={cn(
                        "text-sm",
                        isOwnMessage && "[&_a]:text-white [&_a]:underline"
                      )}>
                        {renderMessageContent(message)}
                      </div>

                      {/* Attachments */}
                      {message.hasAttachments && message.attachments && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map(attachment => (
                            <div
                              key={attachment.id}
                              className={cn(
                                "flex items-center gap-2 text-xs p-2 rounded",
                                isOwnMessage ? "bg-white/10" : "bg-background"
                              )}
                            >
                              <Paperclip className="h-3 w-3" />
                              <span className="truncate">{attachment.name}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reactions */}
                      {message.reactions && message.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {message.reactions.map((reaction, i) => (
                            <span
                              key={i}
                              className={cn(
                                "text-xs px-1.5 py-0.5 rounded-full",
                                isOwnMessage ? "bg-white/20" : "bg-muted-foreground/20"
                              )}
                              title={reaction.user.displayName}
                            >
                              {reaction.reactionType}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Time and status */}
                      <div className={cn(
                        "flex items-center gap-1 mt-1 text-xs",
                        isOwnMessage ? "text-white/70 justify-end" : "text-muted-foreground"
                      )}>
                        {message.isEdited && <span>(edited)</span>}
                        <span>{formatMessageTime(message.teamsCreatedAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Compose */}
      <div className="p-4 border-t">
        <div className="flex items-end gap-2">
          <Textarea
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
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
    </div>
  );
}
