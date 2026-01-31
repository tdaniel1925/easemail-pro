/**
 * Event Preview Card
 * Displays calendar event details from .ics attachments in email view
 * Shows event info, conflict warnings, and RSVP buttons
 */

'use client';

import { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, Clock, AlertTriangle, Check, Video, ExternalLink, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { format, differenceInMinutes } from 'date-fns';

interface EventPreviewCardProps {
  icsAttachmentId: string;
  emailId: string;
  onRsvp?: (response: 'accepted' | 'tentative' | 'declined') => Promise<void>;
}

interface ParsedEvent {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  attendees?: Array<{
    email: string;
    name?: string;
    status?: string;
  }>;
  organizer?: {
    email: string;
    name?: string;
  };
  recurrenceRule?: string;
}

interface ConflictEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
}

export function EventPreviewCard({ icsAttachmentId, emailId, onRsvp }: EventPreviewCardProps) {
  const { toast } = useToast();
  const [event, setEvent] = useState<ParsedEvent | null>(null);
  const [conflicts, setConflicts] = useState<ConflictEvent[]>([]);
  const [existingResponse, setExistingResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEventPreview();
  }, [icsAttachmentId]);

  const loadEventPreview = async () => {
    try {
      setLoading(true);
      setError(null);

      // Parse .ics attachment
      const response = await fetch(`/api/calendar/parse-ics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attachmentId: icsAttachmentId,
          emailId: emailId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to parse calendar event');
      }

      const data = await response.json();
      setEvent(data.event);

      // Check for conflicts with existing events
      if (data.event?.startTime && data.event?.endTime) {
        await checkConflicts(data.event.startTime, data.event.endTime);
      }

      // Check if user already responded to this event
      if (data.event?.uid) {
        await checkExistingResponse(data.event.uid);
      }
    } catch (error) {
      console.error('Error loading event preview:', error);
      setError(error instanceof Error ? error.message : 'Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const checkConflicts = async (startTime: string, endTime: string) => {
    try {
      const start = new Date(startTime).getTime() / 1000;
      const end = new Date(endTime).getTime() / 1000;

      const response = await fetch(
        `/api/calendar/events?start=${start}&end=${end}`
      );

      if (response.ok) {
        const data = await response.json();
        const conflictingEvents = (data.events || []).filter((e: any) =>
          new Date(e.startTime) < new Date(endTime) &&
          new Date(e.endTime) > new Date(startTime)
        );
        setConflicts(conflictingEvents);
      }
    } catch (error) {
      console.error('Error checking conflicts:', error);
    }
  };

  const checkExistingResponse = async (eventUid: string) => {
    try {
      // Check if event already exists in user's calendar
      const response = await fetch(`/api/calendar/events?uid=${eventUid}`);
      if (response.ok) {
        const data = await response.json();
        if (data.events && data.events.length > 0) {
          setExistingResponse('accepted');
        }
      }
    } catch (error) {
      console.error('Error checking existing response:', error);
    }
  };

  const handleRsvp = async (response: 'accepted' | 'tentative' | 'declined') => {
    try {
      setProcessing(true);

      if (onRsvp) {
        await onRsvp(response);
      }

      setExistingResponse(response);

      toast({
        title: 'Response Sent',
        description: `You have ${response} this invitation.`,
      });
    } catch (error) {
      console.error('Error sending RSVP:', error);
      toast({
        title: 'Failed to Send Response',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'EEEE, MMMM d, yyyy \'at\' h:mm a');
    } catch {
      return dateString;
    }
  };

  const getDuration = (startTime: string, endTime: string) => {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const minutes = differenceInMinutes(end, start);

      if (minutes < 60) {
        return `${minutes} minutes`;
      }

      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;

      if (remainingMinutes === 0) {
        return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
      }

      return `${hours}h ${remainingMinutes}m`;
    } catch {
      return 'Unknown';
    }
  };

  const extractMeetingLink = (text?: string) => {
    if (!text) return null;

    const patterns = {
      zoom: /https?:\/\/[^\s]*zoom\.us\/[^\s]*/i,
      googleMeet: /https?:\/\/meet\.google\.com\/[^\s]*/i,
      teams: /https?:\/\/teams\.microsoft\.com\/[^\s]*/i,
      webex: /https?:\/\/[^\s]*webex\.com\/[^\s]*/i,
    };

    for (const [platform, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match) {
        return { platform, url: match[0] };
      }
    }

    return null;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Link copied to clipboard',
    });
  };

  if (loading) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !event) {
    return (
      <Card className="mt-4 border-destructive/50">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Unable to load calendar event details'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const meetingLink = extractMeetingLink(event.description) || extractMeetingLink(event.location);

  return (
    <Card className="mt-4 border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Meeting Invitation</CardTitle>
          </div>
          {existingResponse && (
            <Badge
              variant={existingResponse === 'accepted' ? 'default' : 'secondary'}
              className="gap-1"
            >
              <Check className="h-3 w-3" />
              {existingResponse === 'accepted'
                ? 'Accepted'
                : existingResponse === 'tentative'
                ? 'Tentative'
                : 'Declined'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Event Title */}
        <div>
          <h3 className="text-lg font-semibold">{event.title}</h3>
        </div>

        {/* Date & Time */}
        <div className="flex items-start gap-2 text-sm">
          <Clock className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="font-medium">{formatDateTime(event.startTime)}</p>
            <p className="text-muted-foreground">
              Duration: {getDuration(event.startTime, event.endTime)}
            </p>
          </div>
        </div>

        {/* Location */}
        {event.location && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <p>{event.location}</p>
          </div>
        )}

        {/* Meeting Link */}
        {meetingLink && (
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-background">
            <Video className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium capitalize">{meetingLink.platform} Meeting</p>
              <p className="text-xs text-muted-foreground truncate">{meetingLink.url}</p>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(meetingLink.url)}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => window.open(meetingLink.url, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Attendees */}
        {event.attendees && event.attendees.length > 0 && (
          <div className="flex items-start gap-2 text-sm">
            <Users className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="font-medium">{event.attendees.length} attendees</p>
              <p className="text-muted-foreground">
                {event.attendees.slice(0, 3).map((a) => a.name || a.email).join(', ')}
                {event.attendees.length > 3 && ` +${event.attendees.length - 3} more`}
              </p>
            </div>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div className="text-sm text-muted-foreground">
            <p className="line-clamp-3 whitespace-pre-wrap">{event.description}</p>
          </div>
        )}

        {/* Conflict Warning */}
        {conflicts.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Scheduling Conflict:</strong> This event overlaps with {conflicts.length}{' '}
              existing event{conflicts.length > 1 ? 's' : ''}.
              <ul className="mt-2 ml-4 list-disc space-y-1">
                {conflicts.slice(0, 2).map((c) => (
                  <li key={c.id}>
                    {c.title} at {formatDateTime(c.startTime)}
                  </li>
                ))}
                {conflicts.length > 2 && <li>+{conflicts.length - 2} more conflicts</li>}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* RSVP Buttons */}
        {!existingResponse && (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => handleRsvp('accepted')}
              disabled={processing}
              className="flex-1"
            >
              {processing ? 'Processing...' : 'Accept'}
            </Button>
            <Button
              onClick={() => handleRsvp('tentative')}
              disabled={processing}
              variant="outline"
              className="flex-1"
            >
              Maybe
            </Button>
            <Button
              onClick={() => handleRsvp('declined')}
              disabled={processing}
              variant="outline"
              className="flex-1"
            >
              Decline
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
