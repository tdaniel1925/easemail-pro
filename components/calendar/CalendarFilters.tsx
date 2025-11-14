'use client';

import { useState } from 'react';
import { Check, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { getCalendarTypeInfo } from '@/lib/calendar/calendar-utils';
import { cn } from '@/lib/utils';

interface CalendarFiltersProps {
  selectedTypes: string[];
  onTypesChange: (types: string[]) => void;
  availableTypes: string[];
}

const CALENDAR_TYPES = [
  'personal',
  'work',
  'family',
  'holiday',
  'birthday',
  'meeting',
  'task',
] as const;

export function CalendarFilters({
  selectedTypes,
  onTypesChange,
  availableTypes,
}: CalendarFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter(t => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  const selectAll = () => {
    onTypesChange(CALENDAR_TYPES.map(t => t));
  };

  const clearAll = () => {
    onTypesChange([]);
  };

  const activeFiltersCount = CALENDAR_TYPES.length - selectedTypes.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filter Calendars
          {activeFiltersCount > 0 && (
            <Badge
              variant="default"
              className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Calendar Types</h4>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                className="h-7 text-xs"
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-7 text-xs"
              >
                None
              </Button>
            </div>
          </div>

          {/* Calendar Type Checkboxes */}
          <div className="space-y-2">
            {CALENDAR_TYPES.map(type => {
              const info = getCalendarTypeInfo(type);
              const isSelected = selectedTypes.includes(type);
              const isAvailable = availableTypes.includes(type);

              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  disabled={!isAvailable}
                  className={cn(
                    'w-full flex items-center gap-3 p-2 rounded-lg transition-colors',
                    'hover:bg-accent',
                    isSelected && 'bg-accent',
                    !isAvailable && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {/* Checkbox */}
                  <div
                    className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground'
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>

                  {/* Icon and Label */}
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-lg">{info.icon}</span>
                    <span className="text-sm font-medium">{info.label}</span>
                  </div>

                  {/* Color Indicator */}
                  <div
                    className={cn(
                      'w-3 h-3 rounded-full',
                      `bg-${info.color}-500`
                    )}
                    style={{ backgroundColor: `var(--${info.color}-500, hsl(var(--primary)))` }}
                  />
                </button>
              );
            })}
          </div>

          {/* Info Text */}
          {availableTypes.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center">
              No events to filter
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Showing {selectedTypes.length} of {CALENDAR_TYPES.length} calendar types
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
