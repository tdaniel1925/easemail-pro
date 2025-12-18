/**
 * Teams Chat Sidebar Component
 * Compact Teams chat view for the right sidebar in inbox
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Loader2,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, getInitials, generateAvatarColor } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface TeamsChat {
  id: string;
  teamsChatId: string;
  chatType: 'oneOnOne' | 'group' | 'meeting';
  topic: string | null;
  otherParticipantName: string | null;
  otherParticipantEmail: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastMessageSenderName: string | null;
  unreadCount: number;
}

interface TeamsMessage {
  id: string;
  teamsMessageId: string;
  senderName: string;
  senderEmail: string;
  body: string;
  teamsCreatedAt: string;
}

export function TeamsChatSidebar() {
  const [hasTeamsAccount, setHasTeamsAccount] = useState<boolean | null>(null);
  const [chats, setChats] = useState<TeamsChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<TeamsChat | null>(null);
  const [messages, setMessages] = useState<TeamsMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkTeamsAccount();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
    }
  }, [selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkTeamsAccount = async () => {
    try {
      const response = await fetch('/api/teams/accounts');
      const data = await response.json();
      setHasTeamsAccount(data.accounts && data.accounts.length > 0);
      if (data.accounts && data.accounts.length > 0) {
        fetchChats();
      }
    } catch (error) {
      console.error('Error checking Teams account:', error);
      setHasTeamsAccount(false);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChats = async () => {
    try {
      const response = await fetch('/api/teams/chats?limit=10');
      const data = await response.json();
      if (data.chats) {
        setChats(data.chats);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      setIsLoadingMessages(true);
      const response = await fetch(`/api/teams/chats/${chatId}/messages?limit=20`);
      const data = await response.json();
      if (data.messages) {
        setMessages(data.messages.reverse());
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || isSending) return;

    try {
      setIsSending(true);
      const response = await fetch(`/api/teams/chats/${selectedChat.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage }),
      });

      const data = await response.json();
      if (data.success) {
        setNewMessage('');
        fetchMessages(selectedChat.id);
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

  const getChatName = (chat: TeamsChat) => {
    if (chat.chatType === 'oneOnOne') {
      return chat.otherParticipantName || 'Unknown';
    }
    return chat.topic || 'Group Chat';
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
        <p className="text-xs text-muted-foreground">Loading Teams...</p>
      </div>
    );
  }

  // No Teams account connected
  if (!hasTeamsAccount) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <div className="w-12 h-12 rounded-full bg-[#6264A7]/10 flex items-center justify-center mb-3">
          <Video className="h-6 w-6 text-[#6264A7]" />
        </div>
        <p className="text-xs font-medium mb-2">Connect Teams</p>
        <p className="text-xs text-muted-foreground mb-3">
          Link your Microsoft Teams account to chat here
        </p>
        <Link href="/teams">
          <Button size="sm" variant="outline" className="text-[#6264A7]">
            Connect
          </Button>
        </Link>
      </div>
    );
  }

  // Chat list view
  if (!selectedChat) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-xs font-medium">Recent Chats</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={fetchChats}>
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Link href="/teams">
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-4 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground">No recent chats</p>
            </div>
          ) : (
            <div className="space-y-0.5 p-1">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  className={cn(
                    "w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors hover:bg-accent",
                    chat.unreadCount > 0 && "bg-[#6264A7]/5"
                  )}
                  onClick={() => setSelectedChat(chat)}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-white flex-shrink-0"
                    style={{ backgroundColor: generateAvatarColor(getChatName(chat)) }}
                  >
                    {getInitials(getChatName(chat))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-xs truncate",
                        chat.unreadCount > 0 && "font-semibold"
                      )}>
                        {getChatName(chat)}
                      </span>
                      {chat.unreadCount > 0 && (
                        <span className="bg-[#6264A7] text-white text-[10px] rounded-full px-1.5 min-w-[18px] text-center">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                    {chat.lastMessagePreview && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {chat.lastMessageSenderName}: {chat.lastMessagePreview}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }

  // Chat view
  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <button
          onClick={() => setSelectedChat(null)}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
        </button>
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white flex-shrink-0"
          style={{ backgroundColor: generateAvatarColor(getChatName(selectedChat)) }}
        >
          {getInitials(getChatName(selectedChat))}
        </div>
        <span className="text-xs font-medium truncate flex-1">{getChatName(selectedChat)}</span>
        <Link href="/teams">
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <ExternalLink className="h-3 w-3" />
          </Button>
        </Link>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-2">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <MessageSquare className="h-6 w-6 text-muted-foreground/50 mb-2" />
            <p className="text-xs text-muted-foreground">No messages yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <div key={msg.id} className="group">
                <div className="flex items-start gap-1.5">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] text-white flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: generateAvatarColor(msg.senderEmail) }}
                  >
                    {getInitials(msg.senderName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1">
                      <span className="text-[10px] font-medium">{msg.senderName.split(' ')[0]}</span>
                      <span className="text-[9px] text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.teamsCreatedAt), { addSuffix: false })}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/90 break-words">
                      {stripHtml(msg.body)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <div className="p-2 border-t">
        <div className="flex gap-1">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="h-8 text-xs"
            disabled={isSending}
          />
          <Button
            size="icon"
            className="h-8 w-8 bg-[#6264A7] hover:bg-[#6264A7]/90"
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
