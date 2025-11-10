/**
 * Drafts View Component
 * Displays list of saved email drafts and allows resuming/deleting them
 */

'use client';

import { useState, useEffect } from 'react';
import { FileEdit, Trash2, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface Draft {
  id: string;
  toRecipients: Array<{ email: string; name?: string }>;
  cc?: Array<{ email: string; name?: string }>;
  bcc?: Array<{ email: string; name?: string }>;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  attachments?: any[];
  replyToEmailId?: string | null;
  replyType?: string | null;
  updatedAt: string;
  createdAt: string;
}

interface DraftsViewProps {
  accountId: string;
  onResumeDraft: (draft: Draft) => void;
}

export function DraftsView({ accountId, onResumeDraft }: DraftsViewProps) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);

  // Fetch drafts for the account
  const fetchDrafts = async () => {
    if (!accountId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/nylas/drafts?accountId=${accountId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch drafts');
      }

      const data = await response.json();
      setDrafts(data.drafts || []);
    } catch (err) {
      console.error('Error fetching drafts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load drafts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, [accountId]);

  const handleDeleteDraft = async (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering resume

    if (!confirm('Are you sure you want to delete this draft?')) {
      return;
    }

    try {
      setDeletingDraftId(draftId);

      const response = await fetch(`/api/nylas/drafts?draftId=${draftId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete draft');
      }

      // Remove draft from state
      setDrafts(drafts.filter((d) => d.id !== draftId));
    } catch (err) {
      console.error('Error deleting draft:', err);
      alert('Failed to delete draft. Please try again.');
    } finally {
      setDeletingDraftId(null);
    }
  };

  const getRecipientSummary = (draft: Draft): string => {
    const recipients = draft.toRecipients || [];
    if (recipients.length === 0) return '(No recipients)';
    if (recipients.length === 1) return recipients[0].name || recipients[0].email;
    return `${recipients[0].name || recipients[0].email} +${recipients.length - 1}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-sm text-muted-foreground">Loading drafts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchDrafts} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8">
          <FileEdit className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No drafts</h3>
          <p className="text-sm text-muted-foreground">
            Your saved email drafts will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        <h2 className="text-2xl font-semibold mb-6">Drafts ({drafts.length})</h2>

        <div className="space-y-3">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              onClick={() => onResumeDraft(draft)}
              className="group relative border border-border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors"
            >
              {/* Header: Recipients and timestamp */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium truncate">
                    To: {getRecipientSummary(draft)}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(draft.updatedAt), { addSuffix: true })}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDeleteDraft(draft.id, e)}
                    disabled={deletingDraftId === draft.id}
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              {/* Subject */}
              <h3 className="font-medium text-sm mb-2 truncate">
                {draft.subject || '(No subject)'}
              </h3>

              {/* Body preview */}
              <p className="text-sm text-muted-foreground line-clamp-2">
                {draft.bodyText || draft.bodyHtml?.replace(/<[^>]*>/g, '') || '(No content)'}
              </p>

              {/* Attachments indicator */}
              {draft.attachments && draft.attachments.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {draft.attachments.length} attachment{draft.attachments.length > 1 ? 's' : ''}
                </div>
              )}

              {/* Reply indicator */}
              {draft.replyType && (
                <div className="mt-2 text-xs text-blue-600">
                  {draft.replyType === 'reply' && 'Reply'}
                  {draft.replyType === 'reply-all' && 'Reply All'}
                  {draft.replyType === 'forward' && 'Forward'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
