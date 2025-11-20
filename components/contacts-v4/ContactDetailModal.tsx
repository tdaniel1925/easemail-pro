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
  Clock,
  Send,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getInitials, generateAvatarColor, cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import type { ContactV4, NylasEmail, NylasPhoneNumber, NylasPhysicalAddress } from '@/lib/types/contacts-v4';
import { formatDistanceToNow } from 'date-fns';
import { calculateSMSSegments } from '@/lib/sms/character-counter';
import { formatPhoneForDisplay, formatPhoneForTwilio } from '@/lib/utils/phone';

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

  // SMS form state
  const [showSMSForm, setShowSMSForm] = useState(false);
  const [smsMessage, setSMSMessage] = useState('');
  const [smsPhoneNumber, setSMSPhoneNumber] = useState('');
  const [isSendingSMS, setIsSendingSMS] = useState(false);
  const [smsError, setSMSError] = useState<string | null>(null);
  const [smsSuccess, setSMSSuccess] = useState(false);
  const [twilioDetails, setTwilioDetails] = useState<{
    sid?: string;
    status?: string;
    cost?: number;
    segments?: number;
  } | null>(null);

  // Error states for inline display
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

  // Fetch contact details
  useEffect(() => {
    if (isOpen && contactId) {
      fetchContact();
    }
  }, [isOpen, contactId]);

  // Reset SMS form and errors when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowSMSForm(false);
      setSMSMessage('');
      setSMSPhoneNumber('');
      setSMSError(null);
      setSMSSuccess(false);
      setTwilioDetails(null);
      setDeleteError(null);
      setFavoriteError(null);
    }
  }, [isOpen]);

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
      // Close modal if contact can't be loaded
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!contact) return;

    setFavoriteError(null);

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
        setContact({ ...contact, isFavorite: !contact.isFavorite });
      } else {
        throw new Error(data.error || 'Failed to update favorite status');
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      setFavoriteError(error instanceof Error ? error.message : 'Failed to update favorite status');
    }
  };

  const handleDelete = async () => {
    // Show confirmation toast instead of browser confirm
    const confirmed = window.confirm('Are you sure you want to delete this contact? This action cannot be undone.');

    if (!confirmed) {
      return;
    }

    setDeleteError(null);

    try {
      const response = await fetch(`/api/contacts-v4/${contactId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Contact deleted successfully'
        });
        onDeleted?.();
        onClose();
      } else {
        throw new Error(data.error || 'Failed to delete contact');
      }
    } catch (error) {
      console.error('Failed to delete contact:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete contact';
      setDeleteError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
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

  const handleSendSMS = (phoneNumber: string) => {
    if (!contact) return;
    setSMSPhoneNumber(phoneNumber);
    setShowSMSForm(true);
    setSMSError(null);
    setSMSSuccess(false);
    setTwilioDetails(null);
  };

  const handleCloseSMSForm = () => {
    setShowSMSForm(false);
    setSMSMessage('');
    setSMSPhoneNumber('');
    setSMSError(null);
    setSMSSuccess(false);
    setTwilioDetails(null);
  };

  const handleSendSMSMessage = async () => {
    if (!contact || !smsMessage.trim()) {
      setSMSError('Please enter a message');
      return;
    }

    const segments = calculateSMSSegments(smsMessage);
    const maxSegments = 10;

    if (segments.messageCount > maxSegments) {
      setSMSError(`Message exceeds ${maxSegments} segment limit`);
      return;
    }

    setIsSendingSMS(true);
    setSMSError(null);
    setTwilioDetails(null);

    try {
      console.log('🚀 Sending SMS to:', smsPhoneNumber);
      console.log('📤 Request payload:', {
        contactId: contact.id,
        toPhone: smsPhoneNumber,
        messageLength: smsMessage.trim().length,
      });

      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          toPhone: smsPhoneNumber,
          message: smsMessage.trim(),
        }),
      });

      console.log('📡 Response status:', response.status, response.statusText);

      const responseText = await response.text();
      console.log('📄 Raw response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('[SMS] Parsed response data:', data);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        setSMSError('Failed to parse server response');
        return;
      }

      const isSuccess = (
        response.ok &&
        (data.success === true || data.success === 'true') &&
        (data.twilioSid || data.smsId)
      );

      console.log('🔍 Success check:', {
        responseOk: response.ok,
        dataSuccess: data.success,
        hasTwilioSid: !!data.twilioSid,
        hasSmsId: !!data.smsId,
        finalResult: isSuccess,
      });

      if (isSuccess) {
        console.log('[SMS] SMS sent successfully!');

        setTwilioDetails({
          sid: data.twilioSid,
          status: data.status || 'queued',
          cost: data.cost,
          segments: data.segments,
        });

        setSMSSuccess(true);
        toast({
          title: 'SMS sent successfully!',
          description: `Message sent to ${formatPhoneForDisplay(smsPhoneNumber)}`,
        });

        // Auto-close SMS form after 3 seconds
        setTimeout(() => {
          handleCloseSMSForm();
        }, 3000);
      } else {
        console.error('❌ SMS send failed - Response details:', {
          status: response.status,
          ok: response.ok,
          dataSuccess: data.success,
          data: data,
        });
        setSMSError(data.error || data.details || data.message || `Failed: ${response.status} ${response.statusText}`);
      }
    } catch (err: any) {
      console.error('❌ Network/Runtime error:', err);
      console.error('Error stack:', err.stack);
      setSMSError(err.message || 'Network error - please check your connection');
    } finally {
      setIsSendingSMS(false);
    }
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
    getPrimaryEmail(contact.emails)?.email || contact.displayName
  );

  const primaryEmail = getPrimaryEmail(contact.emails);
  const primaryPhone = getPrimaryPhone(contact.phoneNumbers);

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
                {getInitials(contact.displayName)}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-background border shadow-sm"
                  onClick={handleToggleFavorite}
                >
                  <Star className={cn(
                    "h-3 w-3",
                    contact.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                  )} />
                </Button>
              </div>

              <div>
                <DialogTitle className="text-2xl mb-1">{contact.displayName}</DialogTitle>

                {/* Job Title and Company */}
                {(contact.jobTitle || contact.companyName) && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {contact.jobTitle && contact.companyName
                      ? `${contact.jobTitle} at ${contact.companyName}`
                      : contact.jobTitle || contact.companyName
                    }
                  </p>
                )}

                {/* Primary Contact */}
                <p className="text-sm text-muted-foreground">
                  {primaryEmail?.email || (primaryPhone ? formatPhoneForTwilio(primaryPhone.number) : 'No contact info')}
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
                onClick={() => primaryPhone && handleSendSMS(primaryPhone.number)}
                disabled={!primaryPhone}
                title={primaryPhone ? "Send SMS" : "No phone available"}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                SMS
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
            {/* Error Messages */}
            {(deleteError || favoriteError) && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    {deleteError && (
                      <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                        Delete Error: {deleteError}
                      </p>
                    )}
                    {favoriteError && (
                      <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                        Favorite Error: {favoriteError}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDeleteError(null);
                      setFavoriteError(null);
                    }}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* SMS FORM (shown when showSMSForm is true) */}
            {showSMSForm && (
              <div className="mb-6 p-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Send SMS
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{formatPhoneForDisplay(smsPhoneNumber)}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseSMSForm}
                    disabled={isSendingSMS}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Message Input */}
                <div>
                  <textarea
                    value={smsMessage}
                    onChange={(e) => setSMSMessage(e.target.value)}
                    placeholder="Type your message..."
                    className={`w-full h-32 px-4 py-3 bg-white dark:bg-gray-800 border ${
                      calculateSMSSegments(smsMessage).messageCount > 10
                        ? 'border-red-300 dark:border-red-700'
                        : 'border-gray-300 dark:border-gray-700'
                    } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
                    disabled={isSendingSMS || smsSuccess}
                  />

                  {/* Character Counter */}
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                      <span>
                        {calculateSMSSegments(smsMessage).characterCount} / {calculateSMSSegments(smsMessage).charsPerSegment * calculateSMSSegments(smsMessage).messageCount} chars
                      </span>
                      <span className={calculateSMSSegments(smsMessage).messageCount > 10 ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                        {calculateSMSSegments(smsMessage).messageCount} segment{calculateSMSSegments(smsMessage).messageCount !== 1 ? 's' : ''}
                      </span>
                      <span className="text-gray-400">
                        {calculateSMSSegments(smsMessage).encoding === 'GSM-7' ? 'GSM-7' : 'Unicode'}
                      </span>
                    </div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      ${(calculateSMSSegments(smsMessage).messageCount * 0.05).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {smsError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-300">{smsError}</p>
                  </div>
                )}

                {/* Success Message */}
                {smsSuccess && twilioDetails && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">
                          SMS sent successfully!
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          Status: {twilioDetails.status} • SID: {twilioDetails.sid?.slice(-8)}
                        </p>
                      </div>
                    </div>

                    {/* Twilio Details */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">Delivery Details:</p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-blue-700 dark:text-blue-300">
                        <div>
                          <span className="font-medium">Segments:</span> {twilioDetails.segments || 1}
                        </div>
                        <div>
                          <span className="font-medium">Cost:</span> ${twilioDetails.cost?.toFixed(4) || '0.05'}
                        </div>
                        <div className="col-span-2">
                          <span className="font-medium">Twilio SID:</span> {twilioDetails.sid}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Info Note */}
                {!smsError && !smsSuccess && (
                  <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Messages over 160 characters are split into multiple SMS. Emojis count as 2-4 characters.
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleCloseSMSForm}
                    disabled={isSendingSMS}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendSMSMessage}
                    disabled={isSendingSMS || smsSuccess || !smsMessage.trim() || calculateSMSSegments(smsMessage).messageCount > 10}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSendingSMS ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : smsSuccess ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Sent
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send SMS
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-6 mt-0">
              {/* Name Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Name
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {contact.givenName && (
                    <InfoField label="First Name" value={contact.givenName} />
                  )}
                  {contact.middleName && (
                    <InfoField label="Middle Name" value={contact.middleName} />
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
                {contact.phoneNumbers && contact.phoneNumbers.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Phone Numbers</p>
                    <div className="space-y-2">
                      {contact.phoneNumbers.map((phone: NylasPhoneNumber, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <Badge variant="outline">{phone.type || 'other'}</Badge>
                          <a
                            href={`tel:${formatPhoneForTwilio(phone.number)}`}
                            className="text-sm hover:underline"
                          >
                            {formatPhoneForTwilio(phone.number)}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Professional Information */}
              {(contact.jobTitle || contact.companyName || contact.department || contact.officeLocation || contact.managerName) && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Professional
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {contact.jobTitle && (
                      <InfoField label="Job Title" value={contact.jobTitle} />
                    )}
                    {contact.companyName && (
                      <InfoField label="Company" value={contact.companyName} />
                    )}
                    {contact.department && (
                      <InfoField label="Department" value={contact.department} />
                    )}
                    {contact.officeLocation && (
                      <InfoField label="Office Location" value={contact.officeLocation} />
                    )}
                    {contact.managerName && (
                      <InfoField label="Manager" value={contact.managerName} />
                    )}
                  </div>
                </div>
              )}

              {/* Addresses */}
              {contact.physicalAddresses && contact.physicalAddresses.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Addresses
                  </h3>
                  <div className="space-y-4">
                    {contact.physicalAddresses.map((address: NylasPhysicalAddress, index: number) => (
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
              {contact.webPages && contact.webPages.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Web & Social
                  </h3>
                  <div className="space-y-2">
                    {contact.webPages.map((page: any, index: number) => (
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
              {contact.imAddresses && contact.imAddresses.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">Instant Messaging</h3>
                  <div className="space-y-2">
                    {contact.imAddresses.map((im: any, index: number) => (
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
