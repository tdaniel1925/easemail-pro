'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { AdvancedSearchPanel, type SearchFilters } from './AdvancedSearchPanel';

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void;
  debounceMs?: number;
}

export default function SearchBar({ onSearch, debounceMs = 500 }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});

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

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
  };

  const handleAdvancedSearch = () => {
    onSearch({ ...filters, query: query || undefined });
  };

  return (
    <div className="flex items-center gap-2">
      <form onSubmit={handleSubmit} className="relative flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search emails..."
            value={query}
            onChange={handleChange}
            className="pl-10 pr-10"
          />
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
      <AdvancedSearchPanel
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onSearch={handleAdvancedSearch}
      />
    </div>
  );
}
