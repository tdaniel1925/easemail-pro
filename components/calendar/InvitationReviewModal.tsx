/**
 * Invitation Review Modal
 * Review, edit, and approve calendar invitations before sending
 */

'use client';

import React, { useState, useEffect } from 'react';
import { X, Mail, Edit, Users, FileText, Send, Save, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { sanitizeEmailHTML } from '@/lib/utils/email-html';
// Preview will be generated via API call to avoid client-side template issues

interface InvitationReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    id: string;
    title: string;
    description?: string | null;
    location?: string | null;
    startTime: Date;
    endTime: Date;
    allDay: boolean;
    timezone?: string | null;
    organizerEmail?: string | null;
  };
  attendees: Array<{ email: string; name?: string }>;
  organizer: {
    name: string;
    email: string;
  };
  onSend: (data: {
    customMessage?: string;
    personalNotes?: string;
    subjectOverride?: string;
    attendees: Array<{ email: string; name?: string }>;
  }) => Promise<void>;
}

type TabType = 'preview' | 'edit' | 'attendees' | 'notes';

export default function InvitationReviewModal({
  isOpen,
  onClose,
  event,
  attendees: initialAttendees,
  organizer,
  onSend,
}: InvitationReviewModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('preview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Editable fields
  const [subjectOverride, setSubjectOverride] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [personalNotes, setPersonalNotes] = useState<string>('');
  const [attendees, setAttendees] = useState<Array<{ email: string; name?: string }>>(initialAttendees);

  // Initialize default subject
  useEffect(() => {
    if (!subjectOverride && event.title) {
      setSubjectOverride(`Invitation: ${event.title}`);
    }
  }, [event.title, subjectOverride]);

  // Reset attendees when modal opens
  useEffect(() => {
    if (isOpen) {
      setAttendees(initialAttendees);
      setSubjectOverride(`Invitation: ${event.title}`);
      setCustomMessage('');
      setPersonalNotes('');
      setError(null);
    }
  }, [isOpen, initialAttendees, event.title]);

  // Preview HTML state - will be fetched from API
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);

  // Generate preview HTML via API call
  useEffect(() => {
    if (isOpen && attendees.length > 0 && activeTab === 'preview') {
      setPreviewLoading(true);
      fetch('/api/calendar/events/preview-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: {
            title: event.title,
            description: event.description,
            location: event.location,
            startTime: event.startTime.toISOString(),
            endTime: event.endTime.toISOString(),
            allDay: event.allDay,
            timezone: event.timezone,
          },
          organizer,
          attendee: attendees[0],
          customMessage: customMessage || undefined,
        }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.html) {
            setPreviewHtml(data.html);
          }
        })
        .catch(err => {
          console.error('Error loading preview:', err);
          setPreviewHtml('');
        })
        .finally(() => {
          setPreviewLoading(false);
        });
    } else {
      setPreviewHtml('');
    }
  }, [isOpen, attendees, event, organizer, customMessage, activeTab]);

  const handleSend = async () => {
    if (attendees.length === 0) {
      setError('Please add at least one attendee before sending invitations.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSend({
        customMessage: customMessage.trim() || undefined,
        personalNotes: personalNotes.trim() || undefined,
        subjectOverride: subjectOverride.trim() || undefined,
        attendees,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send invitations');
    } finally {
      setLoading(false);
    }
  };

  const removeAttendee = (index: number) => {
    setAttendees(prev => prev.filter((_, i) => i !== index));
  };

  const addAttendee = () => {
    setAttendees(prev => [...prev, { email: '', name: '' }]);
  };

  const updateAttendee = (index: number, field: 'email' | 'name', value: string) => {
    setAttendees(prev => prev.map((a, i) => 
      i === index ? { ...a, [field]: value } : a
    ));
  };

  if (!isOpen) {
    return null;
  }

  return React.createElement(
    Dialog,
    { open: isOpen, onOpenChange: onClose },
    React.createElement(
      DialogContent,
      { className: "max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" },
      React.createElement(
        DialogHeader,
        null,
        React.createElement(
          DialogTitle,
          { className: "flex items-center gap-2" },
          React.createElement(Mail, { className: "h-5 w-5" }),
          React.createElement("span", null, "Review & Send Invitations")
        )
      ),
      React.createElement(
        Tabs,
        { value: activeTab, onValueChange: (v: string) => setActiveTab(v as TabType), className: "flex-1 overflow-hidden flex flex-col" },
        React.createElement(
          TabsList,
          { className: "grid w-full grid-cols-4" },
          React.createElement(TabsTrigger, { value: "preview", className: "flex items-center gap-2" },
            React.createElement(Eye, { className: "h-4 w-4" }),
            "Preview"
          ),
          React.createElement(TabsTrigger, { value: "edit", className: "flex items-center gap-2" },
            React.createElement(Edit, { className: "h-4 w-4" }),
            "Edit"
          ),
          React.createElement(TabsTrigger, { value: "attendees", className: "flex items-center gap-2" },
            React.createElement(Users, { className: "h-4 w-4" }),
            `Attendees (${attendees.length})`
          ),
          React.createElement(TabsTrigger, { value: "notes", className: "flex items-center gap-2" },
            React.createElement(FileText, { className: "h-4 w-4" }),
            "Notes"
          )
        ),
        React.createElement(
          "div",
          { className: "flex-1 overflow-y-auto mt-4" },
          React.createElement(
            TabsContent,
            { value: "preview", className: "space-y-4" },
            React.createElement(
              "div",
              { className: "border border-border rounded-lg p-4 bg-muted/30" },
              React.createElement("p", { className: "text-sm text-muted-foreground mb-2" },
                "This is how the invitation email will appear to recipients:"
              ),
              previewLoading ? React.createElement(
                "div",
                { className: "flex items-center justify-center py-8" },
                React.createElement(Loader2, { className: "h-6 w-6 animate-spin text-muted-foreground" }),
                React.createElement("span", { className: "ml-2 text-sm text-muted-foreground" }, "Loading preview...")
              ) : previewHtml ? React.createElement(
                "div",
                { className: "border border-border rounded-lg bg-white p-4 max-h-[500px] overflow-y-auto", dangerouslySetInnerHTML: { __html: sanitizeEmailHTML(previewHtml, true) } }
              ) : React.createElement("p", { className: "text-sm text-muted-foreground" }, "Add attendees to see preview")
            )
          ),
          React.createElement(
            TabsContent,
            { value: "edit", className: "space-y-4" },
            React.createElement(
              "div",
              null,
              React.createElement("label", { className: "block text-sm font-medium mb-2" }, "Subject Line"),
              React.createElement(Input, {
                value: subjectOverride,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => setSubjectOverride(e.target.value),
                placeholder: "Invitation: Event Title"
              }),
              React.createElement("p", { className: "text-xs text-muted-foreground mt-1" },
                'Default: "Invitation: {Event Title}"'
              )
            ),
            React.createElement(
              "div",
              null,
              React.createElement("label", { className: "block text-sm font-medium mb-2" },
                "Custom Message (Optional)"
              ),
              React.createElement(Textarea, {
                value: customMessage,
                onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomMessage(e.target.value),
                placeholder: "Add a personal note that will be included in the invitation email...",
                rows: 6,
                className: "resize-none"
              }),
              React.createElement("p", { className: "text-xs text-muted-foreground mt-1" },
                "This message will be added to the invitation email body"
              )
            )
          ),
          React.createElement(
            TabsContent,
            { value: "attendees", className: "space-y-4" },
            React.createElement(
              "div",
              { className: "flex items-center justify-between" },
              React.createElement("p", { className: "text-sm text-muted-foreground" },
                "Review and manage attendees who will receive invitations"
              ),
              React.createElement(Button, {
                type: "button",
                variant: "outline",
                size: "sm",
                onClick: addAttendee
              }, "Add Attendee")
            ),
            React.createElement(
              "div",
              { className: "space-y-2" },
              attendees.map((attendee, index) => React.createElement(
                "div",
                { key: index, className: "flex items-center gap-2 p-3 border border-border rounded-lg bg-card" },
                React.createElement(
                  "div",
                  { className: "flex-1 grid grid-cols-2 gap-2" },
                  React.createElement(Input, {
                    placeholder: "Email address",
                    value: attendee.email,
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => updateAttendee(index, 'email', e.target.value)
                  }),
                  React.createElement(Input, {
                    placeholder: "Name (optional)",
                    value: attendee.name || '',
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => updateAttendee(index, 'name', e.target.value)
                  })
                ),
                React.createElement(Button, {
                  type: "button",
                  variant: "ghost",
                  size: "sm",
                  onClick: () => removeAttendee(index)
                }, React.createElement(X, { className: "h-4 w-4" }))
              )),
              attendees.length === 0 && React.createElement(
                "div",
                { className: "text-center py-8 text-muted-foreground" },
                React.createElement(Users, { className: "h-12 w-12 mx-auto mb-2 opacity-50" }),
                React.createElement("p", null, "No attendees added"),
                React.createElement(Button, {
                  type: "button",
                  variant: "outline",
                  size: "sm",
                  onClick: addAttendee,
                  className: "mt-2"
                }, "Add First Attendee")
              )
            )
          ),
          React.createElement(
            TabsContent,
            { value: "notes", className: "space-y-4" },
            React.createElement(
              "div",
              null,
              React.createElement("label", { className: "block text-sm font-medium mb-2" },
                "Personal Notes (Internal Only)"
              ),
              React.createElement(Textarea, {
                value: personalNotes,
                onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setPersonalNotes(e.target.value),
                placeholder: "Add internal notes about this invitation. These notes will NOT be sent to attendees...",
                rows: 8,
                className: "resize-none"
              }),
              React.createElement("p", { className: "text-xs text-muted-foreground mt-1" },
                "These notes are for your reference only and will not be included in the invitation email"
              )
            )
          )
        ),
        error && React.createElement(
          "div",
          { className: "mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300" },
          error
        ),
        React.createElement(
          "div",
          { className: "flex justify-end gap-2 pt-4 border-t border-border mt-4" },
          React.createElement(Button, {
            type: "button",
            variant: "outline",
            onClick: onClose,
            disabled: loading
          }, "Cancel"),
          React.createElement(Button, {
            type: "button",
            variant: "outline",
            onClick: onClose,
            disabled: loading
          }, React.createElement(Save, { className: "h-4 w-4 mr-2" }), "Save & Send Later"),
          React.createElement(Button, {
            type: "button",
            onClick: handleSend,
            disabled: loading || attendees.length === 0
          }, loading ? React.createElement(React.Fragment, null, React.createElement(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }), "Sending...") : React.createElement(React.Fragment, null, React.createElement(Send, { className: "h-4 w-4 mr-2" }), `Send Invitations (${attendees.length})`))
        )
      )
    )
  );
}
