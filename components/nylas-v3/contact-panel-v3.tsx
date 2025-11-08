/**
 * Contact Panel v3
 * Right sidebar with Contact, Calendar, AI, and SMS tabs
 */

'use client';

import { useState, useEffect } from 'react';
import { User, Calendar as CalendarIcon, Mail, Phone, UserPlus, MessageSquare, FileText, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getInitials, generateAvatarColor, cn } from '@/lib/utils';
import { MiniCalendar } from '@/components/calendar/MiniCalendar';
import { AIAssistantSidebar } from '@/components/ai/AIAssistantSidebar';
import { SMSPanelTab } from '@/components/sms/SMSPanelTab';
import ContactModal from '@/components/contacts/ContactModal';
import { SMSModal } from '@/components/sms/SMSModal';
import { ContactNotes } from '@/components/contacts/ContactNotes';
import { CommunicationTimeline } from '@/components/contacts/CommunicationTimeline';

interface EmailMessage {
  id: string;
  subject: string;
  from: Array<{ email: string; name?: string }>;
  to: Array<{ email: string; name?: string }>;
  date: number;
  body?: string;
  snippet?: string;
}

interface ContactPanelV3Props {
  email?: EmailMessage;
  activeTab?: 'contact' | 'calendar' | 'ai' | 'sms';
  onTabChange?: (tab: 'contact' | 'calendar' | 'ai' | 'sms') => void;
}

export function ContactPanelV3({ email, activeTab: externalActiveTab, onTabChange }: ContactPanelV3Props) {
  const [internalActiveTab, setInternalActiveTab] = useState<'contact' | 'calendar' | 'ai' | 'sms'>('calendar');

  // Use external activeTab if provided, otherwise use internal
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;

  // Handle tab change
  const handleTabChange = (tab: 'contact' | 'calendar' | 'ai' | 'sms') => {
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
      // No email selected → switch to Calendar tab (unless on AI or SMS tab)
      if (activeTab !== 'ai' && activeTab !== 'sms') {
        handleTabChange('calendar');
      }
    }
  }, [email]);

  const sender = email?.from?.[0];
  const avatarColor = generateAvatarColor(sender?.email || 'unknown@example.com');

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* Tabs Header - Fixed */}
      <div className="flex-shrink-0 h-14 border-b border-border flex items-center px-4">
        <div className="flex gap-2">
          <button
            className={cn(
              'px-3 py-2 text-sm rounded-sm transition-colors',
              activeTab === 'contact'
                ? 'text-primary font-bold'
                : 'text-muted-foreground font-medium hover:text-foreground'
            )}
            onClick={() => handleTabChange('contact')}
          >
            <User className="h-4 w-4 inline mr-2" />
            Contact
          </button>
          <button
            className={cn(
              'px-3 py-2 text-sm rounded-sm transition-colors',
              activeTab === 'calendar'
                ? 'text-primary font-bold'
                : 'text-muted-foreground font-medium hover:text-foreground'
            )}
            onClick={() => handleTabChange('calendar')}
          >
            <CalendarIcon className="h-4 w-4 inline mr-2" />
            Calendar
          </button>
          <button
            className={cn(
              'px-3 py-2 text-sm rounded-sm transition-colors',
              activeTab === 'ai'
                ? 'text-primary font-bold'
                : 'text-muted-foreground font-medium hover:text-foreground'
            )}
            onClick={() => handleTabChange('ai')}
          >
            <Bot className="h-4 w-4 inline mr-2" />
            AI
          </button>
          <button
            className={cn(
              'px-3 py-2 text-sm rounded-sm transition-colors',
              activeTab === 'sms'
                ? 'text-primary font-bold'
                : 'text-muted-foreground font-medium hover:text-foreground'
            )}
            onClick={() => handleTabChange('sms')}
          >
            <MessageSquare className="h-4 w-4 inline mr-2" />
            SMS
          </button>
        </div>
      </div>

      {/* Tab Content - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'contact' ? (
          email ? (
            <ContactInfoTab email={email} avatarColor={avatarColor} />
          ) : (
            <div className="flex flex-col h-full items-center justify-center px-4">
              <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground text-center">
                Select an email<br />to view contact information
              </p>
            </div>
          )
        ) : activeTab === 'calendar' ? (
          <MiniCalendar />
        ) : activeTab === 'sms' ? (
          <SMSPanelTab />
        ) : (
          <div className="h-full">
            <AIAssistantSidebar
              isOpen={true}
              onClose={() => handleTabChange('calendar')}
              fullPage={true}
            />
          </div>
        )}
      </div>
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
  const emailForModal = {
    id: email.id,
    fromEmail: senderEmail,
    fromName: senderName,
    subject: email.subject,
    receivedAt: new Date(email.date * 1000),
    bodyText: email.body || email.snippet,
    bodyHtml: email.body,
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Contact Header - Fixed */}
        <div className="flex-shrink-0 p-4 space-y-4 border-b border-border">
          <div className="text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-medium text-white mx-auto mb-3"
              style={{ backgroundColor: avatarColor }}
            >
              {getInitials(senderName)}
            </div>
            <h3 className="font-semibold text-lg break-words px-2">{senderName}</h3>
            <p className="text-sm text-muted-foreground break-all px-2">{senderEmail}</p>
            {savedContact && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                ✓ Saved Contact
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!savedContact ? (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsContactModalOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            ) : (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsContactModalOpen(true)}
              >
                <User className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleSMSClick}
              disabled={!savedContact || !savedContact.phone}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              SMS
            </Button>
          </div>

          {/* Sub-tabs for Contact Info */}
          {savedContact && (
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setInfoTab('details')}
                className={cn(
                  'flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors',
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
                  'flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors',
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
                  'flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors',
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
        <div className="flex-1 overflow-y-auto p-4 space-y-6 min-h-0">
          {infoTab === 'details' && (
            <>
              {/* Contact Details */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase">Contact Information</h4>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">Email</p>
                    <a
                      href={`mailto:${senderEmail}`}
                      className="text-sm hover:underline break-all"
                    >
                      {senderEmail}
                    </a>
                  </div>
                </div>

                {savedContact?.phone && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">Phone</p>
                      <a
                        href={`tel:${savedContact.phone}`}
                        className="text-sm hover:underline"
                      >
                        {savedContact.phone}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Activity */}
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
