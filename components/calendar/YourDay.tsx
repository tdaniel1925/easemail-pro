'use client';

import { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, MapPin, Users, Sun, Moon, Coffee, Pencil } from 'lucide-react';
import { useAccount } from '@/contexts/AccountContext';
import { format, isToday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  description?: string;
  color?: string;
  hexColor?: string;
  attendees?: Array<{ email: string; name?: string }>;
  when?: {
    startTime?: number;
    endTime?: number;
    date?: string;
  };
}

export function YourDay() {
  const { selectedAccount } = useAccount();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Load display name from localStorage on mount
  useEffect(() => {
    const savedName = localStorage.getItem('userDisplayName');
    if (savedName) {
      setDisplayName(savedName);
      // @ts-expect-error - name property exists in runtime
    } else if (selectedAccount?.name) {
      // Fallback to account name
      // @ts-expect-error - name property exists in runtime
      const firstName = selectedAccount.name.split(' ')[0];
      setDisplayName(firstName);
      // Save to localStorage for next time
      localStorage.setItem('userDisplayName', firstName);
    } else {
      // Ultimate fallback
      setDisplayName('Friend');
      localStorage.setItem('userDisplayName', 'Friend');
    }
  }, [selectedAccount]);

  // Save display name to localStorage when it changes
  const handleNameChange = (newName: string) => {
    setDisplayName(newName);
    localStorage.setItem('userDisplayName', newName);
  };

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Fetch today's events
  useEffect(() => {
    if (!selectedAccount?.nylasGrantId) {
      setEvents([]);
      return;
    }

    const fetchTodayEvents = async () => {
      setLoading(true);
      setError(null);

      try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        const startTimestamp = Math.floor(startOfDay.getTime() / 1000);
        const endTimestamp = Math.floor(endOfDay.getTime() / 1000);

        const apiUrl = `/api/nylas-v3/calendars/events?accountId=${selectedAccount.nylasGrantId}&start=${startTimestamp}&end=${endTimestamp}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
          throw new Error(`Failed to fetch events: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success) {
          // Sort events by start time
          const sortedEvents = (data.events || []).sort((a: Event, b: Event) => {
            let aStart, bStart;
            if (a.when?.startTime) {
              aStart = new Date(a.when.startTime * 1000);
            } else if (a.when?.date) {
              aStart = new Date(a.when.date);
            } else {
              aStart = new Date(a.startTime);
            }
            if (b.when?.startTime) {
              bStart = new Date(b.when.startTime * 1000);
            } else if (b.when?.date) {
              bStart = new Date(b.when.date);
            } else {
              bStart = new Date(b.startTime);
            }
            return aStart.getTime() - bStart.getTime();
          });

          setEvents(sortedEvents);
        } else {
          throw new Error(data.error || 'Failed to fetch events');
        }
      } catch (err) {
        console.error('Failed to fetch today events:', err);
        setError(err instanceof Error ? err.message : 'Failed to load events');
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayEvents();
  }, [selectedAccount]);

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { icon: Sun, text: 'Good Morning', color: 'text-amber-500' };
    if (hour < 17) return { icon: Coffee, text: 'Good Afternoon', color: 'text-orange-500' };
    return { icon: Moon, text: 'Good Evening', color: 'text-indigo-500' };
  };

  const timeOfDay = getTimeOfDay();
  const TimeIcon = timeOfDay.icon;

  const formatEventTime = (event: Event) => {
    try {
      let startTime, endTime;
      if (event.when?.startTime) {
        startTime = new Date(event.when.startTime * 1000);
        endTime = event.when?.endTime ? new Date(event.when.endTime * 1000) : startTime;
      } else if (event.when?.date) {
        return 'All Day';
      } else {
        startTime = new Date(event.startTime);
        endTime = new Date(event.endTime);
      }
      return `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`;
    } catch {
      return 'Time unavailable';
    }
  };

  const isCurrentEvent = (event: Event) => {
    const now = new Date();
    try {
      let startTime, endTime;
      if (event.when?.startTime) {
        startTime = new Date(event.when.startTime * 1000);
        endTime = event.when?.endTime ? new Date(event.when.endTime * 1000) : startTime;
      } else if (event.when?.date) {
        return false;
      } else {
        startTime = new Date(event.startTime);
        endTime = new Date(event.endTime);
      }
      return now >= startTime && now <= endTime;
    } catch {
      return false;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 mb-1">
          <TimeIcon className={cn('h-5 w-5', timeOfDay.color)} />
          <h2 className="text-lg font-semibold flex items-center">
            <span>{timeOfDay.text}</span>
            <span>,&nbsp;</span>
            {isEditingName ? (
              <input
                ref={nameInputRef}
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onBlur={() => {
                  setIsEditingName(false);
                  if (displayName.trim()) {
                    handleNameChange(displayName.trim());
                  } else {
                    setDisplayName(localStorage.getItem('userDisplayName') || 'Friend');
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditingName(false);
                    if (displayName.trim()) {
                      handleNameChange(displayName.trim());
                    } else {
                      setDisplayName(localStorage.getItem('userDisplayName') || 'Friend');
                    }
                  } else if (e.key === 'Escape') {
                    setIsEditingName(false);
                    setDisplayName(localStorage.getItem('userDisplayName') || 'Friend');
                  }
                }}
                className="bg-transparent border-b border-primary outline-none px-1 min-w-[80px] w-auto"
                style={{ width: `${Math.max(80, displayName.length * 9 + 20)}px` }}
              />
            ) : (
              <button
                onClick={() => setIsEditingName(true)}
                className="hover:text-primary transition-colors group inline-flex items-center gap-1"
              >
                <span>{displayName || 'Friend'}</span>
                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm font-medium text-foreground mb-1">No events today</p>
            <p className="text-xs text-muted-foreground">Your schedule is clear!</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {events.map((event) => {
              const isCurrent = isCurrentEvent(event);
              return (
                <div
                  key={event.id}
                  className={cn(
                    'p-3 rounded-lg border transition-colors',
                    isCurrent
                      ? 'bg-primary/10 border-primary shadow-sm'
                      : 'bg-card border-border hover:bg-accent'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Color indicator */}
                    <div
                      className="w-1 h-full rounded-full mt-1 flex-shrink-0 min-h-[60px]"
                      style={{ backgroundColor: event.hexColor || event.color || '#3b82f6' }}
                    />

                    {/* Event details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className={cn(
                          'text-sm font-semibold truncate',
                          isCurrent && 'text-primary'
                        )}>
                          {event.title}
                        </h3>
                        {isCurrent && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                            Now
                          </span>
                        )}
                      </div>

                      {/* Time */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatEventTime(event)}</span>
                      </div>

                      {/* Location */}
                      {event.location && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}

                      {/* Attendees count */}
                      {event.attendees && event.attendees.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer with quick action */}
      <div className="p-3 border-t border-border">
        <a
          href="/calendar-pro"
          className="block text-center text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          View full calendar →
        </a>
      </div>
    </div>
  );
}
