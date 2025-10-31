'use client';

/**
 * Search Bar Component
 * Full-text search for attachments
 */

import { Search as MagnifyingGlassIcon, X as XMarkIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchBarProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value = '',
  onChange,
  placeholder = 'Search attachments...',
}: SearchBarProps) {
  const [inputValue, setInputValue] = useState(value);

  // Debounce the search
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(inputValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, onChange]);

  return (
    <div className="relative">
      <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" size={16} />
      <Input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        className="pl-10 pr-10"
      />
      {inputValue && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setInputValue('')}
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
        >
          <XMarkIcon className="h-4 w-4" size={16} />
        </Button>
      )}
    </div>
  );
}

