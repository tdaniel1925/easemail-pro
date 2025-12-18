/**
 * Contact Panel v3
 * Right sidebar with Contact, Calendar, and Agenda tabs
 */

'use client';

import { useState, useEffect } from 'react';
import { User, Calendar as CalendarIcon, Mail, Phone, UserPlus, MessageSquare, FileText, Sun, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getInitials, generateAvatarColor, cn } from '@/lib/utils';
import { MiniCalendar } from '@/components/calendar/MiniCalendar';
import { YourDay } from '@/components/calendar/YourDay';
import ContactModal from '@/components/contacts/ContactModal';
import { SMSModal } from '@/components/sms/SMSModal';
import { ContactNotes } from '@/components/contacts/ContactNotes';
import { CommunicationTimeline } from '@/components/contacts/CommunicationTimeline';
import QuickAddV4 from '@/components/calendar/QuickAddV4';
import { TeamsMeetingModal } from '@/components/teams';

interface EmailMessage {
  id: string;
  subject: string;
  from: Array<{ email: string; name?: string }>;
  to: Array<{ email: string; name?: string }>;
  date: number;
  body?: string;
  bodyHtml?: string;
  bodyText?: string;
  snippet?: string;
}

type TabType = 'agenda' | 'contact' | 'calendar';

interface ContactPanelV3Props {
  email?: EmailMessage;
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  onComposeEmail?: (emailData: { to: string; subject: string; body: string }) => void;
  onEventClick?: (event: any) => void;
}

export function ContactPanelV3({ email, activeTab: externalActiveTab, onTabChange, onEventClick }: ContactPanelV3Props) {
  const [internalActiveTab, setInternalActiveTab] = useState<TabType>('agenda');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isTeamsMeetingOpen, setIsTeamsMeetingOpen] = useState(false);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);

  // Use external activeTab if provided, otherwise use internal
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;

  // Handle tab change
  const handleTabChange = (tab: TabType) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };

  // Automatically switch tabs based on email selection
  useEffect(() => {
    if (email) {
      // Email selected → switch to Contact tab
      handleTabChange('contact');
    } else {
      // No email selected → switch to Your Day tab
      handleTabChange('agenda');
    }
  }, [email]);

  const sender = email?.from?.[0];
  const avatarColor = generateAvatarColor(sender?.email || 'unknown@example.com');

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* Tabs Header - Fixed */}
      <div className="flex-shrink-0 h-14 border-b border-border flex items-center px-2">
        <div className="flex gap-0.5">
          <button
            className={cn(
              'px-2 py-1.5 text-xs rounded-sm transition-colors',
              activeTab === 'agenda'
                ? 'text-primary font-semibold'
                : 'text-muted-foreground font-medium hover:text-foreground'
            )}
            onClick={() => handleTabChange('agenda')}
          >
            <Sun className="h-3 w-3 inline mr-1" />
            Agenda
          </button>
          <button
            className={cn(
              'px-2 py-1.5 text-xs rounded-sm transition-colors',
              activeTab === 'contact'
                ? 'text-primary font-semibold'
                : 'text-muted-foreground font-medium hover:text-foreground'
            )}
            onClick={() => handleTabChange('contact')}
          >
            <User className="h-3 w-3 inline mr-1" />
            Contact
          </button>
          <button
            className={cn(
              'px-2 py-1.5 text-xs rounded-sm transition-colors',
              activeTab === 'calendar'
                ? 'text-primary font-semibold'
                : 'text-muted-foreground font-medium hover:text-foreground'
            )}
            onClick={() => handleTabChange('calendar')}
          >
            <CalendarIcon className="h-3 w-3 inline mr-1" />
            Calendar
          </button>
        </div>
      </div>

      {/* Tab Content - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'agenda' ? (
          <YourDay />
        ) : activeTab === 'contact' ? (
          email ? (
            <ContactInfoTab email={email} avatarColor={avatarColor} />
          ) : (
            <div className="flex flex-col h-full items-center justify-center px-3">
              <User className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground text-center">
                Select an email<br />to view contact information
              </p>
            </div>
          )
        ) : (
          <div className="flex flex-col h-full">
            <MiniCalendar
              key={calendarRefreshKey}
              onQuickAddClick={() => setIsQuickAddOpen(true)}
              onEventClick={onEventClick}
            />
            {/* Add Team Event Button */}
            <div className="flex-shrink-0 p-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-[#6264A7] border-[#6264A7]/30 hover:bg-[#6264A7]/10"
                onClick={() => setIsTeamsMeetingOpen(true)}
              >
                <Video className="h-3 w-3 mr-1.5" />
                Add Teams Meeting
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* QuickAdd Modal */}
      <QuickAddV4
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onEventCreated={() => {
          // Refresh MiniCalendar by updating key
          setCalendarRefreshKey(prev => prev + 1);
        }}
      />

      {/* Teams Meeting Modal */}
      <TeamsMeetingModal
        isOpen={isTeamsMeetingOpen}
        onClose={() => setIsTeamsMeetingOpen(false)}
        onSuccess={() => {
          // Refresh MiniCalendar after creating a Teams meeting
          setCalendarRefreshKey(prev => prev + 1);
        }}
      />
    </div>
  );
}

function ContactInfoTab({ email, avatarColor }: { email: EmailMessage; avatarColor: string }) {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isSMSModalOpen, setIsSMSModalOpen] = useState(false);
  const [savedContact, setSavedContact] = useState<any>(null);
  const [infoTab, setInfoTab] = useState<'details' | 'timeline' | 'notes'>('details');

  const sender = email.from[0];
  const senderEmail = sender.email;
  const senderName = sender.name || sender.email;

  // Check if this email is from a saved contact
  useEffect(() => {
    fetchContact();
  }, [senderEmail]);

  const fetchContact = async () => {
    if (!senderEmail) return;

    try {
      const response = await fetch(`/api/contacts?email=${encodeURIComponent(senderEmail)}`);
      const data = await response.json();
      if (data.success && data.contacts.length > 0) {
        setSavedContact(data.contacts[0]);
      } else {
        setSavedContact(null);
      }
    } catch (error) {
      console.error('Failed to fetch contact:', error);
    }
  };

  const handleSMSClick = () => {
    if (!savedContact || !savedContact.phone) {
      alert('Please add this contact with a phone number first');
      setIsContactModalOpen(true);
      return;
    }
    setIsSMSModalOpen(true);
  };

  // Convert v3 email to v1 format for ContactModal
  // Use bodyHtml/bodyText if available (from detail API), fallback to body/snippet
  const emailForModal = {
    id: email.id,
    fromEmail: senderEmail,
    fromName: senderName,
    subject: email.subject,
    receivedAt: new Date(email.date * 1000),
    bodyText: email.bodyText || email.body || email.snippet,
    bodyHtml: email.bodyHtml || email.body,
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Contact Header - Fixed */}
        <div className="flex-shrink-0 p-2 space-y-2 border-b border-border">
          <div className="text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium text-white mx-auto mb-1.5"
              style={{ backgroundColor: avatarColor }}
            >
              {getInitials(senderName)}
            </div>
            <h3 className="font-semibold text-xs break-words px-1">{senderName}</h3>
            <p className="text-[10px] text-muted-foreground break-all px-1">{senderEmail}</p>
            {savedContact && (
              <p className="text-[10px] text-green-600 dark:text-green-400 mt-0.5">
                ✓ Saved Contact
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-1">
            {!savedContact ? (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-6 text-xs"
                onClick={() => setIsContactModalOpen(true)}
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Add Contact
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-6 text-xs"
                onClick={() => setIsContactModalOpen(true)}
              >
                <User className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-6 text-xs"
              onClick={handleSMSClick}
              disabled={!savedContact || !savedContact.phone}
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              SMS
            </Button>
          </div>

          {/* Sub-tabs for Contact Info */}
          {savedContact && (
            <div className="flex gap-0.5 p-0.5 bg-muted rounded-md">
              <button
                onClick={() => setInfoTab('details')}
                className={cn(
                  'flex-1 px-1.5 py-1 text-[10px] font-medium rounded transition-colors',
                  infoTab === 'details'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Details
              </button>
              <button
                onClick={() => setInfoTab('timeline')}
                className={cn(
                  'flex-1 px-1.5 py-1 text-[10px] font-medium rounded transition-colors',
                  infoTab === 'timeline'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Timeline
              </button>
              <button
                onClick={() => setInfoTab('notes')}
                className={cn(
                  'flex-1 px-1.5 py-1 text-[10px] font-medium rounded transition-colors',
                  infoTab === 'notes'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Notes
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3 min-h-0">
          {infoTab === 'details' && (
            <>
              {/* Contact Details */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase">Contact Information</h4>

                <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                  <Mail className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Email</p>
                    <a
                      href={`mailto:${senderEmail}`}
                      className="text-xs hover:underline break-all"
                    >
                      {senderEmail}
                    </a>
                  </div>
                </div>

                {savedContact?.phone && (
                  <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                    <Phone className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Phone</p>
                      <a
                        href={`tel:${savedContact.phone}`}
                        className="text-xs hover:underline"
                      >
                        {savedContact.phone}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Activity */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase">Recent Activity</h4>

                <div className="p-2 rounded-md border border-border">
                  <div className="flex items-start gap-1.5 mb-0.5">
                    <Mail className="h-2.5 w-2.5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-medium">Email Received</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{email.subject}</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {infoTab === 'timeline' && savedContact && (
            <CommunicationTimeline contactId={savedContact.id} />
          )}

          {infoTab === 'notes' && savedContact && (
            <ContactNotes contactId={savedContact.id} />
          )}
        </div>
      </div>

      {/* Contact Modal */}
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => {
          setIsContactModalOpen(false);
          fetchContact(); // Refresh after save
        }}
        email={emailForModal}
      />

      {/* SMS Modal */}
      {savedContact && (
        <SMSModal
          isOpen={isSMSModalOpen}
          onClose={() => setIsSMSModalOpen(false)}
          contact={{
            id: savedContact.id,
            name: savedContact.firstName && savedContact.lastName
              ? `${savedContact.firstName} ${savedContact.lastName}`
              : savedContact.email,
            phoneNumber: savedContact.phone || '',
          }}
          onSuccess={() => {
            // Refresh timeline if we're viewing it
            if (infoTab === 'timeline') {
              fetchContact();
            }
          }}
        />
      )}
    </>
  );
}
