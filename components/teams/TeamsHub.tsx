/**
 * Teams Hub Component
 * Full Teams experience within EaseMail - view meetings, join with one click, start instant meetings
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Video,
  Calendar,
  Clock,
  Users,
  Play,
  ExternalLink,
  Loader2,
  RefreshCw,
  Plus,
  ChevronRight,
  Phone,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { format, parseISO, isToday, isTomorrow, addMinutes, differenceInMinutes, isPast, isFuture } from 'date-fns';
import { TeamsMeetingModal } from './TeamsMeetingModal';

interface CalendarEvent {
  id: string;
  subject: string;
  bodyPreview?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  attendees?: Array<{
    emailAddress: { address: string; name: string };
    type: string;
    status: { response: string };
  }>;
  organizer?: { emailAddress: { address: string; name: string } };
  isOnlineMeeting: boolean;
  onlineMeeting?: { joinUrl: string };
  isAllDay: boolean;
  isCancelled: boolean;
  isOrganizer: boolean;
  webLink?: string;
}

interface TeamsAccount {
  id: string;
  email: string;
  displayName?: string;
  isActive: boolean;
}

export function TeamsHub() {
  const [account, setAccount] = useState<TeamsAccount | null>(null);
  const [meetings, setMeetings] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAccount, setIsCheckingAccount] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isStartingInstant, setIsStartingInstant] = useState(false);

  const { toast } = useToast();

  // Check for Teams account
  useEffect(() => {
    checkTeamsAccount();
  }, []);

  const checkTeamsAccount = async () => {
    try {
      setIsCheckingAccount(true);
      const response = await fetch('/api/teams/accounts');
      const data = await response.json();

      if (data.accounts && data.accounts.length > 0) {
        setAccount(data.accounts[0]);
      } else {
        setAccount(null);
      }
    } catch (error) {
      console.error('Error checking Teams account:', error);
      setAccount(null);
    } finally {
      setIsCheckingAccount(false);
    }
  };

  // Fetch upcoming meetings
  const fetchMeetings = useCallback(async () => {
    if (!account) return;

    try {
      setIsLoading(true);
      const now = new Date();
      const endOfTomorrow = new Date();
      endOfTomorrow.setDate(endOfTomorrow.getDate() + 2);
      endOfTomorrow.setHours(23, 59, 59, 999);

      const params = new URLSearchParams({
        accountId: account.id,
        startDateTime: now.toISOString(),
        endDateTime: endOfTomorrow.toISOString(),
        teamsOnly: 'true',
        top: '20',
      });

      const response = await fetch(`/api/teams/calendar?${params}`);
      const data = await response.json();

      if (data.success && data.events) {
        // Filter to only show Teams meetings (online meetings)
        const teamsMeetings = data.events.filter((e: CalendarEvent) =>
          e.isOnlineMeeting && !e.isCancelled
        );
        setMeetings(teamsMeetings);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [account]);

  useEffect(() => {
    if (account) {
      fetchMeetings();
      // Refresh every 2 minutes
      const interval = setInterval(fetchMeetings, 120000);
      return () => clearInterval(interval);
    }
  }, [account, fetchMeetings]);

  // Start an instant meeting
  const startInstantMeeting = async () => {
    if (!account) return;

    try {
      setIsStartingInstant(true);

      const now = new Date();
      const end = addMinutes(now, 30);

      const response = await fetch('/api/teams/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          subject: `Quick Meeting - ${format(now, 'MMM d, h:mm a')}`,
          startDateTime: now.toISOString(),
          endDateTime: end.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          isOnlineMeeting: true,
        }),
      });

      const data = await response.json();

      if (data.success && data.joinUrl) {
        toast({
          title: 'Meeting created!',
          description: 'Opening Teams meeting...',
        });
        // Open the meeting immediately
        window.open(data.joinUrl, '_blank');
        fetchMeetings();
      } else {
        throw new Error(data.error || 'Failed to create meeting');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start meeting',
        variant: 'destructive',
      });
    } finally {
      setIsStartingInstant(false);
    }
  };

  // Join a meeting
  const joinMeeting = (joinUrl: string) => {
    window.open(joinUrl, '_blank');
  };

  // Get meeting status
  const getMeetingStatus = (meeting: CalendarEvent) => {
    const start = parseISO(meeting.start.dateTime);
    const end = parseISO(meeting.end.dateTime);
    const now = new Date();
    const minutesUntilStart = differenceInMinutes(start, now);

    if (isPast(end)) {
      return { status: 'ended', label: 'Ended', color: 'bg-gray-100 text-gray-600' };
    }
    if (isPast(start) && isFuture(end)) {
      return { status: 'live', label: 'Live Now', color: 'bg-red-100 text-red-700 animate-pulse' };
    }
    if (minutesUntilStart <= 5) {
      return { status: 'starting', label: 'Starting Soon', color: 'bg-yellow-100 text-yellow-700' };
    }
    if (minutesUntilStart <= 15) {
      return { status: 'upcoming', label: `In ${minutesUntilStart} min`, color: 'bg-blue-100 text-blue-700' };
    }
    return { status: 'scheduled', label: format(start, 'h:mm a'), color: 'bg-gray-100 text-gray-600' };
  };

  // Get date label
  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMM d');
  };

  // Group meetings by day
  const groupMeetingsByDay = () => {
    const groups: Record<string, CalendarEvent[]> = {};

    meetings.forEach(meeting => {
      const date = format(parseISO(meeting.start.dateTime), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(meeting);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, meetings]) => ({
        date,
        label: getDateLabel(date + 'T00:00:00'),
        meetings: meetings.sort((a, b) =>
          parseISO(a.start.dateTime).getTime() - parseISO(b.start.dateTime).getTime()
        ),
      }));
  };

  // Loading state
  if (isCheckingAccount) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-[#6264A7]" />
      </div>
    );
  }

  // No Teams account connected
  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-[#6264A7]/10 flex items-center justify-center mb-6">
          <Video className="h-10 w-10 text-[#6264A7]" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Connect Microsoft Teams</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Connect your Microsoft Teams account to view meetings, join calls, and schedule new meetings - all from within EaseMail.
        </p>
        <Button
          size="lg"
          className="bg-[#6264A7] hover:bg-[#6264A7]/90"
          onClick={() => window.location.href = '/teams'}
        >
          <Video className="h-5 w-5 mr-2" />
          Connect Teams Account
        </Button>
      </div>
    );
  }

  // Find the next meeting
  const liveMeeting = meetings.find(m => {
    const status = getMeetingStatus(m);
    return status.status === 'live';
  });

  const nextMeeting = meetings.find(m => {
    const status = getMeetingStatus(m);
    return status.status === 'starting' || status.status === 'upcoming' || status.status === 'scheduled';
  });

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b bg-gradient-to-r from-[#6264A7] to-[#7B83EB]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Video className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Teams Hub</h1>
              <p className="text-sm text-white/70">{account.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={fetchMeetings}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={() => window.location.href = '/teams'}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Card
              className="cursor-pointer hover:shadow-md transition-all hover:border-[#6264A7]/50"
              onClick={startInstantMeeting}
            >
              <CardContent className="p-4 flex items-center gap-3">
                {isStartingInstant ? (
                  <Loader2 className="h-8 w-8 animate-spin text-[#6264A7]" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#6264A7] flex items-center justify-center">
                    <Play className="h-6 w-6 text-white ml-0.5" />
                  </div>
                )}
                <div>
                  <p className="font-semibold">Start Meeting</p>
                  <p className="text-xs text-muted-foreground">Start now</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-all hover:border-[#6264A7]/50"
              onClick={() => setIsCreateOpen(true)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#6264A7]/10 flex items-center justify-center">
                  <Plus className="h-6 w-6 text-[#6264A7]" />
                </div>
                <div>
                  <p className="font-semibold">Schedule</p>
                  <p className="text-xs text-muted-foreground">Plan ahead</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Meeting Alert */}
          {liveMeeting && liveMeeting.onlineMeeting?.joinUrl && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                      <Video className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-red-500 text-white">LIVE</Badge>
                        <span className="font-semibold">{liveMeeting.subject}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Meeting in progress • {liveMeeting.attendees?.length || 0} participants
                      </p>
                    </div>
                  </div>
                  <Button
                    className="bg-red-500 hover:bg-red-600"
                    onClick={() => joinMeeting(liveMeeting.onlineMeeting!.joinUrl)}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Join Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next Meeting */}
          {nextMeeting && !liveMeeting && nextMeeting.onlineMeeting?.joinUrl && (
            <Card className="border-[#6264A7]/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Next Meeting</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-[#6264A7]/10 flex items-center justify-center">
                      <Video className="h-6 w-6 text-[#6264A7]" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{nextMeeting.subject}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {format(parseISO(nextMeeting.start.dateTime), 'h:mm a')} - {format(parseISO(nextMeeting.end.dateTime), 'h:mm a')}
                        </span>
                        {nextMeeting.attendees && nextMeeting.attendees.length > 0 && (
                          <>
                            <span>•</span>
                            <Users className="h-3 w-3" />
                            <span>{nextMeeting.attendees.length}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getMeetingStatus(nextMeeting).color}>
                      {getMeetingStatus(nextMeeting).label}
                    </Badge>
                    <Button
                      className="bg-[#6264A7] hover:bg-[#6264A7]/90"
                      onClick={() => joinMeeting(nextMeeting.onlineMeeting!.joinUrl)}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Join
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Meetings */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Upcoming Meetings</h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-[#6264A7]"
                onClick={() => window.location.href = '/teams'}
              >
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : meetings.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="font-medium mb-1">No upcoming Teams meetings</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your schedule is clear for the next two days
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule a Meeting
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {groupMeetingsByDay().map(({ date, label, meetings }) => (
                  <div key={date}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">{label}</h3>
                    <div className="space-y-2">
                      {meetings.map(meeting => {
                        const status = getMeetingStatus(meeting);
                        return (
                          <Card
                            key={meeting.id}
                            className={cn(
                              "hover:shadow-sm transition-shadow",
                              status.status === 'live' && "border-red-200"
                            )}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                                    status.status === 'live' ? "bg-red-100" : "bg-[#6264A7]/10"
                                  )}>
                                    <Video className={cn(
                                      "h-5 w-5",
                                      status.status === 'live' ? "text-red-500" : "text-[#6264A7]"
                                    )} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium truncate">{meeting.subject}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      <span>
                                        {format(parseISO(meeting.start.dateTime), 'h:mm a')} - {format(parseISO(meeting.end.dateTime), 'h:mm a')}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Badge className={status.color} variant="secondary">
                                    {status.label}
                                  </Badge>
                                  {meeting.onlineMeeting?.joinUrl && (
                                    <Button
                                      size="sm"
                                      variant={status.status === 'live' ? 'default' : 'outline'}
                                      className={status.status === 'live' ? 'bg-red-500 hover:bg-red-600' : ''}
                                      onClick={() => joinMeeting(meeting.onlineMeeting!.joinUrl)}
                                    >
                                      {status.status === 'live' ? 'Join' : <ExternalLink className="h-4 w-4" />}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Create Meeting Modal */}
      <TeamsMeetingModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchMeetings}
      />
    </div>
  );
}
