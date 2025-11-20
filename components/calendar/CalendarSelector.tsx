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
}

interface CalendarSelectorProps {
  accountId: string | null;
  selectedCalendarIds: string[];
  onCalendarSelectionChange: (calendarIds: string[]) => void;
  className?: string;
}

// Cache for calendar data (simple in-memory cache)
const calendarCache = new Map<string, { data: CalendarItem[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function CalendarSelector({
  accountId,
  selectedCalendarIds,
  onCalendarSelectionChange,
  className,
}: CalendarSelectorProps) {
  const [calendars, setCalendars] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // Fetch calendars when account changes
  useEffect(() => {
    if (accountId) {
      fetchCalendars();
    } else {
      setCalendars([]);
    }
  }, [accountId]);

  const fetchCalendars = async () => {
    if (!accountId) return;

    // Rate limiting - prevent too many requests
    const now = Date.now();
    if (now - lastFetchTime < 2000) { // 2 second cooldown
      console.log('[CalendarSelector] Skipping fetch due to rate limiting');
      return;
    }

    // Check cache first
    const cached = calendarCache.get(accountId);
    if (cached && now - cached.timestamp < CACHE_DURATION) {
      console.log('[CalendarSelector] Using cached calendar data');
      setCalendars(cached.data);

      // Auto-select all calendars on first load if none selected
      if (selectedCalendarIds.length === 0) {
        const allCalendarIds = cached.data.map((cal: CalendarItem) => cal.id);
        onCalendarSelectionChange(allCalendarIds);
      }
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setLastFetchTime(now);

      const response = await fetch(`/api/nylas-v3/calendars?accountId=${accountId}`);
      const data = await response.json();

      if (data.success && data.calendars) {
        setCalendars(data.calendars);

        // Cache the result
        calendarCache.set(accountId, {
          data: data.calendars,
          timestamp: now,
        });

        // Auto-select all calendars on first load if none selected
        if (selectedCalendarIds.length === 0) {
          const allCalendarIds = data.calendars.map((cal: CalendarItem) => cal.id);
          onCalendarSelectionChange(allCalendarIds);
        }
      } else {
        throw new Error(data.error || 'Failed to fetch calendars');
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

  if (!accountId) {
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
                        {calendar.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {calendar.description}
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
