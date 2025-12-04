'use client';

/**
 * MS Teams Panel Component
 *
 * Main panel for MS Teams integration - designed to look like the real MS Teams app.
 * Shows teams, channels, chats, and allows messaging without leaving EaseMail.
 */

import { useState, useEffect, useCallback } from 'react';
import { useMSTeams, MSTeam, MSChannel, MSChat, MSMessage } from '@/lib/hooks/useMSTeams';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Users,
  MessageSquare,
  Video,
  ChevronRight,
  ChevronDown,
  Send,
  RefreshCw,
  Link as LinkIcon,
  Circle,
  Loader2,
  Hash,
  Lock,
  Calendar,
  MoreHorizontal,
  Phone,
  Paperclip,
  Smile,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';

// MS Teams Logo SVG - Purple/Blue like real Teams
function TeamsLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.625 6.75H14.25V4.5C14.25 3.67157 14.9216 3 15.75 3H19.125C19.9534 3 20.625 3.67157 20.625 4.5V6.75Z" fill="#5059C9"/>
      <path d="M14.25 6.75H3.375C2.54657 6.75 1.875 7.42157 1.875 8.25V18.75C1.875 19.5784 2.54657 20.25 3.375 20.25H14.25C15.0784 20.25 15.75 19.5784 15.75 18.75V8.25C15.75 7.42157 15.0784 6.75 14.25 6.75Z" fill="#7B83EB"/>
      <circle cx="17.625" cy="9" r="2.25" fill="#5059C9"/>
      <path d="M22.125 11.25H17.625C16.7966 11.25 16.125 11.9216 16.125 12.75V18C16.125 18.8284 16.7966 19.5 17.625 19.5H22.125C22.9534 19.5 23.625 18.8284 23.625 18V12.75C23.625 11.9216 22.9534 11.25 22.125 11.25Z" fill="#5059C9"/>
      <circle cx="8.8125" cy="5.25" r="2.25" fill="#7B83EB"/>
    </svg>
  );
}

// Presence indicator component
function PresenceIndicator({ availability, size = 'sm' }: { availability?: string; size?: 'sm' | 'md' }) {
  const colors: Record<string, string> = {
    Available: 'bg-green-500',
    Busy: 'bg-red-500',
    DoNotDisturb: 'bg-red-600',
    BeRightBack: 'bg-yellow-500',
    Away: 'bg-yellow-500',
    Offline: 'bg-gray-400',
  };

  const sizeClasses = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3';

  return (
    <span className={cn(
      'absolute bottom-0 right-0 rounded-full border-2 border-background',
      sizeClasses,
      colors[availability || 'Offline'] || 'bg-gray-400'
    )} />
  );
}

// Not connected view
function NotConnectedView({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gradient-to-b from-[#464EB8]/10 to-transparent">
      <div className="bg-[#464EB8] p-4 rounded-2xl mb-6">
        <TeamsLogo className="h-12 w-12" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Connect MS Teams</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        Access your Teams chats, channels, and meetings directly from EaseMail.
      </p>
      <Button onClick={onConnect} className="gap-2 bg-[#464EB8] hover:bg-[#3B41A0]">
        <LinkIcon className="h-4 w-4" />
        Connect MS Teams
      </Button>
    </div>
  );
}

// Navigation item types
type NavItem = 'activity' | 'chat' | 'teams' | 'calendar' | 'calls';

// Left rail navigation (like real Teams)
function LeftRail({
  activeNav,
  onNavChange,
}: {
  activeNav: NavItem;
  onNavChange: (nav: NavItem) => void;
}) {
  const navItems: { id: NavItem; icon: React.ElementType; label: string }[] = [
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'teams', icon: Users, label: 'Teams' },
    { id: 'calendar', icon: Calendar, label: 'Calendar' },
    { id: 'calls', icon: Phone, label: 'Calls' },
  ];

  return (
    <div className="w-16 bg-[#292929] flex flex-col items-center py-2 gap-1">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavChange(item.id)}
          className={cn(
            'w-12 h-12 flex flex-col items-center justify-center rounded-lg transition-colors',
            activeNav === item.id
              ? 'bg-[#464EB8] text-white'
              : 'text-gray-400 hover:bg-[#3D3D3D] hover:text-white'
          )}
        >
          <item.icon className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

// Teams list sidebar
function TeamsSidebar({
  teams,
  selectedTeam,
  onSelectTeam,
  channels,
  selectedChannel,
  onSelectChannel,
  onLoadChannels,
  isLoading,
}: {
  teams: MSTeam[];
  selectedTeam: MSTeam | null;
  onSelectTeam: (team: MSTeam) => void;
  channels: MSChannel[];
  selectedChannel: MSChannel | null;
  onSelectChannel: (channel: MSChannel) => void;
  onLoadChannels: (teamId: string) => void;
  isLoading: boolean;
}) {
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  const toggleTeam = async (team: MSTeam) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(team.id)) {
      newExpanded.delete(team.id);
    } else {
      newExpanded.add(team.id);
      onLoadChannels(team.id);
    }
    setExpandedTeams(newExpanded);
    onSelectTeam(team);
  };

  if (isLoading && teams.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No teams found</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-0.5">
        {teams.map((team) => (
          <div key={team.id}>
            <button
              onClick={() => toggleTeam(team)}
              className={cn(
                'w-full flex items-center gap-2 p-2 rounded-md text-left hover:bg-accent transition-colors group',
                selectedTeam?.id === team.id && !selectedChannel && 'bg-accent'
              )}
            >
              {expandedTeams.has(team.id) ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <div className="h-8 w-8 rounded bg-gradient-to-br from-[#464EB8] to-[#7B83EB] flex items-center justify-center text-white text-sm font-medium">
                {team.displayName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium truncate flex-1">{team.displayName}</span>
              <MoreHorizontal className="h-4 w-4 opacity-0 group-hover:opacity-50" />
            </button>

            {expandedTeams.has(team.id) && selectedTeam?.id === team.id && (
              <div className="ml-8 mt-0.5 space-y-0.5">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => onSelectChannel(channel)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-accent transition-colors',
                      selectedChannel?.id === channel.id && 'bg-accent'
                    )}
                  >
                    {channel.membershipType === 'private' ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Hash className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm truncate">{channel.displayName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// Chats sidebar
function ChatsSidebar({
  chats,
  selectedChat,
  onSelectChat,
  isLoading,
}: {
  chats: MSChat[];
  selectedChat: MSChat | null;
  onSelectChat: (chat: MSChat) => void;
  isLoading: boolean;
}) {
  const getChatDisplayName = (chat: MSChat) => {
    if (chat.topic) return chat.topic;
    if (chat.members && chat.members.length > 0) {
      return chat.members.map((m) => m.displayName).join(', ');
    }
    return chat.chatType === 'oneOnOne' ? 'Direct Message' : 'Group Chat';
  };

  const getChatInitials = (chat: MSChat) => {
    if (chat.chatType === 'oneOnOne' && chat.members?.[0]?.displayName) {
      const name = chat.members[0].displayName;
      const parts = name.split(' ');
      return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name[0];
    }
    return chat.chatType === 'group' ? 'G' : 'C';
  };

  if (isLoading && chats.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No chats found</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-0.5">
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat)}
            className={cn(
              'w-full flex items-center gap-3 p-2 rounded-md text-left hover:bg-accent transition-colors',
              selectedChat?.id === chat.id && 'bg-accent'
            )}
          >
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="text-xs bg-gradient-to-br from-[#464EB8] to-[#7B83EB] text-white">
                  {getChatInitials(chat)}
                </AvatarFallback>
              </Avatar>
              {chat.chatType === 'oneOnOne' && (
                <PresenceIndicator availability="Available" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{getChatDisplayName(chat)}</p>
              <p className="text-xs text-muted-foreground truncate">
                {chat.chatType === 'group' ? `${chat.members?.length || 0} members` : 'Click to view messages'}
              </p>
            </div>
            {chat.lastUpdatedDateTime && (
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(chat.lastUpdatedDateTime), { addSuffix: false })}
              </span>
            )}
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}

// Message view component (looks like Teams chat)
function MessageView({
  messages,
  onSendMessage,
  isLoading,
  title,
  subtitle,
}: {
  messages: MSMessage[];
  onSendMessage: (content: string) => Promise<boolean>;
  isLoading: boolean;
  title: string;
  subtitle?: string;
}) {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    const success = await onSendMessage(newMessage);
    if (success) setNewMessage('');
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded bg-gradient-to-br from-[#464EB8] to-[#7B83EB] flex items-center justify-center text-white font-medium">
            {title.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-semibold">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => {
              const showAvatar = index === 0 || messages[index - 1]?.sender?.id !== msg.sender?.id;

              return (
                <div key={msg.id} className={cn('flex gap-3', msg.isFromMe && 'justify-end')}>
                  {!msg.isFromMe && showAvatar && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="text-xs bg-gradient-to-br from-orange-400 to-orange-600 text-white">
                        {msg.sender?.displayName?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {!msg.isFromMe && !showAvatar && <div className="w-8" />}
                  <div className={cn('max-w-[70%]', msg.isFromMe && 'order-first')}>
                    {!msg.isFromMe && showAvatar && (
                      <p className="text-xs font-medium mb-1 text-muted-foreground">
                        {msg.sender?.displayName || 'Unknown'}
                      </p>
                    )}
                    <div
                      className={cn(
                        'rounded-lg px-3 py-2',
                        msg.isFromMe
                          ? 'bg-[#464EB8] text-white'
                          : 'bg-muted'
                      )}
                    >
                      <div
                        className="text-sm"
                        dangerouslySetInnerHTML={{
                          __html: msg.contentType === 'html' ? msg.content : msg.content,
                        }}
                      />
                    </div>
                    <p className={cn('text-[10px] text-muted-foreground mt-1', msg.isFromMe && 'text-right')}>
                      {format(new Date(msg.createdDateTime), 'h:mm a')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Message input (like Teams) */}
      <div className="border-t p-3">
        <div className="flex items-center gap-2 bg-muted rounded-lg p-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a new message"
            disabled={sending}
            className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
            <Smile className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            size="icon"
            className="h-8 w-8 flex-shrink-0 bg-[#464EB8] hover:bg-[#3B41A0]"
          >
            {sending ? (
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

// Empty state when nothing selected
function EmptyState({ nav }: { nav: NavItem }) {
  const content: Record<NavItem, { icon: React.ElementType; title: string; desc: string }> = {
    chat: { icon: MessageSquare, title: 'Select a chat', desc: 'Choose a conversation from the left to view messages' },
    teams: { icon: Users, title: 'Select a channel', desc: 'Expand a team and select a channel to view messages' },
    calendar: { icon: Calendar, title: 'Calendar', desc: 'View your Teams meetings and schedule' },
    calls: { icon: Phone, title: 'Calls', desc: 'Make and receive calls through Teams' },
    activity: { icon: MessageSquare, title: 'Activity', desc: 'View your recent activity' },
  };

  const { icon: Icon, title, desc } = content[nav];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="bg-muted p-4 rounded-full mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{desc}</p>
    </div>
  );
}

// Main TeamsPanel component
export function TeamsPanel({ className }: { className?: string }) {
  const {
    isConnected,
    isLoading,
    teams,
    chats,
    presence,
    connect,
    loadTeams,
    loadChannels,
    loadChats,
    loadChatMessages,
    sendChatMessage,
    loadChannelMessages,
    sendChannelMessage,
    loadPresence,
  } = useMSTeams();

  const [activeNav, setActiveNav] = useState<NavItem>('chat');
  const [selectedTeam, setSelectedTeam] = useState<MSTeam | null>(null);
  const [channels, setChannels] = useState<MSChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<MSChannel | null>(null);
  const [selectedChat, setSelectedChat] = useState<MSChat | null>(null);
  const [messages, setMessages] = useState<MSMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load initial data when connected
  useEffect(() => {
    if (isConnected && !dataLoaded) {
      console.log('[TeamsPanel] Connected, loading data...');
      Promise.all([loadTeams(), loadChats(), loadPresence()]).then(() => {
        setDataLoaded(true);
        console.log('[TeamsPanel] Data loaded');
      });
    }
  }, [isConnected, dataLoaded, loadTeams, loadChats, loadPresence]);

  // Handle channel loading
  const handleLoadChannels = useCallback(async (teamId: string) => {
    console.log('[TeamsPanel] Loading channels for team:', teamId);
    const loadedChannels = await loadChannels(teamId);
    setChannels(loadedChannels);
  }, [loadChannels]);

  // Handle channel selection
  const handleSelectChannel = useCallback(async (channel: MSChannel) => {
    setSelectedChannel(channel);
    setSelectedChat(null);
    setMessagesLoading(true);
    if (selectedTeam) {
      const msgs = await loadChannelMessages(selectedTeam.id, channel.id);
      setMessages(msgs);
    }
    setMessagesLoading(false);
  }, [selectedTeam, loadChannelMessages]);

  // Handle chat selection
  const handleSelectChat = useCallback(async (chat: MSChat) => {
    setSelectedChat(chat);
    setSelectedChannel(null);
    setMessagesLoading(true);
    const msgs = await loadChatMessages(chat.id);
    setMessages(msgs);
    setMessagesLoading(false);
  }, [loadChatMessages]);

  // Handle send message
  const handleSendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (selectedChat) {
      const success = await sendChatMessage(selectedChat.id, content);
      if (success) {
        const msgs = await loadChatMessages(selectedChat.id);
        setMessages(msgs);
      }
      return success;
    } else if (selectedChannel && selectedTeam) {
      const success = await sendChannelMessage(selectedTeam.id, selectedChannel.id, content);
      if (success) {
        const msgs = await loadChannelMessages(selectedTeam.id, selectedChannel.id);
        setMessages(msgs);
      }
      return success;
    }
    return false;
  }, [selectedChat, selectedChannel, selectedTeam, sendChatMessage, sendChannelMessage, loadChatMessages, loadChannelMessages]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    if (activeNav === 'chat') {
      loadChats();
    } else if (activeNav === 'teams') {
      loadTeams();
    }
  }, [activeNav, loadChats, loadTeams]);

  // Get current title for message view
  const getMessageViewTitle = () => {
    if (selectedChat) {
      if (selectedChat.topic) return selectedChat.topic;
      if (selectedChat.members && selectedChat.members.length > 0) {
        return selectedChat.members.map((m) => m.displayName).join(', ');
      }
      return 'Chat';
    }
    if (selectedChannel) return selectedChannel.displayName;
    return '';
  };

  // Not connected state
  if (isConnected === false) {
    return (
      <div className={cn('h-full', className)}>
        <NotConnectedView onConnect={connect} />
      </div>
    );
  }

  // Loading state
  if (isConnected === null) {
    return (
      <div className={cn('h-full flex items-center justify-center', className)}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#464EB8] mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Connecting to MS Teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('h-full flex', className)}>
      {/* Left rail navigation */}
      <LeftRail activeNav={activeNav} onNavChange={setActiveNav} />

      {/* Sidebar */}
      <div className="w-72 border-r flex flex-col bg-background">
        {/* Sidebar header */}
        <div className="flex items-center justify-between p-3 border-b">
          <h2 className="font-semibold">
            {activeNav === 'chat' ? 'Chat' : activeNav === 'teams' ? 'Teams' : activeNav.charAt(0).toUpperCase() + activeNav.slice(1)}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search" className="pl-8 h-8" />
          </div>
        </div>

        {/* Content based on active nav */}
        {activeNav === 'chat' && (
          <ChatsSidebar
            chats={chats}
            selectedChat={selectedChat}
            onSelectChat={handleSelectChat}
            isLoading={isLoading}
          />
        )}
        {activeNav === 'teams' && (
          <TeamsSidebar
            teams={teams}
            selectedTeam={selectedTeam}
            onSelectTeam={setSelectedTeam}
            channels={channels}
            selectedChannel={selectedChannel}
            onSelectChannel={handleSelectChannel}
            onLoadChannels={handleLoadChannels}
            isLoading={isLoading}
          />
        )}
        {(activeNav === 'calendar' || activeNav === 'calls') && (
          <div className="flex-1 flex items-center justify-center p-4 text-center text-muted-foreground">
            <p className="text-sm">Coming soon</p>
          </div>
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1">
        {(selectedChat || selectedChannel) ? (
          <MessageView
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={messagesLoading}
            title={getMessageViewTitle()}
            subtitle={selectedChannel ? `${selectedTeam?.displayName}` : undefined}
          />
        ) : (
          <EmptyState nav={activeNav} />
        )}
      </div>
    </div>
  );
}
