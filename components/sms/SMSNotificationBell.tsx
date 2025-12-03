'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

interface SMSMessage {
  id: string;
  from: string;
  body: string;
  receivedAt: string;
  isRead: boolean;
}

interface SMSNotificationBellProps {
  unreadCount: number;
  onCountUpdate?: (count: number) => void;
}

export default function SMSNotificationBell({
  unreadCount,
  onCountUpdate
}: SMSNotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Fetch SMS messages when popover opens
  useEffect(() => {
    if (open && messages.length === 0) {
      fetchMessages();
    }
  }, [open]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sms/inbox');
      if (response.ok) {
        const data = await response.json();
        // Get the 10 most recent unread messages
        const unreadMessages = data.messages
          ?.filter((msg: any) => !msg.isRead)
          .slice(0, 10)
          .map((msg: any) => ({
            id: msg.id,
            from: msg.from || 'Unknown',
            body: msg.body || '',
            receivedAt: msg.receivedAt || new Date().toISOString(),
            isRead: msg.isRead || false,
          })) || [];
        setMessages(unreadMessages);
      }
    } catch (error) {
      console.error('Failed to fetch SMS messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // Call API to mark all as read
      const response = await fetch('/api/sms/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });

      if (response.ok) {
        setMessages([]);
        onCountUpdate?.(0);
        setOpen(false);
      }
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  const handleViewAllMessages = () => {
    setOpen(false);
    router.push('/sms');
  };

  const handleViewMessage = (message: SMSMessage) => {
    setOpen(false);
    // Navigate to SMS page with phone number parameter
    router.push(`/sms?phone=${encodeURIComponent(message.from)}`);
  };

  const formatPhoneNumber = (phone: string) => {
    // Basic phone number formatting
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-7 px-2 gap-1 text-xs font-medium"
          aria-label="SMS Notifications"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>SMS</span>
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="h-4 min-w-[16px] flex items-center justify-center px-1 text-[10px] ml-0.5"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Text Messages</h3>
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {unreadCount} unread {unreadCount === 1 ? 'message' : 'messages'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs"
              >
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
              <p className="text-sm font-medium text-muted-foreground">
                No unread messages
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="px-4 py-3 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleViewMessage(message)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-medium text-sm">
                      {formatPhoneNumber(message.from)}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(message.receivedAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {message.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t px-4 py-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleViewAllMessages}
          >
            View All Messages
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
