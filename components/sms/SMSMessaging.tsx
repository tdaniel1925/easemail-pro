/**
 * SMS Messaging Component
 * Complete messaging interface with conversations and chat bubbles
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Phone, Loader2, RefreshCw, Send, ArrowLeft, X, Check, CheckCheck } from 'lucide-react';
import { format, formatDistanceToNow, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn, getInitials, generateAvatarColor } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

interface SMSMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  message: string;
  sentAt: string;
  deliveredAt: string | null;
  status: string;
  isRead: boolean;
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

export function SMSMessaging() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);

  // Get phone number from URL parameters
  const phoneFromUrl = searchParams?.get('phone');

  useEffect(() => {
    fetchMessages();

    // Poll for new messages every 10 seconds
    const interval = setInterval(() => {
      fetchMessages(true);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Group messages when they change
  useEffect(() => {
    if (messages.length > 0) {
      groupMessagesByContact();
    }
  }, [messages]);

  // Auto-select conversation from URL parameter
  useEffect(() => {
    if (phoneFromUrl && conversations.length > 0) {
      const conversation = conversations.find(c => c.contactPhone === phoneFromUrl);
      if (conversation) {
        setSelectedConversation(conversation);
        setShowMobileChat(true);
      }
    }
  }, [phoneFromUrl, conversations]);

  // Scroll to bottom when conversation changes or new message arrives
  useEffect(() => {
    if (selectedConversation) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedConversation?.messages]);

  const fetchMessages = async (background = false) => {
    try {
      if (!background) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
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
      // Use the phone number from 'from' field for inbound messages
      const phone = message.from;

      if (conversationMap.has(phone)) {
        const conv = conversationMap.get(phone)!;
        conv.messages.push(message);

        // Count unread messages
        if (!message.isRead) {
          conv.unreadCount++;
        }

        // Update last message if this one is newer
        if (new Date(message.sentAt) > new Date(conv.lastMessage.sentAt)) {
          conv.lastMessage = message;
        }
      } else {
        // Create new conversation
        conversationMap.set(phone, {
          contactPhone: phone,
          contactName: message.contact?.name || formatPhoneNumber(phone),
          contactId: message.contact?.id || null,
          lastMessage: message,
          messages: [message],
          unreadCount: message.isRead ? 0 : 1,
        });
      }
    });

    // Convert map to array and sort by most recent message
    const conversationArray = Array.from(conversationMap.values()).sort(
      (a, b) => new Date(b.lastMessage.sentAt).getTime() - new Date(a.lastMessage.sentAt).getTime()
    );

    setConversations(conversationArray);
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setShowMobileChat(true);

    // Mark messages as read
    markConversationAsRead(conversation.contactPhone);

    // Update URL
    router.push(`/sms?phone=${encodeURIComponent(conversation.contactPhone)}`);
  };

  const markConversationAsRead = async (phone: string) => {
    try {
      const messageIds = messages
        .filter(m => m.from === phone && !m.isRead)
        .map(m => m.id);

      if (messageIds.length === 0) return;

      const response = await fetch('/api/sms/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds }),
      });

      if (response.ok) {
        // Update local state
        setMessages(prevMessages =>
          prevMessages.map(m =>
            messageIds.includes(m.id) ? { ...m, isRead: true } : m
          )
        );
      }
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    setIsSending(true);

    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedConversation.contactPhone,
          message: newMessage.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNewMessage('');
        textareaRef.current?.focus();

        // Refresh messages to show the sent message
        await fetchMessages(true);

        toast({
          title: 'Message sent',
          description: `Sent to ${selectedConversation.contactName}`,
        });
      } else {
        toast({
          title: 'Failed to send message',
          description: data.error || 'Please try again',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Failed to send message',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleBackToList = () => {
    setShowMobileChat(false);
    setSelectedConversation(null);
    router.push('/sms');
  };

  const handleBackNavigation = () => {
    // Check if there's a history to go back to
    if (window.history.length > 1) {
      router.back();
    } else {
      // Default to inbox if no history
      router.push('/inbox');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">Loading conversations...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen px-4">
        <MessageSquare className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">No Conversations Yet</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          When contacts reply to your SMS messages, they'll appear here.
        </p>
        <Button
          variant="outline"
          onClick={() => router.push('/inbox')}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Inbox
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Conversation List */}
      <div className={cn(
        "flex flex-col bg-background border-r border-border",
        "w-full md:w-96 lg:w-[420px]",
        showMobileChat && "hidden md:flex"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={handleBackNavigation}
              title="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <MessageSquare className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-semibold text-lg">Messages</h2>
              <p className="text-xs text-muted-foreground">
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchMessages()}
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
                onClick={() => handleSelectConversation(conversation)}
                className={cn(
                  "p-4 border-b border-border cursor-pointer transition-colors",
                  "hover:bg-muted/50 active:bg-muted",
                  isSelected && "bg-muted border-l-4 border-l-primary"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
                      style={{ backgroundColor: avatarColor }}
                    >
                      {conversation.contactId ? (
                        getInitials(conversation.contactName)
                      ) : (
                        <Phone className="h-5 w-5" />
                      )}
                    </div>
                    {conversation.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-[10px] font-bold text-primary-foreground">
                          {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={cn(
                        "font-medium text-sm truncate",
                        conversation.unreadCount > 0 && "font-semibold"
                      )}>
                        {conversation.contactName}
                      </p>
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        {formatDistanceToNow(new Date(conversation.lastMessage.sentAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {formatPhoneNumber(conversation.contactPhone)}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn(
                        "text-sm line-clamp-1 flex-1",
                        conversation.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                      )}>
                        {conversation.lastMessage.body || conversation.lastMessage.message}
                      </p>
                      {conversation.messages.length > 1 && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">
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

      {/* Chat View */}
      <div className={cn(
        "flex flex-col flex-1 bg-card",
        !selectedConversation && "hidden md:flex",
        showMobileChat && "flex"
      )}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-background flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 md:hidden"
                onClick={handleBackToList}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
                style={{ backgroundColor: generateAvatarColor(selectedConversation.contactPhone) }}
              >
                {selectedConversation.contactId ? (
                  getInitials(selectedConversation.contactName)
                ) : (
                  <Phone className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base truncate">
                  {selectedConversation.contactName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {formatPhoneNumber(selectedConversation.contactPhone)}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
              {selectedConversation.messages
                .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())
                .map((message, index) => {
                  const isInbound = message.from === selectedConversation.contactPhone;
                  const prevMessage = index > 0 ? selectedConversation.messages[index - 1] : null;
                  const showDivider = !prevMessage || !isSameDay(new Date(message.sentAt), new Date(prevMessage.sentAt));

                  return (
                    <div key={message.id}>
                      {/* Date Divider */}
                      {showDivider && (
                        <div className="flex items-center justify-center my-4">
                          <span className="text-xs text-muted-foreground bg-background px-3 py-1 rounded-full border border-border">
                            {format(new Date(message.sentAt), 'EEEE, MMMM d')}
                          </span>
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div className={cn(
                        "flex items-end gap-2",
                        isInbound ? "justify-start" : "justify-end"
                      )}>
                        <div className={cn(
                          "max-w-[75%] md:max-w-[65%] rounded-2xl px-4 py-2.5 shadow-sm",
                          isInbound
                            ? "bg-background text-foreground rounded-bl-sm border border-border"
                            : "bg-primary text-primary-foreground rounded-br-sm"
                        )}>
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {message.body || message.message}
                          </p>
                          <div className={cn(
                            "flex items-center gap-1 mt-1",
                            isInbound ? "justify-start" : "justify-end"
                          )}>
                            <span className={cn(
                              "text-[10px]",
                              isInbound ? "text-muted-foreground" : "text-primary-foreground/70"
                            )}>
                              {format(new Date(message.sentAt), 'h:mm a')}
                            </span>
                            {!isInbound && (
                              <span className="text-primary-foreground/70">
                                {message.deliveredAt ? (
                                  <CheckCheck className="h-3 w-3" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border bg-background">
              <div className="flex items-end gap-2">
                <Textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 min-h-[44px] max-h-[120px] resize-none"
                  rows={1}
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="h-11 w-11 flex-shrink-0"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="hidden md:flex flex-col items-center justify-center h-full">
            <MessageSquare className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">Select a conversation</h3>
            <p className="text-sm text-muted-foreground">
              Choose a conversation from the list to start messaging
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
