'use client';

import { useState, useEffect } from 'react';
import { X, Mail, Phone, Building, MapPin, Linkedin, Globe, Twitter, Edit, Trash2, ExternalLink, Calendar, MessageSquare, Loader2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getInitials, generateAvatarColor } from '@/lib/utils';
import { ContactNotes } from './ContactNotes';
import { CommunicationTimeline } from './CommunicationTimeline';
import { SMSModal } from '@/components/sms/SMSModal';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';

interface ContactDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: any;
  onEdit: (contact: any) => void;
  onDelete: (id: string) => void;
}

export default function ContactDetailModal({ isOpen, onClose, contact, onEdit, onDelete }: ContactDetailModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSMSModalOpen, setIsSMSModalOpen] = useState(false);
  const [teamsAccountId, setTeamsAccountId] = useState<string | null>(null);
  const [isCreatingTeamsChat, setIsCreatingTeamsChat] = useState(false);
  const [isSchedulingMeeting, setIsSchedulingMeeting] = useState(false);

  // Fetch Teams account on mount
  useEffect(() => {
    const fetchTeamsAccount = async () => {
      try {
        const response = await fetch('/api/teams/accounts');
        const data = await response.json();
        if (data.accounts && data.accounts.length > 0) {
          setTeamsAccountId(data.accounts[0].id);
        }
      } catch (error) {
        console.error('Error fetching Teams accounts:', error);
      }
    };
    fetchTeamsAccount();
  }, []);
  
  // Build display name with proper fallbacks
  const displayName = contact.displayName || 
                      contact.fullName || 
                      `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 
                      contact.email || 
                      contact.phone || 
                      'Unknown Contact';
  
  // Use email or phone for avatar color generation
  const avatarSeed = contact.email || contact.phone || displayName;
  const avatarColor = generateAvatarColor(avatarSeed);

  const handleComposeEmail = () => {
    if (!contact.email) {
      return;
    }
    
    // Dispatch event to open compose modal
    const event = new CustomEvent('openCompose', {
      detail: {
        type: 'new',
        email: contact.email
      }
    });
    window.dispatchEvent(event);
  };

  const handleSMS = () => {
    if (!contact.phone) {
      alert('SMS requires a phone number. Please edit this contact to add a phone number.');
      return;
    }
    setIsSMSModalOpen(true);
  };

  const handleDelete = () => {
    onDelete(contact.id);
    onClose();
  };

  const handleStartTeamsChat = async () => {
    if (!contact.email || !teamsAccountId) {
      toast({
        title: 'Cannot start Teams chat',
        description: !contact.email ? 'Contact needs an email address' : 'No Teams account connected',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCreatingTeamsChat(true);

      const response = await fetch('/api/teams/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: teamsAccountId,
          participantEmail: contact.email,
        }),
      });

      const data = await response.json();

      if (data.success || data.chat) {
        toast({
          title: 'Teams chat ready',
          description: 'Opening Teams chat...',
        });
        // Navigate to Teams page with the chat selected
        router.push('/teams');
      } else {
        throw new Error(data.error || 'Failed to create chat');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start Teams chat',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingTeamsChat(false);
    }
  };

  const handleScheduleMeeting = async () => {
    if (!contact.email || !teamsAccountId) {
      toast({
        title: 'Cannot schedule meeting',
        description: !contact.email ? 'Contact needs an email address' : 'No Teams account connected',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSchedulingMeeting(true);

      // Create a meeting for tomorrow at 10 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const endTime = new Date(tomorrow);
      endTime.setHours(11, 0, 0, 0);

      const response = await fetch('/api/teams/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: teamsAccountId,
          subject: `Meeting with ${displayName}`,
          startDateTime: tomorrow.toISOString(),
          endDateTime: endTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          isOnlineMeeting: true,
          attendees: [{ email: contact.email, name: displayName }],
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Meeting scheduled',
          description: `Teams meeting scheduled for tomorrow at 10 AM`,
        });
        // Navigate to Teams calendar
        router.push('/teams');
      } else {
        throw new Error(data.error || 'Failed to schedule meeting');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to schedule meeting',
        variant: 'destructive',
      });
    } finally {
      setIsSchedulingMeeting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-medium text-white"
                style={{ backgroundColor: avatarColor }}
              >
                {getInitials(displayName)}
              </div>
              <div>
                <DialogTitle className="text-2xl mb-1">{displayName}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {contact.jobTitle && contact.company 
                    ? `${contact.jobTitle} at ${contact.company}`
                    : contact.jobTitle || contact.company || contact.email
                  }
                </p>
                {contact.tags && contact.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {contact.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0 mr-8">
              <Button variant="outline" size="sm" onClick={() => onEdit(contact)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSMS}
                disabled={!contact.phone}
                title={contact.phone ? "Send SMS" : "Add phone number to send SMS"}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                SMS
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleComposeEmail}
                disabled={!contact.email}
                title={contact.email ? "Send Email" : "Add email to send email"}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              {teamsAccountId && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStartTeamsChat}
                    disabled={!contact.email || isCreatingTeamsChat}
                    title={contact.email ? "Start Teams Chat" : "Add email to start Teams chat"}
                    className="text-[#6264A7] border-[#6264A7]/50 hover:bg-[#6264A7]/10"
                  >
                    {isCreatingTeamsChat ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <MessageSquare className="h-4 w-4 mr-2" />
                    )}
                    Teams Chat
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleScheduleMeeting}
                    disabled={!contact.email || isSchedulingMeeting}
                    title={contact.email ? "Schedule Teams Meeting" : "Add email to schedule meeting"}
                    className="text-[#6264A7] border-[#6264A7]/50 hover:bg-[#6264A7]/10"
                  >
                    {isSchedulingMeeting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Video className="h-4 w-4 mr-2" />
                    )}
                    Meeting
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-6">
            <TabsContent value="overview" className="space-y-6 mt-0">
              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <a 
                        href={`mailto:${contact.email}`}
                        className="text-sm hover:underline text-primary"
                      >
                        {contact.email}
                      </a>
                    </div>
                  </div>

                  {contact.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Phone</p>
                        <a 
                          href={`tel:${contact.phone}`}
                          className="text-sm hover:underline"
                        >
                          {contact.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {contact.company && (
                    <div className="flex items-start gap-3">
                      <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Company</p>
                        <p className="text-sm">{contact.company}</p>
                      </div>
                    </div>
                  )}

                  {contact.location && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Location</p>
                        <p className="text-sm">{contact.location}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Social Links */}
              {(contact.linkedinUrl || contact.website || contact.twitterHandle) && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">Social & Web</h3>
                  <div className="flex flex-wrap gap-2">
                    {contact.linkedinUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer">
                          <Linkedin className="h-4 w-4 mr-2" />
                          LinkedIn
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    )}
                    {contact.twitterHandle && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={contact.twitterHandle} target="_blank" rel="noopener noreferrer">
                          <Twitter className="h-4 w-4 mr-2" />
                          Twitter
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    )}
                    {contact.website && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={contact.website} target="_blank" rel="noopener noreferrer">
                          <Globe className="h-4 w-4 mr-2" />
                          Website
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Statistics */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold">Statistics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-2xl font-bold">{contact.emailCount || 0}</p>
                    <p className="text-sm text-muted-foreground">Email Threads</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-2xl font-bold">
                      {contact.lastEmailAt 
                        ? formatDistanceToNow(new Date(contact.lastEmailAt), { addSuffix: false })
                        : 'Never'
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">Last Contact</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-2xl font-bold">
                      {contact.createdAt 
                        ? formatDistanceToNow(new Date(contact.createdAt), { addSuffix: false })
                        : 'Unknown'
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">In Contacts</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {contact.notes && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">Notes</h3>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
                  </div>
                </div>
              )}

              {/* Danger Zone */}
              <div className="space-y-4 pt-4 border-t border-destructive/20">
                <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
                <Button 
                  variant="destructive" 
                  onClick={handleDelete}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Contact
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-0">
              <CommunicationTimeline contactId={contact.id} />
            </TabsContent>

            <TabsContent value="notes" className="mt-0">
              <ContactNotes contactId={contact.id} />
            </TabsContent>
          </div>
        </Tabs>

        <SMSModal
          isOpen={isSMSModalOpen}
          onClose={() => setIsSMSModalOpen(false)}
          contact={contact.phone ? {
            id: contact.id,
            name: displayName,
            phoneNumber: contact.phone,
          } : null}
          onSuccess={() => {
            setIsSMSModalOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

