import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface ThreadEmail {
  id: string;
  subject: string;
  fromEmail: string;
  fromName: string | null;
  receivedAt: Date | null;
  snippet: string | null;
  isRead: boolean | null;
  hasAttachments: boolean | null;
}

export interface ThreadParticipant {
  id: string;
  email: string;
  name: string | null;
  messageCount: number | null;
}

export interface ThreadTimelineEvent {
  id: string;
  eventType: string;
  actor: string | null;
  summary: string | null;
  occurredAt: Date;
}

export interface Thread {
  id: string;
  subject: string | null;
  emailCount: number | null;
  participantCount: number | null;
  attachmentCount: number | null;
  isRead: boolean | null;
  isStarred: boolean | null;
  isMuted: boolean | null;
  hasUnread: boolean | null;
  aiSummary: string | null;
  aiCategory: string | null;
  aiSentiment: string | null;
  decisions: Array<{
    decision: string;
    madeBy: string;
    madeAt: string;
    emailId: string;
  }> | null;
  actionItems: Array<{
    item: string;
    assignedTo?: string;
    dueDate?: string;
    status: 'pending' | 'completed';
    emailId: string;
  }> | null;
  keyTopics: string[] | null;
  firstEmailAt: Date | null;
  lastEmailAt: Date | null;
  needsReply: boolean | null;
  participants: ThreadParticipant[];
  timelineEvents: ThreadTimelineEvent[];
  emails: ThreadEmail[];
}

/**
 * Hook to fetch thread details
 */
export function useThread(threadId: string | null, options?: { enabled?: boolean }) {
  return useQuery<Thread | null>({
    queryKey: ['thread', threadId],
    queryFn: async () => {
      if (!threadId) return null;

      const response = await fetch(`/api/threads/${threadId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch thread');
      }
      const data = await response.json();
      return data.thread;
    },
    enabled: !!threadId && (options?.enabled !== false),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to update thread (mute, archive, star, etc.)
 */
export function useUpdateThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      threadId,
      action,
      value,
      actionIndex,
    }: {
      threadId: string;
      action: 'mute' | 'archive' | 'star' | 'mark_read' | 'complete_action';
      value?: boolean;
      actionIndex?: number;
    }) => {
      const response = await fetch(`/api/threads/${threadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, value, actionIndex }),
      });

      if (!response.ok) {
        throw new Error('Failed to update thread');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate thread query
      queryClient.invalidateQueries({ queryKey: ['thread', variables.threadId] });
    },
  });
}

/**
 * Hook to generate thread summary
 */
export function useGenerateThreadSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (threadId: string) => {
      const response = await fetch(`/api/threads/${threadId}/summarize`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      return response.json();
    },
    onSuccess: (data, threadId) => {
      // Update the thread cache with new summary
      queryClient.setQueryData(['thread', threadId], data.thread);
    },
  });
}

