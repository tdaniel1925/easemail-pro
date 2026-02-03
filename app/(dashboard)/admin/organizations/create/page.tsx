/**
 * Organization Onboarding Page
 * 
 * Comprehensive form for creating new organizations
 * Clean full-page layout matching the rules page design
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Users, 
  CreditCard,
  User,
  Globe,
  ArrowLeft,
  Check,
  FileText,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function CreateOrganizationPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    // Company Information
    name: '',
    slug: '',
    website: '',
    industry: '',
    companySize: '',
    description: '',

    // Business Address
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',

    // Primary Contact
    primaryContactName: '',
    primaryContactEmail: '',
    primaryContactPhone: '',
    primaryContactTitle: '',

    // Billing Contact
    billingContactName: '',
    billingContactEmail: '',
    billingContactPhone: '',
    sameAsPrimary: true,

    // Technical Contact
    techContactName: '',
    techContactEmail: '',
    techContactPhone: '',
    sameAsTech: false,

    // Subscription Details
    planType: 'team',
    maxSeats: 10,
    billingEmail: '',
    billingCycle: 'monthly',

    // Additional Information
    taxId: '',
    purchaseOrderNumber: '',
    notes: '',

    // Organization Owner (Step 6)
    ownerEmail: '',
    ownerFullName: '',
    ownerPhone: '',
    ownerTitle: '',
    sendWelcomeEmail: true,
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Auto-generate slug from name
      if (field === 'name') {
        updated.slug = generateSlug(value);
      }
      return updated;
    });
  };

  const steps = [
    { number: 1, title: 'Company Info', icon: Building2 },
    { number: 2, title: 'Address', icon: MapPin },
    { number: 3, title: 'Contacts', icon: Users },
    { number: 4, title: 'Billing', icon: CreditCard },
    { number: 5, title: 'Subscription', icon: Briefcase },
    { number: 6, title: 'Owner Setup', icon: User },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.slug) {
      setError('Organization name and slug are required');
      return;
    }

    if (!formData.ownerEmail || !formData.ownerFullName) {
      setError('Owner email and full name are required');
      setCurrentStep(6); // Navigate to owner setup step
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.ownerEmail)) {
      setError('Please enter a valid owner email address');
      setCurrentStep(6);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/admin/organizations?success=created');
      } else {
        setError(data.error || 'Failed to create organization');
      }
    } catch (error) {
      console.error('Error creating organization:', error);
      setError('An error occurred while creating the organization');
    } finally {
      setSaving(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 6) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  return (
    <div className="flex w-full h-full">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card p-4 overflow-y-auto flex-shrink-0">
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-3 text-foreground">New Organization</h2>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Organizations
          </button>
        </div>

        {/* Progress Steps */}
        <nav className="space-y-2">
          {steps.map((step) => {
            const Icon = step.icon;
            const isCompleted = step.number < currentStep;
            const isCurrent = step.number === currentStep;
            
            return (
              <button
                key={step.number}
                onClick={() => setCurrentStep(step.number)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative',
                  isCurrent
                    ? 'bg-primary text-primary-foreground'
                    : isCompleted
                    ? 'text-foreground hover:bg-accent'
                    : 'text-muted-foreground hover:bg-accent/50'
                )}
              >
                <div className={cn(
                  'flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium',
                  isCurrent
                    ? 'bg-primary-foreground text-primary'
                    : isCompleted
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {isCompleted ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    step.number
                  )}
                </div>
                <span className="flex-1 text-left">{step.title}</span>
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </nav>

        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Complete all steps to create your organization and start inviting team members.
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-4xl mx-auto p-8">
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Company Information */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Company Information
                  </CardTitle>
                  <CardDescription>
                    Basic details about the organization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Organization Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="Acme Corporation"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="slug">URL Slug *</Label>
                      <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(e) => updateField('slug', e.target.value)}
                        placeholder="acme-corp"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        /teams/{formData.slug || 'your-slug'}
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => updateField('website', e.target.value)}
                        placeholder="https://acme.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="industry">Industry</Label>
                      <Select
                        value={formData.industry}
                        onValueChange={(value) => updateField('industry', value)}
                      >
                        <SelectTrigger id="industry">
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technology">Technology</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="healthcare">Healthcare</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="manufacturing">Manufacturing</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="companySize">Company Size</Label>
                      <Select
                        value={formData.companySize}
                        onValueChange={(value) => updateField('companySize', value)}
                      >
                        <SelectTrigger id="companySize">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">1-10 employees</SelectItem>
                          <SelectItem value="11-50">11-50 employees</SelectItem>
                          <SelectItem value="51-200">51-200 employees</SelectItem>
                          <SelectItem value="201-500">201-500 employees</SelectItem>
                          <SelectItem value="501+">501+ employees</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      placeholder="Brief description of the organization..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Business Address */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Business Address
                  </CardTitle>
                  <CardDescription>
                    Physical address for the organization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="addressLine1">Address Line 1</Label>
                    <Input
                      id="addressLine1"
                      value={formData.addressLine1}
                      onChange={(e) => updateField('addressLine1', e.target.value)}
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div>
                    <Label htmlFor="addressLine2">Address Line 2</Label>
                    <Input
                      id="addressLine2"
                      value={formData.addressLine2}
                      onChange={(e) => updateField('addressLine2', e.target.value)}
                      placeholder="Suite 100 (optional)"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => updateField('city', e.target.value)}
                        placeholder="New York"
                      />
                    </div>

                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => updateField('state', e.target.value)}
                        placeholder="NY"
                      />
                    </div>

                    <div>
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) => updateField('zipCode', e.target.value)}
                        placeholder="10001"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => updateField('country', value)}
                    >
                      <SelectTrigger id="country">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="United States">United States</SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                        <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                        <SelectItem value="Australia">Australia</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Contact Information */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Primary Contact
                    </CardTitle>
                    <CardDescription>
                      Main point of contact for this organization
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="primaryContactName">Full Name</Label>
                        <Input
                          id="primaryContactName"
                          value={formData.primaryContactName}
                          onChange={(e) => updateField('primaryContactName', e.target.value)}
                          placeholder="John Smith"
                        />
                      </div>

                      <div>
                        <Label htmlFor="primaryContactTitle">Title</Label>
                        <Input
                          id="primaryContactTitle"
                          value={formData.primaryContactTitle}
                          onChange={(e) => updateField('primaryContactTitle', e.target.value)}
                          placeholder="CEO"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="primaryContactEmail">Email</Label>
                        <Input
                          id="primaryContactEmail"
                          type="email"
                          value={formData.primaryContactEmail}
                          onChange={(e) => updateField('primaryContactEmail', e.target.value)}
                          placeholder="john@acme.com"
                        />
                      </div>

                      <div>
                        <Label htmlFor="primaryContactPhone">Phone</Label>
                        <Input
                          id="primaryContactPhone"
                          type="tel"
                          value={formData.primaryContactPhone}
                          onChange={(e) => updateField('primaryContactPhone', e.target.value)}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Billing Contact
                    </CardTitle>
                    <CardDescription>
                      Contact for billing and invoices
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="sameAsPrimary"
                        checked={formData.sameAsPrimary}
                        onChange={(e) => updateField('sameAsPrimary', String(e.target.checked))}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="sameAsPrimary" className="cursor-pointer">
                        Same as primary contact
                      </Label>
                    </div>

                    {!formData.sameAsPrimary && (
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="billingContactName">Name</Label>
                          <Input
                            id="billingContactName"
                            value={formData.billingContactName}
                            onChange={(e) => updateField('billingContactName', e.target.value)}
                            placeholder="Jane Doe"
                          />
                        </div>

                        <div>
                          <Label htmlFor="billingContactEmail">Email</Label>
                          <Input
                            id="billingContactEmail"
                            type="email"
                            value={formData.billingContactEmail}
                            onChange={(e) => updateField('billingContactEmail', e.target.value)}
                            placeholder="billing@acme.com"
                          />
                        </div>

                        <div>
                          <Label htmlFor="billingContactPhone">Phone</Label>
                          <Input
                            id="billingContactPhone"
                            type="tel"
                            value={formData.billingContactPhone}
                            onChange={(e) => updateField('billingContactPhone', e.target.value)}
                            placeholder="+1 (555) 987-6543"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Technical Contact
                    </CardTitle>
                    <CardDescription>
                      Technical support and IT contact
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="techContactName">Name</Label>
                        <Input
                          id="techContactName"
                          value={formData.techContactName}
                          onChange={(e) => updateField('techContactName', e.target.value)}
                          placeholder="Tech Lead"
                        />
                      </div>

                      <div>
                        <Label htmlFor="techContactEmail">Email</Label>
                        <Input
                          id="techContactEmail"
                          type="email"
                          value={formData.techContactEmail}
                          onChange={(e) => updateField('techContactEmail', e.target.value)}
                          placeholder="tech@acme.com"
                        />
                      </div>

                      <div>
                        <Label htmlFor="techContactPhone">Phone</Label>
                        <Input
                          id="techContactPhone"
                          type="tel"
                          value={formData.techContactPhone}
                          onChange={(e) => updateField('techContactPhone', e.target.value)}
                          placeholder="+1 (555) 456-7890"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 4: Billing Information */}
            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Billing Information
                  </CardTitle>
                  <CardDescription>
                    Tax and payment details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="billingEmail">Billing Email</Label>
                    <Input
                      id="billingEmail"
                      type="email"
                      value={formData.billingEmail}
                      onChange={(e) => updateField('billingEmail', e.target.value)}
                      placeholder="billing@acme.com"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Invoices will be sent to this email
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="taxId">Tax ID / EIN</Label>
                      <Input
                        id="taxId"
                        value={formData.taxId}
                        onChange={(e) => updateField('taxId', e.target.value)}
                        placeholder="12-3456789"
                      />
                    </div>

                    <div>
                      <Label htmlFor="purchaseOrderNumber">Purchase Order Number</Label>
                      <Input
                        id="purchaseOrderNumber"
                        value={formData.purchaseOrderNumber}
                        onChange={(e) => updateField('purchaseOrderNumber', e.target.value)}
                        placeholder="PO-2024-001"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => updateField('notes', e.target.value)}
                      placeholder="Any special billing requirements or notes..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 5: Subscription */}
            {currentStep === 5 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Subscription Details
                  </CardTitle>
                  <CardDescription>
                    Choose a plan and configure seats
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="planType">Plan Type</Label>
                      <Select
                        value={formData.planType}
                        onValueChange={(value) => updateField('planType', value)}
                      >
                        <SelectTrigger id="planType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="team">Team (Up to 20 users)</SelectItem>
                          <SelectItem value="business">Business (Up to 50 users)</SelectItem>
                          <SelectItem value="enterprise">Enterprise (Unlimited)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="maxSeats">Maximum Seats</Label>
                      <Input
                        id="maxSeats"
                        type="number"
                        min="1"
                        value={formData.maxSeats}
                        onChange={(e) => updateField('maxSeats', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="billingCycle">Billing Cycle</Label>
                    <Select
                      value={formData.billingCycle}
                      onValueChange={(value) => updateField('billingCycle', value)}
                    >
                      <SelectTrigger id="billingCycle">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="annual">Annual (Save 20%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <h4 className="font-medium mb-2">Review</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Organization:</span>
                        <span className="font-medium">{formData.name || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Plan:</span>
                        <span className="font-medium capitalize">{formData.planType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Seats:</span>
                        <span className="font-medium">{formData.maxSeats}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Billing:</span>
                        <span className="font-medium capitalize">{formData.billingCycle}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 6: Owner Setup */}
            {currentStep === 6 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Organization Owner
                  </CardTitle>
                  <CardDescription>
                    Set up the primary owner account for this organization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg mb-4">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      <strong>Note:</strong> A user account will be automatically created for the organization owner.
                      They will receive an email with their login credentials and can access the organization admin dashboard immediately.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ownerEmail">Owner Email *</Label>
                      <Input
                        id="ownerEmail"
                        type="email"
                        value={formData.ownerEmail}
                        onChange={(e) => updateField('ownerEmail', e.target.value)}
                        placeholder="owner@acme.com"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        This email will be used for login
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="ownerFullName">Owner Full Name *</Label>
                      <Input
                        id="ownerFullName"
                        value={formData.ownerFullName}
                        onChange={(e) => updateField('ownerFullName', e.target.value)}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ownerPhone">Owner Phone</Label>
                      <Input
                        id="ownerPhone"
                        type="tel"
                        value={formData.ownerPhone}
                        onChange={(e) => updateField('ownerPhone', e.target.value)}
                        placeholder="+1 (555) 123-4567"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Optional - for account recovery
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="ownerTitle">Owner Title</Label>
                      <Input
                        id="ownerTitle"
                        value={formData.ownerTitle}
                        onChange={(e) => updateField('ownerTitle', e.target.value)}
                        placeholder="CEO, Founder, etc."
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="sendWelcomeEmail"
                        checked={formData.sendWelcomeEmail}
                        onChange={(e) => updateField('sendWelcomeEmail', e.target.checked ? 'true' : 'false')}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <Label htmlFor="sendWelcomeEmail" className="font-normal cursor-pointer">
                        Send welcome email with login credentials
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 ml-6">
                      Recommended - The owner will receive an email with their temporary password and setup instructions
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <h4 className="font-medium mb-3">Review Organization Setup</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Organization:</span>
                        <span className="font-medium">{formData.name || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Plan:</span>
                        <span className="font-medium capitalize">{formData.planType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Max Seats:</span>
                        <span className="font-medium">{formData.maxSeats}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Owner:</span>
                        <span className="font-medium">{formData.ownerFullName || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Owner Email:</span>
                        <span className="font-medium">{formData.ownerEmail || 'Not set'}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                Previous
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>

                {currentStep < 6 ? (
                  <Button type="button" onClick={nextStep}>
                    Next
                  </Button>
                ) : (
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Creating...' : 'Create Organization'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
