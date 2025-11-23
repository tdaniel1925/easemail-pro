'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Calendar, AlertCircle } from 'lucide-react';

interface Account {
  id: string;
  emailAddress: string;
  nylasGrantId?: string;
}

interface CreateCalendarDialogProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onCalendarCreated: () => void;
}

// Popular calendar name suggestions with colors
const POPULAR_CALENDARS = [
  { name: 'Family', color: '#f59e0b', description: 'Family events and activities' },
  { name: 'Medical', color: '#ef4444', description: 'Doctor appointments and health' },
  { name: 'Work Projects', color: '#3b82f6', description: 'Work-related projects' },
  { name: 'Personal', color: '#8b5cf6', description: 'Personal events and tasks' },
  { name: 'Birthdays', color: '#ec4899', description: 'Birthday reminders' },
  { name: 'Vacation', color: '#14b8a6', description: 'Vacation and travel plans' },
  { name: 'Fitness', color: '#10b981', description: 'Gym, sports, and fitness' },
  { name: 'Education', color: '#6366f1', description: 'Classes and learning' },
  { name: 'Finance', color: '#059669', description: 'Bill payments and budgeting' },
  { name: 'Social', color: '#f97316', description: 'Social events and meetups' },
];

// Calendar color options
const COLOR_OPTIONS = [
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#84cc16', label: 'Lime' },
  { value: '#10b981', label: 'Green' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#6366f1', label: 'Indigo' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#a855f7', label: 'Violet' },
  { value: '#d946ef', label: 'Fuchsia' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#f43f5e', label: 'Rose' },
];

export default function CreateCalendarDialog({
  isOpen,
  onClose,
  accounts,
  onCalendarCreated,
}: CreateCalendarDialogProps) {
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [calendarName, setCalendarName] = useState('');
  const [calendarColor, setCalendarColor] = useState('#3b82f6');
  const [description, setDescription] = useState('');
  const [isCustomName, setIsCustomName] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingCalendars, setExistingCalendars] = useState<any[]>([]);
  const [usedColors, setUsedColors] = useState<Set<string>>(new Set());

  // Get writable accounts (those with nylasGrantId)
  const writableAccounts = accounts.filter(acc => acc.nylasGrantId);

  // Fetch existing calendars to check for used colors
  useEffect(() => {
    if (isOpen && accounts.length > 0) {
      fetchExistingCalendars();
    }
  }, [isOpen, accounts]);

  const fetchExistingCalendars = async () => {
    try {
      const allCalendars: any[] = [];
      const colors = new Set<string>();

      for (const account of accounts) {
        if (!account.nylasGrantId) continue;

        try {
          const response = await fetch(`/api/nylas-v3/calendars?accountId=${account.nylasGrantId}`);
          const data = await response.json();

          if (data.success && data.calendars) {
            allCalendars.push(...data.calendars);
            // Collect used colors
            data.calendars.forEach((cal: any) => {
              if (cal.hexColor) {
                colors.add(cal.hexColor.toLowerCase());
              }
            });
          }
        } catch (err) {
          console.error(`Failed to fetch calendars for account:`, err);
        }
      }

      setExistingCalendars(allCalendars);
      setUsedColors(colors);

      // Auto-select first available unused color
      const unusedColor = COLOR_OPTIONS.find(color =>
        !colors.has(color.value.toLowerCase())
      );
      if (unusedColor) {
        setCalendarColor(unusedColor.value);
      }
    } catch (err) {
      console.error('Failed to fetch existing calendars:', err);
    }
  };

  const handleSelectPopularCalendar = (calendar: typeof POPULAR_CALENDARS[0]) => {
    setCalendarName(calendar.name);

    // If the suggested color is already used, find an unused one
    let colorToUse = calendar.color;
    if (usedColors.has(calendar.color.toLowerCase())) {
      const unusedColor = COLOR_OPTIONS.find(color =>
        !usedColors.has(color.value.toLowerCase())
      );
      if (unusedColor) {
        colorToUse = unusedColor.value;
      }
    }

    setCalendarColor(colorToUse);
    setDescription(calendar.description);
    setIsCustomName(false);
  };

  const handleCustomNameToggle = () => {
    setIsCustomName(true);
    setCalendarName('');
    setDescription('');
  };

  const handleCreateCalendar = async () => {
    if (!selectedAccount || !calendarName.trim()) {
      setError('Please select an account and enter a calendar name');
      return;
    }

    // Check if selected color is already used
    if (usedColors.has(calendarColor.toLowerCase())) {
      setError('This color is already used by another calendar. Please select a different color.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const account = writableAccounts.find(acc => acc.id === selectedAccount);
      if (!account?.nylasGrantId) {
        throw new Error('Account not found or not connected');
      }

      const response = await fetch('/api/nylas-v3/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.nylasGrantId,
          name: calendarName.trim(),
          description: description.trim(),
          hexColor: calendarColor,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create calendar');
      }

      // Success!
      onCalendarCreated();
      handleClose();
    } catch (err: any) {
      console.error('Error creating calendar:', err);
      setError(err.message || 'Failed to create calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedAccount('');
    setCalendarName('');
    setCalendarColor('#3b82f6');
    setDescription('');
    setIsCustomName(false);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Create New Calendar
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Account Selection */}
          <div className="space-y-2">
            <Label>Select Account</Label>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an account..." />
              </SelectTrigger>
              <SelectContent>
                {writableAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.emailAddress}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {writableAccounts.length === 0 && (
              <p className="text-xs text-red-600">
                No writable accounts found. Please connect an email account first.
              </p>
            )}
          </div>

          {/* Popular Calendar Options */}
          {!isCustomName && (
            <div className="space-y-2">
              <Label>Popular Calendars</Label>
              <div className="grid grid-cols-2 gap-2">
                {POPULAR_CALENDARS.map((calendar) => (
                  <button
                    key={calendar.name}
                    onClick={() => handleSelectPopularCalendar(calendar)}
                    className={`p-3 rounded-lg border-2 transition-all hover:border-primary text-left ${
                      calendarName === calendar.name && !isCustomName
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: calendar.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{calendar.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {calendar.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCustomNameToggle}
                className="w-full mt-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Custom Name
              </Button>
            </div>
          )}

          {/* Custom Calendar Name */}
          {isCustomName && (
            <>
              <div className="space-y-2">
                <Label htmlFor="calendarName">Calendar Name</Label>
                <Input
                  id="calendarName"
                  value={calendarName}
                  onChange={(e) => setCalendarName(e.target.value)}
                  placeholder="e.g., Medical, Family, Work Projects"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this calendar"
                  maxLength={200}
                />
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCustomName(false)}
                className="w-full"
              >
                Back to Popular Options
              </Button>
            </>
          )}

          {/* Color Selection */}
          {(isCustomName || calendarName) && (
            <div className="space-y-2">
              <Label>Calendar Color</Label>
              <div className="grid grid-cols-8 gap-2">
                {COLOR_OPTIONS.map((color) => {
                  const isUsed = usedColors.has(color.value.toLowerCase());
                  return (
                    <button
                      key={color.value}
                      onClick={() => !isUsed && setCalendarColor(color.value)}
                      disabled={isUsed}
                      className={`w-10 h-10 rounded-lg border-2 transition-all relative ${
                        calendarColor === color.value
                          ? 'border-foreground ring-2 ring-offset-2'
                          : 'border-border'
                      } ${
                        isUsed
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:scale-110 cursor-pointer'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={isUsed ? `${color.label} (Already used)` : color.label}
                    >
                      {isUsed && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-0.5 h-12 bg-white/80 rotate-45" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {usedColors.size > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Colors with a slash are already used by existing calendars
                </p>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreateCalendar} disabled={loading || !selectedAccount || !calendarName.trim()}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Calendar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
