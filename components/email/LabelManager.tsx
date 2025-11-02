'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus, Trash2, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Label {
  id: string;
  name: string;
  color: string;
}

interface LabelManagerProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#d946ef', // fuchsia
  '#ec4899', // pink
];

export function LabelManager({ open, onClose }: LabelManagerProps) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Fetch labels
  useEffect(() => {
    if (open) {
      fetchLabels();
    }
  }, [open]);

  const fetchLabels = async () => {
    try {
      const response = await fetch('/api/labels');
      const data = await response.json();
      if (data.success) {
        setLabels(data.labels);
      }
    } catch (error) {
      console.error('Failed to fetch labels:', error);
    }
  };

  const handleCreate = async () => {
    if (!newLabelName.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLabelName.trim(),
          color: selectedColor,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setLabels([...labels, data.label]);
        setNewLabelName('');
        setSelectedColor(DEFAULT_COLORS[0]);
      }
    } catch (error) {
      console.error('Failed to create label:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/labels/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setLabels(labels.filter(l => l.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete label:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Labels</DialogTitle>
          <DialogDescription>
            Create and organize labels for your emails
          </DialogDescription>
        </DialogHeader>

        {/* Create New Label */}
        <div className="space-y-3 py-4">
          <div className="flex gap-2">
            <Input
              placeholder="New label name"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <Button onClick={handleCreate} disabled={loading || !newLabelName.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>

          {/* Color Picker */}
          <div className="flex gap-2">
            {DEFAULT_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={cn(
                  'w-6 h-6 rounded-full transition-transform',
                  selectedColor === color && 'ring-2 ring-offset-2 ring-primary scale-110'
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Existing Labels */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {labels.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No labels yet. Create your first one above.
            </p>
          ) : (
            labels.map((label) => (
              <div
                key={label.id}
                className="flex items-center justify-between p-2 rounded-lg border border-border hover:bg-accent"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="text-sm">{label.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(label.id)}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

