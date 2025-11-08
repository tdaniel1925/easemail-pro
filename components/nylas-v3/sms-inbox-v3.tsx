/**
 * SMS Inbox v3
 * SMS messaging integrated with Nylas v3 inbox
 */

'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Phone, User, Clock, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn, getInitials, generateAvatarColor } from '@/lib/utils';

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

export function SMSInboxV3() {
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<SMSMessage | null>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

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

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4">
        <MessageSquare className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">No SMS Messages Yet</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          When contacts reply to your SMS messages, they'll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Message List */}
      <div className={cn(
        "flex-1 flex flex-col bg-background overflow-hidden",
        selectedMessage && "lg:max-w-md xl:max-w-lg"
      )}>
        {/* Header - Fixed */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Incoming SMS</h2>
            <span className="text-xs text-muted-foreground">
              ({messages.length})
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

        {/* Message List - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {messages.map((message) => {
            const avatarColor = generateAvatarColor(message.from);
            const isSelected = selectedMessage?.id === message.id;

            return (
              <div
                key={message.id}
                onClick={() => setSelectedMessage(message)}
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
                    {message.contact ? getInitials(message.contact.name) : <Phone className="h-5 w-5" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm truncate">
                        {message.contact?.name || message.from}
                      </p>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(message.sentAt), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {message.from}
                    </p>
                    <p className="text-sm text-foreground line-clamp-2">
                      {message.message}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Message Detail Panel (appears on larger screens) */}
      {selectedMessage && (
        <div className="hidden lg:flex flex-col flex-1 border-l border-border bg-card overflow-hidden">
          {/* Detail Header - Fixed */}
          <div className="flex-shrink-0 p-4 border-b border-border">
            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-base font-medium text-white flex-shrink-0"
                style={{ backgroundColor: generateAvatarColor(selectedMessage.from) }}
              >
                {selectedMessage.contact ? (
                  getInitials(selectedMessage.contact.name)
                ) : (
                  <Phone className="h-6 w-6" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  {selectedMessage.contact?.name || 'Unknown Contact'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedMessage.from}
                </p>
                {selectedMessage.contact?.email && (
                  <p className="text-xs text-muted-foreground">
                    {selectedMessage.contact.email}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Message Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              {/* Timestamp */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Received {format(new Date(selectedMessage.sentAt), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}
                </span>
              </div>

              {/* Message Body */}
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap">
                  {selectedMessage.message}
                </p>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 text-xs">
                <span className={cn(
                  "px-2 py-1 rounded-full font-medium",
                  selectedMessage.status === 'received'
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                    : "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300"
                )}>
                  {selectedMessage.status || 'received'}
                </span>
              </div>

              {/* Actions */}
              {selectedMessage.contact && (
                <div className="pt-4 border-t border-border">
                  <Button variant="outline" size="sm" className="w-full">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Reply via SMS
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
