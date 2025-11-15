/**
 * Event Search Component
 * Search and filter calendar events
 */

'use client';

import { useState, useMemo } from 'react';
import { Search, X, Filter, Calendar, MapPin, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface EventSearchProps {
  events: any[];
  onResultsChange: (filteredEvents: any[]) => void;
  className?: string;
}

export default function EventSearch({ events, onResultsChange, className }: EventSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterColors, setFilterColors] = useState<string[]>([]);
  const [showPastEvents, setShowPastEvents] = useState(true);
  const [hasLocation, setHasLocation] = useState<boolean | null>(null);
  const [hasAttendees, setHasAttendees] = useState<boolean | null>(null);
  const [hasMeetingLink, setHasMeetingLink] = useState<boolean | null>(null);

  // Get unique types and colors from events
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    events.forEach(event => {
      if (event.calendarType) types.add(event.calendarType);
    });
    return Array.from(types).sort();
  }, [events]);

  const availableColors = useMemo(() => {
    const colors = new Set<string>();
    events.forEach(event => {
      if (event.color) colors.add(event.color);
    });
    return Array.from(colors).sort();
  }, [events]);

  // Filter events
  const filteredEvents = useMemo(() => {
    let filtered = events;

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => {
        return (
          event.title?.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          event.location?.toLowerCase().includes(query) ||
          event.organizerEmail?.toLowerCase().includes(query)
        );
      });
    }

    // Filter by type
    if (filterTypes.length > 0) {
      filtered = filtered.filter(event => filterTypes.includes(event.calendarType));
    }

    // Filter by color
    if (filterColors.length > 0) {
      filtered = filtered.filter(event => filterColors.includes(event.color));
    }

    // Filter past events
    if (!showPastEvents) {
      const now = new Date();
      filtered = filtered.filter(event => new Date(event.endTime) >= now);
    }

    // Filter by location
    if (hasLocation !== null) {
      filtered = filtered.filter(event => {
        const eventHasLocation = event.location && event.location.trim() !== '';
        return hasLocation ? eventHasLocation : !eventHasLocation;
      });
    }

    // Filter by attendees
    if (hasAttendees !== null) {
      filtered = filtered.filter(event => {
        const eventHasAttendees = event.attendees && event.attendees.length > 0;
        return hasAttendees ? eventHasAttendees : !eventHasAttendees;
      });
    }

    // Filter by meeting link
    if (hasMeetingLink !== null) {
      filtered = filtered.filter(event => {
        const text = `${event.description || ''} ${event.location || ''}`.toLowerCase();
        const eventHasLink = text.includes('zoom.us') ||
                            text.includes('meet.google.com') ||
                            text.includes('teams.microsoft.com') ||
                            text.includes('webex.com');
        return hasMeetingLink ? eventHasLink : !eventHasLink;
      });
    }

    return filtered;
  }, [events, searchQuery, filterTypes, filterColors, showPastEvents, hasLocation, hasAttendees, hasMeetingLink]);

  // Update parent when filtered events change
  useMemo(() => {
    onResultsChange(filteredEvents);
  }, [filteredEvents, onResultsChange]);

  const hasActiveFilters = () => {
    return filterTypes.length > 0 ||
           filterColors.length > 0 ||
           !showPastEvents ||
           hasLocation !== null ||
           hasAttendees !== null ||
           hasMeetingLink !== null;
  };

  const clearAllFilters = () => {
    setFilterTypes([]);
    setFilterColors([]);
    setShowPastEvents(true);
    setHasLocation(null);
    setHasAttendees(null);
    setHasMeetingLink(null);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Filter Button */}
      <DropdownMenu open={showFilters} onOpenChange={setShowFilters}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={hasActiveFilters() ? "default" : "outline"}
            size="sm"
            className="relative"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters() && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold flex items-center justify-center">
                {[filterTypes.length, filterColors.length, !showPastEvents ? 1 : 0,
                  hasLocation !== null ? 1 : 0, hasAttendees !== null ? 1 : 0,
                  hasMeetingLink !== null ? 1 : 0].reduce((a, b) => a + b, 0)}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Filters</span>
            {hasActiveFilters() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all
              </Button>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Event Types */}
          {availableTypes.length > 0 && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                Event Type
              </DropdownMenuLabel>
              {availableTypes.map(type => (
                <DropdownMenuCheckboxItem
                  key={type}
                  checked={filterTypes.includes(type)}
                  onCheckedChange={(checked) => {
                    setFilterTypes(prev =>
                      checked ? [...prev, type] : prev.filter(t => t !== type)
                    );
                  }}
                >
                  {type}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}

          {/* Event Colors */}
          {availableColors.length > 0 && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Color
              </DropdownMenuLabel>
              {availableColors.map(color => (
                <DropdownMenuCheckboxItem
                  key={color}
                  checked={filterColors.includes(color)}
                  onCheckedChange={(checked) => {
                    setFilterColors(prev =>
                      checked ? [...prev, color] : prev.filter(c => c !== color)
                    );
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      color === 'blue' && 'bg-blue-500',
                      color === 'green' && 'bg-green-500',
                      color === 'red' && 'bg-red-500',
                      color === 'purple' && 'bg-purple-500',
                      color === 'orange' && 'bg-orange-500',
                      color === 'pink' && 'bg-pink-500'
                    )} />
                    {color}
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}

          {/* Quick Filters */}
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Quick Filters
          </DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={!showPastEvents}
            onCheckedChange={(checked) => setShowPastEvents(!checked)}
          >
            Hide past events
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={hasLocation === true}
            onCheckedChange={(checked) => setHasLocation(checked ? true : null)}
          >
            <MapPin className="h-3 w-3 mr-2" />
            Has location
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={hasAttendees === true}
            onCheckedChange={(checked) => setHasAttendees(checked ? true : null)}
          >
            <Users className="h-3 w-3 mr-2" />
            Has attendees
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={hasMeetingLink === true}
            onCheckedChange={(checked) => setHasMeetingLink(checked ? true : null)}
          >
            Has meeting link
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Results Count */}
      {(searchQuery || hasActiveFilters()) && (
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          {filteredEvents.length} result{filteredEvents.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
