/**
 * SMS Inbox Component
 * Displays SMS messages grouped by contact conversation
 */

'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Phone, User, Clock, Loader2, RefreshCw, Send, ArrowLeft } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn, getInitials, generateAvatarColor } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface SMSMessage {
  id: string;
  from: string;
  to: string;
  message: string;
  sentAt: Date;
  deliveredAt: Date | null;
  status: string;
  contact: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
}

interface Conversation {
  contactPhone: string;
  contactName: string;
  contactId: string | null;
  lastMessage: SMSMessage;
  messages: SMSMessage[];
  unreadCount: number;
}

export function SMSInbox() {
  const router = useRouter();
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  // Group messages into conversations when messages change
  useEffect(() => {
    if (messages.length > 0) {
      groupMessagesByContact();
    }
  }, [messages]);

  const fetchMessages = async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const response = await fetch('/api/sms/inbox');
      const data = await response.json();

      if (data.success) {
        setMessages(data.messages);
      } else {
        console.error('Failed to fetch SMS messages:', data.error);
      }
    } catch (error) {
      console.error('Error fetching SMS messages:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const groupMessagesByContact = () => {
    const conversationMap = new Map<string, Conversation>();

    messages.forEach((message) => {
      const phone = message.from;

      if (conversationMap.has(phone)) {
        const conv = conversationMap.get(phone)!;
        conv.messages.push(message);

        // Update last message if this one is newer
        if (new Date(message.sentAt) > new Date(conv.lastMessage.sentAt)) {
          conv.lastMessage = message;
        }
      } else {
        // Create new conversation
        conversationMap.set(phone, {
          contactPhone: phone,
          contactName: message.contact?.name || phone,
          contactId: message.contact?.id || null,
          lastMessage: message,
          messages: [message],
          unreadCount: 0, // TODO: Track read status
        });
      }
    });

    // Convert map to array and sort by most recent message
    const conversationArray = Array.from(conversationMap.values()).sort(
      (a, b) => new Date(b.lastMessage.sentAt).getTime() - new Date(a.lastMessage.sentAt).getTime()
    );

    setConversations(conversationArray);
  };

  const handleRefresh = () => {
    fetchMessages(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">Loading SMS messages...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4">
        <MessageSquare className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">No Conversations Yet</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          When contacts reply to your SMS messages, they'll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Conversation List */}
      <div className={cn(
        "flex-1 flex flex-col bg-background",
        selectedConversation && "lg:max-w-md xl:max-w-lg"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => router.push('/inbox')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Messages</h2>
            <span className="text-xs text-muted-foreground">
              ({conversations.length})
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conversation) => {
            const avatarColor = generateAvatarColor(conversation.contactPhone);
            const isSelected = selectedConversation?.contactPhone === conversation.contactPhone;

            return (
              <div
                key={conversation.contactPhone}
                onClick={() => setSelectedConversation(conversation)}
                className={cn(
                  "p-4 border-b border-border cursor-pointer transition-colors",
                  "hover:bg-muted/50",
                  isSelected && "bg-muted border-l-2 border-l-primary"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {conversation.contactId ? getInitials(conversation.contactName) : <Phone className="h-5 w-5" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm truncate">
                        {conversation.contactName}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conversation.lastMessage.sentAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {conversation.contactPhone}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {conversation.lastMessage.message}
                      </p>
                      {conversation.messages.length > 1 && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-2">
                          {conversation.messages.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conversation Detail Panel (Chat View) */}
      {selectedConversation && (
        <div className="hidden lg:flex flex-col flex-1 border-l border-border bg-card">
          {/* Conversation Header */}
          <div className="p-4 border-b border-border bg-background">
            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-base font-medium text-white flex-shrink-0"
                style={{ backgroundColor: generateAvatarColor(selectedConversation.contactPhone) }}
              >
                {selectedConversation.contactId ? (
                  getInitials(selectedConversation.contactName)
                ) : (
                  <Phone className="h-6 w-6" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  {selectedConversation.contactName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedConversation.contactPhone}
                </p>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {selectedConversation.messages
              .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())
              .map((message, index) => {
                const isInbound = message.from === selectedConversation.contactPhone;
                const showTimestamp =
                  index === 0 ||
                  new Date(message.sentAt).getTime() - new Date(selectedConversation.messages[index - 1].sentAt).getTime() > 3600000; // 1 hour

                return (
                  <div key={message.id} className="space-y-2">
                    {/* Timestamp Divider */}
                    {showTimestamp && (
                      <div className="flex items-center justify-center">
                        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                          {format(new Date(message.sentAt), 'MMM d, h:mm a')}
                        </span>
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div className={cn(
                      "flex",
                      isInbound ? "justify-start" : "justify-end"
                    )}>
                      <div className={cn(
                        "max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm",
                        isInbound
                          ? "bg-muted text-foreground rounded-tl-sm"
                          : "bg-primary text-primary-foreground rounded-tr-sm"
                      )}>
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.message}
                        </p>
                        {!showTimestamp && (
                          <span className={cn(
                            "text-[10px] mt-1 block",
                            isInbound ? "text-muted-foreground" : "text-primary-foreground/70"
                          )}>
                            {format(new Date(message.sentAt), 'h:mm a')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Reply Input */}
          <div className="p-4 border-t border-border bg-background">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <textarea
                  placeholder="Type a message..."
                  className="w-full min-h-[80px] max-h-[200px] resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={2}
                />
              </div>
              <Button size="icon" className="h-10 w-10 flex-shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

