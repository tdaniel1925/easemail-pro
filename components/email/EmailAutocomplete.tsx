import { useState, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';

interface EmailRecipient {
  email: string;
  name?: string;
}

interface EmailAutocompleteProps {
  value: EmailRecipient[];
  onChange: (recipients: EmailRecipient[]) => void;
  placeholder?: string;
  label?: string;
}

interface Suggestion {
  email: string;
  name?: string;
  source: 'contact' | 'recent';
}

export default function EmailAutocomplete({
  value,
  onChange,
  placeholder = 'Enter email addresses',
  label,
}: EmailAutocompleteProps) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions when user types OR show recent on focus
  useEffect(() => {
    if (input.length === 0) {
      // Show recent contacts when field is focused but empty
      const fetchRecentContacts = async () => {
        try {
          const response = await fetch('/api/emails/suggestions?recent=true');
          if (!response.ok) return;
          const data = await response.json();
          if (data.suggestions && data.suggestions.length > 0) {
            setSuggestions(data.suggestions);
            // Don't auto-show on page load, only on focus
          }
        } catch (error) {
          console.error('Error fetching recent contacts:', error);
        }
      };
      fetchRecentContacts();
      return;
    }

    if (input.length < 2) {
      setShowSuggestions(false);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/emails/suggestions?query=${encodeURIComponent(input)}`);
        if (!response.ok) return;

        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(data.suggestions && data.suggestions.length > 0);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Error fetching email suggestions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 200);
    return () => {
      clearTimeout(debounce);
      setIsLoading(false);
    };
  }, [input]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addRecipient = (email: string, name?: string) => {
    // Check if email already exists
    if (value.some((r) => r.email.toLowerCase() === email.toLowerCase())) {
      setInput('');
      setShowSuggestions(false);
      return;
    }

    onChange([...value, { email, name }]);
    setInput('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeRecipient = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();

      if (showSuggestions && suggestions.length > 0) {
        // Select highlighted suggestion
        const selected = suggestions[selectedIndex];
        addRecipient(selected.email, selected.name);
      } else if (input.trim()) {
        // Add manually typed email
        const email = input.trim();
        if (isValidEmail(email)) {
          addRecipient(email);
        }
      }
    } else if (e.key === 'Backspace' && input === '' && value.length > 0) {
      // Remove last recipient
      removeRecipient(value.length - 1);
    } else if (e.key === 'ArrowDown' && showSuggestions) {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp' && showSuggestions) {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Handle paste to support comma-separated emails
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    // Split by comma, semicolon, space, or newline
    const emails = pastedText
      .split(/[,;\s\n]+/)
      .map(email => email.trim())
      .filter(email => email.length > 0);
    
    let addedCount = 0;
    emails.forEach(email => {
      if (isValidEmail(email) && !value.some(r => r.email.toLowerCase() === email.toLowerCase())) {
        onChange([...value, { email }]);
        addedCount++;
      }
    });
    
    // Clear input after paste
    setInput('');
    setShowSuggestions(false);
    
    if (addedCount > 0) {
      inputRef.current?.focus();
    }
  };

  // Show recent contacts on focus
  const handleFocus = () => {
    if (suggestions.length > 0 && input.length === 0) {
      setShowSuggestions(true);
    }
  };

  // Handle blur - add email if valid
  const handleBlur = () => {
    // Small delay to allow click events to fire first
    setTimeout(() => {
      if (input.trim() && isValidEmail(input.trim())) {
        addRecipient(input.trim());
      }
    }, 200);
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium mb-1.5">
          {label}
        </label>
      )}

      <div className="flex flex-wrap gap-2 p-2 border border-border rounded-lg bg-background min-h-[42px] focus-within:ring-2 focus-within:ring-primary/20 relative">
        {value.map((recipient, index) => (
          <div
            key={index}
            className="flex items-center gap-1 px-2 py-1 bg-accent rounded-md text-sm"
          >
            <span>
              {recipient.name ? (
                <>
                  <span className="font-medium">{recipient.name}</span>
                  <span className="text-muted-foreground ml-1">
                    {'<'}{recipient.email}{'>'}
                  </span>
                </>
              ) : (
                recipient.email
              )}
            </span>
            <button
              type="button"
              onClick={() => removeRecipient(index)}
              className="hover:bg-accent-foreground/10 rounded p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        <div className="flex-1 min-w-[200px] relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={value.length === 0 ? placeholder : ''}
            className="flex-1 outline-none bg-transparent text-sm pr-6"
          />
          {isLoading && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground absolute right-0" />
          )}
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-[240px] overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => addRecipient(suggestion.email, suggestion.name)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full px-3 py-2 text-left hover:bg-accent transition-colors ${
                index === selectedIndex ? 'bg-accent' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {suggestion.name && (
                    <div className="font-medium text-sm truncate">{suggestion.name}</div>
                  )}
                  <div className={`text-sm truncate ${suggestion.name ? 'text-muted-foreground' : ''}`}>
                    {suggestion.email}
                  </div>
                </div>
                <div className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                  suggestion.source === 'contact'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                }`}>
                  {suggestion.source === 'contact' ? 'Contact' : 'Recent'}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {input && !isValidEmail(input) && input.includes('@') && (
        <p className="text-xs text-muted-foreground mt-1">
          Press Enter or comma to add email
        </p>
      )}
    </div>
  );
}

