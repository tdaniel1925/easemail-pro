'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { X, Plus, Trash2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  EmailRule,
  RuleCondition,
  RuleAction,
  ConditionField,
  ConditionOperator,
  ActionType,
  ConditionLogic,
} from '@/lib/rules/types';

interface RuleBuilderProps {
  rule: EmailRule | null;
  onClose: () => void;
  onSave: (ruleData: any) => void;
}

export default function RuleBuilder({ rule, onClose, onSave }: RuleBuilderProps) {
  const [name, setName] = useState(rule?.name || '');
  const [description, setDescription] = useState(rule?.description || '');
  const [isEnabled, setIsEnabled] = useState(rule?.isEnabled ?? true);
  const [conditionLogic, setConditionLogic] = useState<ConditionLogic>(rule?.conditions.logic || 'AND');
  const [conditions, setConditions] = useState<RuleCondition[]>(
    rule?.conditions.conditions || [
      { field: 'subject', operator: 'contains', value: '' },
    ]
  );
  const [actions, setActions] = useState<RuleAction[]>(
    rule?.actions || [{ type: 'mark_as_read' }]
  );
  const [stopProcessing, setStopProcessing] = useState(rule?.stopProcessing ?? false);
  const [saving, setSaving] = useState(false);

  // Field options
  const fieldOptions: { value: ConditionField; label: string }[] = [
    { value: 'from_email', label: 'From Email' },
    { value: 'from_name', label: 'From Name' },
    { value: 'to_email', label: 'To Email' },
    { value: 'subject', label: 'Subject' },
    { value: 'body', label: 'Body' },
    { value: 'has_attachments', label: 'Has Attachments' },
    { value: 'is_read', label: 'Is Read' },
    { value: 'is_starred', label: 'Is Starred' },
    { value: 'folder', label: 'Folder' },
    { value: 'label', label: 'Label' },
  ];

  // Operator options
  const getOperatorOptions = (field: ConditionField): { value: ConditionOperator; label: string }[] => {
    const stringOperators = [
      { value: 'contains' as ConditionOperator, label: 'Contains' },
      { value: 'not_contains' as ConditionOperator, label: 'Does not contain' },
      { value: 'is' as ConditionOperator, label: 'Is exactly' },
      { value: 'is_not' as ConditionOperator, label: 'Is not' },
      { value: 'starts_with' as ConditionOperator, label: 'Starts with' },
      { value: 'ends_with' as ConditionOperator, label: 'Ends with' },
    ];

    const booleanOperators = [
      { value: 'is' as ConditionOperator, label: 'Is' },
    ];

    if (['is_read', 'is_starred', 'has_attachments'].includes(field)) {
      return booleanOperators;
    }

    return stringOperators;
  };

  // Action options
  const actionOptions: { value: ActionType; label: string; needsValue?: boolean }[] = [
    { value: 'mark_as_read', label: 'Mark as Read' },
    { value: 'mark_as_unread', label: 'Mark as Unread' },
    { value: 'star', label: 'Star' },
    { value: 'unstar', label: 'Unstar' },
    { value: 'archive', label: 'Archive' },
    { value: 'delete', label: 'Delete' },
    { value: 'mark_as_spam', label: 'Mark as Spam' },
    { value: 'move_to_folder', label: 'Move to Folder', needsValue: true },
    { value: 'add_label', label: 'Add Label', needsValue: true },
    { value: 'forward_to', label: 'Forward To', needsValue: true },
  ];

  // Add condition
  const addCondition = () => {
    setConditions([
      ...conditions,
      { field: 'subject', operator: 'contains', value: '' },
    ]);
  };

  // Remove condition
  const removeCondition = (index: number) => {
    if (conditions.length > 1) {
      setConditions(conditions.filter((_, i) => i !== index));
    }
  };

  // Update condition
  const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    setConditions(newConditions);
  };

  // Add action
  const addAction = () => {
    setActions([...actions, { type: 'mark_as_read' }]);
  };

  // Remove action
  const removeAction = (index: number) => {
    if (actions.length > 1) {
      setActions(actions.filter((_, i) => i !== index));
    }
  };

  // Update action
  const updateAction = (index: number, updates: Partial<RuleAction>) => {
    const newActions = [...actions];
    newActions[index] = { ...newActions[index], ...updates };
    setActions(newActions);
  };

  // Save rule
  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      alert('Please enter a rule name');
      return;
    }

    if (conditions.some(c => !c.value && c.value !== false)) {
      alert('Please fill in all condition values');
      return;
    }

    setSaving(true);
    try {
      const ruleData = {
        name,
        description,
        isEnabled,
        conditions: {
          logic: conditionLogic,
          conditions,
        },
        actions,
        stopProcessing,
      };

      await onSave(ruleData);
    } catch (error) {
      console.error('Error saving rule:', error);
      alert('Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-background border-b border-border p-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                {rule ? 'Edit Rule' : 'Create New Rule'}
              </h2>
              <p className="text-sm text-muted-foreground">
                Automate your email workflow with custom rules
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8 max-w-3xl mx-auto">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-base font-semibold">Rule Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Archive newsletters"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-base font-semibold">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this rule does..."
                  rows={2}
                  className="mt-2"
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30">
                <div>
                  <Label htmlFor="enabled" className="text-base font-semibold">Enable Rule</Label>
                  <p className="text-sm text-muted-foreground">Rule will run automatically when enabled</p>
                </div>
                <Switch
                  id="enabled"
                  checked={isEnabled}
                  onCheckedChange={setIsEnabled}
                />
              </div>
            </div>

            {/* Conditions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold">Conditions</h3>
                  <p className="text-sm text-muted-foreground">When these conditions are met</p>
                </div>
                <Select value={conditionLogic} onValueChange={(v) => setConditionLogic(v as ConditionLogic)}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">All (AND)</SelectItem>
                    <SelectItem value="OR">Any (OR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                {conditions.map((condition, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-4 border border-border rounded-lg bg-card"
                  >
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      {/* Field */}
                      <Select
                        value={condition.field}
                        onValueChange={(v) => updateCondition(index, { field: v as ConditionField })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fieldOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Operator */}
                      <Select
                        value={condition.operator}
                        onValueChange={(v) => updateCondition(index, { operator: v as ConditionOperator })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getOperatorOptions(condition.field).map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Value */}
                      {['is_read', 'is_starred', 'has_attachments'].includes(condition.field) ? (
                        <Select
                          value={String(condition.value)}
                          onValueChange={(v) => updateCondition(index, { value: v === 'true' })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">True</SelectItem>
                            <SelectItem value="false">False</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={String(condition.value)}
                          onChange={(e) => updateCondition(index, { value: e.target.value })}
                          placeholder="Value..."
                        />
                      )}
                    </div>

                    {conditions.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCondition(index)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={addCondition}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Condition
              </Button>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold">Actions</h3>
                <p className="text-sm text-muted-foreground">Perform these actions</p>
              </div>

              <div className="space-y-3">
                {actions.map((action, index) => {
                  const actionOption = actionOptions.find(opt => opt.value === action.type);
                  
                  return (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-4 border border-border rounded-lg bg-card"
                    >
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        {/* Action Type */}
                        <Select
                          value={action.type}
                          onValueChange={(v) => updateAction(index, { type: v as ActionType })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {actionOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Action Value (if needed) */}
                        {actionOption?.needsValue && (
                          <Input
                            value={(action as any).folder || (action as any).label || (action as any).email || ''}
                            onChange={(e) => {
                              if (action.type === 'move_to_folder') {
                                updateAction(index, { folder: e.target.value } as any);
                              } else if (action.type === 'add_label') {
                                updateAction(index, { label: e.target.value } as any);
                              } else if (action.type === 'forward_to') {
                                updateAction(index, { email: e.target.value, includeOriginal: true } as any);
                              }
                            }}
                            placeholder={
                              action.type === 'move_to_folder'
                                ? 'Folder name...'
                                : action.type === 'add_label'
                                ? 'Label name...'
                                : 'Email address...'
                            }
                          />
                        )}
                      </div>

                      {actions.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAction(index)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              <Button
                variant="outline"
                onClick={addAction}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Action
              </Button>
            </div>

            {/* Advanced Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30">
                <div>
                  <Label htmlFor="stopProcessing" className="text-base font-semibold">Stop Processing</Label>
                  <p className="text-sm text-muted-foreground">Don't run other rules if this one matches</p>
                </div>
                <Switch
                  id="stopProcessing"
                  checked={stopProcessing}
                  onCheckedChange={setStopProcessing}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-background border-t border-border p-6 flex items-center justify-end gap-3 flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : rule ? 'Update Rule' : 'Create Rule'}
          </Button>
        </div>
      </div>
    </div>
  );
}
