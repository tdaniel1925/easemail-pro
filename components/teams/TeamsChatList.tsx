/**
 * Teams Chat List Component
 * Displays list of Teams chats with preview and unread indicators
 */

'use client';

import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Users,
  Video,
  User,
  Loader2,
  RefreshCw,
  Pin,
  BellOff,
  Archive,
  Search,
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn, getInitials, generateAvatarColor } from '@/lib/utils';

interface TeamsChat {
  id: string;
  teamsChatId: string;
  chatType: 'oneOnOne' | 'group' | 'meeting';
  topic: string | null;
  webUrl: string | null;
  participants: Array<{
    id: string;
    displayName: string;
    email?: string;
  }> | null;
  otherParticipantName: string | null;
  otherParticipantEmail: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastMessageSenderName: string | null;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  isArchived: boolean;
  accountEmail: string;
  accountDisplayName: string | null;
}

interface TeamsChatListProps {
  onSelectChat: (chat: TeamsChat) => void;
  selectedChatId?: string;
}

export function TeamsChatList({ onSelectChat, selectedChatId }: TeamsChatListProps) {
  const [chats, setChats] = useState<TeamsChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const response = await fetch('/api/teams/chats');
      const data = await response.json();

      if (data.chats) {
        setChats(data.chats);
      }
    } catch (error) {
      console.error('Error fetching Teams chats:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/teams/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (data.success) {
        await fetchChats(true);
      }
    } catch (error) {
      console.error('Error syncing Teams:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatMessageTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM d');
    }
  };

  const getChatDisplayName = (chat: TeamsChat): string => {
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

  const getChatIcon = (chatType: string) => {
    switch (chatType) {
      case 'oneOnOne':
        return <User className="h-4 w-4" />;
      case 'group':
        return <Users className="h-4 w-4" />;
      case 'meeting':
        return <Video className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const displayName = getChatDisplayName(chat).toLowerCase();
    return displayName.includes(query) ||
      chat.lastMessagePreview?.toLowerCase().includes(query);
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">Loading Teams chats...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#6264A7]" />
            Teams Chats
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSync}
              disabled={isSyncing}
              title="Sync Teams"
            >
              <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-1">
              {searchQuery ? 'No matching chats' : 'No Teams chats'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? 'Try a different search term'
                : 'Connect your Teams account to see chats'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredChats.map((chat) => {
              const displayName = getChatDisplayName(chat);
              const initials = getInitials(displayName);
              const avatarColor = generateAvatarColor(displayName);

              return (
                <button
                  key={chat.id}
                  onClick={() => onSelectChat(chat)}
                  className={cn(
                    "w-full p-3 flex items-start gap-3 hover:bg-muted/50 transition-colors text-left",
                    selectedChatId === chat.id && "bg-muted"
                  )}
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-medium"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {chat.chatType === 'oneOnOne' ? initials : getChatIcon(chat.chatType)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{displayName}</span>
                        {chat.isPinned && <Pin className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                        {chat.isMuted && <BellOff className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatMessageTime(chat.lastMessageAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-sm text-muted-foreground truncate">
                        {chat.lastMessageSenderName && (
                          <span className="font-medium">{chat.lastMessageSenderName}: </span>
                        )}
                        {chat.lastMessagePreview || 'No messages yet'}
                      </p>
                      {chat.unreadCount > 0 && (
                        <Badge variant="default" className="bg-[#6264A7] text-white text-xs px-1.5 py-0.5 min-w-[20px] text-center">
                          {chat.unreadCount}
                        </Badge>
                      )}
                    </div>

                    {/* Chat type indicator */}
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-muted-foreground capitalize">
                        {chat.chatType === 'oneOnOne' ? '1:1' : chat.chatType}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {chat.accountEmail}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
