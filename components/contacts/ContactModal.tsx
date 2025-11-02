'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Sparkles, Mail, Phone, Building, MapPin, Linkedin, Globe, User, Twitter, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  email?: {
    id: string;
    fromEmail?: string;
    fromName?: string;
    bodyText?: string;
    bodyHtml?: string;
    subject?: string;
  };
  contact?: any; // For editing existing contact
  onContactSaved?: (enriching: boolean) => void; // Callback to notify enrichment status
}

export default function ContactModal({ isOpen, onClose, email, contact, onContactSaved }: ContactModalProps) {
  const [loading, setLoading] = useState(false);
  const [aiEnriching, setAiEnriching] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    company: '',
    phone: '',
    jobTitle: '',
    website: '',
    linkedIn: '',
    twitter: '',
    address: '',
    notes: '',
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Pre-populate data when modal opens (either from email or existing contact)
  useEffect(() => {
    if (isOpen) {
      if (contact) {
        // Editing existing contact
        setFormData({
          email: contact.email || '',
          firstName: contact.firstName || '',
          lastName: contact.lastName || '',
          company: contact.company || '',
          phone: contact.phone || '',
          jobTitle: contact.jobTitle || '',
          website: contact.website || '',
          linkedIn: contact.linkedinUrl || '',
          twitter: contact.twitterHandle || '',
          address: contact.location || '',
          notes: contact.notes || '',
          tags: contact.tags || [],
        });
      } else if (email) {
        // Creating from email
        const nameParts = (email.fromName || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        setFormData(prev => ({
          ...prev,
          email: email.fromEmail || '',
          firstName,
          lastName,
        }));
        
        // Show info that enrichment will happen in background
        console.log('ℹ️ Contact will be enriched in background after saving');
      } else {
        // New empty contact
        setFormData({
          email: '',
          firstName: '',
          lastName: '',
          company: '',
          phone: '',
          jobTitle: '',
          website: '',
          linkedIn: '',
          twitter: '',
          address: '',
          notes: '',
          tags: [],
        });
      }
    }
  }, [email, contact, isOpen]);

  const enrichContactWithAI = async (emailData: any) => {
    setAiEnriching(true);
    try {
      const response = await fetch('/api/contacts/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailData.fromEmail,
          name: emailData.fromName,
          emailBody: emailData.bodyText || emailData.bodyHtml,
          subject: emailData.subject,
        }),
      });

      const data = await response.json();
      
      if (data.success && data.enrichedData) {
        setFormData(prev => ({
          ...prev,
          ...data.enrichedData,
        }));
      }
    } catch (error) {
      console.error('AI enrichment failed:', error);
    } finally {
      setAiEnriching(false);
    }
  };

  const triggerBackgroundEnrichment = (contactId: string, emailData: any) => {
    // Fire and forget - enrichment happens in background
    fetch('/api/contacts/enrich-background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactId,
        email: emailData.fromEmail,
        name: emailData.fromName,
        emailBody: emailData.bodyText || emailData.bodyHtml,
        subject: emailData.subject,
      }),
    }).catch(error => {
      console.error('Background enrichment failed:', error);
    });

    console.log('🔄 Background enrichment triggered for contact:', contactId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validation: Need at least first OR last name
    const hasName = formData.firstName.trim() || formData.lastName.trim();
    
    // Validation: Need at least email OR phone
    const hasContact = formData.email.trim() || formData.phone.trim();

    // Check what's missing and build friendly error message
    const missing: string[] = [];
    
    if (!hasName) {
      missing.push('a first name or last name');
    }
    
    if (!hasContact) {
      missing.push('an email or phone number');
    }

    if (missing.length > 0) {
      const message = `Please provide ${missing.join(' and ')} to save this contact.`;
      setValidationError(message);
      return; // Don't submit
    }

    setLoading(true);

    try {
      const url = contact ? `/api/contacts/${contact.id}` : '/api/contacts';
      const method = contact ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setValidationError(null);
        
        // If this is a new contact from email, trigger background enrichment
        const isEnriching = !contact && email && data.contact?.id;
        if (isEnriching) {
          triggerBackgroundEnrichment(data.contact.id, email);
        }
        
        // Notify parent component
        onContactSaved?.(!!isEnriching);
        
        onClose();
      } else {
        setValidationError(data.error || 'Failed to save contact');
      }
    } catch (error) {
      console.error('Failed to save contact:', error);
      setValidationError('Failed to save contact. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">
              {contact ? 'Edit Contact' : 'Add Contact'}
            </DialogTitle>
            {!contact && email && (
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                <Sparkles className="h-4 w-4" />
                Enrichment will run in background
              </div>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Basic Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  First Name
                  <span className="text-muted-foreground text-xs ml-1">(or last name required)</span>
                </label>
                <Input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Last Name
                  <span className="text-muted-foreground text-xs ml-1">(or first name required)</span>
                </label>
                <Input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
                <span className="text-muted-foreground text-xs">(or phone required)</span>
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!!contact} // Can't change email when editing
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
                <span className="text-muted-foreground text-xs">(or email required)</span>
              </label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder={aiEnriching ? "AI searching..." : "+1 (555) 123-4567"}
              />
            </div>
          </div>

          {/* Validation Error Message */}
          {validationError && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                {validationError}
              </p>
            </div>
          )}

          {/* Professional Information */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building className="h-5 w-5" />
              Professional Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Company</label>
                <Input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder={aiEnriching ? "AI searching..." : ""}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Job Title</label>
                <Input
                  type="text"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  placeholder={aiEnriching ? "AI searching..." : ""}
                />
              </div>
            </div>
          </div>

          {/* Social & Web */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Social & Web
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                </label>
                <Input
                  type="url"
                  value={formData.linkedIn}
                  onChange={(e) => setFormData({ ...formData, linkedIn: e.target.value })}
                  placeholder={aiEnriching ? "AI searching LinkedIn..." : "https://linkedin.com/in/..."}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Twitter className="h-4 w-4" />
                  Twitter
                </label>
                <Input
                  type="url"
                  value={formData.twitter}
                  onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                  placeholder="https://twitter.com/..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Website</label>
                <Input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Tags
            </h3>
            <div className="flex gap-2">
              <Input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add tag (e.g., VIP, Work, Partner)"
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => removeTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Additional Info */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-lg font-semibold">Additional Information</h3>
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </label>
              <Input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder={aiEnriching ? "AI searching..." : "City, State/Country"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Notes</label>
              <textarea
                rows={4}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-background"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any notes about this contact..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {contact ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                contact ? 'Update Contact' : 'Create Contact'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
