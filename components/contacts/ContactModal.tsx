'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Sparkles, Mail, Phone, Building, MapPin, Linkedin, Globe, User, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
}

export default function ContactModal({ isOpen, onClose, email }: ContactModalProps) {
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
  });

  // Pre-populate email data when modal opens
  useEffect(() => {
    if (email && isOpen) {
      const nameParts = (email.fromName || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      setFormData(prev => ({
        ...prev,
        email: email.fromEmail || '',
        firstName,
        lastName,
      }));
      
      // Auto-trigger AI enrichment
      enrichContactWithAI(email);
    }
  }, [email, isOpen]);

  const enrichContactWithAI = async (emailData: any) => {
    setAiEnriching(true);
    try {
      // Call AI enrichment API
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Reset form and close
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
        });
        onClose();
      }
    } catch (error) {
      console.error('Failed to create contact:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">Add Contact</DialogTitle>
            {aiEnriching && (
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                <Sparkles className="h-4 w-4 animate-pulse" />
                AI enriching contact info...
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
                <label className="block text-sm font-medium mb-2">First Name *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-background"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Last Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-background"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email *
              </label>
              <input
                type="email"
                required
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-muted"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </label>
              <input
                type="tel"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-background"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder={aiEnriching ? "AI searching..." : ""}
              />
            </div>
          </div>

          {/* Professional Information */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building className="h-5 w-5" />
              Professional Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Company</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-background"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder={aiEnriching ? "AI searching..." : ""}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Job Title</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-background"
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
                <input
                  type="url"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-background"
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
                <input
                  type="url"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-background"
                  value={formData.twitter}
                  onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                  placeholder="https://twitter.com/..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Website</label>
                <input
                  type="url"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-background"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-lg font-semibold">Additional Information</h3>
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Address
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-background"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder={aiEnriching ? "AI searching..." : ""}
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
            <Button type="submit" disabled={loading || aiEnriching}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Contact'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

