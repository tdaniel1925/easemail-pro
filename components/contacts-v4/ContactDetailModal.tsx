'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Phone,
  Building,
  MapPin,
  Globe,
  Edit,
  Trash2,
  ExternalLink,
  Calendar,
  MessageSquare,
  Loader2,
  Star,
  User,
  Briefcase,
  Home,
  AlertCircle,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getInitials, generateAvatarColor, cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import type { ContactV4, NylasEmail, NylasPhoneNumber, NylasPhysicalAddress } from '@/lib/types/contacts-v4';
import { formatDistanceToNow } from 'date-fns';

interface ContactDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: string;
  onEdit?: (contactId: string) => void;
  onDeleted?: () => void;
}

export default function ContactDetailModal({
  isOpen,
  onClose,
  contactId,
  onEdit,
  onDeleted
}: ContactDetailModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState<ContactV4 | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch contact details
  useEffect(() => {
    if (isOpen && contactId) {
      fetchContact();
    }
  }, [isOpen, contactId]);

  const fetchContact = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/contacts-v4/${contactId}`);
      const data = await response.json();

      if (data.success) {
        setContact(data.contact);
      } else {
        throw new Error(data.error || 'Failed to fetch contact');
      }
    } catch (error) {
      console.error('Failed to fetch contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to load contact details',
        variant: 'destructive'
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!contact) return;

    try {
      const response = await fetch(`/api/contacts-v4/${contactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: { is_favorite: !contact.isFavorite },
          sync_immediately: false
        }),
      });

      const data = await response.json();

      if (data.success) {
        setContact({ ...contact, is_favorite: !contact.is_favorite });
        toast({
          title: contact.is_favorite ? 'Removed from favorites' : 'Added to favorites',
        });
      } else {
        throw new Error(data.error || 'Failed to update favorite status');
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      toast({
        title: 'Error',
        description: 'Failed to update favorite status',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this contact? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/contacts-v4/${contactId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Contact deleted',
          description: 'Contact has been deleted successfully',
        });
        onDeleted?.();
        onClose();
      } else {
        throw new Error(data.error || 'Failed to delete contact');
      }
    } catch (error) {
      console.error('Failed to delete contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete contact',
        variant: 'destructive'
      });
    }
  };

  const handleComposeEmail = (email: string) => {
    const event = new CustomEvent('openCompose', {
      detail: {
        type: 'compose',
        email: { to: email, subject: '' }
      }
    });
    window.dispatchEvent(event);
  };

  if (loading || !contact) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const avatarColor = generateAvatarColor(
    getPrimaryEmail(contact.emails)?.email || contact.display_name
  );

  const primaryEmail = getPrimaryEmail(contact.emails);
  const primaryPhone = getPrimaryPhone(contact.phone_numbers);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              {/* Avatar */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-medium text-white relative"
                style={{ backgroundColor: avatarColor }}
              >
                {getInitials(contact.display_name)}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-background border shadow-sm"
                  onClick={handleToggleFavorite}
                >
                  <Star className={cn(
                    "h-3 w-3",
                    contact.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                  )} />
                </Button>
              </div>

              <div>
                <DialogTitle className="text-2xl mb-1">{contact.display_name}</DialogTitle>

                {/* Job Title and Company */}
                {(contact.job_title || contact.company_name) && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {contact.job_title && contact.company_name
                      ? `${contact.job_title} at ${contact.company_name}`
                      : contact.job_title || contact.company_name
                    }
                  </p>
                )}

                {/* Primary Contact */}
                <p className="text-sm text-muted-foreground">
                  {primaryEmail?.email || primaryPhone?.number || 'No contact info'}
                </p>

                {/* Tags */}
                {contact.tags && contact.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {contact.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Sync Status */}
                {contact.sync_status !== 'synced' && (
                  <div className="mt-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-yellow-600">
                      {contact.sync_status.replace('_', ' ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-shrink-0 mr-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onEdit?.(contact.id);
                  onClose();
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => primaryEmail && handleComposeEmail(primaryEmail.email)}
                disabled={!primaryEmail}
                title={primaryEmail ? "Send Email" : "No email available"}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-6">
            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-6 mt-0">
              {/* Name Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Name
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {contact.given_name && (
                    <InfoField label="First Name" value={contact.given_name} />
                  )}
                  {contact.middle_name && (
                    <InfoField label="Middle Name" value={contact.middle_name} />
                  )}
                  {contact.surname && (
                    <InfoField label="Last Name" value={contact.surname} />
                  )}
                  {contact.suffix && (
                    <InfoField label="Suffix" value={contact.suffix} />
                  )}
                  {contact.nickname && (
                    <InfoField label="Nickname" value={contact.nickname} />
                  )}
                </div>
              </div>

              {/* Contact Methods */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Contact Methods
                </h3>

                {/* Emails */}
                {contact.emails && contact.emails.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Email Addresses</p>
                    <div className="space-y-2">
                      {contact.emails.map((email: NylasEmail, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <Badge variant="outline">{email.type || 'other'}</Badge>
                          <a
                            href={`mailto:${email.email}`}
                            className="text-sm hover:underline text-primary"
                          >
                            {email.email}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Phone Numbers */}
                {contact.phone_numbers && contact.phone_numbers.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Phone Numbers</p>
                    <div className="space-y-2">
                      {contact.phone_numbers.map((phone: NylasPhoneNumber, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <Badge variant="outline">{phone.type || 'other'}</Badge>
                          <a
                            href={`tel:${phone.number}`}
                            className="text-sm hover:underline"
                          >
                            {phone.number}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Professional Information */}
              {(contact.job_title || contact.company_name || contact.department || contact.office_location || contact.manager_name) && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Professional
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {contact.job_title && (
                      <InfoField label="Job Title" value={contact.job_title} />
                    )}
                    {contact.company_name && (
                      <InfoField label="Company" value={contact.company_name} />
                    )}
                    {contact.department && (
                      <InfoField label="Department" value={contact.department} />
                    )}
                    {contact.office_location && (
                      <InfoField label="Office Location" value={contact.office_location} />
                    )}
                    {contact.manager_name && (
                      <InfoField label="Manager" value={contact.manager_name} />
                    )}
                  </div>
                </div>
              )}

              {/* Addresses */}
              {contact.physical_addresses && contact.physical_addresses.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Addresses
                  </h3>
                  <div className="space-y-4">
                    {contact.physical_addresses.map((address: NylasPhysicalAddress, index: number) => (
                      <div key={index} className="space-y-1">
                        <Badge variant="outline">{address.type || 'other'}</Badge>
                        <p className="text-sm">
                          {[
                            address.street_address,
                            address.city,
                            address.state,
                            address.postal_code,
                            address.country
                          ].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Web Pages */}
              {contact.web_pages && contact.web_pages.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Web & Social
                  </h3>
                  <div className="space-y-2">
                    {contact.web_pages.map((page: any, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <Badge variant="outline">{page.type || 'other'}</Badge>
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm hover:underline text-primary flex items-center gap-1"
                        >
                          {page.url}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {contact.notes && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">Notes</h3>
                  <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
                </div>
              )}
            </TabsContent>

            {/* DETAILS TAB */}
            <TabsContent value="details" className="space-y-6 mt-0">
              {/* Birthday */}
              {contact.birthday && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Personal
                  </h3>
                  <InfoField
                    label="Birthday"
                    value={new Date(contact.birthday).toLocaleDateString()}
                  />
                </div>
              )}

              {/* Groups */}
              {contact.groups && contact.groups.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">Groups</h3>
                  <div className="flex flex-wrap gap-2">
                    {contact.groups.map((group: any, index: number) => (
                      <Badge key={index} variant="secondary">
                        {group.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* IM Addresses */}
              {contact.im_addresses && contact.im_addresses.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">Instant Messaging</h3>
                  <div className="space-y-2">
                    {contact.im_addresses.map((im: any, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <Badge variant="outline">{im.type || 'other'}</Badge>
                        <span className="text-sm">{im.im_address}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// HELPERS
// ============================================

interface InfoFieldProps {
  label: string;
  value: string;
  mono?: boolean;
}

function InfoField({ label, value, mono }: InfoFieldProps) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className={cn("text-sm", mono && "font-mono text-xs")}>{value}</p>
    </div>
  );
}

function getPrimaryEmail(emails: any[]): NylasEmail | null {
  if (!emails || emails.length === 0) return null;

  return (
    emails.find(e => e.type === 'work') ||
    emails.find(e => e.type === 'personal') ||
    emails[0] ||
    null
  );
}

function getPrimaryPhone(phones: any[]): NylasPhoneNumber | null {
  if (!phones || phones.length === 0) return null;

  return (
    phones.find(p => p.type === 'mobile') ||
    phones.find(p => p.type === 'work') ||
    phones[0] ||
    null
  );
}
