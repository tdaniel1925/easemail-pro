/**
 * Event Details Modal Component
 * Display calendar event information with meeting links
 */

'use client';

import { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Bell,
  Repeat,
  Video,
  ExternalLink,
  Edit,
  Trash2,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: any;
  onEdit?: () => void;
  onDelete?: () => void;
  onSuccess?: () => void;
}

interface MeetingLink {
  type: 'zoom' | 'google-meet' | 'teams' | 'webex' | 'other';
  url: string;
  label: string;
}

// Utility to strip HTML tags and decode HTML entities
function sanitizeEventText(text: string | undefined | null): string {
  if (!text) return '';

  // First, decode HTML entities
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const decoded = doc.documentElement.textContent || '';

  // Remove any remaining HTML tags
  return decoded.replace(/<[^>]*>/g, '').trim();
}

export default function EventDetailsModal({
  isOpen,
  onClose,
  event,
  onEdit,
  onDelete,
  onSuccess
}: EventDetailsModalProps) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!event) return null;

  // Extract meeting links from description, location, and metadata
  const extractMeetingLinks = (): MeetingLink[] => {
    const links: MeetingLink[] = [];
    const text = `${event.description || ''} ${event.location || ''} ${JSON.stringify(event.metadata || {})}`;

    // Zoom links
    const zoomRegex = /https?:\/\/[^\s]*zoom\.us\/[^\s]*/gi;
    const zoomMatches = text.match(zoomRegex);
    if (zoomMatches) {
      zoomMatches.forEach(url => {
        links.push({ type: 'zoom', url, label: 'Join Zoom Meeting' });
      });
    }

    // Google Meet links
    const meetRegex = /https?:\/\/[^\s]*meet\.google\.com\/[^\s]*/gi;
    const meetMatches = text.match(meetRegex);
    if (meetMatches) {
      meetMatches.forEach(url => {
        links.push({ type: 'google-meet', url, label: 'Join Google Meet' });
      });
    }

    // Microsoft Teams links
    const teamsRegex = /https?:\/\/[^\s]*teams\.microsoft\.com\/[^\s]*/gi;
    const teamsMatches = text.match(teamsRegex);
    if (teamsMatches) {
      teamsMatches.forEach(url => {
        links.push({ type: 'teams', url, label: 'Join Microsoft Teams' });
      });
    }

    // Webex links
    const webexRegex = /https?:\/\/[^\s]*webex\.com\/[^\s]*/gi;
    const webexMatches = text.match(webexRegex);
    if (webexMatches) {
      webexMatches.forEach(url => {
        links.push({ type: 'webex', url, label: 'Join Webex Meeting' });
      });
    }

    // Generic video call links
    const genericRegex = /https?:\/\/[^\s]*(meet|call|conference|video)[^\s]*/gi;
    const genericMatches = text.match(genericRegex);
    if (genericMatches) {
      genericMatches.forEach(url => {
        // Skip if already added
        if (!links.some(l => l.url === url)) {
          links.push({ type: 'other', url, label: 'Join Meeting' });
        }
      });
    }

    // Remove duplicates
    return Array.from(new Map(links.map(link => [link.url, link])).values());
  };

  const meetingLinks = extractMeetingLinks();

  const getMeetingIcon = (type: MeetingLink['type']) => {
    switch (type) {
      case 'zoom':
      case 'google-meet':
      case 'teams':
      case 'webex':
        return <Video className="h-4 w-4" />;
      default:
        return <ExternalLink className="h-4 w-4" />;
    }
  };

  const getMeetingColor = (type: MeetingLink['type']) => {
    switch (type) {
      case 'zoom':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'google-meet':
        return 'bg-green-500 hover:bg-green-600';
      case 'teams':
        return 'bg-purple-500 hover:bg-purple-600';
      case 'webex':
        return 'bg-orange-500 hover:bg-orange-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(text);
      toast({
        title: 'Copied!',
        description: `${label} copied to clipboard`,
      });
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the link manually',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/calendar/events/${event.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete event');
      }

      toast({
        title: 'Event Deleted',
        description: 'Event has been successfully deleted',
      });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const formatDateTime = (date: Date, allDay: boolean) => {
    if (allDay) {
      return format(date, 'EEEE, MMMM d, yyyy');
    }
    return format(date, 'EEEE, MMMM d, yyyy • h:mm a');
  };

  const startDate = new Date(event.startTime);
  const endDate = new Date(event.endTime);
  const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60)); // minutes
  const isPast = endDate < new Date();
  const isUpcoming = startDate > new Date();
  const timeUntil = isUpcoming ? formatDistanceToNow(startDate, { addSuffix: true }) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl pr-8">{sanitizeEventText(event.title)}</DialogTitle>
              {timeUntil && (
                <p className="text-sm text-muted-foreground mt-1">
                  Starts {timeUntil}
                </p>
              )}
            </div>
            <div className="flex gap-1">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onEdit();
                    onClose();
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && !showDeleteConfirm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteClick}
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Meeting Links - Prominent Display */}
          {meetingLinks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Video className="h-4 w-4" />
                Meeting Links
              </h3>
              <div className="space-y-2">
                {meetingLinks.map((link, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border"
                  >
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex-1 flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors ${getMeetingColor(link.type)}`}
                    >
                      {getMeetingIcon(link.type)}
                      <span className="font-medium">{link.label}</span>
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(link.url, link.label)}
                      className="shrink-0"
                    >
                      {copiedLink === link.url ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Date & Time */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">{formatDateTime(startDate, event.allDay)}</p>
                <p className="text-sm text-muted-foreground">
                  to {event.allDay ? format(endDate, 'EEEE, MMMM d, yyyy') : format(endDate, 'h:mm a')}
                </p>
                {!event.allDay && duration > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Duration: {duration >= 60 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : `${duration}m`}
                  </p>
                )}
                {event.timezone && event.timezone !== 'UTC' && (
                  <p className="text-xs text-muted-foreground">{event.timezone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Location */}
          {event.location && !meetingLinks.some(link => event.location.includes(link.url)) && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Location</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{sanitizeEventText(event.location)}</p>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Description</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{sanitizeEventText(event.description)}</p>
              </div>
            </div>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="font-medium mb-2">Attendees ({event.attendees.length})</p>
                <div className="space-y-2">
                  {event.attendees.map((attendee: any, index: number) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{attendee.name || attendee.email}</p>
                        {attendee.name && (
                          <p className="text-xs text-muted-foreground">{attendee.email}</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        attendee.status === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        attendee.status === 'declined' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        attendee.status === 'maybe' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {attendee.status || 'pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Organizer */}
          {event.organizerEmail && (
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Organizer</p>
                <p className="text-sm text-muted-foreground">{event.organizerEmail}</p>
              </div>
            </div>
          )}

          {/* Reminders */}
          {event.reminders && event.reminders.length > 0 && (
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Reminders</p>
                <div className="space-y-1 mt-1">
                  {event.reminders.map((reminder: any, index: number) => (
                    <p key={index} className="text-sm text-muted-foreground">
                      {reminder.minutesBefore >= 1440
                        ? `${Math.floor(reminder.minutesBefore / 1440)} day${Math.floor(reminder.minutesBefore / 1440) > 1 ? 's' : ''} before`
                        : reminder.minutesBefore >= 60
                        ? `${Math.floor(reminder.minutesBefore / 60)} hour${Math.floor(reminder.minutesBefore / 60) > 1 ? 's' : ''} before`
                        : `${reminder.minutesBefore} minute${reminder.minutesBefore > 1 ? 's' : ''} before`
                      } ({reminder.type})
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recurrence */}
          {event.isRecurring && event.recurrenceRule && (
            <div className="flex items-start gap-3">
              <Repeat className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Recurrence</p>
                <p className="text-sm text-muted-foreground">{event.recurrenceRule}</p>
                {event.recurrenceEndDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Until {format(new Date(event.recurrenceEndDate), 'MMMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Status Badge */}
          <div className="flex items-center gap-2 pt-4 border-t border-border flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              isPast ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' :
              isUpcoming ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
              'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            }`}>
              {isPast ? 'Past Event' : isUpcoming ? 'Upcoming' : 'In Progress'}
            </span>
            {event.status && event.status !== 'confirmed' && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                {event.status}
              </span>
            )}
            {/* Calendar Name Badge */}
            {event.calendarName && (
              <span
                className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5"
                style={{
                  backgroundColor: event.hexColor ? `${event.hexColor}20` : undefined,
                  color: event.hexColor || undefined,
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: event.hexColor || undefined,
                }}
              >
                <Calendar className="h-3 w-3" />
                <span>{event.calendarName}</span>
                {event.calendarIsPrimary && <span className="text-[10px]">(Primary)</span>}
              </span>
            )}
            {event.calendarType && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                event.color === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                event.color === 'green' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                event.color === 'red' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                event.color === 'purple' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                event.color === 'orange' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
              }`}>
                {event.calendarType}
              </span>
            )}
          </div>
        </div>

        {/* Delete Confirmation Banner */}
        {showDeleteConfirm && (
          <div className="p-4 bg-destructive/10 border-t border-destructive/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-destructive">Delete this event?</p>
                <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteCancel}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete Event'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
