/**
 * Simplified Rule Execution Engine
 *
 * Executes rule actions via Nylas API
 * Supports 4 core action types: move, mark_read, star, delete
 */

import type { SimpleAction, EmailMessage } from './types-simple';

/**
 * Execute a single action on an email via Nylas API
 */
export async function executeAction(
  action: SimpleAction,
  message: EmailMessage,
  grantId: string
): Promise<{ success: boolean; error?: string }> {
  const { id: messageId } = message;

  try {
    switch (action.type) {
      case 'move': {
        // Move message to folder
        const response = await fetch(`/api/nylas/messages/${messageId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grantId,
            folders: [action.folderId],
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          return { success: false, error: `Failed to move: ${error}` };
        }

        console.log(`[Rule Executor] Moved message ${messageId} to folder ${action.folderName}`);
        return { success: true };
      }

      case 'mark_read': {
        // Mark message as read
        const response = await fetch(`/api/nylas/messages/${messageId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grantId,
            unread: false,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          return { success: false, error: `Failed to mark read: ${error}` };
        }

        console.log(`[Rule Executor] Marked message ${messageId} as read`);
        return { success: true };
      }

      case 'star': {
        // Star/flag message
        const response = await fetch(`/api/nylas/messages/${messageId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grantId,
            starred: true,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          return { success: false, error: `Failed to star: ${error}` };
        }

        console.log(`[Rule Executor] Starred message ${messageId}`);
        return { success: true };
      }

      case 'delete': {
        // Delete message
        const response = await fetch(`/api/nylas/messages/${messageId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ grantId }),
        });

        if (!response.ok) {
          const error = await response.text();
          return { success: false, error: `Failed to delete: ${error}` };
        }

        console.log(`[Rule Executor] Deleted message ${messageId}`);
        return { success: true };
      }

      default:
        return { success: false, error: `Unknown action type: ${(action as any).type}` };
    }
  } catch (error) {
    console.error(`[Rule Executor] Error executing action:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute multiple actions sequentially
 * Returns array of results for each action
 */
export async function executeActions(
  actions: SimpleAction[],
  message: EmailMessage,
  grantId: string
): Promise<Array<{ action: SimpleAction; success: boolean; error?: string }>> {
  const results = [];

  for (const action of actions) {
    const result = await executeAction(action, message, grantId);
    results.push({
      action,
      ...result,
    });

    // If an action fails, log it but continue with other actions
    if (!result.success) {
      console.error(`[Rule Executor] Action failed:`, result.error);
    }
  }

  return results;
}

/**
 * Get estimated execution time for an action (in ms)
 * Used for analytics
 */
export function getActionExecutionTime(action: SimpleAction): number {
  switch (action.type) {
    case 'move': return 1000; // Moving is slowest
    case 'mark_read': return 500;
    case 'star': return 500;
    case 'delete': return 800;
    default: return 500;
  }
}
