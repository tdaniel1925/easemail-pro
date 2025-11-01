'use client';

import { useState } from 'react';
import { useThread, useUpdateThread, useGenerateThreadSummary } from '@/lib/hooks/useThread';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  X,
  Users,
  Mail,
  Paperclip,
  Clock,
  Sparkles,
  CheckCircle2,
  Circle,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  Archive,
  VolumeX,
  Volume2,
  Star,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ThreadSummaryPanelProps {
  threadId: string;
  onEmailClick?: (emailId: string) => void;
  onClose?: () => void;
}

export function ThreadSummaryPanel({ threadId, onEmailClick, onClose }: ThreadSummaryPanelProps) {
  const { data: thread, isLoading, error } = useThread(threadId);
  const updateThread = useUpdateThread();
  const generateSummary = useGenerateThreadSummary();
  const [activeTab, setActiveTab] = useState<'summary' | 'timeline'>('summary');

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>Failed to load thread</p>
      </div>
    );
  }

  const handleMuteToggle = () => {
    updateThread.mutate({
      threadId,
      action: 'mute',
      value: !thread.isMuted,
    });
  };

  const handleArchiveToggle = () => {
    // Note: Thread interface doesn't have isArchived property - would need to add to schema
    updateThread.mutate({
      threadId,
      action: 'archive',
      value: true, // Always archive when clicked
    });
  };

  const handleStarToggle = () => {
    updateThread.mutate({
      threadId,
      action: 'star',
      value: !thread.isStarred,
    });
  };

  const handleCompleteAction = (actionIndex: number) => {
    updateThread.mutate({
      threadId,
      action: 'complete_action',
      actionIndex,
    });
  };

  const handleRegenerateSummary = () => {
    generateSummary.mutate(threadId);
  };

  return (
    <div className="border-t border-border bg-card/50 animate-in slide-in-from-top duration-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Thread Summary</span>
          <span className="text-xs text-muted-foreground">
            ({thread.emailCount || 0} emails)
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded-sm transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Thread Stats */}
      <div className="px-4 py-3 border-b border-border bg-background/50">
        <div className="flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{thread.participantCount || 0} participants</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            <span>{thread.emailCount || 0} emails</span>
          </div>
          {thread.attachmentCount ? (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Paperclip className="h-3.5 w-3.5" />
              <span>{thread.attachmentCount}</span>
            </div>
          ) : null}
          {thread.lastEmailAt && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatDistanceToNow(new Date(thread.lastEmailAt))} ago</span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 mt-3">
          <Button
            size="sm"
            variant={thread.isStarred ? 'default' : 'outline'}
            onClick={handleStarToggle}
            className="h-7 text-xs"
          >
            <Star className={cn('h-3 w-3 mr-1', thread.isStarred && 'fill-current')} />
            {thread.isStarred ? 'Starred' : 'Star'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleMuteToggle}
            className="h-7 text-xs"
          >
            {thread.isMuted ? (
              <>
                <Volume2 className="h-3 w-3 mr-1" />
                Unmute
              </>
            ) : (
              <>
                <VolumeX className="h-3 w-3 mr-1" />
                Mute
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleArchiveToggle}
            className="h-7 text-xs"
          >
            <Archive className="h-3 w-3 mr-1" />
            Archive
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-2 border-b border-border flex gap-2">
        <button
          onClick={() => setActiveTab('summary')}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-sm transition-colors',
            activeTab === 'summary'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          Summary
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-sm transition-colors',
            activeTab === 'timeline'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          Timeline
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-3 max-h-[500px] overflow-y-auto">
        {activeTab === 'summary' ? (
          <ThreadSummaryTab
            thread={thread}
            onEmailClick={onEmailClick}
            onCompleteAction={handleCompleteAction}
            onRegenerateSummary={handleRegenerateSummary}
            isRegenerating={generateSummary.isPending}
          />
        ) : (
          <ThreadTimelineTab thread={thread} onEmailClick={onEmailClick} />
        )}
      </div>
    </div>
  );
}

function ThreadSummaryTab({
  thread,
  onEmailClick,
  onCompleteAction,
  onRegenerateSummary,
  isRegenerating,
}: {
  thread: any;
  onEmailClick?: (emailId: string) => void;
  onCompleteAction: (index: number) => void;
  onRegenerateSummary: () => void;
  isRegenerating: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* AI Summary */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">AI Summary</h3>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onRegenerateSummary}
            disabled={isRegenerating}
            className="h-7 text-xs"
          >
            {isRegenerating ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 mr-1" />
                Regenerate
              </>
            )}
          </Button>
        </div>
        {thread.aiSummary ? (
          <div className="text-sm text-foreground bg-muted/50 rounded-md p-3 border border-border">
            {thread.aiSummary}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground italic">
            No summary available. Click "Regenerate" to generate one.
          </div>
        )}
      </div>

      {/* Category & Sentiment */}
      {(thread.aiCategory || thread.aiSentiment) && (
        <div className="flex items-center gap-2 text-xs">
          {thread.aiCategory && (
            <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">
              {thread.aiCategory}
            </span>
          )}
          {thread.aiSentiment && (
            <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
              {thread.aiSentiment}
            </span>
          )}
        </div>
      )}

      {/* Decisions */}
      {thread.decisions && thread.decisions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <h3 className="text-sm font-semibold">Decisions Made</h3>
          </div>
          <div className="space-y-2">
            {thread.decisions.map((decision: any, index: number) => (
              <div
                key={index}
                className="text-sm bg-green-500/10 border border-green-500/20 rounded-md p-2.5"
              >
                <p className="font-medium text-foreground">{decision.decision}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  By {decision.madeBy} • {new Date(decision.madeAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Items */}
      {thread.actionItems && thread.actionItems.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold">Action Items</h3>
          </div>
          <div className="space-y-2">
            {thread.actionItems.map((item: any, index: number) => (
              <div
                key={index}
                className={cn(
                  'text-sm bg-muted/50 border border-border rounded-md p-2.5 flex items-start gap-2',
                  item.status === 'completed' && 'opacity-60'
                )}
              >
                <button
                  onClick={() => onCompleteAction(index)}
                  className="mt-0.5 flex-shrink-0"
                  disabled={item.status === 'completed'}
                >
                  {item.status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={cn('font-medium', item.status === 'completed' && 'line-through')}>
                    {item.item}
                  </p>
                  {(item.assignedTo || item.dueDate) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.assignedTo && `Assigned to ${item.assignedTo}`}
                      {item.assignedTo && item.dueDate && ' • '}
                      {item.dueDate && `Due ${new Date(item.dueDate).toLocaleDateString()}`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Topics */}
      {thread.keyTopics && thread.keyTopics.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Key Topics</h3>
          <div className="flex flex-wrap gap-2">
            {thread.keyTopics.map((topic: string, index: number) => (
              <span
                key={index}
                className="px-2 py-1 text-xs rounded-full bg-muted text-foreground"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Thread Emails */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Thread Emails ({thread.emails?.length || 0})</h3>
        <div className="space-y-2">
          {thread.emails?.map((email: any) => (
            <button
              key={email.id}
              onClick={() => onEmailClick?.(email.id)}
              className="w-full text-left bg-muted/30 hover:bg-muted/60 border border-border rounded-md p-2.5 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {email.fromName || email.fromEmail}
                    </span>
                    {!email.isRead && (
                      <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {email.receivedAt
                      ? formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })
                      : 'Unknown date'}
                  </p>
                  {email.snippet && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {email.snippet}
                    </p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ThreadTimelineTab({
  thread,
  onEmailClick,
}: {
  thread: any;
  onEmailClick?: (emailId: string) => void;
}) {
  if (!thread.timelineEvents || thread.timelineEvents.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No timeline events</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {thread.timelineEvents.map((event: any, index: number) => (
        <div key={event.id} className="relative pl-6 pb-4">
          {/* Timeline line */}
          {index < thread.timelineEvents.length - 1 && (
            <div className="absolute left-2 top-6 bottom-0 w-px bg-border" />
          )}

          {/* Timeline dot */}
          <div className="absolute left-0 top-1.5 h-4 w-4 rounded-full bg-primary border-2 border-background" />

          {/* Event content */}
          <button
            onClick={() => onEmailClick?.(event.emailId)}
            className="w-full text-left bg-muted/30 hover:bg-muted/60 border border-border rounded-md p-2.5 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{event.summary}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {event.actor} •{' '}
                  {formatDistanceToNow(new Date(event.occurredAt), { addSuffix: true })}
                </p>
                {event.content && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.content}</p>
                )}
              </div>
            </div>
          </button>
        </div>
      ))}
    </div>
  );
}

