'use client';

import { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, MapPin, Users, Sun, Moon, Coffee, Pencil } from 'lucide-react';
import { useAccount } from '@/contexts/AccountContext';
import { format, isToday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import EventModal from './EventModal';

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
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

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

  // Fetch today's events - uses same logic as main calendar page to ensure consistency
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

        // STEP 1: Fetch local DB events (created via QuickAdd, EventModal, etc.)
        let localEvents: any[] = [];
        try {
          const localResponse = await fetch(
            `/api/calendar/events?startDate=${startOfDay.toISOString()}&endDate=${endOfDay.toISOString()}`
          );
          if (localResponse.ok) {
            const localData = await localResponse.json();
            if (localData.success && localData.events) {
              localEvents = localData.events;
              console.log('[YourDay] Fetched local DB events:', localEvents.length);
            }
          }
        } catch (err) {
          console.warn('[YourDay] Failed to fetch local events:', err);
          // Continue - local events are optional
        }

        // STEP 2: Fetch Nylas events (synced from Google/Microsoft Calendar)
        let nylasEvents: any[] = [];
        const startTimestamp = Math.floor(startOfDay.getTime() / 1000);
        const endTimestamp = Math.floor(endOfDay.getTime() / 1000);

        const apiUrl = `/api/nylas-v3/calendars/events?accountId=${selectedAccount.nylasGrantId}&start=${startTimestamp}&end=${endTimestamp}`;
        const response = await fetch(apiUrl);

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            nylasEvents = data.events || [];
            console.log('[YourDay] Fetched Nylas events:', nylasEvents.length);
          }
        } else {
          console.warn('[YourDay] Failed to fetch Nylas events:', response.statusText);
        }

        // STEP 3: Merge and deduplicate events
        const mergedEvents: any[] = [];
        const seenEventIds = new Set<string>();

        // Add Nylas events first (they're authoritative)
        nylasEvents.forEach(event => {
          mergedEvents.push(event);
          seenEventIds.add(event.id);
          if (event.googleEventId) seenEventIds.add(event.googleEventId);
          if (event.outlookEventId) seenEventIds.add(event.outlookEventId);
        });

        // Add local events that aren't already in Nylas (recently created, not yet synced)
        localEvents.forEach(event => {
          const eventId = event.id;
          const googleId = event.googleEventId;
          const outlookId = event.outlookEventId;

          // Skip if we've already added this event from Nylas
          if (seenEventIds.has(eventId) ||
              (googleId && seenEventIds.has(googleId)) ||
              (outlookId && seenEventIds.has(outlookId))) {
            return;
          }

          mergedEvents.push(event);
          seenEventIds.add(eventId);
        });

        console.log('[YourDay] Merged events:', {
          local: localEvents.length,
          nylas: nylasEvents.length,
          merged: mergedEvents.length,
        });

        // Sort events by start time
        const sortedEvents = mergedEvents.sort((a: Event, b: Event) => {
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
        setError(null);
      } catch (err) {
        console.error('[YourDay] Failed to fetch today events:', err);
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

  const isPastEvent = (event: Event) => {
    const now = new Date();
    try {
      let endTime;
      if (event.when?.endTime) {
        endTime = new Date(event.when.endTime * 1000);
      } else if (event.when?.date) {
        return false; // All-day events don't show as past
      } else {
        endTime = new Date(event.endTime);
      }
      return now > endTime;
    } catch {
      return false;
    }
  };

  const handleEventClick = (event: Event) => {
    // Transform the event data to match EventModal's expected format
    const transformedEvent = {
      ...event,
      // Ensure startTime and endTime are ISO strings
      startTime: event.when?.startTime
        ? new Date(event.when.startTime * 1000).toISOString()
        : event.startTime,
      endTime: event.when?.endTime
        ? new Date(event.when.endTime * 1000).toISOString()
        : event.endTime,
      // Handle all-day events
      allDay: event.when?.date ? true : false,
    };
    setSelectedEvent(transformedEvent as any);
    setIsEventModalOpen(true);
  };

  const handleModalClose = () => {
    setIsEventModalOpen(false);
    setSelectedEvent(null);
  };

  const handleEventUpdate = () => {
    // Refresh events after update
    if (selectedAccount?.nylasGrantId) {
      const fetchTodayEvents = async () => {
        try {
          const now = new Date();
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
          const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

          const startTimestamp = Math.floor(startOfDay.getTime() / 1000);
          const endTimestamp = Math.floor(endOfDay.getTime() / 1000);

          const apiUrl = `/api/nylas-v3/calendars/events?accountId=${selectedAccount.nylasGrantId}&start=${startTimestamp}&end=${endTimestamp}`;
          const response = await fetch(apiUrl);

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
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
            }
          }
        } catch (err) {
          console.error('Failed to refresh events:', err);
        }
      };
      fetchTodayEvents();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-1.5 mb-0.5">
          <TimeIcon className={cn('h-3.5 w-3.5', timeOfDay.color)} />
          <h2 className="text-xs font-semibold flex items-center">
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
                className="bg-transparent border-b border-primary outline-none px-0.5 min-w-[60px] w-auto text-xs"
                style={{ width: `${Math.max(60, displayName.length * 7 + 16)}px` }}
              />
            ) : (
              <button
                onClick={() => setIsEditingName(true)}
                className="hover:text-primary transition-colors group inline-flex items-center gap-0.5"
              >
                <span>{displayName || 'Friend'}</span>
                <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </h2>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="p-2 text-center">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-xs font-medium text-foreground mb-0.5">No events today</p>
            <p className="text-[10px] text-muted-foreground">Your schedule is clear!</p>
          </div>
        ) : (
          <div className="p-2 space-y-1.5">
            {events.map((event) => {
              const isCurrent = isCurrentEvent(event);
              const isPast = isPastEvent(event);
              return (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className={cn(
                    'p-2 rounded-md border transition-colors cursor-pointer',
                    isCurrent
                      ? 'bg-primary/10 border-primary shadow-sm'
                      : isPast
                      ? 'bg-muted/30 border-muted opacity-60'
                      : 'bg-card border-border hover:bg-accent'
                  )}
                >
                  <div className="flex items-start gap-2">
                    {/* Color indicator */}
                    <div
                      className="w-0.5 h-full rounded-full mt-0.5 flex-shrink-0 min-h-[40px]"
                      style={{ backgroundColor: event.hexColor || event.color || '#3b82f6' }}
                    />

                    {/* Event details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1 mb-0.5">
                        <h3 className={cn(
                          'text-xs font-semibold truncate',
                          isCurrent && 'text-primary'
                        )}>
                          {event.title}
                        </h3>
                        {isCurrent && (
                          <span className="text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                            Now
                          </span>
                        )}
                      </div>

                      {/* Time */}
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        <span>{formatEventTime(event)}</span>
                      </div>

                      {/* Location */}
                      {event.location && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
                          <MapPin className="h-2.5 w-2.5" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}

                      {/* Attendees count */}
                      {event.attendees && event.attendees.length > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Users className="h-2.5 w-2.5" />
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
      <div className="p-2 border-t border-border">
        <a
          href="/calendar"
          className="block text-center text-[10px] text-muted-foreground hover:text-primary transition-colors"
        >
          View full calendar →
        </a>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <EventModal
          isOpen={isEventModalOpen}
          onClose={handleModalClose}
          event={selectedEvent}
          onSuccess={handleEventUpdate}
        />
      )}
    </div>
  );
}
