/**
 * World-Class Calendar Page
 * Inspired by Outlook, Google Calendar, and Superhuman
 */

'use client';

import { useState, Suspense, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Plus,
  RefreshCw,
  Sparkles,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIconLucide,
  Loader2,
  ArrowLeft,
  AlertCircle,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useAccount } from '@/contexts/AccountContext';
import { useToast } from '@/components/ui/use-toast';

// Calendar Components
import EventModal from '@/components/calendar/EventModal';
import EventDetailsModal from '@/components/calendar/EventDetailsModal';
import DayEventsModal from '@/components/calendar/DayEventsModal';
import DraggableMonthView from '@/components/calendar/DraggableMonthView';
import WeekView from '@/components/calendar/WeekView';
import DayView from '@/components/calendar/DayView';
import AgendaView from '@/components/calendar/AgendaView';
import YearView from '@/components/calendar/YearView';
import ListView from '@/components/calendar/ListView';
import QuickAddV4 from '@/components/calendar/QuickAddV4';
import EventSearch from '@/components/calendar/EventSearch';
import CalendarSelector from '@/components/calendar/CalendarSelector';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth } from 'date-fns';
import { transformNylasEvent } from '@/lib/calendar/event-utils';
import { notificationService } from '@/lib/services/notification-service';
import { buildConflictMap, type CalendarEvent } from '@/lib/calendar/calendar-utils';

type ViewType = 'month' | 'week' | 'day' | 'agenda' | 'year' | 'list';

function CalendarContent() {
  const { selectedAccount, accounts: contextAccounts } = useAccount();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // ✅ Local state for all user accounts (for multi-account calendar support)
  const [allAccounts, setAllAccounts] = useState<any[]>([]);

  // ✅ Calendar metadata (for color coding events)
  const [calendarMetadata, setCalendarMetadata] = useState<Map<string, { hexColor: string; name: string }>>(new Map());
  const [metadataLoading, setMetadataLoading] = useState(false);

  // View State with localStorage persistence
  const [view, setView] = useState<ViewType>(() => {
    // Load saved view preference from localStorage
    if (typeof window !== 'undefined') {
      const savedView = localStorage.getItem('calendar-default-view');
      if (savedView && ['month', 'week', 'day', 'year', 'agenda', 'list'].includes(savedView)) {
        return savedView as ViewType;
      }
    }
    return 'month';
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentYear, setCurrentYear] = useState(new Date());

  // Data State
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Modal State
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayModalDate, setDayModalDate] = useState<Date | null>(null);
  const [dayModalClickedTime, setDayModalClickedTime] = useState<string | undefined>(undefined);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [selectedCalendarTypes, setSelectedCalendarTypes] = useState<string[]>([
    'personal', 'work', 'family', 'holiday', 'birthday', 'meeting', 'task'
  ]);

  // Mini Calendar State
  const [miniCalendarMonth, setMiniCalendarMonth] = useState(new Date());
  const [selectedMiniDate, setSelectedMiniDate] = useState<Date | null>(null);
  const [isCalendarListOpen, setIsCalendarListOpen] = useState(false);
  const [sidebarDetailEvent, setSidebarDetailEvent] = useState<any>(null);

  // Calendar Selection State with localStorage persistence
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>(() => {
    // Load saved calendar selection from localStorage
    if (typeof window !== 'undefined' && selectedAccount?.nylasGrantId) {
      const savedSelection = localStorage.getItem(`calendar-selection-${selectedAccount.nylasGrantId}`);
      if (savedSelection) {
        try {
          return JSON.parse(savedSelection);
        } catch (err) {
          console.error('[Calendar] Failed to parse saved calendar selection:', err);
        }
      }
    }
    return [];
  });

  // Wrapper function to update calendar selection and persist to localStorage
  const handleCalendarSelectionChange = useCallback((calendarIds: string[]) => {
    console.log('[Calendar] Calendar selection changed:', {
      previous: selectedCalendarIds,
      new: calendarIds,
      count: calendarIds.length,
    });

    setSelectedCalendarIds(calendarIds);

    // Persist to localStorage (per account)
    if (typeof window !== 'undefined' && selectedAccount?.nylasGrantId) {
      localStorage.setItem(
        `calendar-selection-${selectedAccount.nylasGrantId}`,
        JSON.stringify(calendarIds)
      );
      console.log('[Calendar] Saved calendar selection to localStorage:', {
        accountId: selectedAccount.nylasGrantId,
        selectedCount: calendarIds.length,
      });
    }
  }, [selectedAccount?.nylasGrantId, selectedCalendarIds]);

  // ✅ Fetch all accounts on mount for multi-account calendar support
  useEffect(() => {
    const fetchAllAccounts = async () => {
      try {
        const response = await fetch('/api/nylas/accounts');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setAllAccounts(data.accounts || []);
            console.log('[Calendar] Loaded all accounts:', data.accounts.length);
          }
        }
      } catch (error) {
        console.error('[Calendar] Failed to fetch accounts:', error);
      }
    };

    fetchAllAccounts();
  }, []); // Run once on mount

  // ✅ Fetch calendar metadata for color coding events
  useEffect(() => {
    const fetchCalendarMetadata = async () => {
      const activeAccounts = allAccounts.filter(account => account.isActive && account.nylasGrantId);
      if (activeAccounts.length === 0) {
        setMetadataLoading(false);
        return;
      }

      setMetadataLoading(true);
      const metadata = new Map<string, { hexColor: string; name: string }>();

      for (const account of activeAccounts) {
        try {
          const response = await fetch(`/api/nylas-v3/calendars?accountId=${account.nylasGrantId}`);
          const data = await response.json();

          if (data.success && data.calendars) {
            data.calendars.forEach((cal: any) => {
              metadata.set(cal.id, {
                hexColor: cal.hexColor || '#3b82f6',
                name: cal.name || 'Untitled Calendar',
              });
            });
          }
        } catch (err) {
          console.error('[Calendar] Failed to fetch calendar metadata for', account.emailAddress, err);
        }
      }

      setCalendarMetadata(metadata);
      setMetadataLoading(false);
      console.log('[Calendar] Loaded metadata for', metadata.size, 'calendars');
    };

    fetchCalendarMetadata();
  }, [allAccounts]);

  // Clear calendar selection when account changes
  useEffect(() => {
    if (selectedAccount?.nylasGrantId) {
      // Load saved selection for this account
      const savedSelection = localStorage.getItem(`calendar-selection-${selectedAccount.nylasGrantId}`);
      if (savedSelection) {
        try {
          const parsed = JSON.parse(savedSelection);
          setSelectedCalendarIds(parsed);
          console.log('[Calendar] Loaded calendar selection from localStorage:', {
            accountId: selectedAccount.nylasGrantId,
            selectedCount: parsed.length,
          });
        } catch (err) {
          console.error('[Calendar] Failed to parse saved calendar selection:', err);
          setSelectedCalendarIds([]);
        }
      } else {
        // No saved selection for this account, reset to empty
        setSelectedCalendarIds([]);
      }
    }
  }, [selectedAccount?.nylasGrantId]);

  // ✅ Enrich events with calendar colors
  const enrichedEvents = useMemo(() => {
    return events.map(event => {
      const calendarId = event.calendarId || event.calendar_id;
      const calendarInfo = calendarId ? calendarMetadata.get(calendarId) : null;

      // ✅ FIX BUG #3: Try multiple sources for color before defaulting to blue
      // Log when calendar metadata is not found for debugging
      if (calendarId && !calendarInfo) {
        console.warn('[Calendar] No metadata found for calendar:', calendarId, 'Event:', event.title);
      }

      // Priority: calendarInfo.hexColor > event.calendar.hexColor > event.hexColor > default blue
      const eventColor = calendarInfo?.hexColor ||
                        event.calendar?.hexColor ||
                        event.hexColor ||
                        '#3b82f6'; // Last resort default

      return {
        ...event,
        hexColor: eventColor,
        color: eventColor, // Set both for compatibility with different views
        calendarName: calendarInfo?.name || event.calendar?.name,
      };
    });
  }, [events, calendarMetadata]);

  // Filtered events based on search and calendar types
  const filteredEvents = useMemo(() => {
    const baseEvents = isSearchActive ? searchResults : enrichedEvents;

    console.log('[Calendar] Filtering events:', {
      totalEvents: baseEvents.length,
      selectedCalendarIds,
      selectedCalendarTypes,
    });

    if (selectedCalendarTypes.length === 0) return [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const filtered = baseEvents.filter(event => {
      // ✅ FIX BUG #2: STRICT CALENDAR FILTERING
      // If user has selected specific calendars, ONLY show events from those calendars
      if (selectedCalendarIds.length > 0) {
        const eventCalendarId = event.calendarId || event.calendar_id;

        // Strict filtering: if no calendarId OR not in selected list, hide it
        if (!eventCalendarId || !selectedCalendarIds.includes(eventCalendarId)) {
          return false; // Hide events without calendarId OR from unselected calendars
        }
      }

      // Filter by calendar type
      const eventType = event.calendarType || 'personal';
      if (!selectedCalendarTypes.includes(eventType)) return false;

      // Filter out past events (but keep today's events)
      try {
        let eventStartTime: Date;
        let eventEndTime: Date;

        // Parse start time
        if (event.startTime) {
          eventStartTime = new Date(event.startTime);
        } else if (event.when?.startTime) {
          eventStartTime = new Date(event.when.startTime * 1000);
        } else if (event.when?.date) {
          eventStartTime = new Date(event.when.date);
        } else {
          return true; // Include if we can't determine the start time
        }

        // Parse end time
        if (event.endTime) {
          eventEndTime = new Date(event.endTime);
        } else if (event.when?.endTime) {
          eventEndTime = new Date(event.when.endTime * 1000);
        } else if (event.when?.date) {
          // All-day event - set end time to end of day
          eventEndTime = new Date(event.when.date);
          eventEndTime.setHours(23, 59, 59, 999);
        } else {
          return true; // Include if we can't determine the end time
        }

        // ✅ FIXED: Show all of today's events, even if they already ended
        // Check if event starts today or later
        const eventStartDate = new Date(eventStartTime.getFullYear(), eventStartTime.getMonth(), eventStartTime.getDate());

        // Show event if it starts today or in the future
        return eventStartDate >= startOfToday;
      } catch (err) {
        console.error('Error filtering past event:', err, event);
        return true; // Include events with parsing errors
      }
    });

    console.log('[Calendar] Filtered events result:', {
      filteredCount: filtered.length,
    });

    return filtered;
  }, [enrichedEvents, searchResults, isSearchActive, selectedCalendarTypes, selectedCalendarIds]);

  // ✅ Build conflict map for all events (memoized for performance)
  const conflictMap = useMemo(() => {
    return buildConflictMap(filteredEvents as CalendarEvent[]);
  }, [filteredEvents]);

  // Get available calendar types
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    events.forEach(event => {
      const eventType = event.calendarType || 'personal';
      types.add(eventType);
    });
    return Array.from(types);
  }, [events]);

  // Rate limiting state
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const FETCH_COOLDOWN = 2000; // 2 seconds minimum between fetches

  // ✅ Memoize calendar IDs string to prevent dependency array changes
  const selectedCalendarIdsString = useMemo(() => selectedCalendarIds.join(','), [selectedCalendarIds]);

  // Fetch events from both local DB and Nylas (merged)
  const fetchEvents = useCallback(async (force = false) => {
    setError(null);

    // Rate limiting - prevent too many API calls
    const now = Date.now();
    if (!force && now - lastFetchTime < FETCH_COOLDOWN) {
      console.log('[Calendar] Skipping fetch due to rate limiting');
      return;
    }

    // ✅ Get all active accounts (isActive = true)
    const activeAccounts = allAccounts.filter(account => account.isActive && account.nylasGrantId);

    if (activeAccounts.length === 0) {
      setEvents([]);
      setLoading(false);
      if (initialLoadDone) {
        setError('No active accounts found. Please activate an account in Account Settings.');
      }
      setInitialLoadDone(true);
      return;
    }

    try {
      setLoading(true);
      setLastFetchTime(now);
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      // STEP 1: Fetch local DB events (created via QuickAdd, EventModal, etc.)
      let localEvents: any[] = [];
      try {
        const localResponse = await fetch(
          `/api/calendar/events?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        );
        if (localResponse.ok) {
          const localData = await localResponse.json();
          if (localData.success && localData.events) {
            localEvents = localData.events;
            console.log('[Calendar] Fetched local DB events:', localEvents.length);
          }
        }
      } catch (err) {
        console.warn('[Calendar] Failed to fetch local events:', err);
        // Continue - local events are optional
      }

      // STEP 2: Fetch Nylas events from ALL active accounts (synced from Google/Microsoft Calendar)
      let nylasEvents: any[] = [];

      // ✅ Loop through all active accounts and fetch their calendar events
      for (const account of activeAccounts) {
        if (!account.nylasGrantId) continue;

        try {
          // Convert to Unix timestamps for Nylas v3 API
          const startTimestamp = Math.floor(startDate.getTime() / 1000);
          const endTimestamp = Math.floor(endDate.getTime() / 1000);

          // Build API URL with calendar filtering
          let apiUrl = `/api/nylas-v3/calendars/events?accountId=${account.nylasGrantId}&start=${startTimestamp}&end=${endTimestamp}`;

          if (selectedCalendarIds.length > 0) {
            apiUrl += `&calendarIds=${selectedCalendarIds.join(',')}`;
          }

          console.log(`[Calendar] Fetching events for account: ${account.emailAddress}`);
          const response = await fetch(apiUrl);

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              // Transform Nylas events to calendar component format and add to collection
              const accountEvents = (data.events || [])
                .map((event: any) => transformNylasEvent(event))
                .filter((event: any) => event !== null);

              nylasEvents.push(...accountEvents);
              console.log(`[Calendar] Fetched ${accountEvents.length} events from ${account.emailAddress}`);
            }
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error(`[Calendar] Nylas API Error for ${account.emailAddress}:`, response.status, errorData);

            // Don't throw errors for individual accounts - continue with other accounts
            if (response.status === 403) {
              console.warn(`[Calendar] Access denied for ${account.emailAddress}. Skipping this account.`);
            } else if (response.status === 404) {
              console.warn(`[Calendar] Calendar account not found for ${account.emailAddress}. Skipping this account.`);
            } else if (response.status === 400) {
              console.warn(`[Calendar] ${account.emailAddress} not properly connected. Skipping this account.`);
            }
          }
        } catch (err) {
          console.warn(`[Calendar] Failed to fetch Nylas events for ${account.emailAddress}:`, err);
          // Continue with other accounts even if one fails
        }
      }

      console.log('[Calendar] Total Nylas events fetched from all active accounts:', nylasEvents.length);

      // STEP 3: Merge and deduplicate events
      // Deduplication strategy: Prefer Nylas events (they have more metadata), but include local events that aren't synced yet
      const mergedEvents: any[] = [];
      const seenEventIds = new Set<string>();

      // Add Nylas events first (they're authoritative)
      nylasEvents.forEach(event => {
        mergedEvents.push(event);
        seenEventIds.add(event.id);
        // Also track by googleEventId/outlookEventId for deduplication
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

        // Add local event (it hasn't synced to Nylas yet)
        mergedEvents.push(event);
        seenEventIds.add(eventId);
      });

      console.log('[Calendar] Merged events:', {
        local: localEvents.length,
        nylas: nylasEvents.length,
        merged: mergedEvents.length,
        deduplicated: localEvents.length + nylasEvents.length - mergedEvents.length
      });

      if (mergedEvents.length > 0) {
        console.log('[Calendar] Sample merged event:', {
          id: mergedEvents[0].id,
          title: mergedEvents[0].title,
          startTime: mergedEvents[0].startTime,
          endTime: mergedEvents[0].endTime,
        });
      }

      setEvents(mergedEvents);
      setError(null);
      setInitialLoadDone(true);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load calendar events';
      setError(errorMessage);
      setEvents([]);
      setInitialLoadDone(true);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, allAccounts, selectedCalendarIdsString, initialLoadDone, lastFetchTime]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Handle search results - enrich with calendar colors
  const handleSearchResults = useCallback((results: any[]) => {
    // ✅ Enrich search results with calendar colors just like regular events
    const enrichedResults = results.map(event => {
      const calendarId = event.calendarId || event.calendar_id;
      const calendarInfo = calendarId ? calendarMetadata.get(calendarId) : null;

      return {
        ...event,
        hexColor: calendarInfo?.hexColor || '#3b82f6',
        calendarName: calendarInfo?.name,
      };
    });

    setSearchResults(enrichedResults);
    setIsSearchActive(results.length !== events.length);
  }, [events.length, calendarMetadata]);

  // Sync calendar
  const handleSync = async (silent = false) => {
    if (!selectedAccount?.nylasGrantId) {
      if (!silent) {
        toast({
          title: 'No Account Selected',
          description: 'Please select an account to sync.',
          variant: 'destructive',
        });
      }
      return;
    }

    setSyncing(true);
    try {
      const response = await fetch('/api/calendar/sync/nylas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccount.id }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (!silent) {
          toast({
            title: 'Sync Complete',
            description: `Successfully synced ${data.synced || 0} events`,
          });
        }
        await fetchEvents();
        console.log('[Auto-Sync] Successfully synced calendar');
      } else {
        if (!silent) {
          toast({
            title: 'Sync Failed',
            description: data.error || 'Failed to sync calendar',
            variant: 'destructive',
          });
        }
        console.error('[Auto-Sync] Sync failed:', data.error);
      }
    } catch (error) {
      console.error('[Auto-Sync] Sync failed:', error);
      if (!silent) {
        toast({
          title: 'Sync Failed',
          description: 'An error occurred while syncing',
          variant: 'destructive',
        });
      }
    } finally {
      setSyncing(false);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async (eventIds: string[]) => {
    if (eventIds.length === 0) return;

    try {
      const response = await fetch('/api/calendar/events/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventIds }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Events Deleted',
          description: data.message,
        });

        // Refresh events
        await fetchEvents();
      } else {
        toast({
          title: 'Deletion Failed',
          description: data.error || 'Failed to delete events',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast({
        title: 'Deletion Failed',
        description: 'An error occurred while deleting events',
        variant: 'destructive',
      });
    }
  };

  // ✅ OUTLOOK BEHAVIOR: Auto-sync calendar every 3 minutes
  // TEMPORARILY DISABLED - Auto-sync was deleting locally created events that haven't synced to remote calendar yet
  // TODO: Fix sync service to preserve local events before re-enabling
  // useEffect(() => {
  //   if (!selectedAccount?.nylasGrantId) return;

  //   console.log('[Auto-Sync] Starting auto-sync interval (every 3 minutes)');

  //   // Auto-sync every 3 minutes (180,000 ms)
  //   const syncInterval = setInterval(() => {
  //     console.log('[Auto-Sync] Running scheduled sync...');
  //     handleSync(true); // Silent sync (no toast notifications)
  //   }, 3 * 60 * 1000);

  //   // Cleanup interval on unmount or account change
  //   return () => {
  //     console.log('[Auto-Sync] Clearing auto-sync interval');
  //     clearInterval(syncInterval);
  //   };
  // }, [selectedAccount?.nylasGrantId]);

  // ✅ OUTLOOK BEHAVIOR: Request notification permission on mount
  useEffect(() => {
    const requestNotificationPermission = async () => {
      const permission = await notificationService.requestPermission();

      if (permission === 'granted') {
        console.log('✅ Browser notifications enabled for calendar reminders');
      } else if (permission === 'denied') {
        console.warn('⚠️ Browser notifications blocked. Reminders will not appear.');
      } else {
        console.log('ℹ️ Browser notifications not yet permitted');
      }
    };

    requestNotificationPermission();
  }, []);

  // ✅ OUTLOOK BEHAVIOR: Schedule notifications for upcoming events
  useEffect(() => {
    // Cancel all existing notifications before scheduling new ones
    notificationService.cancelAllNotifications();

    if (events.length === 0) {
      console.log('[Notifications] No events to schedule notifications for');
      return;
    }

    const now = new Date();
    let scheduledCount = 0;

    // Schedule notifications for each event with reminders
    events.forEach(event => {
      try {
        // Parse event start time
        let eventStart: Date | null = null;

        if (event.startTime) {
          eventStart = new Date(event.startTime);
        } else if (event.when?.startTime) {
          eventStart = new Date(event.when.startTime * 1000);
        }

        if (!eventStart || isNaN(eventStart.getTime())) {
          return; // Skip events without valid start time
        }

        // Only schedule for future events
        if (eventStart <= now) {
          return;
        }

        // Get reminders from event (default to 15 minutes like Outlook)
        const reminders = event.reminders && event.reminders.length > 0
          ? event.reminders
          : [{ minutes: 15, method: 'notification' }];

        // Schedule notification for each reminder
        reminders.forEach((reminder: any) => {
          const minutesBefore = reminder.minutes || 15;

          const notificationId = notificationService.scheduleReminder({
            eventId: event.id,
            eventTitle: event.title || 'Untitled Event',
            eventStart,
            eventLocation: event.location,
            minutesBefore,
          });

          if (notificationId) {
            scheduledCount++;
          }
        });
      } catch (error) {
        console.error('[Notifications] Error scheduling notification for event:', event.id, error);
      }
    });

    console.log(`[Notifications] Scheduled ${scheduledCount} reminder notifications for ${events.length} events`);

    // Cleanup: Cancel all notifications when component unmounts or events change
    return () => {
      console.log('[Notifications] Cleaning up scheduled notifications');
      notificationService.cancelAllNotifications();
    };
  }, [events]);

  // Navigation functions
  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  // Event handlers
  const handleNewEvent = () => {
    setSelectedEvent(null);
    setSelectedDate(new Date());
    setIsEventModalOpen(true);
  };

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setIsEventDetailsOpen(true);
  };

  const handleDayClick = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setDayModalDate(date);
    setDayModalClickedTime(undefined);
    setIsDayModalOpen(true);
  };

  const handleEditEvent = () => {
    setIsEventDetailsOpen(false);
    setIsEventModalOpen(true);
  };

  const handleEventMove = async (eventId: string, newDate: Date) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;

      const oldStart = new Date(event.startTime);
      const oldEnd = new Date(event.endTime);
      const timeDiff = oldEnd.getTime() - oldStart.getTime();

      const newStart = new Date(newDate);
      newStart.setHours(oldStart.getHours(), oldStart.getMinutes());
      const newEnd = new Date(newStart.getTime() + timeDiff);

      const response = await fetch(`/api/calendar/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: newStart.toISOString(),
          endTime: newEnd.toISOString(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({ title: 'Event Moved', description: 'Event updated successfully' });
        await fetchEvents();
      } else {
        throw new Error(data.error || 'Failed to move event');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      await fetchEvents();
    }
  };

  // Mini calendar functions
  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(event => {
      try {
        // Nylas v3 events use 'when' object with different formats
        let eventStartTime;
        if (event.when?.startTime) {
          eventStartTime = new Date(event.when.startTime * 1000); // Unix timestamp
        } else if (event.when?.date) {
          eventStartTime = new Date(event.when.date);
        } else if (event.startTime) {
          eventStartTime = new Date(event.startTime);
        } else {
          return false;
        }

        const eventDate = format(eventStartTime, 'yyyy-MM-dd');
        return eventDate === dateStr;
      } catch (err) {
        console.error('Error parsing event date:', err, event);
        return false;
      }
    });
  };

  const hasEventsOnDate = (date: Date) => {
    return getEventsForDate(date).length > 0;
  };

  const miniMonthStart = startOfMonth(miniCalendarMonth);
  const miniMonthEnd = endOfMonth(miniCalendarMonth);
  const miniDays = eachDayOfInterval({ start: miniMonthStart, end: miniMonthEnd });
  const miniFirstDayOfWeek = miniMonthStart.getDay();
  const miniEmptyCells = Array(miniFirstDayOfWeek).fill(null);

  return (
    <div className="flex h-screen bg-background">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left: Back to Inbox + Title & Navigation */}
              <div className="flex items-center gap-4">
                <a
                  href="/inbox"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Inbox</span>
                </a>

                <div className="h-6 w-px bg-border" />

                <div className="flex items-center gap-3">
                  <CalendarIconLucide className="h-6 w-6 text-primary" />
                  <h1 className="text-2xl font-bold">Calendar</h1>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={previousMonth}
                      className="h-8 w-8"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-[140px] text-center">
                      <span className="font-semibold">
                        {format(currentMonth, 'MMMM yyyy')}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={nextMonth}
                      className="h-8 w-8"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSync(false)}
                  disabled={syncing}
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
                  Sync
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsQuickAddOpen(true)}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Quick Add
                </Button>
              </div>
            </div>

            {/* Second Row: Search & View Selector */}
            <div className="flex items-center justify-between mt-4 gap-4">
              {/* Search */}
              <div className="flex-1 max-w-md">
                <EventSearch
                  events={events}
                  onResultsChange={handleSearchResults}
                />
              </div>

              {/* View Selector */}
              <div className="flex gap-1 bg-muted p-1 rounded-lg">
                {(['month', 'week', 'day', 'year', 'agenda', 'list'] as ViewType[]).map((v) => (
                  <Button
                    key={v}
                    variant={view === v ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setView(v);
                      // Save preference to localStorage
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('calendar-default-view', v);
                      }
                    }}
                    className="capitalize"
                  >
                    {v}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading && !initialLoadDone ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <p className="text-muted-foreground">{error}</p>
                <Button onClick={() => fetchEvents()}>Retry</Button>
              </div>
            </div>
          ) : (
            <>
              {/* Warning: No calendars selected */}
              {selectedCalendarIds.length === 0 && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No calendars selected</AlertTitle>
                  <AlertDescription>
                    Select at least one calendar from the sidebar to view events.
                  </AlertDescription>
                </Alert>
              )}

              {view === 'month' && (
                <DraggableMonthView
                  currentMonth={currentMonth}
                  events={filteredEvents}
                  onMonthChange={setCurrentMonth}
                  onEventMove={handleEventMove}
                  onDayClick={handleDayClick}
                  onEventClick={(e, event) => handleEventClick(event)}
                />
              )}

              {view === 'week' && (
                <WeekView
                  events={filteredEvents}
                  onEventClick={handleEventClick}
                  onTimeSlotClick={(date, hour) => {
                    setDayModalDate(date);
                    setDayModalClickedTime(`${hour}:00`);
                    setIsDayModalOpen(true);
                  }}
                  currentDate={currentDate}
                  onDateChange={setCurrentDate}
                />
              )}

              {view === 'day' && (
                <DayView
                  events={filteredEvents}
                  onEventClick={handleEventClick}
                  onTimeSlotClick={(date, hour) => {
                    setDayModalDate(date);
                    setDayModalClickedTime(`${hour}:00`);
                    setIsDayModalOpen(true);
                  }}
                  currentDate={currentDate}
                  onDateChange={setCurrentDate}
                />
              )}

              {view === 'year' && (
                <YearView
                  currentYear={currentYear}
                  events={filteredEvents}
                  onDateClick={(date) => {
                    setCurrentMonth(date);
                    setCurrentDate(date);
                    setView('month');
                  }}
                  onEventClick={handleEventClick}
                />
              )}

              {view === 'agenda' && (
                <AgendaView
                  events={filteredEvents}
                  onEventClick={handleEventClick}
                />
              )}

              {view === 'list' && (
                <ListView
                  events={filteredEvents}
                  currentDate={currentDate}
                  onEventClick={handleEventClick}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Sidebar - Desktop Only (hidden on mobile/tablet) */}
      <div className="hidden lg:flex w-80 border-l border-border bg-card flex-col">
        {/* Mini Monthly Calendar */}
        <div className="p-4 border-b border-border">
          <div className="space-y-3">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMiniCalendarMonth(new Date(miniCalendarMonth.getFullYear(), miniCalendarMonth.getMonth() - 1))}
                className="h-7 w-7"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold">
                {format(miniCalendarMonth, 'MMMM yyyy')}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMiniCalendarMonth(new Date(miniCalendarMonth.getFullYear(), miniCalendarMonth.getMonth() + 1))}
                className="h-7 w-7"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Mini Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {/* Day Headers */}
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-xs font-medium text-muted-foreground py-1">
                  {day}
                </div>
              ))}

              {/* Empty cells before month starts */}
              {miniEmptyCells.map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {/* Calendar days */}
              {miniDays.map((day) => {
                const hasEvents = hasEventsOnDate(day);
                const isSelected = selectedMiniDate && isSameDay(day, selectedMiniDate);
                const isTodayDate = isToday(day);
                const isCurrentMonth = isSameMonth(day, miniCalendarMonth);

                return (
                  <button
                    key={day.toString()}
                    onClick={() => {
                      setSelectedMiniDate(day);
                      setCurrentMonth(day);
                      setCurrentDate(day);
                    }}
                    className={cn(
                      "aspect-square rounded-md text-xs flex items-center justify-center relative transition-colors",
                      isCurrentMonth ? "text-foreground" : "text-muted-foreground/40",
                      isTodayDate && "bg-primary text-primary-foreground font-semibold",
                      isSelected && !isTodayDate && "bg-accent",
                      !isSelected && !isTodayDate && "hover:bg-accent/50"
                    )}
                  >
                    {format(day, 'd')}
                    {hasEvents && (
                      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Day Events Panel */}
        {selectedMiniDate && (
          <div className="border-b border-border">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">
                  {format(selectedMiniDate, 'EEEE, MMMM d')}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMiniDate(null)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {(() => {
                const dayEvents = getEventsForDate(selectedMiniDate);

                if (dayEvents.length === 0) {
                  return (
                    <div className="text-xs text-muted-foreground text-center py-4">
                      No events scheduled
                    </div>
                  );
                }

                return (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {dayEvents.map((event) => {
                      const startTime = new Date(event.startTime);
                      const endTime = new Date(event.endTime);

                      return (
                        <button
                          key={event.id}
                          onClick={() => {
                            setSelectedEvent(event);
                            setIsEventDetailsOpen(true);
                          }}
                          className="w-full text-left p-2 rounded-md hover:bg-accent transition-colors"
                        >
                          <div className="flex items-start gap-2">
                            <div
                              className="w-1 h-full rounded-full mt-1 flex-shrink-0"
                              style={{ backgroundColor: event.color || '#3b82f6' }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {event.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                              </p>
                              {event.location && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  📍 {event.location}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Calendar List Toggle Button */}
        <div className="p-3 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCalendarListOpen(!isCalendarListOpen)}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              <CalendarIconLucide className="h-4 w-4" />
              My Calendars
            </span>
            <ChevronRight className={cn(
              "h-4 w-4 transition-transform",
              isCalendarListOpen && "rotate-90"
            )} />
          </Button>
        </div>
      </div>

      {/* Slide-out Event Detail Panel */}
      {sidebarDetailEvent && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setSidebarDetailEvent(null)}
          />

          {/* Detail Panel */}
          <div className="fixed top-0 right-0 h-full w-96 bg-card border-l border-border shadow-2xl z-50 lg:right-80 transform transition-transform duration-300 ease-in-out">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold">Event Details</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarDetailEvent(null)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Event Details */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Title */}
                <div>
                  <div
                    className="w-full h-1 rounded-full mb-3"
                    style={{ backgroundColor: sidebarDetailEvent.color || '#3b82f6' }}
                  />
                  <h3 className="text-xl font-semibold break-words">{sidebarDetailEvent.title}</h3>
                </div>

                {/* Time */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CalendarIconLucide className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {format(new Date(sidebarDetailEvent.startTime), 'EEEE, MMMM d, yyyy')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(sidebarDetailEvent.startTime), 'h:mm a')} - {format(new Date(sidebarDetailEvent.endTime), 'h:mm a')}
                    </p>
                  </div>
                </div>

                {/* Location */}
                {sidebarDetailEvent.location && (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                      <span className="text-accent-foreground">📍</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-muted-foreground break-words">{sidebarDetailEvent.location}</p>
                    </div>
                  </div>
                )}

                {/* Description */}
                {sidebarDetailEvent.description && (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                      <span className="text-accent-foreground">📝</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium mb-1">Description</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{sidebarDetailEvent.description}</p>
                    </div>
                  </div>
                )}

                {/* Attendees */}
                {sidebarDetailEvent.attendees && sidebarDetailEvent.attendees.length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                      <span className="text-accent-foreground">👥</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium mb-2">Attendees</p>
                      <div className="space-y-1">
                        {sidebarDetailEvent.attendees.map((attendee: any, idx: number) => (
                          <div key={idx} className="text-sm text-muted-foreground break-words">
                            {attendee.email || attendee}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Calendar */}
                {sidebarDetailEvent.calendar && (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <CalendarIconLucide className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Calendar</p>
                      <p className="text-sm text-muted-foreground break-words">{sidebarDetailEvent.calendar}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-border space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelectedEvent(sidebarDetailEvent);
                    setSidebarDetailEvent(null);
                  }}
                >
                  Edit Event
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={async () => {
                    if (confirm('Are you sure you want to delete this event?')) {
                      try {
                        const response = await fetch(`/api/calendar/events/${sidebarDetailEvent.id}`, {
                          method: 'DELETE',
                        });

                        if (response.ok) {
                          setSidebarDetailEvent(null);
                          fetchEvents();
                          toast({
                            title: 'Event Deleted',
                            description: 'The event has been deleted successfully.',
                          });
                        }
                      } catch (error) {
                        console.error('Failed to delete event:', error);
                        toast({
                          title: 'Delete Failed',
                          description: 'Failed to delete the event.',
                          variant: 'destructive',
                        });
                      }
                    }
                  }}
                >
                  Delete Event
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Slide-in Calendar List Panel */}
      {isCalendarListOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
            onClick={() => setIsCalendarListOpen(false)}
          />

          {/* Calendar List Panel */}
          <div className={cn(
            "fixed top-0 right-0 h-full w-80 bg-card border-l border-border shadow-2xl z-50",
            "transform transition-transform duration-300 ease-in-out",
            "lg:right-80" // Offset by sidebar width on desktop
          )}>
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <CalendarIconLucide className="h-5 w-5" />
                  My Calendars
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCalendarListOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Calendar Selector */}
              <div className="flex-1 overflow-y-auto">
                <CalendarSelector
                  accounts={allAccounts.filter(a => a.isActive && a.nylasGrantId)}
                  selectedCalendarIds={selectedCalendarIds}
                  onCalendarSelectionChange={handleCalendarSelectionChange}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      <DayEventsModal
        isOpen={isDayModalOpen}
        onClose={() => {
          setIsDayModalOpen(false);
          setDayModalDate(null);
          setDayModalClickedTime(undefined);
        }}
        date={dayModalDate || new Date()}
        events={dayModalDate ? getEventsForDate(dayModalDate) : []}
        onEventClick={(event) => {
          setSelectedEvent(event);
          setIsEventDetailsOpen(true);
        }}
        onAddEvent={(prefilledData) => {
          setIsDayModalOpen(false);
          setSelectedDate(prefilledData?.date || new Date());
          // If a specific time was clicked, set the hour
          if (dayModalClickedTime) {
            const [hour] = dayModalClickedTime.split(':').map(Number);
            const dateWithTime = new Date(prefilledData?.date || new Date());
            dateWithTime.setHours(hour);
            setSelectedDate(dateWithTime);
          }
          setSelectedEvent(null);
          setIsEventModalOpen(true);
        }}
        onBulkDelete={handleBulkDelete}
        onQuickAdd={() => setIsQuickAddOpen(true)}
      />

      <EventDetailsModal
        isOpen={isEventDetailsOpen}
        onClose={() => {
          setIsEventDetailsOpen(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        conflicts={selectedEvent ? (conflictMap.get(selectedEvent.id) || []) : []}
        onEdit={handleEditEvent}
        onDelete={() => {
          setIsEventDetailsOpen(false);
          setSelectedEvent(null);
        }}
        onSuccess={fetchEvents}
      />

      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setSelectedEvent(null);
          setSelectedDate(null);
        }}
        event={selectedEvent}
        defaultDate={selectedDate || undefined}
        onSuccess={fetchEvents}
      />

      <QuickAddV4
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onEventCreated={fetchEvents}
      />
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <CalendarContent />
    </Suspense>
  );
}
