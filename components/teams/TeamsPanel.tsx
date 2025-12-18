/**
 * Teams Panel Component
 * Main panel for Teams integration showing chat list and conversation view
 */

'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Settings, Plus, Loader2, ArrowLeft, Inbox, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { TeamsChatList } from './TeamsChatList';
import { TeamsChatView } from './TeamsChatView';
import { TeamsConnectButton } from './TeamsConnectButton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import EaseMailLogoFull from '@/components/ui/EaseMailLogoFull';

interface TeamsAccount {
  id: string;
  email: string;
  displayName: string | null;
  syncStatus: string;
  lastSyncAt: string | null;
  lastError: string | null;
  isActive: boolean;
}

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

export function TeamsPanel() {
  const [accounts, setAccounts] = useState<TeamsAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<TeamsChat | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/teams/accounts');
      const data = await response.json();

      if (data.accounts) {
        setAccounts(data.accounts);
      }
    } catch (error) {
      console.error('Error fetching Teams accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountConnected = () => {
    fetchAccounts();
  };

  const handleSelectChat = (chat: TeamsChat) => {
    setSelectedChat(chat);
  };

  const handleBackToList = () => {
    setSelectedChat(null);
  };

  // Header component with navigation
  const Header = () => (
    <div className="flex items-center justify-between p-4 border-b bg-background">
      <div className="flex items-center gap-4">
        <Link href="/inbox">
          <EaseMailLogoFull className="h-8" />
        </Link>
        <div className="h-6 w-px bg-border" />
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-[#6264A7]" />
          <span className="font-semibold">Teams Chats</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link href="/inbox">
          <Button variant="outline" size="sm">
            <Inbox className="h-4 w-4 mr-2" />
            Back to Inbox
          </Button>
        </Link>
        {accounts.length > 0 && (
          <Button variant="ghost" size="sm" onClick={fetchAccounts}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header />
        <div className="flex flex-col items-center justify-center flex-1 p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">Loading Teams...</p>
        </div>
      </div>
    );
  }

  // No accounts connected
  if (accounts.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <Header />
        <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#6264A7]/10 flex items-center justify-center mb-4">
            <MessageSquare className="h-8 w-8 text-[#6264A7]" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Connect Microsoft Teams</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Connect your Microsoft Teams account to view and respond to Teams chats
            directly from EaseMail.
          </p>
          <TeamsConnectButton onConnected={handleAccountConnected} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex flex-1 min-h-0">
        {/* Chat List (always visible on desktop, hidden when chat selected on mobile) */}
        <div
          className={cn(
            "w-full lg:w-96 lg:border-r",
            selectedChat && "hidden lg:block"
          )}
        >
          <TeamsChatList
            onSelectChat={handleSelectChat}
            selectedChatId={selectedChat?.id}
          />
        </div>

        {/* Chat View (only visible when chat selected) */}
        {selectedChat ? (
          <div className="flex-1">
            <TeamsChatView
              chat={selectedChat}
              onBack={handleBackToList}
              currentUserId={currentUserId}
            />
          </div>
        ) : (
          // Empty state for desktop when no chat selected
          <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-8 text-center bg-muted/30">
            <div className="w-16 h-16 rounded-full bg-[#6264A7]/10 flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-[#6264A7]" />
            </div>
            <h3 className="text-lg font-medium mb-2">Select a chat</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Choose a conversation from the list to start messaging
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
