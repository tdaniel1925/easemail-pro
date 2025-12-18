/**
 * Teams Meeting Modal
 * Create a new Teams meeting from anywhere in the app
 */

'use client';

import { useState, useEffect } from 'react';
import { Video, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { format, addHours } from 'date-fns';

interface TeamsMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TeamsMeetingModal({ isOpen, onClose, onSuccess }: TeamsMeetingModalProps) {
  const [hasTeamsAccount, setHasTeamsAccount] = useState<boolean | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCheckingAccount, setIsCheckingAccount] = useState(true);

  const { toast } = useToast();

  // Form state
  const [newMeeting, setNewMeeting] = useState({
    subject: '',
    startDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    endDate: format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
    location: '',
    body: '',
    isOnlineMeeting: true,
    attendees: '',
  });

  // Check for Teams account when modal opens
  useEffect(() => {
    if (isOpen) {
      checkTeamsAccount();
      // Reset form
      setNewMeeting({
        subject: '',
        startDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        endDate: format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
        location: '',
        body: '',
        isOnlineMeeting: true,
        attendees: '',
      });
    }
  }, [isOpen]);

  const checkTeamsAccount = async () => {
    try {
      setIsCheckingAccount(true);
      const response = await fetch('/api/teams/accounts');
      const data = await response.json();

      if (data.accounts && data.accounts.length > 0) {
        setHasTeamsAccount(true);
        setAccountId(data.accounts[0].id);
      } else {
        setHasTeamsAccount(false);
        setAccountId(null);
      }
    } catch (error) {
      console.error('Error checking Teams account:', error);
      setHasTeamsAccount(false);
    } finally {
      setIsCheckingAccount(false);
    }
  };

  const handleCreateMeeting = async () => {
    if (!accountId || !newMeeting.subject.trim()) return;

    try {
      setIsCreating(true);

      const attendeesList = newMeeting.attendees
        .split(',')
        .map(e => e.trim())
        .filter(e => e)
        .map(email => ({ email }));

      const response = await fetch('/api/teams/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          subject: newMeeting.subject,
          startDateTime: new Date(newMeeting.startDate).toISOString(),
          endDateTime: new Date(newMeeting.endDate).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          location: newMeeting.location || undefined,
          body: newMeeting.body || undefined,
          isOnlineMeeting: newMeeting.isOnlineMeeting,
          attendees: attendeesList.length > 0 ? attendeesList : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Meeting created',
          description: newMeeting.isOnlineMeeting
            ? 'Your Teams meeting has been scheduled'
            : 'Your calendar event has been created',
        });
        onClose();
        onSuccess?.();
      } else {
        throw new Error(data.error || 'Failed to create meeting');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create meeting',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-[#6264A7]" />
            Schedule Teams Meeting
          </DialogTitle>
          <DialogDescription>
            Create a new Teams meeting with video conferencing
          </DialogDescription>
        </DialogHeader>

        {isCheckingAccount ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hasTeamsAccount ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Video className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Teams Not Connected</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Connect your Microsoft Teams account to create meetings
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/teams'}
              className="text-[#6264A7] border-[#6264A7]"
            >
              Connect Teams
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Title *</Label>
                <Input
                  id="subject"
                  placeholder="Meeting title"
                  value={newMeeting.subject}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={newMeeting.startDate}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={newMeeting.endDate}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="attendees">Attendees (optional)</Label>
                <Input
                  id="attendees"
                  placeholder="email1@example.com, email2@example.com"
                  value={newMeeting.attendees}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, attendees: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Separate multiple emails with commas</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location (optional)</Label>
                <Input
                  id="location"
                  placeholder="Meeting room or address"
                  value={newMeeting.location}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Description (optional)</Label>
                <Textarea
                  id="body"
                  placeholder="Meeting agenda or notes"
                  value={newMeeting.body}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, body: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="isOnlineMeeting"
                    checked={newMeeting.isOnlineMeeting}
                    onCheckedChange={(checked) => setNewMeeting(prev => ({ ...prev, isOnlineMeeting: checked }))}
                  />
                  <Label htmlFor="isOnlineMeeting" className="cursor-pointer">
                    <span className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-[#6264A7]" />
                      Add Teams meeting link
                    </span>
                  </Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateMeeting}
                disabled={!newMeeting.subject.trim() || isCreating}
                className="bg-[#6264A7] hover:bg-[#6264A7]/90"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Meeting
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
