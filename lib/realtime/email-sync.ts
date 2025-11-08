/**
 * Real-time Email Sync
 * Uses Supabase Realtime to notify frontend of email changes
 */

import { createClient } from '@/lib/supabase/client';

export type EmailSyncEvent = {
  type: 'message.created' | 'message.updated' | 'message.deleted' | 'folder.updated';
  accountId: string;
  messageId?: string;
  folderId?: string;
  timestamp: number;
};

/**
 * Subscribe to email sync events for an account
 */
export function subscribeToEmailSync(
  accountId: string,
  onEvent: (event: EmailSyncEvent) => void
): () => void {
  const supabase = createClient();

  // Use Supabase Realtime broadcast feature
  const channel = supabase.channel(`email-sync:${accountId}`);

  channel.on(
    'broadcast',
    { event: 'email-sync' },
    (payload: { payload: EmailSyncEvent }) => {
      console.log('[Realtime] Email sync event:', payload.payload);
      onEvent(payload.payload);
    }
  );

  channel.subscribe((status) => {
    console.log(`[Realtime] Channel status:`, status);
  });

  // Return cleanup function
  return () => {
    console.log('[Realtime] Unsubscribing from channel');
    supabase.removeChannel(channel);
  };
}

/**
 * Broadcast an email sync event (called from webhook handler)
 */
export async function broadcastEmailSync(event: EmailSyncEvent): Promise<void> {
  const supabase = createClient();

  const channel = supabase.channel(`email-sync:${event.accountId}`);

  await channel.send({
    type: 'broadcast',
    event: 'email-sync',
    payload: event,
  });

  console.log('[Realtime] Broadcasted email sync event:', event.type);
}
