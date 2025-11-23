'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Edit2, Trash2, ChevronDown, ChevronUp, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SimpleEmailRule } from '@/lib/rules/types-simple';
import { formatDistanceToNow } from 'date-fns';

interface RuleCardProps {
  rule: SimpleEmailRule;
  onEdit: (rule: SimpleEmailRule) => void;
  onDelete: (ruleId: string) => void;
  onToggle: (ruleId: string, isEnabled: boolean) => void;
  onTest: (rule: SimpleEmailRule) => void;
}

export default function RuleCard({ rule, onEdit, onDelete, onToggle, onTest }: RuleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-border rounded-lg bg-card hover:shadow-md transition-all">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-lg truncate">{rule.name}</h3>
              <span
                className={cn(
                  'px-2 py-0.5 text-xs rounded-full',
                  rule.isActive
                    ? 'bg-green-500/10 text-green-600'
                    : 'bg-gray-500/10 text-gray-600'
                )}
              >
                {rule.isActive ? 'Active' : 'Disabled'}
              </span>
            </div>

            {rule.description && (
              <p className="text-sm text-muted-foreground mb-2">{rule.description}</p>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Executed {rule.executionCount} times</span>
              {rule.lastExecutedAt && (
                <span>Last: {formatDistanceToNow(new Date(rule.lastExecutedAt))} ago</span>
              )}
              <span>Success: {rule.successCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Switch
              checked={rule.isActive}
              onCheckedChange={(checked) => onToggle(rule.id, checked)}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onTest(rule)}
              title="Test this rule"
            >
              <Play className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(rule)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(rule.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-border">
          <div className="grid grid-cols-2 gap-4">
            {/* Conditions */}
            <div>
              <h4 className="text-sm font-semibold mb-2">
                Conditions ({rule.matchAll ? 'ALL' : 'ANY'})
              </h4>
              <div className="space-y-2">
                {rule.conditions.map((condition, index) => (
                  <div key={index} className="text-sm bg-muted/50 rounded p-2">
                    <span className="font-medium">{condition.type}</span>
                    <span className="text-muted-foreground mx-2">{condition.operator}</span>
                    <span className="text-primary">{String(condition.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Actions ({rule.actions.length})</h4>
              <div className="space-y-2">
                {rule.actions.map((action, index) => (
                  <div key={index} className="text-sm bg-primary/10 rounded p-2">
                    <span className="font-medium">{action.type.replace(/_/g, ' ')}</span>
                    {(action as any).folderName && (
                      <span className="text-muted-foreground ml-2">→ {(action as any).folderName}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
            {rule.stopProcessing && <span>✓ Stop processing after this</span>}
            {rule.failureCount > 0 && (
              <span className="text-red-500">⚠ {rule.failureCount} failures</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

