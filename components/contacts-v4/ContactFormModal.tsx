'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Loader2,
  User,
  Mail,
  Phone,
  Building,
  MapPin,
  Globe,
  Calendar,
  FileText,
  Tag as TagIcon,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import type {
  ContactV4,
  NylasEmail,
  NylasPhoneNumber,
  NylasPhysicalAddress,
  NylasWebPage,
  ContactFormData
} from '@/lib/types/contacts-v4';

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact?: ContactV4 | null;
  accountId: string;
  onSaved?: () => void;
}

export default function ContactFormModal({
  isOpen,
  onClose,
  contact,
  accountId,
  onSaved
}: ContactFormModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // Basic fields
  const [givenName, setGivenName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [surname, setSurname] = useState('');
  const [suffix, setSuffix] = useState('');
  const [nickname, setNickname] = useState('');

  // Contact methods
  const [emails, setEmails] = useState<NylasEmail[]>([{ type: 'work', email: '' }]);
  const [phones, setPhones] = useState<NylasPhoneNumber[]>([{ type: 'mobile', number: '' }]);

  // Professional
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [department, setDepartment] = useState('');
  const [officeLocation, setOfficeLocation] = useState('');
  const [managerName, setManagerName] = useState('');

  // Personal
  const [birthday, setBirthday] = useState('');
  const [notes, setNotes] = useState('');

  // Organization
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Addresses
  const [addresses, setAddresses] = useState<NylasPhysicalAddress[]>([]);

  // Web pages
  const [webPages, setWebPages] = useState<NylasWebPage[]>([]);

  // Load contact data when editing
  useEffect(() => {
    if (contact) {
      setGivenName(contact.given_name || '');
      setMiddleName(contact.middle_name || '');
      setSurname(contact.surname || '');
      setSuffix(contact.suffix || '');
      setNickname(contact.nickname || '');

      setEmails(contact.emails?.length > 0 ? contact.emails : [{ type: 'work', email: '' }]);
      setPhones(contact.phone_numbers?.length > 0 ? contact.phone_numbers : [{ type: 'mobile', number: '' }]);

      setJobTitle(contact.job_title || '');
      setCompanyName(contact.company_name || '');
      setDepartment(contact.department || '');
      setOfficeLocation(contact.office_location || '');
      setManagerName(contact.manager_name || '');

      setBirthday(contact.birthday ? new Date(contact.birthday).toISOString().split('T')[0] : '');
      setNotes(contact.notes || '');

      setTags(contact.tags || []);
      setAddresses(contact.physical_addresses || []);
      setWebPages(contact.web_pages || []);
    } else {
      // Reset form for new contact
      resetForm();
    }
  }, [contact, isOpen]);

  const resetForm = () => {
    setGivenName('');
    setMiddleName('');
    setSurname('');
    setSuffix('');
    setNickname('');
    setEmails([{ type: 'work', email: '' }]);
    setPhones([{ type: 'mobile', number: '' }]);
    setJobTitle('');
    setCompanyName('');
    setDepartment('');
    setOfficeLocation('');
    setManagerName('');
    setBirthday('');
    setNotes('');
    setTags([]);
    setTagInput('');
    setAddresses([]);
    setWebPages([]);
  };

  // Email handlers
  const addEmail = () => {
    setEmails([...emails, { type: 'work', email: '' }]);
  };

  const removeEmail = (index: number) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  const updateEmail = (index: number, field: keyof NylasEmail, value: string) => {
    const updated = [...emails];
    updated[index] = { ...updated[index], [field]: value };
    setEmails(updated);
  };

  // Phone handlers
  const addPhone = () => {
    setPhones([...phones, { type: 'mobile', number: '' }]);
  };

  const removePhone = (index: number) => {
    setPhones(phones.filter((_, i) => i !== index));
  };

  const updatePhone = (index: number, field: keyof NylasPhoneNumber, value: string) => {
    const updated = [...phones];
    updated[index] = { ...updated[index], [field]: value };
    setPhones(updated);
  };

  // Address handlers
  const addAddress = () => {
    setAddresses([...addresses, {
      type: 'work',
      street_address: '',
      city: '',
      state: '',
      postal_code: '',
      country: ''
    }]);
  };

  const removeAddress = (index: number) => {
    setAddresses(addresses.filter((_, i) => i !== index));
  };

  const updateAddress = (index: number, field: keyof NylasPhysicalAddress, value: string) => {
    const updated = [...addresses];
    updated[index] = { ...updated[index], [field]: value };
    setAddresses(updated);
  };

  // Web page handlers
  const addWebPage = () => {
    setWebPages([...webPages, { type: 'homepage', url: '' }]);
  };

  const removeWebPage = (index: number) => {
    setWebPages(webPages.filter((_, i) => i !== index));
  };

  const updateWebPage = (index: number, field: keyof NylasWebPage, value: string) => {
    const updated = [...webPages];
    updated[index] = { ...updated[index], [field]: value };
    setWebPages(updated);
  };

  // Tag handlers
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  // Validation
  const validate = (): string | null => {
    // At least one email or phone is required
    const hasEmail = emails.some(e => e.email.trim() !== '');
    const hasPhone = phones.some(p => p.number.trim() !== '');

    if (!hasEmail && !hasPhone) {
      return 'At least one email address or phone number is required';
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of emails) {
      if (email.email.trim() && !emailRegex.test(email.email)) {
        return `Invalid email format: ${email.email}`;
      }
    }

    // At least first name or last name required
    if (!givenName.trim() && !surname.trim()) {
      return 'First name or last name is required';
    }

    return null;
  };

  // Save handler
  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      toast({
        title: 'Validation Error',
        description: validationError,
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      // Filter out empty emails and phones
      const validEmails = emails.filter(e => e.email.trim() !== '');
      const validPhones = phones.filter(p => p.number.trim() !== '');
      const validAddresses = addresses.filter(a =>
        a.street_address || a.city || a.state || a.postal_code || a.country
      );
      const validWebPages = webPages.filter(w => w.url.trim() !== '');

      const contactData = {
        given_name: givenName.trim() || undefined,
        middle_name: middleName.trim() || undefined,
        surname: surname.trim() || undefined,
        suffix: suffix.trim() || undefined,
        nickname: nickname.trim() || undefined,
        emails: validEmails,
        phone_numbers: validPhones,
        physical_addresses: validAddresses,
        web_pages: validWebPages,
        job_title: jobTitle.trim() || undefined,
        company_name: companyName.trim() || undefined,
        department: department.trim() || undefined,
        office_location: officeLocation.trim() || undefined,
        manager_name: managerName.trim() || undefined,
        birthday: birthday || undefined,
        notes: notes.trim() || undefined,
        tags: tags,
      };

      let response;

      if (contact) {
        // Update existing contact
        response = await fetch(`/api/contacts-v4/${contact.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            updates: contactData,
            sync_immediately: true
          }),
        });
      } else {
        // Create new contact
        response = await fetch('/api/contacts-v4', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            account_id: accountId,
            contact: contactData,
            sync_immediately: true
          }),
        });
      }

      const data = await response.json();

      if (data.success) {
        toast({
          title: contact ? 'Contact updated' : 'Contact created',
          description: contact ? 'Contact has been updated successfully' : 'New contact has been created',
        });
        onSaved?.();
        onClose();
      } else {
        throw new Error(data.error || 'Failed to save contact');
      }
    } catch (error) {
      console.error('Failed to save contact:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save contact',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-2xl">
            {contact ? 'Edit Contact' : 'Add New Contact'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="professional">Professional</TabsTrigger>
            <TabsTrigger value="additional">Additional</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-6">
            {/* BASIC TAB */}
            <TabsContent value="basic" className="space-y-6 mt-0">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Name Information
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="givenName">First Name</Label>
                    <Input
                      id="givenName"
                      value={givenName}
                      onChange={(e) => setGivenName(e.target.value)}
                      placeholder="John"
                    />
                  </div>

                  <div>
                    <Label htmlFor="surname">Last Name</Label>
                    <Input
                      id="surname"
                      value={surname}
                      onChange={(e) => setSurname(e.target.value)}
                      placeholder="Doe"
                    />
                  </div>

                  <div>
                    <Label htmlFor="middleName">Middle Name</Label>
                    <Input
                      id="middleName"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      placeholder="Michael"
                    />
                  </div>

                  <div>
                    <Label htmlFor="suffix">Suffix</Label>
                    <Input
                      id="suffix"
                      value={suffix}
                      onChange={(e) => setSuffix(e.target.value)}
                      placeholder="Jr., Sr., III"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="nickname">Nickname</Label>
                    <Input
                      id="nickname"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="Johnny"
                    />
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <TagIcon className="h-5 w-5" />
                  Tags
                </h3>

                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder="Add a tag..."
                  />
                  <Button type="button" onClick={addTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* CONTACT TAB */}
            <TabsContent value="contact" className="space-y-6 mt-0">
              {/* Emails */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Addresses
                  </h3>
                  <Button type="button" variant="outline" size="sm" onClick={addEmail}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Email
                  </Button>
                </div>

                <div className="space-y-3">
                  {emails.map((email, index) => (
                    <div key={index} className="flex gap-2">
                      <select
                        className="h-10 px-3 rounded-md border border-input bg-background w-32"
                        value={email.type}
                        onChange={(e) => updateEmail(index, 'type', e.target.value)}
                      >
                        <option value="work">Work</option>
                        <option value="personal">Personal</option>
                        <option value="other">Other</option>
                      </select>
                      <Input
                        type="email"
                        value={email.email}
                        onChange={(e) => updateEmail(index, 'email', e.target.value)}
                        placeholder="john@example.com"
                        className="flex-1"
                      />
                      {emails.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeEmail(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Phone Numbers */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Phone Numbers
                  </h3>
                  <Button type="button" variant="outline" size="sm" onClick={addPhone}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Phone
                  </Button>
                </div>

                <div className="space-y-3">
                  {phones.map((phone, index) => (
                    <div key={index} className="flex gap-2">
                      <select
                        className="h-10 px-3 rounded-md border border-input bg-background w-32"
                        value={phone.type}
                        onChange={(e) => updatePhone(index, 'type', e.target.value)}
                      >
                        <option value="mobile">Mobile</option>
                        <option value="work">Work</option>
                        <option value="home">Home</option>
                        <option value="fax">Fax</option>
                        <option value="pager">Pager</option>
                        <option value="other">Other</option>
                      </select>
                      <Input
                        type="tel"
                        value={phone.number}
                        onChange={(e) => updatePhone(index, 'number', e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        className="flex-1"
                      />
                      {phones.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removePhone(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Web Pages */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Web Pages
                  </h3>
                  <Button type="button" variant="outline" size="sm" onClick={addWebPage}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add URL
                  </Button>
                </div>

                {webPages.length > 0 && (
                  <div className="space-y-3">
                    {webPages.map((page, index) => (
                      <div key={index} className="flex gap-2">
                        <select
                          className="h-10 px-3 rounded-md border border-input bg-background w-32"
                          value={page.type}
                          onChange={(e) => updateWebPage(index, 'type', e.target.value)}
                        >
                          <option value="homepage">Homepage</option>
                          <option value="profile">Profile</option>
                          <option value="blog">Blog</option>
                          <option value="other">Other</option>
                        </select>
                        <Input
                          type="url"
                          value={page.url}
                          onChange={(e) => updateWebPage(index, 'url', e.target.value)}
                          placeholder="https://example.com"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeWebPage(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* PROFESSIONAL TAB */}
            <TabsContent value="professional" className="space-y-6 mt-0">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Professional Information
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input
                      id="jobTitle"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="Software Engineer"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="companyName">Company</Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Acme Inc."
                    />
                  </div>

                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Engineering"
                    />
                  </div>

                  <div>
                    <Label htmlFor="officeLocation">Office Location</Label>
                    <Input
                      id="officeLocation"
                      value={officeLocation}
                      onChange={(e) => setOfficeLocation(e.target.value)}
                      placeholder="Building A, Floor 3"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="managerName">Manager</Label>
                    <Input
                      id="managerName"
                      value={managerName}
                      onChange={(e) => setManagerName(e.target.value)}
                      placeholder="Jane Smith"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ADDITIONAL TAB */}
            <TabsContent value="additional" className="space-y-6 mt-0">
              {/* Addresses */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Addresses
                  </h3>
                  <Button type="button" variant="outline" size="sm" onClick={addAddress}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Address
                  </Button>
                </div>

                {addresses.length > 0 && (
                  <div className="space-y-4">
                    {addresses.map((address, index) => (
                      <div key={index} className="p-4 border border-border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <select
                            className="h-10 px-3 rounded-md border border-input bg-background w-32"
                            value={address.type}
                            onChange={(e) => updateAddress(index, 'type', e.target.value)}
                          >
                            <option value="work">Work</option>
                            <option value="home">Home</option>
                            <option value="other">Other</option>
                          </select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeAddress(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>

                        <Input
                          value={address.street_address || ''}
                          onChange={(e) => updateAddress(index, 'street_address', e.target.value)}
                          placeholder="Street Address"
                        />

                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            value={address.city || ''}
                            onChange={(e) => updateAddress(index, 'city', e.target.value)}
                            placeholder="City"
                          />
                          <Input
                            value={address.state || ''}
                            onChange={(e) => updateAddress(index, 'state', e.target.value)}
                            placeholder="State/Province"
                          />
                          <Input
                            value={address.postal_code || ''}
                            onChange={(e) => updateAddress(index, 'postal_code', e.target.value)}
                            placeholder="Postal Code"
                          />
                          <Input
                            value={address.country || ''}
                            onChange={(e) => updateAddress(index, 'country', e.target.value)}
                            placeholder="Country"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Personal */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Personal
                </h3>

                <div>
                  <Label htmlFor="birthday">Birthday</Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </h3>

                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes about this contact..."
                  rows={5}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer Actions */}
        <div className="border-t pt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {contact ? 'Changes will be synced to your email provider' : 'Contact will be synced to your email provider'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                contact ? 'Update Contact' : 'Create Contact'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
