'use client';

import { useState } from 'react';
import { User, Calendar as CalendarIcon, Mail, Phone, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getInitials, generateAvatarColor } from '@/lib/utils';
import { cn } from '@/lib/utils';
import ContactModal from '@/components/contacts/ContactModal';
import { MiniCalendar } from '@/components/calendar/MiniCalendar';

interface Email {
  id: string;
  fromEmail?: string;
  fromName?: string;
  subject: string;
  receivedAt: Date;
  bodyText?: string;
  bodyHtml?: string;
}

interface ContactPanelProps {
  email: Email | undefined;
}

export function ContactPanel({ email }: ContactPanelProps) {
  const [activeTab, setActiveTab] = useState<'contact' | 'calendar'>('contact');

  if (!email) {
    return (
      <div className="flex flex-col h-full bg-card items-center justify-center px-4">
        <p className="text-sm text-muted-foreground text-center">
          Select an email<br />to view contact information
        </p>
      </div>
    );
  }

  const avatarColor = generateAvatarColor(email?.fromEmail || 'unknown@example.com');

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Tabs Header */}
      <div className="h-14 border-b border-border flex items-center px-4">
        <div className="flex gap-2">
          <button
            className={cn(
              'px-3 py-2 text-sm font-medium rounded-sm transition-colors',
              activeTab === 'contact'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
            onClick={() => setActiveTab('contact')}
          >
            <User className="h-4 w-4 inline mr-2" />
            Contact
          </button>
          <button
            className={cn(
              'px-3 py-2 text-sm font-medium rounded-sm transition-colors',
              activeTab === 'calendar'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
            onClick={() => setActiveTab('calendar')}
          >
            <CalendarIcon className="h-4 w-4 inline mr-2" />
            Calendar
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'contact' ? (
          <ContactInfoTab email={email} avatarColor={avatarColor} />
        ) : (
          <MiniCalendar />
        )}
      </div>
    </div>
  );
}

function ContactInfoTab({ email, avatarColor }: { email: Email; avatarColor: string }) {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  
  return (
    <>
      <div className="p-4 space-y-6">
        {/* Contact Header */}
        <div className="text-center pb-4 border-b border-border">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-medium text-white mx-auto mb-3"
            style={{ backgroundColor: avatarColor }}
          >
            {getInitials(email.fromName || email.fromEmail || 'Unknown')}
          </div>
          <h3 className="font-semibold text-lg break-words px-2">{email.fromName || email.fromEmail || 'Unknown'}</h3>
          <p className="text-sm text-muted-foreground break-all px-2">{email.fromEmail}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => setIsContactModalOpen(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add to Contacts
          </Button>
          <Button variant="outline" className="flex-1">
            <Phone className="h-4 w-4 mr-2" />
            SMS
          </Button>
        </div>

      {/* Contact Details - Only Email */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase">Contact Information</h4>
        
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <Mail className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Email</p>
            <a 
              href={`mailto:${email.fromEmail || 'unknown@example.com'}`} 
              className="text-sm hover:underline break-all"
            >
              {email.fromEmail || 'Unknown'}
            </a>
          </div>
        </div>
      </div>

      {/* Recent Activity - Just this email */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase">Recent Activity</h4>

        <div className="p-3 rounded-lg border border-border">
          <div className="flex items-start gap-2 mb-1">
            <Mail className="h-3 w-3 text-muted-foreground mt-1" />
            <div className="flex-1">
              <p className="text-sm font-medium">Email Received</p>
              <p className="text-xs text-muted-foreground line-clamp-1">{email.subject}</p>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Contact Modal */}
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        email={email}
      />
    </>
  );
}

