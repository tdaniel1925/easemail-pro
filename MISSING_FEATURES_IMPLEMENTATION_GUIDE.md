# Missing Email Features - Complete Implementation Guide

This guide provides step-by-step instructions to implement 7 critical email features that are present in Gmail, Outlook, and Superhuman but missing from EaseMail.

## Table of Contents

1. [Undo Send](#1-undo-send)
2. [Snooze UI](#2-snooze-ui)
3. [Keyboard Shortcuts](#3-keyboard-shortcuts)
4. [Spam Management UI](#4-spam-management-ui)
5. [Unsubscribe Detection](#5-unsubscribe-detection)
6. [Vacation Responder](#6-vacation-responder)
7. [Follow-up Reminders](#7-follow-up-reminders-bonus)

---

## 1. Undo Send

**Priority**: HIGH | **Complexity**: LOW | **Time**: 2-3 hours

### Overview
Add a 5-second delay before emails are actually sent, with a toast notification allowing the user to cancel.

### Implementation Steps

#### Step 1: Create Undo Send Toast Component

**File**: `components/email/UndoSendToast.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UndoSendToastProps {
  onUndo: () => void;
  onComplete: () => void;
  duration?: number; // in milliseconds
}

export function UndoSendToast({
  onUndo,
  onComplete,
  duration = 5000
}: UndoSendToastProps) {
  const [timeLeft, setTimeLeft] = useState(duration / 1000);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          clearInterval(interval);
          if (!cancelled) {
            onComplete();
          }
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [cancelled, onComplete]);

  const handleUndo = () => {
    setCancelled(true);
    onUndo();
  };

  const progress = (timeLeft / (duration / 1000)) * 100;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-card border border-border rounded-lg shadow-lg p-4 min-w-[320px] animate-in slide-in-from-bottom-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          <div>
            <p className="text-sm font-medium">Sending email...</p>
            <p className="text-xs text-muted-foreground">
              {timeLeft.toFixed(1)}s remaining
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleUndo}
          className="gap-2"
        >
          <Undo2 className="h-4 w-4" />
          Undo
        </Button>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
```

#### Step 2: Update Email Compose Component

**File**: `components/nylas-v3/email-compose-v3.tsx`

Add state for undo send:

```tsx
// Add to existing state (around line 75)
const [showUndoToast, setShowUndoToast] = useState(false);
const [pendingEmail, setPendingEmail] = useState<any>(null);
const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
```

Modify the `handleSend` function (around line 292):

```tsx
const handleSend = async () => {
  setValidationError(null);
  setSuccessMessage(null);

  // Validation
  if (to.length === 0 && cc.length === 0 && bcc.length === 0) {
    setValidationError('Please enter at least one recipient (To, Cc, or Bcc)');
    return;
  }

  const allRecipients = [...to, ...cc, ...bcc];
  const invalidEmails = allRecipients.filter(r => !isValidEmail(r.email));
  if (invalidEmails.length > 0) {
    setValidationError(`Invalid email addresses: ${invalidEmails.map(r => r.email).join(', ')}`);
    return;
  }

  if (!accountId) {
    setValidationError('No email account selected. Please select an account first.');
    return;
  }

  // Check for signature
  if (signatures.length === 0 && !hideSignaturePromptPreference && !skipSignatureCheck && type === 'compose') {
    setShowSignaturePrompt(true);
    return;
  }

  const hasContent = body.trim() || attachments.length > 0;
  if (!hasContent) {
    setValidationError('Email body cannot be empty');
    return;
  }

  // Warn about empty subject
  if (!subject || subject.trim() === '') {
    setValidationError('Warning: Email has no subject. Click Send again to confirm.');
    if (validationError?.includes('no subject')) {
      setValidationError(null);
    } else {
      return;
    }
  }

  // ✅ NEW: Prepare email payload
  const uploadedAttachments = [];
  if (attachments.length > 0) {
    setIsSending(true);
    console.log(`[EmailComposeV3] Uploading ${attachments.length} attachment(s)...`);

    for (const file of attachments) {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/attachments/upload', {
        method: 'POST',
        body: formData,
      });

      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();
        uploadedAttachments.push({
          filename: file.name,
          url: uploadData.attachment.storageUrl,
          contentType: file.type,
          size: file.size,
        });
      } else {
        console.error('Failed to upload attachment:', file.name);
      }
    }
    setIsSending(false);
  }

  // ✅ NEW: Store email payload for delayed send
  const emailPayload = {
    accountId,
    to: to.map(r => ({ email: r.email, name: r.name })),
    cc: cc.length > 0 ? cc.map(r => ({ email: r.email, name: r.name })) : undefined,
    bcc: bcc.length > 0 ? bcc.map(r => ({ email: r.email, name: r.name })) : undefined,
    subject,
    body,
    attachments: uploadedAttachments,
    replyToMessageId: replyTo?.messageId,
    trackOpens,
    trackClicks,
  };

  setPendingEmail(emailPayload);
  setShowUndoToast(true);

  // ✅ NEW: Schedule actual send after 5 seconds
  undoTimeoutRef.current = setTimeout(() => {
    sendEmailNow(emailPayload);
  }, 5000);
};

// ✅ NEW: Function to actually send the email
const sendEmailNow = async (emailPayload: any) => {
  setIsSending(true);
  setShowUndoToast(false);

  try {
    console.log('[EmailComposeV3] Sending email via Nylas v3...');

    const response = await fetch('/api/nylas-v3/messages/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const data = await response.json();

    if (data.success) {
      console.log('[EmailComposeV3] Email sent successfully');

      // Show success toast
      toast({
        title: 'Email sent',
        description: 'Your email has been sent successfully.',
      });

      resetForm();
      onClose();

      // Trigger refresh
      window.dispatchEvent(new CustomEvent('refreshEmails'));
    } else {
      console.error('[EmailComposeV3] Failed to send email:', data.error);
      setValidationError(`Failed to send email: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('[EmailComposeV3] Send error:', error);
    setValidationError('Failed to send email. Please check your connection and try again.');
  } finally {
    setIsSending(false);
    setPendingEmail(null);
  }
};

// ✅ NEW: Function to cancel send
const handleUndoSend = () => {
  if (undoTimeoutRef.current) {
    clearTimeout(undoTimeoutRef.current);
    undoTimeoutRef.current = null;
  }
  setShowUndoToast(false);
  setPendingEmail(null);
  setIsSending(false);

  toast({
    title: 'Send cancelled',
    description: 'Your email was not sent.',
  });
};
```

Add the undo toast to the JSX (at the end of the component, before closing):

```tsx
{/* Undo Send Toast */}
{showUndoToast && (
  <UndoSendToast
    onUndo={handleUndoSend}
    onComplete={() => setShowUndoToast(false)}
    duration={5000}
  />
)}
```

#### Step 3: Add User Preference

Add a setting in Settings page to allow users to enable/disable undo send or adjust the delay.

**File**: `components/settings/SettingsContent.tsx`

Add under email preferences:

```tsx
<div className="space-y-2">
  <Label htmlFor="undo-send-enabled">Undo Send</Label>
  <div className="flex items-center justify-between">
    <div className="flex-1">
      <p className="text-sm text-muted-foreground">
        Delay sending emails by 5 seconds to allow cancellation
      </p>
    </div>
    <Switch
      id="undo-send-enabled"
      checked={undoSendEnabled}
      onCheckedChange={setUndoSendEnabled}
    />
  </div>

  {undoSendEnabled && (
    <div className="mt-2">
      <Label htmlFor="undo-send-delay">Delay (seconds)</Label>
      <Select value={undoSendDelay.toString()} onValueChange={(v) => setUndoSendDelay(Number(v))}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="5">5 seconds</SelectItem>
          <SelectItem value="10">10 seconds</SelectItem>
          <SelectItem value="15">15 seconds</SelectItem>
          <SelectItem value="30">30 seconds</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )}
</div>
```

### Testing Checklist

- [ ] Undo toast appears when sending email
- [ ] Progress bar counts down correctly
- [ ] Clicking "Undo" cancels the send
- [ ] Email sends automatically after 5 seconds if not cancelled
- [ ] Multiple emails can be queued
- [ ] Toast dismisses after send completes
- [ ] User preference saves correctly

---

## 2. Snooze UI

**Priority**: HIGH | **Complexity**: MEDIUM | **Time**: 4-5 hours

### Overview
Database schema already exists (`isSnoozed`, `snoozeUntil`). Need to add UI components and API routes.

### Implementation Steps

#### Step 1: Create Snooze Dialog Component

**File**: `components/email/SnoozeDialog.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Clock, Sunrise, Sunset, Calendar as CalendarIcon } from 'lucide-react';
import { format, addHours, addDays, startOfDay, set } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface SnoozeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSnooze: (until: Date) => void;
  emailId: string;
}

const SNOOZE_PRESETS = [
  {
    label: 'Later Today',
    icon: Sunset,
    getValue: () => set(new Date(), { hours: 18, minutes: 0, seconds: 0 }),
    description: '6:00 PM',
  },
  {
    label: 'Tomorrow',
    icon: Sunrise,
    getValue: () => set(addDays(new Date(), 1), { hours: 9, minutes: 0, seconds: 0 }),
    description: 'Tomorrow at 9:00 AM',
  },
  {
    label: 'This Weekend',
    icon: CalendarIcon,
    getValue: () => {
      const now = new Date();
      const daysUntilSaturday = (6 - now.getDay() + 7) % 7 || 7;
      return set(addDays(now, daysUntilSaturday), { hours: 9, minutes: 0, seconds: 0 });
    },
    description: 'Saturday at 9:00 AM',
  },
  {
    label: 'Next Week',
    icon: CalendarIcon,
    getValue: () => {
      const now = new Date();
      const daysUntilMonday = ((1 - now.getDay() + 7) % 7) + 7;
      return set(addDays(now, daysUntilMonday), { hours: 9, minutes: 0, seconds: 0 });
    },
    description: 'Next Monday at 9:00 AM',
  },
];

export function SnoozeDialog({ isOpen, onClose, onSnooze, emailId }: SnoozeDialogProps) {
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [customTime, setCustomTime] = useState('09:00');
  const [showCustom, setShowCustom] = useState(false);

  const handlePresetSnooze = (preset: typeof SNOOZE_PRESETS[0]) => {
    const snoozeUntil = preset.getValue();
    onSnooze(snoozeUntil);
    onClose();
  };

  const handleCustomSnooze = () => {
    if (!customDate) return;

    const [hours, minutes] = customTime.split(':').map(Number);
    const snoozeUntil = set(customDate, { hours, minutes, seconds: 0 });

    onSnooze(snoozeUntil);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Snooze Email</DialogTitle>
          <DialogDescription>
            Choose when you'd like to be reminded about this email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Preset Options */}
          <div className="grid grid-cols-2 gap-2">
            {SNOOZE_PRESETS.map((preset) => {
              const Icon = preset.icon;
              return (
                <Button
                  key={preset.label}
                  variant="outline"
                  className="h-auto flex-col items-start p-3 gap-1"
                  onClick={() => handlePresetSnooze(preset)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Icon className="h-4 w-4" />
                    <span className="font-medium text-sm">{preset.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {preset.description}
                  </span>
                </Button>
              );
            })}
          </div>

          {/* Custom Date/Time */}
          <div className="pt-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={() => setShowCustom(!showCustom)}
            >
              <Clock className="h-4 w-4" />
              Pick Date & Time
            </Button>

            {showCustom && (
              <div className="mt-4 space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Date</Label>
                  <Calendar
                    mode="single"
                    selected={customDate}
                    onSelect={setCustomDate}
                    disabled={(date) => date < new Date()}
                    className="rounded-md border"
                  />
                </div>

                <div>
                  <Label htmlFor="custom-time" className="text-sm font-medium">
                    Time
                  </Label>
                  <input
                    id="custom-time"
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleCustomSnooze}
                  disabled={!customDate}
                >
                  Snooze Until {customDate && format(customDate, 'MMM d')} at {customTime}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### Step 2: Create API Route for Snoozing

**File**: `app/api/emails/snooze/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { emails } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { emailId, snoozeUntil } = await request.json();

    if (!emailId || !snoozeUntil) {
      return NextResponse.json(
        { error: 'Email ID and snooze time required' },
        { status: 400 }
      );
    }

    // Update email in database
    await db
      .update(emails)
      .set({
        isSnoozed: true,
        snoozeUntil: new Date(snoozeUntil),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(emails.id, emailId),
          eq(emails.userId, session.user.id)
        )
      );

    return NextResponse.json({
      success: true,
      message: 'Email snoozed successfully',
    });
  } catch (error) {
    console.error('[Snooze Email] Error:', error);
    return NextResponse.json(
      { error: 'Failed to snooze email' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const emailId = searchParams.get('emailId');

    if (!emailId) {
      return NextResponse.json(
        { error: 'Email ID required' },
        { status: 400 }
      );
    }

    // Un-snooze email
    await db
      .update(emails)
      .set({
        isSnoozed: false,
        snoozeUntil: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(emails.id, emailId),
          eq(emails.userId, session.user.id)
        )
      );

    return NextResponse.json({
      success: true,
      message: 'Email un-snoozed successfully',
    });
  } catch (error) {
    console.error('[Un-snooze Email] Error:', error);
    return NextResponse.json(
      { error: 'Failed to un-snooze email' },
      { status: 500 }
    );
  }
}
```

#### Step 3: Add Snooze Button to Email Card

**File**: `components/inbox/EmailCard.tsx`

Add snooze button to the actions:

```tsx
import { Clock } from 'lucide-react';
import { SnoozeDialog } from '@/components/email/SnoozeDialog';

// Add state
const [showSnoozeDialog, setShowSnoozeDialog] = useState(false);

// Add handler
const handleSnooze = async (until: Date) => {
  try {
    const response = await fetch('/api/emails/snooze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailId: email.id,
        snoozeUntil: until.toISOString(),
      }),
    });

    if (response.ok) {
      toast({
        title: 'Email snoozed',
        description: `Until ${format(until, 'MMM d, yyyy h:mm a')}`,
      });
      // Refresh emails
      window.dispatchEvent(new CustomEvent('refreshEmails'));
    }
  } catch (error) {
    toast({
      title: 'Error',
      description: 'Failed to snooze email',
      variant: 'destructive',
    });
  }
};

// Add button in the actions section
<Button
  variant="ghost"
  size="sm"
  onClick={(e) => {
    e.stopPropagation();
    setShowSnoozeDialog(true);
  }}
  title="Snooze"
>
  <Clock className="h-4 w-4" />
</Button>

{/* Add dialog */}
<SnoozeDialog
  isOpen={showSnoozeDialog}
  onClose={() => setShowSnoozeDialog(false)}
  onSnooze={handleSnooze}
  emailId={email.id}
/>
```

#### Step 4: Create Background Job to Un-Snooze Emails

**File**: `lib/jobs/unsnooze-emails.ts`

```ts
import { db } from '@/lib/db';
import { emails } from '@/lib/db/schema';
import { and, eq, lte } from 'drizzle-orm';

export async function unsnoozeExpiredEmails() {
  try {
    const now = new Date();

    // Find all snoozed emails where snoozeUntil has passed
    const result = await db
      .update(emails)
      .set({
        isSnoozed: false,
        snoozeUntil: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(emails.isSnoozed, true),
          lte(emails.snoozeUntil, now)
        )
      );

    console.log(`[Unsnooze Job] Un-snoozed ${result.rowCount} emails`);
    return result.rowCount;
  } catch (error) {
    console.error('[Unsnooze Job] Error:', error);
    throw error;
  }
}
```

Add cron job (if using Vercel Cron or similar):

**File**: `app/api/cron/unsnooze/route.ts`

```ts
import { NextResponse } from 'next/server';
import { unsnoozeExpiredEmails } from '@/lib/jobs/unsnooze-emails';

export async function GET() {
  try {
    const count = await unsnoozeExpiredEmails();
    return NextResponse.json({
      success: true,
      unsnoozed: count,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to unsnooze emails' },
      { status: 500 }
    );
  }
}
```

#### Step 5: Filter Snoozed Emails from Inbox

Update inbox queries to exclude snoozed emails:

**File**: `app/api/emails/route.ts`

```ts
// Add to where clause
and(
  eq(emails.userId, session.user.id),
  eq(emails.isSnoozed, false), // ✅ Exclude snoozed emails
  // ... other conditions
)
```

Add "Snoozed" folder to sidebar:

**File**: `components/nylas-v3/folder-sidebar-v3.tsx`

```tsx
{
  id: 'snoozed',
  name: 'Snoozed',
  icon: Clock,
  count: snoozedCount,
}
```

### Testing Checklist

- [ ] Snooze dialog opens with presets
- [ ] Each preset calculates correct date/time
- [ ] Custom date picker works
- [ ] Email is hidden from inbox after snooze
- [ ] Email reappears when snooze time passes
- [ ] Un-snooze button works
- [ ] Snoozed folder shows snoozed emails
- [ ] Cron job runs correctly

---

## 3. Keyboard Shortcuts

**Priority**: HIGH | **Complexity**: MEDIUM | **Time**: 5-6 hours

### Overview
Framework exists (`hooks/useKeyboardShortcuts.ts`). Need to add Gmail-style shortcuts and a help panel.

### Implementation Steps

#### Step 1: Enhance Keyboard Shortcuts Hook

**File**: `hooks/useKeyboardShortcuts.ts`

```tsx
'use client';

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  category: string;
  action: () => void;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  shortcuts: KeyboardShortcut[];
}

export function useKeyboardShortcuts({
  enabled = true,
  shortcuts,
}: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger if user is typing in input/textarea
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow certain shortcuts even in input fields (like Ctrl+Enter to send)
      const allowedInInput = shortcutsRef.current.find(
        (s) =>
          s.key.toLowerCase() === event.key.toLowerCase() &&
          (s.ctrl && event.ctrlKey) &&
          (!s.shift || event.shiftKey) &&
          (!s.alt || event.altKey) &&
          (!s.meta || event.metaKey)
      );

      if (!allowedInInput) {
        return;
      }
    }

    const matchingShortcut = shortcutsRef.current.find(
      (shortcut) =>
        shortcut.key.toLowerCase() === event.key.toLowerCase() &&
        !!shortcut.ctrl === event.ctrlKey &&
        !!shortcut.shift === event.shiftKey &&
        !!shortcut.alt === event.altKey &&
        !!shortcut.meta === event.metaKey
    );

    if (matchingShortcut) {
      event.preventDefault();
      event.stopPropagation();
      matchingShortcut.action();
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  return { shortcuts: shortcutsRef.current };
}
```

#### Step 2: Create Shortcuts Help Dialog

**File**: `components/ui/keyboard-shortcuts-dialog.tsx`

```tsx
'use client';

import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';
import { cn } from '@/lib/utils';

interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

export function KeyboardShortcutsDialog({
  isOpen,
  onClose,
  shortcuts,
}: KeyboardShortcutsDialogProps) {
  const groupedShortcuts = useMemo(() => {
    const groups: Record<string, KeyboardShortcut[]> = {};

    shortcuts.forEach((shortcut) => {
      if (!groups[shortcut.category]) {
        groups[shortcut.category] = [];
      }
      groups[shortcut.category].push(shortcut);
    });

    return groups;
  }, [shortcuts]);

  const formatShortcut = (shortcut: KeyboardShortcut) => {
    const parts: string[] = [];

    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    if (shortcut.meta) parts.push('Cmd');

    // Format the key
    const keyDisplay = shortcut.key.length === 1
      ? shortcut.key.toUpperCase()
      : shortcut.key;

    parts.push(keyDisplay);

    return parts.join(' + ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded">
                      {formatShortcut(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-1 py-0.5 text-xs font-semibold bg-muted border border-border rounded">?</kbd> to toggle this help
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### Step 3: Implement Inbox Shortcuts

**File**: `app/(dashboard)/inbox/page.tsx`

```tsx
'use client';

import { useState, useCallback } from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsDialog } from '@/components/ui/keyboard-shortcuts-dialog';

export default function InboxPage() {
  const [selectedEmailIndex, setSelectedEmailIndex] = useState(0);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [emails, setEmails] = useState<any[]>([]);

  // Define shortcuts
  const shortcuts = [
    // Navigation
    {
      key: 'j',
      description: 'Next email',
      category: 'Navigation',
      action: () => {
        setSelectedEmailIndex((prev) =>
          Math.min(prev + 1, emails.length - 1)
        );
      },
    },
    {
      key: 'k',
      description: 'Previous email',
      category: 'Navigation',
      action: () => {
        setSelectedEmailIndex((prev) => Math.max(prev - 1, 0));
      },
    },
    {
      key: 'Enter',
      description: 'Open email',
      category: 'Navigation',
      action: () => {
        const email = emails[selectedEmailIndex];
        if (email) {
          handleOpenEmail(email);
        }
      },
    },
    {
      key: 'Escape',
      description: 'Close email',
      category: 'Navigation',
      action: () => {
        handleCloseEmail();
      },
    },

    // Actions
    {
      key: 'e',
      description: 'Archive',
      category: 'Actions',
      action: () => {
        const email = emails[selectedEmailIndex];
        if (email) {
          handleArchive(email.id);
        }
      },
    },
    {
      key: '#',
      shift: true,
      description: 'Delete',
      category: 'Actions',
      action: () => {
        const email = emails[selectedEmailIndex];
        if (email) {
          handleDelete(email.id);
        }
      },
    },
    {
      key: 's',
      description: 'Star/Unstar',
      category: 'Actions',
      action: () => {
        const email = emails[selectedEmailIndex];
        if (email) {
          handleToggleStar(email.id);
        }
      },
    },
    {
      key: 'u',
      description: 'Mark as read/unread',
      category: 'Actions',
      action: () => {
        const email = emails[selectedEmailIndex];
        if (email) {
          handleToggleRead(email.id);
        }
      },
    },
    {
      key: 'x',
      description: 'Select email',
      category: 'Actions',
      action: () => {
        const email = emails[selectedEmailIndex];
        if (email) {
          handleToggleSelection(email.id);
        }
      },
    },

    // Compose
    {
      key: 'c',
      description: 'Compose new email',
      category: 'Compose',
      action: () => {
        handleCompose();
      },
    },
    {
      key: 'r',
      description: 'Reply',
      category: 'Compose',
      action: () => {
        const email = emails[selectedEmailIndex];
        if (email) {
          handleReply(email);
        }
      },
    },
    {
      key: 'a',
      description: 'Reply all',
      category: 'Compose',
      action: () => {
        const email = emails[selectedEmailIndex];
        if (email) {
          handleReplyAll(email);
        }
      },
    },
    {
      key: 'f',
      description: 'Forward',
      category: 'Compose',
      action: () => {
        const email = emails[selectedEmailIndex];
        if (email) {
          handleForward(email);
        }
      },
    },
    {
      key: 'Enter',
      ctrl: true,
      description: 'Send email',
      category: 'Compose',
      action: () => {
        handleSendEmail();
      },
    },

    // Search & Filter
    {
      key: '/',
      description: 'Focus search',
      category: 'Search',
      action: () => {
        document.getElementById('email-search')?.focus();
      },
    },
    {
      key: 'g',
      description: 'Go to inbox',
      category: 'Navigation',
      action: () => {
        router.push('/inbox');
      },
    },
    {
      key: 'g',
      shift: true,
      description: 'Go to sent',
      category: 'Navigation',
      action: () => {
        router.push('/inbox?folder=sent');
      },
    },

    // Help
    {
      key: '?',
      shift: true,
      description: 'Show keyboard shortcuts',
      category: 'Help',
      action: () => {
        setShowShortcutsDialog(true);
      },
    },
  ];

  // Enable shortcuts
  useKeyboardShortcuts({
    enabled: true,
    shortcuts,
  });

  return (
    <>
      {/* Your inbox UI */}

      {/* Shortcuts Dialog */}
      <KeyboardShortcutsDialog
        isOpen={showShortcutsDialog}
        onClose={() => setShowShortcutsDialog(false)}
        shortcuts={shortcuts}
      />
    </>
  );
}
```

#### Step 4: Add Visual Keyboard Focus Indicator

Add CSS to highlight the focused email:

```tsx
<div
  className={cn(
    'email-card',
    selectedEmailIndex === index && 'ring-2 ring-primary ring-offset-2'
  )}
>
  {/* Email card content */}
</div>
```

#### Step 5: Add Shortcut Hints to UI

Add subtle hints in the UI:

```tsx
<Button variant="ghost" size="sm">
  Archive
  <span className="ml-2 text-xs text-muted-foreground">E</span>
</Button>
```

### Testing Checklist

- [ ] j/k navigation works
- [ ] Enter opens email
- [ ] Escape closes email
- [ ] e archives email
- [ ] # deletes email
- [ ] s stars email
- [ ] u marks as read/unread
- [ ] c opens compose
- [ ] r/a/f for reply/reply all/forward
- [ ] Ctrl+Enter sends email (in compose)
- [ ] / focuses search
- [ ] ? shows help dialog
- [ ] Shortcuts don't trigger in input fields (except Ctrl+Enter)
- [ ] Visual focus indicator shows current selection

---

## 4. Spam Management UI

**Priority**: MEDIUM | **Complexity**: LOW | **Time**: 3-4 hours

### Overview
Add "Mark as Spam" button and spam folder to the UI.

### Implementation Steps

#### Step 1: Add Spam Folder to Sidebar

**File**: `components/nylas-v3/folder-sidebar-v3.tsx`

```tsx
import { ShieldAlert } from 'lucide-react';

// Add to SYSTEM_FOLDERS array
{
  id: 'spam',
  name: 'Spam',
  icon: ShieldAlert,
  count: spamCount,
  systemFolder: true,
}
```

#### Step 2: Create Mark as Spam API Route

**File**: `app/api/emails/spam/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { emails } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { emailIds } = await request.json();

    if (!emailIds || !Array.isArray(emailIds)) {
      return NextResponse.json(
        { error: 'Email IDs required' },
        { status: 400 }
      );
    }

    // Move emails to spam folder
    await db
      .update(emails)
      .set({
        folder: 'spam',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(emails.userId, session.user.id),
          // emailIds filter
        )
      );

    // TODO: Train spam filter with these emails
    // TODO: Sync with email provider (Nylas)

    return NextResponse.json({
      success: true,
      message: `${emailIds.length} email(s) marked as spam`,
    });
  } catch (error) {
    console.error('[Mark as Spam] Error:', error);
    return NextResponse.json(
      { error: 'Failed to mark as spam' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const emailId = searchParams.get('emailId');

    if (!emailId) {
      return NextResponse.json(
        { error: 'Email ID required' },
        { status: 400 }
      );
    }

    // Move back to inbox
    await db
      .update(emails)
      .set({
        folder: 'inbox',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(emails.id, emailId),
          eq(emails.userId, session.user.id)
        )
      );

    return NextResponse.json({
      success: true,
      message: 'Email moved to inbox',
    });
  } catch (error) {
    console.error('[Not Spam] Error:', error);
    return NextResponse.json(
      { error: 'Failed to move email' },
      { status: 500 }
    );
  }
}
```

#### Step 3: Add Mark as Spam Button

**File**: `components/inbox/EmailCard.tsx`

```tsx
import { ShieldAlert } from 'lucide-react';

// Add button
<Button
  variant="ghost"
  size="sm"
  onClick={(e) => {
    e.stopPropagation();
    handleMarkAsSpam();
  }}
  title="Mark as spam"
>
  <ShieldAlert className="h-4 w-4" />
</Button>

// Add handler
const handleMarkAsSpam = async () => {
  try {
    const response = await fetch('/api/emails/spam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailIds: [email.id] }),
    });

    if (response.ok) {
      toast({
        title: 'Marked as spam',
        description: 'Email moved to spam folder',
      });
      window.dispatchEvent(new CustomEvent('refreshEmails'));
    }
  } catch (error) {
    toast({
      title: 'Error',
      description: 'Failed to mark as spam',
      variant: 'destructive',
    });
  }
};
```

#### Step 4: Add "Not Spam" Button in Spam Folder

**File**: `components/inbox/EmailDetail.tsx`

When viewing an email in the spam folder, show "Not Spam" button:

```tsx
{email.folder === 'spam' && (
  <Button
    variant="outline"
    onClick={handleNotSpam}
  >
    <ShieldAlert className="h-4 w-4 mr-2" />
    Not Spam
  </Button>
)}
```

#### Step 5: Add Bulk Spam Actions

**File**: `components/inbox/BulkActions.tsx`

```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => handleBulkSpam(selectedIds)}
  disabled={selectedIds.length === 0}
>
  <ShieldAlert className="h-4 w-4 mr-2" />
  Mark as Spam ({selectedIds.length})
</Button>
```

### Testing Checklist

- [ ] Spam folder appears in sidebar
- [ ] Mark as Spam button works
- [ ] Email moves to spam folder
- [ ] Spam folder shows spam count
- [ ] "Not Spam" button moves email back to inbox
- [ ] Bulk mark as spam works
- [ ] Spam filter learns from marked emails (if implemented)

---

## 5. Unsubscribe Detection

**Priority**: MEDIUM | **Complexity**: MEDIUM | **Time**: 4-5 hours

### Overview
Detect unsubscribe links in emails and show a one-click unsubscribe button.

### Implementation Steps

#### Step 1: Create Unsubscribe Detection Utility

**File**: `lib/email/unsubscribe-detector.ts`

```ts
interface UnsubscribeInfo {
  hasUnsubscribe: boolean;
  unsubscribeUrl?: string;
  unsubscribeEmail?: string;
  listUnsubscribeHeader?: string;
}

export function detectUnsubscribe(
  headers: Record<string, string>,
  body: string
): UnsubscribeInfo {
  const result: UnsubscribeInfo = {
    hasUnsubscribe: false,
  };

  // 1. Check List-Unsubscribe header (RFC 2369)
  const listUnsubscribe = headers['List-Unsubscribe'] || headers['list-unsubscribe'];

  if (listUnsubscribe) {
    result.hasUnsubscribe = true;
    result.listUnsubscribeHeader = listUnsubscribe;

    // Extract URL from header: <https://example.com/unsubscribe>
    const urlMatch = listUnsubscribe.match(/<(https?:\/\/[^>]+)>/);
    if (urlMatch) {
      result.unsubscribeUrl = urlMatch[1];
    }

    // Extract email from header: <mailto:unsubscribe@example.com>
    const emailMatch = listUnsubscribe.match(/<mailto:([^>]+)>/);
    if (emailMatch) {
      result.unsubscribeEmail = emailMatch[1];
    }
  }

  // 2. Parse body HTML for unsubscribe links (common patterns)
  if (!result.unsubscribeUrl && body) {
    const unsubscribePatterns = [
      /<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?unsubscribe[\s\S]*?<\/a>/i,
      /<a[^>]+href="([^"]+unsubscribe[^"]*)"[^>]*>/i,
      /href="([^"]+)"[^>]*>[\s\S]*?opt[\s-]?out[\s\S]*?<\/a>/i,
    ];

    for (const pattern of unsubscribePatterns) {
      const match = body.match(pattern);
      if (match && match[1]) {
        result.hasUnsubscribe = true;
        result.unsubscribeUrl = match[1];
        break;
      }
    }
  }

  return result;
}

export function isMarketingEmail(
  from: string,
  subject: string,
  headers: Record<string, string>
): boolean {
  // Check for marketing indicators
  const marketingIndicators = [
    'newsletter',
    'promotional',
    'marketing',
    'notification',
    'noreply',
    'no-reply',
  ];

  const fromLower = from.toLowerCase();
  const subjectLower = subject.toLowerCase();

  // Check From address
  if (marketingIndicators.some((indicator) => fromLower.includes(indicator))) {
    return true;
  }

  // Check Subject
  if (marketingIndicators.some((indicator) => subjectLower.includes(indicator))) {
    return true;
  }

  // Check for List-ID header (indicates mailing list)
  if (headers['List-ID'] || headers['list-id']) {
    return true;
  }

  // Check for Precedence: bulk header
  const precedence = headers['Precedence'] || headers['precedence'];
  if (precedence?.toLowerCase() === 'bulk') {
    return true;
  }

  return false;
}
```

#### Step 2: Add Unsubscribe Detection to Email Fetching

**File**: `app/api/emails/route.ts`

When fetching emails, detect unsubscribe info and store it:

```ts
import { detectUnsubscribe, isMarketingEmail } from '@/lib/email/unsubscribe-detector';

// Process each email
const unsubscribeInfo = detectUnsubscribe(email.headers, email.body);
const isMarketing = isMarketingEmail(email.from, email.subject, email.headers);

// Store in database
await db.insert(emails).values({
  // ... other fields
  hasUnsubscribe: unsubscribeInfo.hasUnsubscribe,
  unsubscribeUrl: unsubscribeInfo.unsubscribeUrl,
  unsubscribeEmail: unsubscribeInfo.unsubscribeEmail,
  isMarketing,
});
```

#### Step 3: Add Database Migration

**File**: `migrations/XXX_add_unsubscribe_fields.sql`

```sql
ALTER TABLE emails
ADD COLUMN has_unsubscribe BOOLEAN DEFAULT FALSE,
ADD COLUMN unsubscribe_url TEXT,
ADD COLUMN unsubscribe_email TEXT,
ADD COLUMN is_marketing BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_emails_has_unsubscribe ON emails(has_unsubscribe);
CREATE INDEX idx_emails_is_marketing ON emails(is_marketing);
```

#### Step 4: Create Unsubscribe Component

**File**: `components/email/UnsubscribeButton.tsx`

```tsx
'use client';

import { useState } from 'react';
import { MailX, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';

interface UnsubscribeButtonProps {
  emailId: string;
  unsubscribeUrl?: string;
  unsubscribeEmail?: string;
  fromAddress: string;
}

export function UnsubscribeButton({
  emailId,
  unsubscribeUrl,
  unsubscribeEmail,
  fromAddress,
}: UnsubscribeButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const [isUnsubscribed, setIsUnsubscribed] = useState(false);
  const { toast } = useToast();

  const handleUnsubscribe = async () => {
    setIsUnsubscribing(true);

    try {
      const response = await fetch('/api/emails/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId,
          unsubscribeUrl,
          unsubscribeEmail,
          fromAddress,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsUnsubscribed(true);
        toast({
          title: 'Unsubscribed successfully',
          description: `You won't receive emails from ${fromAddress} anymore.`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: 'Unsubscribe failed',
        description: 'Please try clicking the unsubscribe link in the email.',
        variant: 'destructive',
      });
    } finally {
      setIsUnsubscribing(false);
      setShowDialog(false);
    }
  };

  if (isUnsubscribed) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        Unsubscribed
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
        className="gap-2"
      >
        <MailX className="h-4 w-4" />
        Unsubscribe
      </Button>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsubscribe from emails?</AlertDialogTitle>
            <AlertDialogDescription>
              This will unsubscribe you from future emails from <strong>{fromAddress}</strong>.
              {unsubscribeUrl && (
                <p className="mt-2 text-xs">
                  We'll visit: {unsubscribeUrl}
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnsubscribing}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnsubscribe}
              disabled={isUnsubscribing}
            >
              {isUnsubscribing && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Unsubscribe
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

#### Step 5: Create Unsubscribe API Route

**File**: `app/api/emails/unsubscribe/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { emailId, unsubscribeUrl, unsubscribeEmail, fromAddress } = await request.json();

    if (!unsubscribeUrl && !unsubscribeEmail) {
      return NextResponse.json(
        { error: 'No unsubscribe method available' },
        { status: 400 }
      );
    }

    // Method 1: HTTP GET to unsubscribe URL (RFC 8058 - One-Click Unsubscribe)
    if (unsubscribeUrl) {
      try {
        const response = await fetch(unsubscribeUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'EaseMail/1.0',
          },
          redirect: 'follow',
        });

        if (response.ok) {
          console.log('[Unsubscribe] HTTP unsubscribe successful');
        }
      } catch (error) {
        console.error('[Unsubscribe] HTTP unsubscribe failed:', error);
        // Continue to try email method if available
      }
    }

    // Method 2: Send unsubscribe email
    if (unsubscribeEmail && !unsubscribeUrl) {
      try {
        // Send unsubscribe email via your email service
        // This is a placeholder - implement based on your email service
        console.log('[Unsubscribe] Would send email to:', unsubscribeEmail);
      } catch (error) {
        console.error('[Unsubscribe] Email unsubscribe failed:', error);
      }
    }

    // Create a rule to automatically delete future emails from this sender
    await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Auto-delete emails from ${fromAddress}`,
        enabled: true,
        conditions: [
          {
            field: 'from',
            operator: 'equals',
            value: fromAddress,
          },
        ],
        actions: [
          {
            type: 'delete',
          },
        ],
      }),
    });

    return NextResponse.json({
      success: true,
      message: 'Unsubscribed successfully',
    });
  } catch (error) {
    console.error('[Unsubscribe] Error:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}
```

#### Step 6: Add Unsubscribe Button to Email Detail

**File**: `components/inbox/EmailDetail.tsx`

```tsx
import { UnsubscribeButton } from '@/components/email/UnsubscribeButton';

// In the email header section
{email.hasUnsubscribe && (
  <UnsubscribeButton
    emailId={email.id}
    unsubscribeUrl={email.unsubscribeUrl}
    unsubscribeEmail={email.unsubscribeEmail}
    fromAddress={email.from}
  />
)}
```

### Testing Checklist

- [ ] Unsubscribe links detected from List-Unsubscribe header
- [ ] Unsubscribe links detected from email body
- [ ] Marketing emails identified correctly
- [ ] Unsubscribe button appears for marketing emails
- [ ] One-click unsubscribe works
- [ ] Confirmation dialog shows before unsubscribe
- [ ] Auto-delete rule created after unsubscribe
- [ ] Unsubscribed state persists

---

## 6. Vacation Responder (Out of Office)

**Priority**: MEDIUM | **Complexity**: MEDIUM-HIGH | **Time**: 6-8 hours

### Overview
Allow users to set up automatic replies when they're away.

### Implementation Steps

#### Step 1: Create Database Migration

**File**: `migrations/XXX_add_vacation_responder.sql`

```sql
CREATE TABLE vacation_responders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  enabled BOOLEAN DEFAULT FALSE,
  subject TEXT NOT NULL DEFAULT 'Out of Office',
  message TEXT NOT NULL,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  reply_frequency INTEGER DEFAULT 86400, -- seconds (default: 1 day)
  include_weekends BOOLEAN DEFAULT TRUE,
  external_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE vacation_responder_replies (
  id TEXT PRIMARY KEY,
  responder_id TEXT NOT NULL REFERENCES vacation_responders(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  replied_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(responder_id, recipient_email)
);

CREATE INDEX idx_vacation_responders_user_account ON vacation_responders(user_id, account_id);
CREATE INDEX idx_vacation_responder_replies_responder ON vacation_responder_replies(responder_id);
```

#### Step 2: Create Vacation Responder Settings Component

**File**: `components/settings/VacationResponderSettings.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

export function VacationResponderSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [subject, setSubject] = useState('Out of Office');
  const [message, setMessage] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [includeWeekends, setIncludeWeekends] = useState(true);
  const [externalOnly, setExternalOnly] = useState(false);

  // Load existing settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/vacation-responder');
      if (response.ok) {
        const data = await response.json();
        if (data.responder) {
          setEnabled(data.responder.enabled);
          setSubject(data.responder.subject);
          setMessage(data.responder.message);
          setStartDate(data.responder.startDate ? new Date(data.responder.startDate) : undefined);
          setEndDate(data.responder.endDate ? new Date(data.responder.endDate) : undefined);
          setIncludeWeekends(data.responder.includeWeekends);
          setExternalOnly(data.responder.externalOnly);
        }
      }
    } catch (error) {
      console.error('Failed to load vacation responder settings:', error);
    }
  };

  const handleSave = async () => {
    if (!message.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a message',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/vacation-responder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          subject,
          message,
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
          includeWeekends,
          externalOnly,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Settings saved',
          description: enabled
            ? 'Vacation responder is now active'
            : 'Vacation responder is disabled',
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save vacation responder settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Vacation Responder</h3>
        <p className="text-sm text-muted-foreground">
          Send automatic replies when you're away
        </p>
      </div>

      {/* Enable/Disable */}
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="vacation-enabled">Enable Vacation Responder</Label>
          <p className="text-sm text-muted-foreground">
            Automatically reply to incoming emails
          </p>
        </div>
        <Switch
          id="vacation-enabled"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
      </div>

      {/* Subject */}
      <div className="space-y-2">
        <Label htmlFor="vacation-subject">Subject</Label>
        <Input
          id="vacation-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Out of Office"
        />
      </div>

      {/* Message */}
      <div className="space-y-2">
        <Label htmlFor="vacation-message">Message</Label>
        <Textarea
          id="vacation-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Thank you for your email. I am currently out of the office and will respond when I return."
          rows={6}
        />
        <p className="text-xs text-muted-foreground">
          Tip: Use variables like {'{{name}}'} for personalization
        </p>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date (Optional)</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !startDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>End Date (Optional)</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !endDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                disabled={(date) => startDate ? date < startDate : false}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="include-weekends">Include Weekends</Label>
            <p className="text-sm text-muted-foreground">
              Send auto-replies on Saturdays and Sundays
            </p>
          </div>
          <Switch
            id="include-weekends"
            checked={includeWeekends}
            onCheckedChange={setIncludeWeekends}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="external-only">External Contacts Only</Label>
            <p className="text-sm text-muted-foreground">
              Only send auto-replies to people outside your organization
            </p>
          </div>
          <Switch
            id="external-only"
            checked={externalOnly}
            onCheckedChange={setExternalOnly}
          />
        </div>
      </div>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Changes
      </Button>
    </div>
  );
}
```

#### Step 3: Create API Routes

**File**: `app/api/vacation-responder/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { vacationResponders } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const responder = await db.query.vacationResponders.findFirst({
      where: eq(vacationResponders.userId, session.user.id),
    });

    return NextResponse.json({ responder });
  } catch (error) {
    console.error('[Vacation Responder GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vacation responder' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      enabled,
      subject,
      message,
      startDate,
      endDate,
      includeWeekends,
      externalOnly,
    } = body;

    // Check if responder exists
    const existing = await db.query.vacationResponders.findFirst({
      where: eq(vacationResponders.userId, session.user.id),
    });

    if (existing) {
      // Update existing
      await db
        .update(vacationResponders)
        .set({
          enabled,
          subject,
          message,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          includeWeekends,
          externalOnly,
          updatedAt: new Date(),
        })
        .where(eq(vacationResponders.id, existing.id));
    } else {
      // Create new
      await db.insert(vacationResponders).values({
        id: uuidv4(),
        userId: session.user.id,
        accountId: session.user.id, // Use appropriate account ID
        enabled,
        subject,
        message,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        includeWeekends,
        externalOnly,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Vacation responder saved',
    });
  } catch (error) {
    console.error('[Vacation Responder POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save vacation responder' },
      { status: 500 }
    );
  }
}
```

#### Step 4: Create Background Job to Send Auto-Replies

**File**: `lib/jobs/vacation-auto-reply.ts`

```ts
import { db } from '@/lib/db';
import { vacationResponders, vacationResponderReplies, emails } from '@/lib/db/schema';
import { and, eq, gte, lte, notInArray } from 'drizzle-orm';

export async function processVacationReplies() {
  try {
    const now = new Date();

    // Find all active vacation responders
    const activeResponders = await db.query.vacationResponders.findMany({
      where: and(
        eq(vacationResponders.enabled, true),
        // Start date check (if set, must be in past)
        // End date check (if set, must be in future)
      ),
    });

    for (const responder of activeResponders) {
      // Check date range
      if (responder.startDate && now < responder.startDate) continue;
      if (responder.endDate && now > responder.endDate) {
        // Auto-disable expired responder
        await db
          .update(vacationResponders)
          .set({ enabled: false })
          .where(eq(vacationResponders.id, responder.id));
        continue;
      }

      // Check weekends
      if (!responder.includeWeekends) {
        const day = now.getDay();
        if (day === 0 || day === 6) continue; // Skip weekends
      }

      // Get recent unreplied emails (last hour)
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const recentEmails = await db.query.emails.findMany({
        where: and(
          eq(emails.userId, responder.userId),
          eq(emails.accountId, responder.accountId),
          gte(emails.receivedAt, oneHourAgo),
          eq(emails.folder, 'inbox'),
        ),
      });

      // Get already-replied recipients
      const previousReplies = await db.query.vacationResponderReplies.findMany({
        where: eq(vacationResponderReplies.responderId, responder.id),
      });

      const repliedEmails = new Set(previousReplies.map((r) => r.recipientEmail));

      // Send auto-replies
      for (const email of recentEmails) {
        if (repliedEmails.has(email.from)) {
          continue; // Already replied to this sender
        }

        // Check external-only filter
        if (responder.externalOnly && isInternalEmail(email.from)) {
          continue;
        }

        // Send auto-reply
        await sendAutoReply(responder, email);

        // Record reply
        await db.insert(vacationResponderReplies).values({
          id: uuidv4(),
          responderId: responder.id,
          recipientEmail: email.from,
          repliedAt: now,
        });
      }
    }

    console.log('[Vacation Auto-Reply] Processed successfully');
  } catch (error) {
    console.error('[Vacation Auto-Reply] Error:', error);
    throw error;
  }
}

async function sendAutoReply(responder: any, originalEmail: any) {
  try {
    // Send reply via Nylas
    await fetch('/api/nylas-v3/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: responder.accountId,
        to: [{ email: originalEmail.from }],
        subject: `Re: ${originalEmail.subject}`,
        body: responder.message,
        replyToMessageId: originalEmail.id,
        headers: {
          'Auto-Submitted': 'auto-replied',
          'X-Auto-Response-Suppress': 'All',
        },
      }),
    });

    console.log('[Auto-Reply] Sent to:', originalEmail.from);
  } catch (error) {
    console.error('[Auto-Reply] Failed to send:', error);
  }
}

function isInternalEmail(email: string): boolean {
  // Implement logic to detect internal emails
  // e.g., check if domain matches company domain
  return false;
}
```

#### Step 5: Add to Settings Page

**File**: `app/(dashboard)/settings/page.tsx`

```tsx
import { VacationResponderSettings } from '@/components/settings/VacationResponderSettings';

// Add tab
<TabsContent value="vacation-responder">
  <VacationResponderSettings />
</TabsContent>
```

### Testing Checklist

- [ ] Can enable/disable vacation responder
- [ ] Subject and message save correctly
- [ ] Date range is respected
- [ ] Auto-replies sent to new senders
- [ ] Same sender doesn't get multiple replies
- [ ] Weekend filter works
- [ ] External-only filter works
- [ ] Expired responders auto-disable
- [ ] Reply headers prevent loops

---

## 7. Follow-up Reminders (Bonus)

**Priority**: LOW | **Complexity**: HIGH | **Time**: 8-10 hours

### Overview
Automatically remind users to follow up on emails that haven't received a reply.

### Implementation Steps

(Due to complexity and time constraints, here's a high-level outline)

#### Database Schema

```sql
CREATE TABLE follow_up_reminders (
  id TEXT PRIMARY KEY,
  email_id TEXT NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  remind_at TIMESTAMP NOT NULL,
  reminded BOOLEAN DEFAULT FALSE,
  snoozed_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Key Components

1. **Auto-detection**: When user sends an email, set a reminder for N days if no reply received
2. **Manual reminders**: Button to "Remind me if no reply in X days"
3. **Smart detection**: Detect if email is part of conversation that got a reply
4. **Reminder UI**: Show pending reminders in a dedicated section
5. **Snooze reminders**: Allow snoozing individual reminders
6. **Background job**: Check for due reminders and notify user

#### Implementation Outline

1. Add "Remind Me" button to sent emails
2. Create API route to create reminder
3. Background job to check for replies
4. Notification system for due reminders
5. UI to view/manage all reminders
6. Smart filtering (don't remind if replied)

---

## Testing & Quality Assurance

### General Testing Checklist

For each feature:

- [ ] Unit tests written
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Edge cases handled
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Accessibility tested
- [ ] Mobile responsive
- [ ] Works across browsers
- [ ] Documentation updated

### Performance Testing

- [ ] API routes optimized
- [ ] Database queries indexed
- [ ] Background jobs don't block UI
- [ ] Caching implemented where appropriate
- [ ] No memory leaks

### Security Testing

- [ ] Authentication required
- [ ] Authorization checks in place
- [ ] Input validation
- [ ] SQL injection prevented
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Rate limiting

---

## Deployment Checklist

1. **Database Migrations**
   - [ ] Run all migrations in staging
   - [ ] Verify data integrity
   - [ ] Backup database before production

2. **Environment Variables**
   - [ ] Add any new env vars to .env.example
   - [ ] Update production env vars

3. **Background Jobs**
   - [ ] Set up cron jobs (Vercel Cron, etc.)
   - [ ] Test job execution
   - [ ] Monitor job logs

4. **Feature Flags**
   - [ ] Add feature flags for gradual rollout
   - [ ] Test enabling/disabling features

5. **Monitoring**
   - [ ] Add error tracking (Sentry, etc.)
   - [ ] Set up performance monitoring
   - [ ] Create alerts for failures

6. **Documentation**
   - [ ] Update user documentation
   - [ ] Update API documentation
   - [ ] Create migration guide

---

## Estimated Timeline

| Feature | Complexity | Estimated Time |
|---------|-----------|---------------|
| 1. Undo Send | Low | 2-3 hours |
| 2. Snooze UI | Medium | 4-5 hours |
| 3. Keyboard Shortcuts | Medium | 5-6 hours |
| 4. Spam Management | Low | 3-4 hours |
| 5. Unsubscribe Detection | Medium | 4-5 hours |
| 6. Vacation Responder | Medium-High | 6-8 hours |
| 7. Follow-up Reminders | High | 8-10 hours |
| **Total** | | **32-41 hours** |

**Recommended Implementation Order:**
1. Undo Send (quick win, high impact)
2. Spam Management (quick win)
3. Snooze UI (database ready, medium impact)
4. Keyboard Shortcuts (high impact for power users)
5. Unsubscribe Detection (medium impact)
6. Vacation Responder (important but complex)
7. Follow-up Reminders (nice-to-have, complex)

---

## Support & Resources

- **TypeScript Docs**: https://www.typescriptlang.org/docs/
- **Next.js Docs**: https://nextjs.org/docs
- **Drizzle ORM**: https://orm.drizzle.team/docs/overview
- **Nylas API**: https://developer.nylas.com/docs/
- **shadcn/ui Components**: https://ui.shadcn.com/

---

## Notes

- All code examples use TypeScript
- Database examples use Drizzle ORM (adjust for your ORM)
- API routes are Next.js App Router format
- Components use React Server Components where possible
- All dates stored as UTC in database
- Rate limiting should be added to API routes
- Consider adding telemetry/analytics for feature usage

---

**Document Version**: 1.0
**Last Updated**: {{ current_date }}
**Author**: Claude Code Implementation Guide

