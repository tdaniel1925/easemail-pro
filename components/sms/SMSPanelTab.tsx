'use client';

import { useState, useEffect } from 'react';
import { Loader2, MessageSquare, Send, RefreshCw, User as UserIcon, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, getInitials, generateAvatarColor } from '@/lib/utils';

interface SMSMessage {
  id: string;
  fromPhone: string;
  toPhone: string;
  messageBody: string;
  sentAt: string;
  direction: 'inbound' | 'outbound';
  isRead: boolean;
  contact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

export function SMSPanelTab() {
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/sms/inbox?page=1&limit=50');
      const data = await response.json();
      if (data.success) {
        setMessages(data.messages);
      } else {
        console.error('Failed to fetch SMS messages:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch SMS messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await fetch(`/api/sms/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds: [messageId] }),
      });
      
      // Update local state
      setMessages(prev => 
        prev.map(msg => msg.id === messageId ? { ...msg, isRead: true } : msg)
      );
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  const handleSelectConversation = (phone: string, messageId: string) => {
    setSelectedConversation(phone);
    
    // Mark message as read when selected
    const message = messages.find(m => m.id === messageId);
    if (message && !message.isRead) {
      markAsRead(messageId);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedConversation) return;

    setIsSending(true);
    try {
      // Find the contact for this conversation
      const conversationMessages = messages.filter(m => m.fromPhone === selectedConversation);
      const contactId = conversationMessages[0]?.contact?.id;

      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toPhone: selectedConversation,
          message: replyText,
          contactId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setReplyText('');
        // Refresh messages to include the new outbound message
        fetchMessages();
      } else {
        alert('Failed to send SMS: ' + (data.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Failed to send SMS:', error);
      alert('Failed to send SMS: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const getContactName = (message: SMSMessage) => {
    if (message.contact) {
      return message.contact.firstName && message.contact.lastName
        ? `${message.contact.firstName} ${message.contact.lastName}`
        : message.contact.email || message.contact.phone || message.fromPhone;
    }
    return message.fromPhone;
  };

  const getContactAvatar = (message: SMSMessage) => {
    const name = getContactName(message);
    const emailOrPhone = message.contact?.email || message.fromPhone;
    return {
      initials: getInitials(name),
      color: generateAvatarColor(emailOrPhone),
    };
  };

  // Group messages by phone number (conversation)
  const conversations = messages.reduce((acc, msg) => {
    const phone = msg.direction === 'inbound' ? msg.fromPhone : msg.toPhone;
    if (!acc[phone]) {
      acc[phone] = [];
    }
    acc[phone].push(msg);
    return acc;
  }, {} as Record<string, SMSMessage[]>);

  // Get the latest message for each conversation
  const conversationList = Object.entries(conversations).map(([phone, msgs]) => {
    const sorted = msgs.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    return {
      phone,
      latestMessage: sorted[0],
      unreadCount: sorted.filter(m => m.direction === 'inbound' && !m.isRead).length,
      messages: sorted,
    };
  }).sort((a, b) => new Date(b.latestMessage.sentAt).getTime() - new Date(a.latestMessage.sentAt).getTime());

  const selectedConversationData = conversationList.find(c => c.phone === selectedConversation);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center px-4 text-center">
        <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-sm text-muted-foreground">
          No SMS messages yet
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Incoming SMS will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {!selectedConversation ? (
        // Conversation List View
        <>
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              SMS Messages
            </h3>
            <Button variant="ghost" size="icon" onClick={fetchMessages} className="h-8 w-8">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="divide-y divide-border">
              {conversationList.map(({ phone, latestMessage, unreadCount }) => {
                const { initials, color } = getContactAvatar(latestMessage);
                return (
                  <div
                    key={phone}
                    className="flex items-start gap-3 p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleSelectConversation(phone, latestMessage.id)}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-sm truncate",
                          unreadCount > 0 && "font-semibold"
                        )}>
                          {getContactName(latestMessage)}
                        </span>
                        {unreadCount > 0 && (
                          <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium flex-shrink-0">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {latestMessage.messageBody}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(parseISO(latestMessage.sentAt), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </>
      ) : (
        // Conversation Detail View
        <>
          <div className="flex items-center justify-between p-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSelectedConversation(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
                style={{ backgroundColor: getContactAvatar(selectedConversationData!.latestMessage).color }}
              >
                {getContactAvatar(selectedConversationData!.latestMessage).initials}
              </div>
              <h3 className="text-sm font-semibold">
                {getContactName(selectedConversationData!.latestMessage)}
              </h3>
            </div>
          </div>
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-3">
              {selectedConversationData!.messages.reverse().map((msg) => {
                const isOutbound = msg.direction === 'outbound';
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      isOutbound ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-3 py-2",
                        isOutbound
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.messageBody}</p>
                      <p className={cn(
                        "text-xs mt-1",
                        isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {format(parseISO(msg.sentAt), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply..."
                className="min-h-[60px] max-h-[120px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
              />
              <Button
                onClick={handleSendReply}
                disabled={!replyText.trim() || isSending}
                size="icon"
                className="h-[60px] w-12 flex-shrink-0"
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
      )}
    </div>
  );
}

