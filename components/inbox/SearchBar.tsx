'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, X, SlidersHorizontal, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { SearchFilters } from './AdvancedSearchPanel';

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void;
  debounceMs?: number;
}

export default function SearchBar({ onSearch, debounceMs = 500 }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [showDateFromCalendar, setShowDateFromCalendar] = useState(false);
  const [showDateToCalendar, setShowDateToCalendar] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!isTyping) return;

    const timer = setTimeout(() => {
      onSearch({ ...filters, query: query || undefined });
      setIsTyping(false);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, filters, onSearch, debounceMs, isTyping]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsTyping(true);
  };

  const handleClear = () => {
    setQuery('');
    setIsTyping(false);
    onSearch({ ...filters, query: undefined });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsTyping(false);
    onSearch({ ...filters, query: query || undefined });
  };

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters({ ...filters, [key]: value });
  };

  const clearFilter = (key: keyof SearchFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    setFilters(newFilters);
  };

  const clearAllFilters = () => {
    setFilters({});
  };

  const handleApplyFilters = () => {
    onSearch({ ...filters, query: query || undefined });
    setIsFiltersOpen(false);
  };

  const hasActiveFilters = Object.keys(filters).filter(key => key !== 'query').length > 0;

  return (
    <form onSubmit={handleSubmit} className="relative flex-1">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search emails..."
          value={query}
          onChange={handleChange}
          className="pl-10 pr-20 transition-smooth"
        />
        <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center gap-1 z-10">
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Popover open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7 relative transition-smooth",
                  hasActiveFilters && "text-primary"
                )}
                title="Advanced search filters"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-white flex items-center justify-center">
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
                        type="button"
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
                        type="button"
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
                        type="button"
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
                            type="button"
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
                            type="button"
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
                      type="button"
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
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFiltersOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleApplyFilters}
                    className="flex-1"
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </form>
  );
}
