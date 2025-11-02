'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Plus, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Label {
  id: string;
  name: string;
  color: string;
}

interface LabelPickerProps {
  open: boolean;
  onClose: () => void;
  currentLabels: string[];
  onApply: (labelIds: string[]) => Promise<void>;
}

export function LabelPicker({ open, onClose, currentLabels, onApply }: LabelPickerProps) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set(currentLabels));
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch labels
  useEffect(() => {
    if (open) {
      fetchLabels();
      setSelectedLabels(new Set(currentLabels));
    }
  }, [open, currentLabels]);

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

  const toggleLabel = (labelId: string) => {
    const newSelected = new Set(selectedLabels);
    if (newSelected.has(labelId)) {
      newSelected.delete(labelId);
    } else {
      newSelected.add(labelId);
    }
    setSelectedLabels(newSelected);
  };

  const handleApply = async () => {
    setLoading(true);
    try {
      await onApply(Array.from(selectedLabels));
      onClose();
    } catch (error) {
      console.error('Failed to apply labels:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLabels = labels.filter(label =>
    label.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apply Labels</DialogTitle>
          <DialogDescription>
            Select labels to apply to the selected email(s)
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <Input
          placeholder="Search labels..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {/* Label List */}
        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {filteredLabels.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No labels found. Create one in label management.
            </p>
          ) : (
            filteredLabels.map((label) => (
              <button
                key={label.id}
                onClick={() => toggleLabel(label.id)}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-lg border transition-colors',
                  selectedLabels.has(label.id)
                    ? 'bg-primary/10 border-primary'
                    : 'border-border hover:bg-accent'
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="text-sm">{label.name}</span>
                </div>
                {selectedLabels.has(label.id) && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={loading} className="flex-1">
            Apply Labels
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

