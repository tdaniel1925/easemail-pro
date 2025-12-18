/**
 * New Chat Dialog Component
 * Allows users to search for Microsoft users and start new Teams chats
 */

'use client';

import { useState, useCallback } from 'react';
import { Search, Loader2, User, MessageSquare, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface SearchUser {
  id: string;
  displayName: string;
  email: string;
  jobTitle?: string;
  department?: string;
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

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatCreated: (chat: TeamsChat) => void;
}

export function NewChatDialog({ open, onOpenChange, onChatCreated }: NewChatDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Search users when query changes
  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setUsers([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(`/api/teams/users/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search users');
      }

      setUsers(data.users || []);
    } catch (err) {
      console.error('User search error:', err);
      setError(err instanceof Error ? err.message : 'Failed to search users');
      setUsers([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Trigger search when debounced query changes
  useState(() => {
    if (debouncedSearch) {
      searchUsers(debouncedSearch);
    }
  });

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setSelectedUser(null);

    if (query.length >= 2) {
      searchUsers(query);
    } else {
      setUsers([]);
    }
  };

  // Create chat with selected user
  const handleCreateChat = async () => {
    if (!selectedUser) return;

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/teams/chats/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          userDisplayName: selectedUser.displayName,
          userEmail: selectedUser.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create chat');
      }

      // Reset state and close dialog
      setSearchQuery('');
      setUsers([]);
      setSelectedUser(null);
      onOpenChange(false);

      // Notify parent of new chat
      onChatCreated(data.chat);
    } catch (err) {
      console.error('Create chat error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create chat');
    } finally {
      setIsCreating(false);
    }
  };

  // Handle dialog close
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSearchQuery('');
      setUsers([]);
      setSelectedUser(null);
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#6264A7]" />
            New Teams Chat
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for a person..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-9"
              autoFocus
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Selected User */}
          {selectedUser && (
            <div className="flex items-center gap-3 p-3 rounded-md bg-[#6264A7]/10 border border-[#6264A7]/20">
              <div className="w-10 h-10 rounded-full bg-[#6264A7] flex items-center justify-center text-white font-medium">
                {selectedUser.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedUser.displayName}</p>
                <p className="text-sm text-muted-foreground truncate">{selectedUser.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSelectedUser(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Search Results */}
          {!selectedUser && users.length > 0 && (
            <div className="max-h-64 overflow-y-auto border rounded-md">
              {users.map((user) => (
                <button
                  key={user.id}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left",
                    "border-b last:border-b-0"
                  )}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.displayName}</p>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    {(user.jobTitle || user.department) && (
                      <p className="text-xs text-muted-foreground truncate">
                        {[user.jobTitle, user.department].filter(Boolean).join(' • ')}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!selectedUser && searchQuery.length >= 2 && !isSearching && users.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No users found for "{searchQuery}"</p>
            </div>
          )}

          {/* Initial State */}
          {!selectedUser && searchQuery.length < 2 && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Type at least 2 characters to search</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateChat}
              disabled={!selectedUser || isCreating}
              className="bg-[#6264A7] hover:bg-[#6264A7]/90"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Start Chat
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
