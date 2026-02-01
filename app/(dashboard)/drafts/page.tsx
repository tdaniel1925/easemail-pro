'use client';

import { useEffect, useState } from 'react';
import { useAccount } from '@/contexts/AccountContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, Trash2, Mail, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import EmailCompose from '@/components/email/EmailCompose';

interface Draft {
  id: string;
  accountId: string;
  toRecipients: Array<{ email: string; name?: string }>;
  cc?: Array<{ email: string; name?: string }>;
  bcc?: Array<{ email: string; name?: string }>;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  attachments?: any[];
  createdAt: Date;
  updatedAt: Date;
}

export default function DraftsPage() {
  const { selectedAccount } = useAccount();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDrafts = async () => {
    if (!selectedAccount) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/nylas-v3/drafts?accountId=${selectedAccount.id}`);
      const data = await response.json();

      if (data.success) {
        setDrafts(data.drafts);
      } else {
        toast({
          title: 'Failed to load drafts',
          description: data.error || 'Unknown error',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching drafts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load drafts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, [selectedAccount]);

  const handleEditDraft = (draft: Draft) => {
    setSelectedDraft(draft);
    setIsComposeOpen(true);
  };

  const handleDeleteDraft = async (draftId: string) => {
    if (!confirm('Are you sure you want to delete this draft?')) {
      return;
    }

    setDeletingId(draftId);

    try {
      const response = await fetch(`/api/nylas-v3/drafts?draftId=${draftId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Draft deleted',
          description: 'The draft has been deleted successfully.',
        });
        // Refresh drafts list
        fetchDrafts();
      } else {
        toast({
          title: 'Failed to delete draft',
          description: data.error || 'Unknown error',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete draft',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleComposeClose = () => {
    setIsComposeOpen(false);
    setSelectedDraft(null);
    // Refresh drafts list in case draft was sent
    fetchDrafts();
  };

  const formatRecipients = (recipients: Array<{ email: string; name?: string }>) => {
    if (recipients.length === 0) return 'No recipients';
    if (recipients.length === 1) return recipients[0].name || recipients[0].email;
    return `${recipients[0].name || recipients[0].email} + ${recipients.length - 1} more`;
  };

  const stripHtml = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  if (!selectedAccount) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle>No Account Selected</CardTitle>
            <CardDescription>
              Please select an email account to view your drafts
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading drafts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Drafts
          </h1>
          <p className="text-muted-foreground mt-2">
            {drafts.length} {drafts.length === 1 ? 'draft' : 'drafts'}
          </p>
        </div>

        {drafts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Drafts</h3>
              <p className="text-sm text-muted-foreground">
                Your saved drafts will appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {drafts.map((draft) => {
              const preview = stripHtml(draft.bodyHtml).substring(0, 150);
              const isDeleting = deletingId === draft.id;

              return (
                <Card
                  key={draft.id}
                  className="hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => !isDeleting && handleEditDraft(draft)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Subject */}
                        <h3 className="font-semibold text-lg mb-2 truncate">
                          {draft.subject || '(No Subject)'}
                        </h3>

                        {/* Recipients */}
                        <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">
                            To: {formatRecipients(draft.toRecipients)}
                          </span>
                          {draft.cc && draft.cc.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              +{draft.cc.length} CC
                            </Badge>
                          )}
                        </div>

                        {/* Preview */}
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {preview}
                          {preview.length >= 150 && '...'}
                        </p>

                        {/* Last Updated */}
                        <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Last edited {formatDistanceToNow(new Date(draft.updatedAt))} ago
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteDraft(draft.id)}
                          disabled={isDeleting}
                          className="h-8 w-8"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Compose Modal for Editing Draft */}
      <EmailCompose
        isOpen={isComposeOpen}
        onClose={handleComposeClose}
        draft={selectedDraft as any}
        type="compose"
        accountId={selectedAccount?.id}
      />
    </>
  );
}
