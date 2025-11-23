'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  MessageSquare,
  Users,
  Calendar,
  TrendingUp,
  Mail,
  ExternalLink,
  Loader2,
  Sparkles,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface ThreadEmail {
  id: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  snippet: string;
  receivedAt: Date;
  isRead: boolean;
}

interface ThreadSummary {
  threadId: string;
  emailCount: number;
  participants: Array<{ name: string; email: string; count: number }>;
  startDate: Date;
  lastActivity: Date;
  aiSummary: string;
  keyTopics: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  emails: ThreadEmail[];
}

interface ThreadSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threadId: string | null;
  onEmailClick: (emailId: string) => void;
}

export function ThreadSummaryModal({
  open,
  onOpenChange,
  threadId,
  onEmailClick,
}: ThreadSummaryModalProps) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ThreadSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && threadId) {
      fetchThreadSummary();
    }
  }, [open, threadId]);

  const fetchThreadSummary = async () => {
    if (!threadId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/emails/thread/${threadId}/summary`);
      const data = await response.json();

      if (data.success) {
        setSummary(data.summary);
      } else {
        setError(data.error || 'Failed to load thread summary');
      }
    } catch (err) {
      console.error('Error fetching thread summary:', err);
      setError('Failed to load thread summary');
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-primary/20 text-primary';
      case 'negative':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return '😊';
      case 'negative':
        return '😟';
      default:
        return '😐';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl">Thread Summary</DialogTitle>
              <DialogDescription>
                AI-powered conversation analysis
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-100px)]">
          <div className="p-6 pt-0 space-y-6">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive rounded-lg p-4 text-center">
                {error}
              </div>
            )}

            {summary && !loading && (
              <>
                {/* Overview Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Mail className="h-4 w-4" />
                      <span className="text-xs">Messages</span>
                    </div>
                    <p className="text-2xl font-bold">{summary.emailCount}</p>
                  </div>

                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Users className="h-4 w-4" />
                      <span className="text-xs">Participants</span>
                    </div>
                    <p className="text-2xl font-bold">{summary.participants.length}</p>
                  </div>

                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Calendar className="h-4 w-4" />
                      <span className="text-xs">Duration</span>
                    </div>
                    <p className="text-sm font-semibold">
                      {formatDistanceToNow(new Date(summary.startDate), { addSuffix: false })}
                    </p>
                  </div>

                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-xs">Sentiment</span>
                    </div>
                    <Badge className={getSentimentColor(summary.sentiment)}>
                      {getSentimentIcon(summary.sentiment)} {summary.sentiment}
                    </Badge>
                  </div>
                </div>

                {/* AI Summary */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">AI Summary</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {summary.aiSummary}
                  </p>
                </div>

                {/* Key Topics */}
                {summary.keyTopics.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Key Topics
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {summary.keyTopics.map((topic, index) => (
                        <Badge key={index} variant="secondary">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Participants */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Participants ({summary.participants.length})
                  </h3>
                  <div className="space-y-2">
                    {summary.participants.map((participant, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs">
                            {participant.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{participant.name}</p>
                            <p className="text-xs text-muted-foreground">{participant.email}</p>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {participant.count} message{participant.count !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Timeline */}
                <div>
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Thread Timeline ({summary.emails.length} messages)
                  </h3>
                  <div className="space-y-3">
                    {summary.emails.map((email, index) => (
                      <div key={email.id} className="relative">
                        {/* Timeline connector */}
                        {index < summary.emails.length - 1 && (
                          <div className="absolute left-4 top-12 bottom-0 w-px bg-border" />
                        )}

                        <div
                          className="flex gap-4 group cursor-pointer hover:bg-accent rounded-lg p-3 transition-colors"
                          onClick={() => {
                            onEmailClick(email.id);
                            onOpenChange(false);
                          }}
                        >
                          {/* Timeline dot */}
                          <div className="relative flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center z-10 relative">
                              <Mail className="h-4 w-4 text-primary" />
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {email.fromName}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {email.fromEmail}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(email.receivedAt), 'MMM d, h:mm a')}
                                </span>
                                {!email.isRead && (
                                  <div className="h-2 w-2 rounded-full bg-primary" />
                                )}
                              </div>
                            </div>

                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {email.snippet}
                            </p>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              View Email
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
