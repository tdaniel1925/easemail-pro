'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Tag as TagIcon } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';

interface Tag {
  id: string;
  name: string;
  color: string;
  contactCount: number;
}

interface TagPickerProps {
  selectedTags: string[]; // array of tag IDs
  onChange: (tagIds: string[]) => void;
  disabled?: boolean;
}

export default function TagPicker({ selectedTags, onChange, disabled }: TagPickerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/contacts/tags');
      const data = await res.json();
      if (data.success) {
        setTags(data.tags);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onChange(selectedTags.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTags, tagId]);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    onChange(selectedTags.filter((id) => id !== tagId));
  };

  const selectedTagObjects = tags.filter((t) => selectedTags.includes(t.id));

  return (
    <div className="space-y-2">
      {/* Selected Tags */}
      {selectedTagObjects.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTagObjects.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="gap-1 pr-1"
              style={{
                backgroundColor: tag.color + '20',
                color: tag.color,
                borderColor: tag.color + '40',
              }}
            >
              {tag.name}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag.id)}
                  className="ml-1 rounded-full p-0.5 hover:bg-black/10"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Add Tag Button */}
      {!disabled && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <TagIcon className="h-3.5 w-3.5" />
              Add Tags
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search tags..." />
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup className="max-h-[300px] overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    Loading...
                  </div>
                ) : tags.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No tags available. Create one first!
                  </div>
                ) : (
                  tags.map((tag) => {
                    const isSelected = selectedTags.includes(tag.id);
                    return (
                      <CommandItem
                        key={tag.id}
                        value={tag.name}
                        onSelect={() => handleToggleTag(tag.id)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="flex-1">{tag.name}</span>
                        {isSelected && (
                          <span className="text-xs text-muted-foreground">✓</span>
                        )}
                      </CommandItem>
                    );
                  })
                )}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

