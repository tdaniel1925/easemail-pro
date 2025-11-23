'use client';

import { useState, useEffect } from 'react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useCalendarPro } from '@/contexts/CalendarProContext';
import { Calendar, Plus, Search, Eye, Clock } from 'lucide-react';
import { format, addDays, startOfWeek, startOfMonth } from 'date-fns';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const { setViewMode, setSelectedDate } = useCalendarPro();

  const commands = [
    {
      group: 'Actions',
      items: [
        {
          label: 'New Event',
          icon: Plus,
          action: () => {
            onOpenChange(false);
            setQuickAddOpen(true);
          },
        },
        {
          label: 'Search Events',
          icon: Search,
          action: () => {
            // TODO: Implement search
            onOpenChange(false);
          },
        },
      ],
    },
    {
      group: 'Views',
      items: [
        {
          label: 'Day View',
          icon: Eye,
          action: () => {
            setViewMode('day');
            onOpenChange(false);
          },
        },
        {
          label: 'Week View',
          icon: Eye,
          action: () => {
            setViewMode('week');
            onOpenChange(false);
          },
        },
        {
          label: 'Month View',
          icon: Eye,
          action: () => {
            setViewMode('month');
            onOpenChange(false);
          },
        },
      ],
    },
    {
      group: 'Navigate',
      items: [
        {
          label: 'Go to Today',
          icon: Calendar,
          action: () => {
            setSelectedDate(new Date());
            onOpenChange(false);
          },
        },
        {
          label: 'Go to Tomorrow',
          icon: Calendar,
          action: () => {
            setSelectedDate(addDays(new Date(), 1));
            onOpenChange(false);
          },
        },
        {
          label: 'Start of This Week',
          icon: Calendar,
          action: () => {
            setSelectedDate(startOfWeek(new Date(), { weekStartsOn: 0 }));
            onOpenChange(false);
          },
        },
        {
          label: 'Start of This Month',
          icon: Calendar,
          action: () => {
            setSelectedDate(startOfMonth(new Date()));
            onOpenChange(false);
          },
        },
      ],
    },
  ];

  return (
    <>
      <CommandDialog open={open} onOpenChange={onOpenChange}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {commands.map((group) => (
            <CommandGroup key={group.group} heading={group.group}>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem key={item.label} onSelect={item.action}>
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
