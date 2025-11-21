'use client';

import { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

interface CalendarItem {
  id: string;
  name: string;
  description?: string;
  isPrimary?: boolean;
  hexColor?: string;
  readOnly?: boolean;
  accountId?: string; // ✅ Track which account this calendar belongs to
  accountEmail?: string; // ✅ For display purposes
}

interface Account {
  id: string;
  emailAddress: string;
  nylasGrantId: string;
  isActive: boolean;
}

interface CalendarSelectorProps {
  accounts: Account[]; // ✅ Changed from single accountId to array of accounts
  selectedCalendarIds: string[];
  onCalendarSelectionChange: (calendarIds: string[]) => void;
  className?: string;
}

// Cache for calendar data (simple in-memory cache)
const calendarCache = new Map<string, { data: CalendarItem[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function CalendarSelector({
  accounts, // ✅ Now receives array of accounts
  selectedCalendarIds,
  onCalendarSelectionChange,
  className,
}: CalendarSelectorProps) {
  const [calendars, setCalendars] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // ✅ Fetch calendars when accounts change
  useEffect(() => {
    if (accounts.length > 0) {
      fetchCalendarsForAllAccounts();
    } else {
      setCalendars([]);
    }
  }, [accounts]);

  // ✅ NEW: Fetch calendars for ALL active accounts
  const fetchCalendarsForAllAccounts = async () => {
    // Rate limiting - prevent too many requests
    const now = Date.now();
    if (now - lastFetchTime < 2000) { // 2 second cooldown
      console.log('[CalendarSelector] Skipping fetch due to rate limiting');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setLastFetchTime(now);

      const allCalendars: CalendarItem[] = [];

      // ✅ Loop through all accounts and fetch their calendars
      for (const account of accounts) {
        if (!account.nylasGrantId) continue;

        // Check cache first
        const cached = calendarCache.get(account.nylasGrantId);
        if (cached && now - cached.timestamp < CACHE_DURATION) {
          console.log(`[CalendarSelector] Using cached calendar data for ${account.emailAddress}`);
          // Add account info to cached calendars
          const calendarsWithAccount = cached.data.map(cal => ({
            ...cal,
            accountId: account.id,
            accountEmail: account.emailAddress,
          }));
          allCalendars.push(...calendarsWithAccount);
          continue;
        }

        // Fetch from API
        try {
          const response = await fetch(`/api/nylas-v3/calendars?accountId=${account.nylasGrantId}`);
          const data = await response.json();

          if (data.success && data.calendars) {
            // Add account info to each calendar
            const calendarsWithAccount = data.calendars.map((cal: CalendarItem) => ({
              ...cal,
              accountId: account.id,
              accountEmail: account.emailAddress,
            }));

            allCalendars.push(...calendarsWithAccount);

            // Cache the result
            calendarCache.set(account.nylasGrantId, {
              data: data.calendars,
              timestamp: now,
            });

            console.log(`[CalendarSelector] Fetched ${data.calendars.length} calendars for ${account.emailAddress}`);
          }
        } catch (err) {
          console.error(`[CalendarSelector] Error fetching calendars for ${account.emailAddress}:`, err);
          // Continue with other accounts even if one fails
        }
      }

      setCalendars(allCalendars);
      console.log(`[CalendarSelector] Total calendars loaded: ${allCalendars.length}`);

      // Auto-select all calendars on first load if none selected
      if (selectedCalendarIds.length === 0 && allCalendars.length > 0) {
        const allCalendarIds = allCalendars.map(cal => cal.id);
        onCalendarSelectionChange(allCalendarIds);
      }
    } catch (err) {
      console.error('[CalendarSelector] Error fetching calendars:', err);
      setError(err instanceof Error ? err.message : 'Failed to load calendars');
    } finally {
      setLoading(false);
    }
  };

  const handleCalendarToggle = (calendarId: string) => {
    const newSelection = selectedCalendarIds.includes(calendarId)
      ? selectedCalendarIds.filter(id => id !== calendarId)
      : [...selectedCalendarIds, calendarId];

    onCalendarSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    const allCalendarIds = calendars.map(cal => cal.id);
    onCalendarSelectionChange(allCalendarIds);
  };

  const handleDeselectAll = () => {
    onCalendarSelectionChange([]);
  };

  // ✅ Show calendar selector if there are active accounts
  if (accounts.length === 0) {
    return null;
  }

  return (
    <div className={cn('border-t border-border', className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent transition-colors"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Calendars</span>
          {calendars.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({selectedCalendarIds.length}/{calendars.length})
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Calendar List */}
      {isExpanded && (
        <div className="px-2 pb-3">
          {loading && (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
              Loading calendars...
            </div>
          )}

          {error && (
            <div className="px-2 py-2 text-xs text-red-600">
              {error}
            </div>
          )}

          {!loading && !error && calendars.length === 0 && (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
              No calendars found
            </div>
          )}

          {!loading && !error && calendars.length > 0 && (
            <>
              {/* Select All / Deselect All */}
              <div className="flex gap-2 px-2 py-2 border-b border-border mb-2">
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-primary hover:underline"
                  disabled={selectedCalendarIds.length === calendars.length}
                >
                  Select all
                </button>
                <span className="text-xs text-muted-foreground">|</span>
                <button
                  onClick={handleDeselectAll}
                  className="text-xs text-primary hover:underline"
                  disabled={selectedCalendarIds.length === 0}
                >
                  Deselect all
                </button>
              </div>

              {/* Calendar Items */}
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {calendars.map((calendar) => {
                  const isSelected = selectedCalendarIds.includes(calendar.id);
                  const calendarColor = calendar.hexColor || '#3b82f6';

                  return (
                    <div
                      key={calendar.id}
                      className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => handleCalendarToggle(calendar.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleCalendarToggle(calendar.id)}
                        className="flex-shrink-0"
                        style={{
                          borderColor: isSelected ? calendarColor : undefined,
                          backgroundColor: isSelected ? calendarColor : undefined,
                        }}
                      />
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: calendarColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">
                          {calendar.name}
                          {calendar.isPrimary && (
                            <span className="ml-1 text-xs text-muted-foreground">(Primary)</span>
                          )}
                        </div>
                        {/* ✅ Show which account this calendar belongs to */}
                        {calendar.accountEmail && (
                          <div className="text-xs text-muted-foreground truncate">
                            {calendar.accountEmail}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
