'use client';

import { useState, useEffect, useRef, TextareaHTMLAttributes } from 'react';
import { checkGrammar, GrammarIssue, getIssueSeverityColor } from '@/lib/grammar/grammar-checker';
import { AlertCircle, CheckCircle2, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpellCheckTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SpellCheckTextarea({ value, onChange, className, ...props }: SpellCheckTextareaProps) {
  const [issues, setIssues] = useState<GrammarIssue[]>([]);
  const [showIssues, setShowIssues] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check grammar on value change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const grammarIssues = checkGrammar(value);
      setIssues(grammarIssues);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [value]);

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  const getIssueIcon = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Lightbulb className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative">
      {/* Textarea with browser spellcheck */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={true} // Enable browser's built-in spell check
        className={cn(
          'w-full min-h-[200px] p-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground',
          className
        )}
        {...props}
      />

      {/* Grammar/Style Check Results */}
      {issues.length > 0 && (
        <div className="mt-2 space-y-2">
          {/* Stats Bar */}
          <div className="flex items-center justify-between px-3 py-2 bg-muted rounded-md">
            <div className="flex items-center gap-4 text-sm">
              {errorCount > 0 && (
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-red-500 font-medium">{errorCount}</span>
                </div>
              )}
              {warningCount > 0 && (
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span className="text-yellow-500 font-medium">{warningCount}</span>
                </div>
              )}
              {infoCount > 0 && (
                <div className="flex items-center gap-1">
                  <Lightbulb className="h-4 w-4 text-blue-500" />
                  <span className="text-blue-500 font-medium">{infoCount}</span>
                </div>
              )}
              {issues.length === 0 && (
                <div className="flex items-center gap-1 text-green-500">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">No issues found</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowIssues(!showIssues)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showIssues ? 'Hide' : 'Show'} suggestions
            </button>
          </div>

          {/* Issues List */}
          {showIssues && (
            <div className="max-h-40 overflow-y-auto space-y-2 px-3 py-2 bg-muted/50 rounded-md">
              {issues.slice(0, 10).map((issue, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-sm p-2 bg-background rounded-md hover:bg-accent transition-colors"
                >
                  {getIssueIcon(issue.severity)}
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{issue.message}</p>
                    {issue.suggestions.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Suggestions: {issue.suggestions.join(', ')}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      "{value.substring(issue.startIndex, issue.endIndex)}"
                    </p>
                  </div>
                </div>
              ))}
              {issues.length > 10 && (
                <p className="text-xs text-center text-muted-foreground py-2">
                  ... and {issues.length - 10} more issues
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
