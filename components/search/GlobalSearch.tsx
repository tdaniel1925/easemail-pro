/**
 * GlobalSearch Component
 * Cmd+K / Ctrl+K command bar for unified search
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Loader2, Mail, Users, Calendar, Paperclip, Clock, Command, Filter } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAccount } from '@/contexts/AccountContext';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { parseSearchQuery, type ParsedQuery } from '@/lib/search/query-parser';

interface SearchResults {
  emails: any[];
  contacts: any[];
  events: any[];
  attachments: any[];
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ emails: [], contacts: [], events: [], attachments: [] });
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [parsedQuery, setParsedQuery] = useState<ParsedQuery | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { selectedAccount } = useAccount();
  const router = useRouter();

  // Load search history from localStorage
  useEffect(() => {
    const history = localStorage.getItem('search-history');
    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch (err) {
        console.error('[GlobalSearch] Failed to parse search history:', err);
      }
    }
  }, []);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }

      // ESC to close
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Parse query for smart filters
  useEffect(() => {
    if (query.trim()) {
      const parsed = parseSearchQuery(query);
      setParsedQuery(parsed);
      setShowSuggestions(parsed.suggestions.length > 0 && query.length >= 2);
    } else {
      setParsedQuery(null);
      setShowSuggestions(false);
    }
  }, [query]);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ emails: [], contacts: [], events: [], attachments: [] });
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, selectedAccount]);

  const performSearch = async (searchQuery: string) => {
    if (!selectedAccount?.nylasGrantId) {
      console.warn('[GlobalSearch] No account selected');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/search/unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          filters: {
            accountId: selectedAccount.nylasGrantId,
          },
          limit: 5,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results);
        console.log(`[GlobalSearch] Found ${data.total} results in ${data.took_ms}ms`);
      } else {
        console.error('[GlobalSearch] Search failed:', data.error);
      }
    } catch (error) {
      console.error('[GlobalSearch] Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
    setResults({ emails: [], contacts: [], events: [], attachments: [] });
    setSelectedIndex(0);
  };

  const saveToHistory = (searchQuery: string) => {
    const newHistory = [searchQuery, ...searchHistory.filter(h => h !== searchQuery)].slice(0, 5);
    setSearchHistory(newHistory);
    localStorage.setItem('search-history', JSON.stringify(newHistory));
  };

  const handleResultClick = (type: string, item: any) => {
    saveToHistory(query);
    handleClose();

    // Navigate to the appropriate page
    if (type === 'email') {
      router.push(`/inbox?messageId=${item.id}`);
    } else if (type === 'contact') {
      router.push(`/contacts-v4?contactId=${item.id}`);
    } else if (type === 'event') {
      router.push(`/calendar?eventId=${item.id}`);
    } else if (type === 'attachment') {
      router.push(`/attachments?messageId=${item.message_id}`);
    }
  };

  const removeFilter = (filterKey: string) => {
    if (!parsedQuery) return;

    // Remove the filter from the query string
    const filterPattern = new RegExp(`\\b${filterKey}:[^\\s]+`, 'gi');
    const newQuery = query.replace(filterPattern, '').trim();
    setQuery(newQuery);
  };

  const applySuggestion = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
  };

  const totalResults =
    results.emails.length + results.contacts.length + results.events.length + results.attachments.length;

  const hasResults = totalResults > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Search Input */}
        <div className="border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search emails, contacts, events, files... Try from:, to:, has:attachment"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base pr-0"
              />

              {/* Autocomplete Suggestions */}
              {showSuggestions && parsedQuery && parsedQuery.suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
                  {parsedQuery.suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => applySuggestion(suggestion)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 hover:bg-accent rounded-md transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs text-muted-foreground">
              <Command className="h-3 w-3" />
              <span>K</span>
            </div>
          </div>

          {/* Active Filters */}
          {parsedQuery && Object.keys(parsedQuery.filters).length > 0 && (
            <div className="flex items-center gap-2 px-4 pb-3 flex-wrap">
              <Filter className="h-3 w-3 text-muted-foreground" />
              {parsedQuery.filters.from && (
                <Badge variant="secondary" className="text-xs gap-1">
                  from:{parsedQuery.filters.from}
                  <button onClick={() => removeFilter('from')} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {parsedQuery.filters.to && (
                <Badge variant="secondary" className="text-xs gap-1">
                  to:{parsedQuery.filters.to}
                  <button onClick={() => removeFilter('to')} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {parsedQuery.filters.subject && (
                <Badge variant="secondary" className="text-xs gap-1">
                  subject:{parsedQuery.filters.subject}
                  <button onClick={() => removeFilter('subject')} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {parsedQuery.filters.has && parsedQuery.filters.has.map((item) => (
                <Badge key={item} variant="secondary" className="text-xs gap-1">
                  has:{item}
                  <button onClick={() => removeFilter('has')} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {parsedQuery.filters.is && parsedQuery.filters.is.map((item) => (
                <Badge key={item} variant="secondary" className="text-xs gap-1">
                  is:{item}
                  <button onClick={() => removeFilter('is')} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {parsedQuery.filters.in && (
                <Badge variant="secondary" className="text-xs gap-1">
                  in:{parsedQuery.filters.in}
                  <button onClick={() => removeFilter('in')} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {parsedQuery.filters.after && (
                <Badge variant="secondary" className="text-xs gap-1">
                  after:{parsedQuery.filters.after.toLocaleDateString()}
                  <button onClick={() => removeFilter('after')} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {parsedQuery.filters.before && (
                <Badge variant="secondary" className="text-xs gap-1">
                  before:{parsedQuery.filters.before.toLocaleDateString()}
                  <button onClick={() => removeFilter('before')} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {parsedQuery.filters.filename && (
                <Badge variant="secondary" className="text-xs gap-1">
                  filename:{parsedQuery.filters.filename}
                  <button onClick={() => removeFilter('filename')} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Results / Empty State */}
        <div className="max-h-[500px] overflow-y-auto">
          {!query && searchHistory.length > 0 && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Recent Searches</span>
              </div>
              {searchHistory.map((item, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(item)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors"
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          {!query && searchHistory.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm mb-1">Search across everything</p>
              <p className="text-xs">Try searching for emails, contacts, events, or files</p>
            </div>
          )}

          {query && !loading && !hasResults && (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No results found for &quot;{query}&quot;</p>
            </div>
          )}

          {hasResults && (
            <div className="p-2">
              {/* Emails */}
              {results.emails.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 px-2 py-1 mb-1">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase">
                      Emails ({results.emails.length})
                    </span>
                  </div>
                  {results.emails.map((email) => (
                    <button
                      key={email.id}
                      onClick={() => handleResultClick('email', email)}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium truncate">{email.subject || '(No Subject)'}</p>
                            {email.unread && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {email.from?.[0]?.name || email.from?.[0]?.email} · {email.snippet}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(email.date * 1000, { addSuffix: true })}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Contacts */}
              {results.contacts.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 px-2 py-1 mb-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase">
                      Contacts ({results.contacts.length})
                    </span>
                  </div>
                  {results.contacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => handleResultClick('contact', contact)}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors"
                    >
                      <p className="text-sm font-medium">{contact.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {contact.primary_email} {contact.company_name && `· ${contact.company_name}`}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {/* Events */}
              {results.events.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 px-2 py-1 mb-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase">
                      Events ({results.events.length})
                    </span>
                  </div>
                  {results.events.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => handleResultClick('event', event)}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors"
                    >
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.start_time * 1000).toLocaleString()} {event.location && `· ${event.location}`}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {/* Attachments */}
              {results.attachments.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 px-2 py-1 mb-1">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase">
                      Attachments ({results.attachments.length})
                    </span>
                  </div>
                  {results.attachments.map((attachment) => (
                    <button
                      key={attachment.id}
                      onClick={() => handleResultClick('attachment', attachment)}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors"
                    >
                      <p className="text-sm font-medium">{attachment.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {attachment.message_subject} · {(attachment.size / 1024).toFixed(1)} KB
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2 border-t border-border bg-muted/50 text-xs text-muted-foreground">
          <div className="flex items-center justify-between mb-1">
            <span>Type to search • ESC to close • Try filters: from:, to:, has:attachment, is:unread</span>
            {hasResults && <span>{totalResults} result{totalResults !== 1 ? 's' : ''}</span>}
          </div>
          {parsedQuery && parsedQuery.cleanQuery && (
            <div className="text-xs text-muted-foreground/80">
              Searching for: &quot;{parsedQuery.cleanQuery}&quot;
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
