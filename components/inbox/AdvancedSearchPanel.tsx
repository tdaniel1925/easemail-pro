'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { SlidersHorizontal, Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface SearchFilters {
  query?: string;
  from?: string;
  to?: string;
  subject?: string;
  dateFrom?: Date;
  dateTo?: Date;
  isUnread?: boolean;
  isStarred?: boolean;
  hasAttachment?: boolean;
}

interface AdvancedSearchPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: () => void;
}

export function AdvancedSearchPanel({ filters, onFiltersChange, onSearch }: AdvancedSearchPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDateFromCalendar, setShowDateFromCalendar] = useState(false);
  const [showDateToCalendar, setShowDateToCalendar] = useState(false);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilter = (key: keyof SearchFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).filter(key => key !== 'query').length > 0;

  const handleApply = () => {
    onSearch();
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'gap-2',
            hasActiveFilters && 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 rounded-full bg-blue-600 px-1.5 py-0.5 text-xs text-white">
              {Object.keys(filters).filter(key => key !== 'query').length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Advanced Search</h3>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all
              </Button>
            )}
          </div>

          {/* From Filter */}
          <div className="space-y-2">
            <Label htmlFor="filter-from" className="text-sm font-medium">
              From
            </Label>
            <div className="relative">
              <Input
                id="filter-from"
                placeholder="sender@example.com"
                value={filters.from || ''}
                onChange={(e) => updateFilter('from', e.target.value)}
                className="pr-8"
              />
              {filters.from && (
                <button
                  onClick={() => clearFilter('from')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* To Filter */}
          <div className="space-y-2">
            <Label htmlFor="filter-to" className="text-sm font-medium">
              To
            </Label>
            <div className="relative">
              <Input
                id="filter-to"
                placeholder="recipient@example.com"
                value={filters.to || ''}
                onChange={(e) => updateFilter('to', e.target.value)}
                className="pr-8"
              />
              {filters.to && (
                <button
                  onClick={() => clearFilter('to')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Subject Filter */}
          <div className="space-y-2">
            <Label htmlFor="filter-subject" className="text-sm font-medium">
              Subject
            </Label>
            <div className="relative">
              <Input
                id="filter-subject"
                placeholder="Enter subject keywords"
                value={filters.subject || ''}
                onChange={(e) => updateFilter('subject', e.target.value)}
                className="pr-8"
              />
              {filters.subject && (
                <button
                  onClick={() => clearFilter('subject')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Date Range Filters */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Date Range</Label>
            <div className="grid grid-cols-2 gap-2">
              {/* Date From */}
              <div>
                <Popover open={showDateFromCalendar} onOpenChange={setShowDateFromCalendar}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !filters.dateFrom && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateFrom ? format(filters.dateFrom, 'PP') : 'From'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => {
                        updateFilter('dateFrom', date);
                        setShowDateFromCalendar(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To */}
              <div>
                <Popover open={showDateToCalendar} onOpenChange={setShowDateToCalendar}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !filters.dateTo && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateTo ? format(filters.dateTo, 'PP') : 'To'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => {
                        updateFilter('dateTo', date);
                        setShowDateToCalendar(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {(filters.dateFrom || filters.dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearFilter('dateFrom');
                  clearFilter('dateTo');
                }}
                className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear dates
              </Button>
            )}
          </div>

          {/* Toggle Filters */}
          <div className="space-y-3 border-t pt-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="filter-unread" className="text-sm font-medium cursor-pointer">
                Unread only
              </Label>
              <Switch
                id="filter-unread"
                checked={filters.isUnread || false}
                onCheckedChange={(checked) => updateFilter('isUnread', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="filter-starred" className="text-sm font-medium cursor-pointer">
                Starred only
              </Label>
              <Switch
                id="filter-starred"
                checked={filters.isStarred || false}
                onCheckedChange={(checked) => updateFilter('isStarred', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="filter-attachment" className="text-sm font-medium cursor-pointer">
                Has attachments
              </Label>
              <Switch
                id="filter-attachment"
                checked={filters.hasAttachment || false}
                onCheckedChange={(checked) => updateFilter('hasAttachment', checked)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              className="flex-1"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
