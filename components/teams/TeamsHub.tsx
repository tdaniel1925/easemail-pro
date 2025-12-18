/**
 * Teams Hub Component (Compact Sidebar Version)
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
  Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
      const interval = setInterval(fetchMeetings, 120000);
      return () => clearInterval(interval);
    }
  }, [account, fetchMeetings]);

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

  const joinMeeting = (joinUrl: string) => {
    window.open(joinUrl, '_blank');
  };

  const getMeetingStatus = (meeting: CalendarEvent) => {
    const start = parseISO(meeting.start.dateTime);
    const end = parseISO(meeting.end.dateTime);
    const now = new Date();
    const minutesUntilStart = differenceInMinutes(start, now);

    if (isPast(end)) {
      return { status: 'ended', label: 'Ended', color: 'bg-muted text-muted-foreground' };
    }
    if (isPast(start) && isFuture(end)) {
      return { status: 'live', label: 'Live', color: 'bg-red-500 text-white' };
    }
    if (minutesUntilStart <= 5) {
      return { status: 'starting', label: 'Soon', color: 'bg-yellow-500 text-white' };
    }
    if (minutesUntilStart <= 15) {
      return { status: 'upcoming', label: `${minutesUntilStart}m`, color: 'bg-blue-500 text-white' };
    }
    return { status: 'scheduled', label: format(start, 'h:mm a'), color: 'bg-muted text-muted-foreground' };
  };

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

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
      <div className="flex items-center justify-center h-full p-4">
        <Loader2 className="h-5 w-5 animate-spin text-[#6264A7]" />
      </div>
    );
  }

  // No Teams account connected
  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <div className="w-10 h-10 rounded-full bg-[#6264A7]/10 flex items-center justify-center mb-3">
          <Video className="h-5 w-5 text-[#6264A7]" />
        </div>
        <h3 className="text-xs font-semibold mb-1">Connect Teams</h3>
        <p className="text-[10px] text-muted-foreground mb-3">
          View and join meetings
        </p>
        <Button
          size="sm"
          className="h-7 text-xs bg-[#6264A7] hover:bg-[#6264A7]/90"
          onClick={() => window.location.href = '/teams'}
        >
          <Video className="h-3 w-3 mr-1" />
          Connect
        </Button>
      </div>
    );
  }

  const liveMeeting = meetings.find(m => getMeetingStatus(m).status === 'live');
  const nextMeeting = meetings.find(m => {
    const status = getMeetingStatus(m).status;
    return status === 'starting' || status === 'upcoming' || status === 'scheduled';
  });

  return (
    <div className="flex flex-col h-full">
      {/* Compact Header */}
      <div className="flex-shrink-0 p-2 border-b border-border bg-[#6264A7]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Video className="h-3.5 w-3.5 text-white flex-shrink-0" />
            <span className="text-xs font-medium text-white truncate">{account.email}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-white/80 hover:text-white hover:bg-white/20"
            onClick={fetchMeetings}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {/* Quick Actions */}
        <div className="flex gap-1.5">
          <button
            onClick={startInstantMeeting}
            disabled={isStartingInstant}
            className="flex-1 flex items-center gap-1.5 p-2 rounded-md bg-[#6264A7] text-white hover:bg-[#6264A7]/90 transition-colors"
          >
            {isStartingInstant ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            <span className="text-xs font-medium">Start</span>
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex-1 flex items-center gap-1.5 p-2 rounded-md border border-[#6264A7]/30 text-[#6264A7] hover:bg-[#6264A7]/10 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Schedule</span>
          </button>
        </div>

        {/* Live Meeting Alert */}
        {liveMeeting && liveMeeting.onlineMeeting?.joinUrl && (
          <div className="p-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                <Video className="h-2.5 w-2.5 text-white" />
              </div>
              <Badge className="h-4 px-1 text-[9px] bg-red-500 text-white">LIVE</Badge>
            </div>
            <p className="text-xs font-medium truncate mb-1.5">{liveMeeting.subject}</p>
            <Button
              size="sm"
              className="w-full h-6 text-xs bg-red-500 hover:bg-red-600"
              onClick={() => joinMeeting(liveMeeting.onlineMeeting!.joinUrl)}
            >
              <Phone className="h-3 w-3 mr-1" />
              Join Now
            </Button>
          </div>
        )}

        {/* Next Meeting */}
        {nextMeeting && !liveMeeting && nextMeeting.onlineMeeting?.joinUrl && (
          <div className="p-2 rounded-md border border-border bg-muted/30">
            <p className="text-[10px] text-muted-foreground mb-1">Next Meeting</p>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded bg-[#6264A7]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Video className="h-3 w-3 text-[#6264A7]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{nextMeeting.subject}</p>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" />
                  <span>{format(parseISO(nextMeeting.start.dateTime), 'h:mm a')}</span>
                  <Badge className={cn("h-4 px-1 text-[9px]", getMeetingStatus(nextMeeting).color)}>
                    {getMeetingStatus(nextMeeting).label}
                  </Badge>
                </div>
              </div>
              <Button
                size="sm"
                className="h-6 px-2 text-xs bg-[#6264A7] hover:bg-[#6264A7]/90"
                onClick={() => joinMeeting(nextMeeting.onlineMeeting!.joinUrl)}
              >
                Join
              </Button>
            </div>
          </div>
        )}

        {/* Upcoming Meetings */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">
            Upcoming
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : meetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <Calendar className="h-6 w-6 text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground">No meetings</p>
            </div>
          ) : (
            <div className="space-y-2">
              {groupMeetingsByDay().map(({ date, label, meetings }) => (
                <div key={date}>
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">{label}</p>
                  <div className="space-y-1">
                    {meetings.map(meeting => {
                      const status = getMeetingStatus(meeting);
                      return (
                        <div
                          key={meeting.id}
                          className={cn(
                            "flex items-center gap-2 p-1.5 rounded-md border border-border hover:bg-muted/50 transition-colors",
                            status.status === 'live' && "border-red-200 bg-red-50/50 dark:bg-red-950/20"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded flex items-center justify-center flex-shrink-0",
                            status.status === 'live' ? "bg-red-100" : "bg-[#6264A7]/10"
                          )}>
                            <Video className={cn(
                              "h-2.5 w-2.5",
                              status.status === 'live' ? "text-red-500" : "text-[#6264A7]"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs truncate">{meeting.subject}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {format(parseISO(meeting.start.dateTime), 'h:mm a')}
                            </p>
                          </div>
                          {meeting.onlineMeeting?.joinUrl && (
                            <Button
                              size="sm"
                              variant={status.status === 'live' ? 'default' : 'ghost'}
                              className={cn(
                                "h-5 w-5 p-0",
                                status.status === 'live' ? 'bg-red-500 hover:bg-red-600' : 'text-[#6264A7]'
                              )}
                              onClick={() => joinMeeting(meeting.onlineMeeting!.joinUrl)}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Meeting Modal */}
      <TeamsMeetingModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchMeetings}
      />
    </div>
  );
}
