/**
 * Teams Calendar View Component
 * Shows Teams calendar events with ability to create meetings and RSVP
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Users,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
  Check,
  X,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  isSameDay,
  isToday,
  isTomorrow,
  startOfDay,
  endOfDay,
  addHours,
} from 'date-fns';

interface CalendarEvent {
  id: string;
  subject: string;
  bodyPreview?: string;
  body?: { contentType: string; content: string };
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  attendees?: Array<{
    emailAddress: { address: string; name: string };
    type: string;
    status: { response: string; time?: string };
  }>;
  organizer?: { emailAddress: { address: string; name: string } };
  isOnlineMeeting: boolean;
  onlineMeeting?: { joinUrl: string };
  isAllDay: boolean;
  isCancelled: boolean;
  isOrganizer: boolean;
  responseStatus: { response: string; time?: string };
  showAs: string;
  importance: string;
  webLink?: string;
}

interface TeamsCalendarViewProps {
  accountId?: string;
}

export function TeamsCalendarView({ accountId }: TeamsCalendarViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRsvping, setIsRsvping] = useState(false);

  const { toast } = useToast();

  // New meeting form state
  const [newMeeting, setNewMeeting] = useState({
    subject: '',
    startDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    endDate: format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
    location: '',
    body: '',
    isOnlineMeeting: true,
    attendees: '',
  });

  const fetchEvents = useCallback(async () => {
    if (!accountId) return;

    try {
      setIsLoading(true);
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

      const params = new URLSearchParams({
        accountId,
        startDateTime: currentWeekStart.toISOString(),
        endDateTime: weekEnd.toISOString(),
        top: '50',
      });

      const response = await fetch(`/api/teams/calendar?${params}`);
      const data = await response.json();

      if (data.success && data.events) {
        setEvents(data.events);
      } else {
        console.error('Error fetching events:', data.error);
      }
    } catch (error) {
      console.error('Error fetching Teams calendar:', error);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, currentWeekStart]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handlePrevWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const handleToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const handleCreateMeeting = async () => {
    if (!accountId || !newMeeting.subject.trim()) return;

    try {
      setIsCreating(true);

      const attendeesList = newMeeting.attendees
        .split(',')
        .map(e => e.trim())
        .filter(e => e)
        .map(email => ({ email }));

      const response = await fetch('/api/teams/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          subject: newMeeting.subject,
          startDateTime: new Date(newMeeting.startDate).toISOString(),
          endDateTime: new Date(newMeeting.endDate).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          location: newMeeting.location || undefined,
          body: newMeeting.body || undefined,
          isOnlineMeeting: newMeeting.isOnlineMeeting,
          attendees: attendeesList.length > 0 ? attendeesList : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Meeting created',
          description: newMeeting.isOnlineMeeting
            ? 'Your Teams meeting has been scheduled'
            : 'Your calendar event has been created',
        });
        setIsCreateOpen(false);
        setNewMeeting({
          subject: '',
          startDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
          endDate: format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
          location: '',
          body: '',
          isOnlineMeeting: true,
          attendees: '',
        });
        fetchEvents();
      } else {
        throw new Error(data.error || 'Failed to create meeting');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create meeting',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRsvp = async (eventId: string, response: 'accept' | 'tentativelyAccept' | 'decline') => {
    if (!accountId) return;

    try {
      setIsRsvping(true);

      const res = await fetch('/api/teams/calendar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          eventId,
          action: 'rsvp',
          response,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const responseText = response === 'accept' ? 'accepted' : response === 'decline' ? 'declined' : 'tentatively accepted';
        toast({
          title: 'Response sent',
          description: `You have ${responseText} the meeting invitation`,
        });
        fetchEvents();
        setSelectedEvent(null);
      } else {
        throw new Error(data.error || 'Failed to send response');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send response',
        variant: 'destructive',
      });
    } finally {
      setIsRsvping(false);
    }
  };

  const groupEventsByDay = (events: CalendarEvent[]) => {
    const groups: Record<string, CalendarEvent[]> = {};

    events.forEach(event => {
      const date = format(parseISO(event.start.dateTime), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, events]) => ({
        date,
        events: events.sort((a, b) =>
          parseISO(a.start.dateTime).getTime() - parseISO(b.start.dateTime).getTime()
        ),
      }));
  };

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMMM d');
  };

  const getResponseBadge = (response: string) => {
    switch (response) {
      case 'accepted':
        return <Badge className="bg-green-100 text-green-700">Accepted</Badge>;
      case 'declined':
        return <Badge className="bg-red-100 text-red-700">Declined</Badge>;
      case 'tentativelyAccepted':
        return <Badge className="bg-yellow-100 text-yellow-700">Tentative</Badge>;
      case 'notResponded':
        return <Badge variant="outline">Not responded</Badge>;
      default:
        return null;
    }
  };

  if (!accountId) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-muted-foreground">No Teams account connected</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Calendar Navigation */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-4 font-medium">
            {format(currentWeekStart, 'MMM d')} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchEvents} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-[#6264A7] hover:bg-[#6264A7]/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Meeting
          </Button>
        </div>
      </div>

      {/* Events List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No events this week</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your calendar is clear for this week
            </p>
            <Button onClick={() => setIsCreateOpen(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Schedule a meeting
            </Button>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {groupEventsByDay(events).map(({ date, events }) => (
              <div key={date}>
                <h3 className={cn(
                  "text-sm font-medium mb-3 sticky top-0 bg-background py-1",
                  isToday(parseISO(date)) && "text-[#6264A7]"
                )}>
                  {getDateLabel(date)}
                </h3>
                <div className="space-y-2">
                  {events.map(event => (
                    <Card
                      key={event.id}
                      className={cn(
                        "cursor-pointer hover:shadow-md transition-shadow",
                        event.isCancelled && "opacity-60"
                      )}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {event.isOnlineMeeting && (
                                <Video className="h-4 w-4 text-[#6264A7] flex-shrink-0" />
                              )}
                              <h4 className={cn(
                                "font-medium truncate",
                                event.isCancelled && "line-through"
                              )}>
                                {event.subject}
                              </h4>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {event.isAllDay ? (
                                  'All day'
                                ) : (
                                  `${format(parseISO(event.start.dateTime), 'h:mm a')} - ${format(parseISO(event.end.dateTime), 'h:mm a')}`
                                )}
                              </span>
                              {event.location?.displayName && (
                                <span className="flex items-center gap-1 truncate">
                                  <MapPin className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{event.location.displayName}</span>
                                </span>
                              )}
                            </div>
                            {event.attendees && event.attendees.length > 0 && (
                              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                <Users className="h-3 w-3" />
                                <span>{event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {!event.isOrganizer && getResponseBadge(event.responseStatus.response)}
                            {event.isOrganizer && (
                              <Badge variant="secondary">Organizer</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent?.isOnlineMeeting && (
                <Video className="h-5 w-5 text-[#6264A7]" />
              )}
              {selectedEvent?.subject}
            </DialogTitle>
            {selectedEvent?.isCancelled && (
              <Badge className="w-fit bg-red-100 text-red-700">Cancelled</Badge>
            )}
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              {/* Time */}
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {format(parseISO(selectedEvent.start.dateTime), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedEvent.isAllDay ? (
                      'All day'
                    ) : (
                      `${format(parseISO(selectedEvent.start.dateTime), 'h:mm a')} - ${format(parseISO(selectedEvent.end.dateTime), 'h:mm a')}`
                    )}
                  </p>
                </div>
              </div>

              {/* Location */}
              {selectedEvent.location?.displayName && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedEvent.location.displayName}</span>
                </div>
              )}

              {/* Teams Meeting Link */}
              {selectedEvent.onlineMeeting?.joinUrl && (
                <div className="flex items-center gap-3">
                  <Video className="h-4 w-4 text-[#6264A7]" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[#6264A7] border-[#6264A7]"
                    onClick={() => window.open(selectedEvent.onlineMeeting?.joinUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Join Teams Meeting
                  </Button>
                </div>
              )}

              {/* Organizer */}
              {selectedEvent.organizer && (
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      Organizer: {selectedEvent.organizer.emailAddress.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedEvent.organizer.emailAddress.address}
                    </p>
                  </div>
                </div>
              )}

              {/* Attendees */}
              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Attendees ({selectedEvent.attendees.length})
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1 pl-6">
                    {selectedEvent.attendees.map((attendee, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span>{attendee.emailAddress.name || attendee.emailAddress.address}</span>
                        {getResponseBadge(attendee.status.response)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedEvent.bodyPreview && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedEvent.bodyPreview}
                  </p>
                </div>
              )}

              {/* RSVP Buttons (only if not organizer) */}
              {!selectedEvent.isOrganizer && !selectedEvent.isCancelled && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-3">Your response</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={selectedEvent.responseStatus.response === 'accepted' ? 'default' : 'outline'}
                      className={selectedEvent.responseStatus.response === 'accepted' ? 'bg-green-600 hover:bg-green-700' : ''}
                      onClick={() => handleRsvp(selectedEvent.id, 'accept')}
                      disabled={isRsvping}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedEvent.responseStatus.response === 'tentativelyAccepted' ? 'default' : 'outline'}
                      className={selectedEvent.responseStatus.response === 'tentativelyAccepted' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                      onClick={() => handleRsvp(selectedEvent.id, 'tentativelyAccept')}
                      disabled={isRsvping}
                    >
                      <HelpCircle className="h-4 w-4 mr-1" />
                      Tentative
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedEvent.responseStatus.response === 'declined' ? 'default' : 'outline'}
                      className={selectedEvent.responseStatus.response === 'declined' ? 'bg-red-600 hover:bg-red-700' : ''}
                      onClick={() => handleRsvp(selectedEvent.id, 'decline')}
                      disabled={isRsvping}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              )}

              {/* Open in Outlook */}
              {selectedEvent.webLink && (
                <div className="pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => window.open(selectedEvent.webLink, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in Outlook
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Meeting Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule a Meeting</DialogTitle>
            <DialogDescription>
              Create a new calendar event or Teams meeting
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Title</Label>
              <Input
                id="subject"
                placeholder="Meeting title"
                value={newMeeting.subject}
                onChange={(e) => setNewMeeting(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={newMeeting.startDate}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={newMeeting.endDate}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location (optional)</Label>
              <Input
                id="location"
                placeholder="Meeting room or address"
                value={newMeeting.location}
                onChange={(e) => setNewMeeting(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="attendees">Attendees (optional)</Label>
              <Input
                id="attendees"
                placeholder="email1@example.com, email2@example.com"
                value={newMeeting.attendees}
                onChange={(e) => setNewMeeting(prev => ({ ...prev, attendees: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Separate multiple emails with commas</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Description (optional)</Label>
              <Textarea
                id="body"
                placeholder="Meeting agenda or notes"
                value={newMeeting.body}
                onChange={(e) => setNewMeeting(prev => ({ ...prev, body: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="isOnlineMeeting"
                  checked={newMeeting.isOnlineMeeting}
                  onCheckedChange={(checked) => setNewMeeting(prev => ({ ...prev, isOnlineMeeting: checked }))}
                />
                <Label htmlFor="isOnlineMeeting" className="cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-[#6264A7]" />
                    Add Teams meeting link
                  </span>
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateMeeting}
              disabled={!newMeeting.subject.trim() || isCreating}
              className="bg-[#6264A7] hover:bg-[#6264A7]/90"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Meeting
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
