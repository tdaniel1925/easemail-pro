'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Users } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';

interface Group {
  id: string;
  name: string;
  color: string;
  contactCount: number;
}

interface GroupPickerProps {
  selectedGroups: string[]; // array of group IDs
  onChange: (groupIds: string[]) => void;
  disabled?: boolean;
}

export default function GroupPicker({ selectedGroups, onChange, disabled }: GroupPickerProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/contacts/groups');
      const data = await res.json();
      if (data.success) {
        setGroups(data.groups);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGroup = (groupId: string) => {
    if (selectedGroups.includes(groupId)) {
      onChange(selectedGroups.filter((id) => id !== groupId));
    } else {
      onChange([...selectedGroups, groupId]);
    }
  };

  const handleRemoveGroup = (groupId: string) => {
    onChange(selectedGroups.filter((id) => id !== groupId));
  };

  const selectedGroupObjects = groups.filter((g) => selectedGroups.includes(g.id));

  return (
    <div className="space-y-2">
      {/* Selected Groups */}
      {selectedGroupObjects.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedGroupObjects.map((group) => (
            <Badge
              key={group.id}
              variant="secondary"
              className="gap-1 pr-1"
              style={{
                backgroundColor: group.color + '20',
                color: group.color,
                borderColor: group.color + '40',
              }}
            >
              {group.name}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveGroup(group.id)}
                  className="ml-1 rounded-full p-0.5 hover:bg-black/10"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Add Group Button */}
      {!disabled && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Users className="h-3.5 w-3.5" />
              Add to Groups
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search groups..." />
              <CommandEmpty>No groups found.</CommandEmpty>
              <CommandGroup className="max-h-[300px] overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    Loading...
                  </div>
                ) : groups.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No groups available. Create one first!
                  </div>
                ) : (
                  groups.map((group) => {
                    const isSelected = selectedGroups.includes(group.id);
                    return (
                      <CommandItem
                        key={group.id}
                        onSelect={() => handleToggleGroup(group.id)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center"
                          style={{ backgroundColor: group.color + '20' }}
                        >
                          <Users
                            className="h-3 w-3"
                            style={{ color: group.color }}
                          />
                        </div>
                        <span className="flex-1">{group.name}</span>
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

