/**
 * React Hook for MS Teams Integration
 *
 * Provides easy access to MS Teams features from React components
 */

import { useState, useEffect, useCallback } from 'react';

// Types
export interface MSTeam {
  id: string;
  displayName: string;
  description?: string;
  webUrl?: string;
  isArchived?: boolean;
}

export interface MSChannel {
  id: string;
  displayName: string;
  description?: string;
  webUrl?: string;
  membershipType?: 'standard' | 'private' | 'shared';
}

export interface MSChat {
  id: string;
  chatType: 'oneOnOne' | 'group' | 'meeting';
  topic?: string;
  members?: Array<{
    displayName: string;
    email?: string;
  }>;
  lastUpdatedDateTime?: string;
}

export interface MSMessage {
  id: string;
  content: string;
  contentType: 'text' | 'html';
  sender?: {
    id?: string;
    displayName?: string;
  };
  attachments?: any[];
  createdDateTime: string;
  isFromMe?: boolean;
}

export interface MSMeeting {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  joinUrl?: string;
  webLink?: string;
  organizer?: { address: string; name?: string };
  attendees?: Array<{ email: string; name?: string; status?: string }>;
}

export interface MSPresence {
  availability: 'Available' | 'Busy' | 'DoNotDisturb' | 'BeRightBack' | 'Away' | 'Offline';
  activity: string;
}

export function useMSTeams() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [teams, setTeams] = useState<MSTeam[]>([]);
  const [chats, setChats] = useState<MSChat[]>([]);
  const [presence, setPresence] = useState<MSPresence | null>(null);
  const [meetings, setMeetings] = useState<MSMeeting[]>([]);

  // Check if MS Teams is connected
  const checkConnection = useCallback(async () => {
    try {
      const response = await fetch('/api/ms-graph/teams');
      if (response.ok) {
        setIsConnected(true);
        const data = await response.json();
        setTeams(data.teams || []);
      } else if (response.status === 404) {
        setIsConnected(false);
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Failed to check MS Teams connection:', error);
      setIsConnected(false);
    }
  }, []);

  // Connect to MS Teams (redirect to OAuth)
  const connect = useCallback(() => {
    window.location.href = '/api/ms-graph/auth';
  }, []);

  // Load teams
  const loadTeams = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ms-graph/teams');
      if (!response.ok) throw new Error('Failed to load teams');
      const data = await response.json();
      setTeams(data.teams || []);
      return data.teams;
    } catch (error) {
      console.error('Failed to load teams:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load channels for a team
  const loadChannels = useCallback(async (teamId: string): Promise<MSChannel[]> => {
    try {
      const response = await fetch(`/api/ms-graph/teams?teamId=${teamId}`);
      if (!response.ok) throw new Error('Failed to load channels');
      const data = await response.json();
      return data.channels || [];
    } catch (error) {
      console.error('Failed to load channels:', error);
      return [];
    }
  }, []);

  // Load chats
  const loadChats = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ms-graph/chats');
      if (!response.ok) throw new Error('Failed to load chats');
      const data = await response.json();
      setChats(data.chats || []);
      return data.chats;
    } catch (error) {
      console.error('Failed to load chats:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load chat messages
  const loadChatMessages = useCallback(async (chatId: string): Promise<MSMessage[]> => {
    try {
      const response = await fetch(`/api/ms-graph/chats?chatId=${chatId}`);
      if (!response.ok) throw new Error('Failed to load messages');
      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('Failed to load chat messages:', error);
      return [];
    }
  }, []);

  // Send chat message
  const sendChatMessage = useCallback(async (chatId: string, content: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/ms-graph/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, content }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return true;
    } catch (error) {
      console.error('Failed to send chat message:', error);
      return false;
    }
  }, []);

  // Load channel messages
  const loadChannelMessages = useCallback(async (teamId: string, channelId: string): Promise<MSMessage[]> => {
    try {
      const response = await fetch(`/api/ms-graph/messages?teamId=${teamId}&channelId=${channelId}`);
      if (!response.ok) throw new Error('Failed to load messages');
      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('Failed to load channel messages:', error);
      return [];
    }
  }, []);

  // Send channel message
  const sendChannelMessage = useCallback(async (
    teamId: string,
    channelId: string,
    content: string,
    replyToMessageId?: string
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/ms-graph/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, channelId, content, replyToMessageId }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return true;
    } catch (error) {
      console.error('Failed to send channel message:', error);
      return false;
    }
  }, []);

  // Load meetings
  const loadMeetings = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ms-graph/meetings');
      if (!response.ok) throw new Error('Failed to load meetings');
      const data = await response.json();
      setMeetings(data.meetings || []);
      return data.meetings;
    } catch (error) {
      console.error('Failed to load meetings:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create meeting
  const createMeeting = useCallback(async (params: {
    subject: string;
    startDateTime: string;
    endDateTime: string;
    attendees?: string[];
    body?: string;
    timeZone?: string;
  }): Promise<MSMeeting | null> => {
    try {
      const response = await fetch('/api/ms-graph/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!response.ok) throw new Error('Failed to create meeting');
      const data = await response.json();
      return data.meeting;
    } catch (error) {
      console.error('Failed to create meeting:', error);
      return null;
    }
  }, []);

  // Load presence
  const loadPresence = useCallback(async () => {
    try {
      const response = await fetch('/api/ms-graph/presence');
      if (!response.ok) throw new Error('Failed to load presence');
      const data = await response.json();
      setPresence(data.presence);
      return data.presence;
    } catch (error) {
      console.error('Failed to load presence:', error);
      return null;
    }
  }, []);

  // Set presence
  const setMyPresence = useCallback(async (
    availability: MSPresence['availability'],
    activity: string
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/ms-graph/presence', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability, activity }),
      });
      if (!response.ok) throw new Error('Failed to set presence');
      setPresence({ availability, activity });
      return true;
    } catch (error) {
      console.error('Failed to set presence:', error);
      return false;
    }
  }, []);

  // Check connection on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return {
    // State
    isConnected,
    isLoading,
    teams,
    chats,
    presence,
    meetings,

    // Actions
    connect,
    checkConnection,
    loadTeams,
    loadChannels,
    loadChats,
    loadChatMessages,
    sendChatMessage,
    loadChannelMessages,
    sendChannelMessage,
    loadMeetings,
    createMeeting,
    loadPresence,
    setMyPresence,
  };
}
