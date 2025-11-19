/**
 * Grammar Check Component
 * Provides real-time grammar and spell checking with AI-powered suggestions
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Loader2, AlertCircle, Lightbulb } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface GrammarSuggestion {
  original: string;
  suggestion: string;
  reason: string;
  type: 'spelling' | 'grammar' | 'style' | 'punctuation';
  position: {
    start: number;
    end: number;
  };
}

interface GrammarCheckProps {
  text: string;
  onApplySuggestion?: (original: string, suggestion: string) => void;
}

export function GrammarCheck({ text, onApplySuggestion }: GrammarCheckProps) {
  const [checking, setChecking] = useState(false);
  const [suggestions, setSuggestions] = useState<GrammarSuggestion[]>([]);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const checkGrammar = async () => {
    if (!text || text.trim().length === 0) {
      return;
    }

    setChecking(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/grammar-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Grammar check failed');
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
      setLastChecked(text);
      setIsOpen(true);

    } catch (err: any) {
      console.error('Grammar check error:', err);
      setError(err.message || 'Failed to check grammar');
    } finally {
      setChecking(false);
    }
  };

  const handleApplySuggestion = (suggestion: GrammarSuggestion) => {
    if (onApplySuggestion) {
      onApplySuggestion(suggestion.original, suggestion.suggestion);
    }

    // Remove applied suggestion from list
    setSuggestions(prev => prev.filter(s =>
      s.original !== suggestion.original || s.suggestion !== suggestion.suggestion
    ));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'spelling':
        return '📝';
      case 'grammar':
        return '📖';
      case 'style':
        return '✨';
      case 'punctuation':
        return '🔤';
      default:
        return '💡';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'spelling':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'grammar':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'style':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'punctuation':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const hasIssues = suggestions.length > 0;
  const isPerfect = !checking && lastChecked === text && !hasIssues;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={checkGrammar}
          disabled={checking || !text || text.trim().length === 0}
          className={cn(
            'relative',
            hasIssues && 'border-orange-500 dark:border-orange-400',
            isPerfect && 'border-green-500 dark:border-green-400'
          )}
        >
          {checking ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : isPerfect ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
              Perfect
            </>
          ) : hasIssues ? (
            <>
              <AlertCircle className="w-4 h-4 mr-2 text-orange-600 dark:text-orange-400" />
              {suggestions.length} issue{suggestions.length !== 1 ? 's' : ''}
            </>
          ) : (
            <>
              <Lightbulb className="w-4 h-4 mr-2" />
              Grammar Check
            </>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-96 max-h-[500px] overflow-y-auto"
        side="bottom"
        align="start"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Writing Suggestions</h3>
            {suggestions.length > 0 && (
              <Badge variant="secondary">
                {suggestions.length} issue{suggestions.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {!error && suggestions.length === 0 && lastChecked && (
            <div className="p-4 text-center text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="font-medium">No issues found!</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your writing looks great
              </p>
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getTypeIcon(suggestion.type)}</span>
                      <Badge
                        variant="secondary"
                        className={cn('text-xs', getTypeColor(suggestion.type))}
                      >
                        {suggestion.type}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground line-through">
                        {suggestion.original}
                      </span>
                      {' → '}
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {suggestion.suggestion}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {suggestion.reason}
                    </p>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplySuggestion(suggestion)}
                      className="w-full"
                    >
                      Apply Suggestion
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {suggestions.length === 0 && !lastChecked && !error && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Click "Grammar Check" to analyze your writing
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
