'use client';

import { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  debounceMs?: number;
}

export default function SearchBar({ onSearch, debounceMs = 500 }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!isTyping) return;

    const timer = setTimeout(() => {
      onSearch(query);
      setIsTyping(false);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, onSearch, debounceMs, isTyping]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsTyping(true);
  };

  const handleClear = () => {
    setQuery('');
    setIsTyping(false);
    onSearch('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsTyping(false);
    onSearch(query);
  };

  return (
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
  );
}
