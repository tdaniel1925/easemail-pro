/**
 * Organization Onboarding Page
 * 
 * Comprehensive form for creating new organizations
 * Replaces the simple modal with a full business onboarding process
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
      if (field === 'name' && !prev.slug) {
        updated.slug = generateSlug(value);
      }
      
      // Copy primary contact to billing if sameAsPrimary
      if (field.startsWith('primaryContact') && prev.sameAsPrimary) {
        if (field === 'primaryContactName') updated.billingContactName = value;
        if (field === 'primaryContactEmail') {
          updated.billingContactEmail = value;
          updated.billingEmail = value;
        }
        if (field === 'primaryContactPhone') updated.billingContactPhone = value;
      }
      
      return updated;
    });
  };

  const toggleSameAsPrimary = () => {
    setFormData(prev => {
      const sameAsPrimary = !prev.sameAsPrimary;
      if (sameAsPrimary) {
        return {
          ...prev,
          sameAsPrimary,
          billingContactName: prev.primaryContactName,
          billingContactEmail: prev.primaryContactEmail,
          billingContactPhone: prev.primaryContactPhone,
          billingEmail: prev.primaryContactEmail,
        };
      } else {
        return { ...prev, sameAsPrimary };
      }
    });
  };

  const toggleSameAsTech = () => {
    setFormData(prev => {
      const sameAsTech = !prev.sameAsTech;
      if (sameAsTech) {
        return {
          ...prev,
          sameAsTech,
          techContactName: prev.primaryContactName,
          techContactEmail: prev.primaryContactEmail,
          techContactPhone: prev.primaryContactPhone,
        };
      } else {
        return { ...prev, sameAsTech };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const response = await fetch('/api/admin/organizations/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create organization');
        setSaving(false);
        return;
      }

      // Success - redirect to organizations list
      router.push('/admin/organizations?success=created');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setSaving(false);
    }
  };

  const steps = [
    { id: 1, name: 'Company Info', icon: Building2 },
    { id: 2, name: 'Address', icon: MapPin },
    { id: 3, name: 'Contacts', icon: User },
    { id: 4, name: 'Billing', icon: CreditCard },
    { id: 5, name: 'Subscription', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">New Organization Onboarding</h1>
                <p className="text-sm text-muted-foreground">Complete business setup</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <nav aria-label="Progress">
            <ol className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isComplete = currentStep > step.id;
                const isCurrent = currentStep === step.id;
                
                return (
                  <li key={step.id} className="relative flex-1">
                    {/* Line */}
                    {index !== steps.length - 1 && (
                      <div
                        className={cn(
                          'absolute left-[calc(50%+2rem)] right-[-50%] top-5 h-0.5',
                          isComplete ? 'bg-primary' : 'bg-border'
                        )}
                      />
                    )}
                    
                    {/* Step */}
                    <div className="relative flex flex-col items-center group">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                          isComplete
                            ? 'bg-primary border-primary text-primary-foreground'
                            : isCurrent
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'bg-background border-border text-muted-foreground'
                        )}
                      >
                        {isComplete ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </div>
                      <span
                        className={cn(
                          'mt-2 text-xs font-medium',
                          isCurrent ? 'text-primary' : 'text-muted-foreground'
                        )}
                      >
                        {step.name}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Company Information */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>
                  Basic details about the organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="name">Organization Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="Acme Corporation"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="slug">URL Slug *</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => updateField('slug', generateSlug(e.target.value))}
                      placeholder="acme-corp"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Used in URLs: /teams/{formData.slug || 'your-slug'}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="website">Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => updateField('website', e.target.value)}
                        placeholder="https://acme.com"
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="industry">Industry</Label>
                    <Select
                      value={formData.industry}
                      onValueChange={(value) => updateField('industry', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="services">Professional Services</SelectItem>
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
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1-10 employees</SelectItem>
                        <SelectItem value="11-50">11-50 employees</SelectItem>
                        <SelectItem value="51-200">51-200 employees</SelectItem>
                        <SelectItem value="201-500">201-500 employees</SelectItem>
                        <SelectItem value="501-1000">501-1000 employees</SelectItem>
                        <SelectItem value="1000+">1000+ employees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      placeholder="Brief description of the organization..."
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Business Address */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Business Address</CardTitle>
                <CardDescription>
                  Physical location of the organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="addressLine1">Address Line 1 *</Label>
                    <Input
                      id="addressLine1"
                      value={formData.addressLine1}
                      onChange={(e) => updateField('addressLine1', e.target.value)}
                      placeholder="123 Main Street"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="addressLine2">Address Line 2</Label>
                    <Input
                      id="addressLine2"
                      value={formData.addressLine2}
                      onChange={(e) => updateField('addressLine2', e.target.value)}
                      placeholder="Suite 100"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => updateField('city', e.target.value)}
                        placeholder="San Francisco"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="state">State/Province *</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => updateField('state', e.target.value)}
                        placeholder="CA"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="zipCode">ZIP/Postal Code *</Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) => updateField('zipCode', e.target.value)}
                        placeholder="94105"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="country">Country *</Label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => updateField('country', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="United States">United States</SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                        <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                        <SelectItem value="Australia">Australia</SelectItem>
                        <SelectItem value="Germany">Germany</SelectItem>
                        <SelectItem value="France">France</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Contacts */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Primary Contact */}
              <Card>
                <CardHeader>
                  <CardTitle>Primary Contact</CardTitle>
                  <CardDescription>
                    Main point of contact for this organization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="primaryContactName">Full Name *</Label>
                      <Input
                        id="primaryContactName"
                        value={formData.primaryContactName}
                        onChange={(e) => updateField('primaryContactName', e.target.value)}
                        placeholder="John Doe"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="primaryContactTitle">Title *</Label>
                      <Input
                        id="primaryContactTitle"
                        value={formData.primaryContactTitle}
                        onChange={(e) => updateField('primaryContactTitle', e.target.value)}
                        placeholder="CEO"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="primaryContactEmail">Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="primaryContactEmail"
                          type="email"
                          value={formData.primaryContactEmail}
                          onChange={(e) => updateField('primaryContactEmail', e.target.value)}
                          placeholder="john@acme.com"
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="primaryContactPhone">Phone *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="primaryContactPhone"
                          type="tel"
                          value={formData.primaryContactPhone}
                          onChange={(e) => updateField('primaryContactPhone', e.target.value)}
                          placeholder="+1 (555) 123-4567"
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Technical Contact */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Technical Contact</CardTitle>
                      <CardDescription>
                        IT or technical point of contact
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={toggleSameAsTech}
                    >
                      {formData.sameAsTech ? 'Use Different' : 'Same as Primary'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!formData.sameAsTech && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor="techContactName">Full Name *</Label>
                        <Input
                          id="techContactName"
                          value={formData.techContactName}
                          onChange={(e) => updateField('techContactName', e.target.value)}
                          placeholder="Jane Smith"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="techContactEmail">Email *</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="techContactEmail"
                            type="email"
                            value={formData.techContactEmail}
                            onChange={(e) => updateField('techContactEmail', e.target.value)}
                            placeholder="jane@acme.com"
                            className="pl-9"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="techContactPhone">Phone *</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="techContactPhone"
                            type="tel"
                            value={formData.techContactPhone}
                            onChange={(e) => updateField('techContactPhone', e.target.value)}
                            placeholder="+1 (555) 123-4567"
                            className="pl-9"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  {formData.sameAsTech && (
                    <p className="text-sm text-muted-foreground">
                      Using primary contact as technical contact
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 4: Billing Contact */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Billing Contact</CardTitle>
                    <CardDescription>
                      Contact for billing and invoicing matters
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleSameAsPrimary}
                  >
                    {formData.sameAsPrimary ? 'Use Different' : 'Same as Primary'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!formData.sameAsPrimary && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="billingContactName">Full Name *</Label>
                      <Input
                        id="billingContactName"
                        value={formData.billingContactName}
                        onChange={(e) => updateField('billingContactName', e.target.value)}
                        placeholder="Sarah Johnson"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="billingContactEmail">Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="billingContactEmail"
                          type="email"
                          value={formData.billingContactEmail}
                          onChange={(e) => updateField('billingContactEmail', e.target.value)}
                          placeholder="billing@acme.com"
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="billingContactPhone">Phone *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="billingContactPhone"
                          type="tel"
                          value={formData.billingContactPhone}
                          onChange={(e) => updateField('billingContactPhone', e.target.value)}
                          placeholder="+1 (555) 123-4567"
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}
                {formData.sameAsPrimary && (
                  <p className="text-sm text-muted-foreground">
                    Using primary contact for billing
                  </p>
                )}

                <div className="space-y-4 pt-4 border-t border-border">
                  <div>
                    <Label htmlFor="billingEmail">Billing Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="billingEmail"
                        type="email"
                        value={formData.billingEmail}
                        onChange={(e) => updateField('billingEmail', e.target.value)}
                        placeholder="billing@acme.com"
                        className="pl-9"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Invoices will be sent to this email
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="taxId">Tax ID / VAT Number</Label>
                      <Input
                        id="taxId"
                        value={formData.taxId}
                        onChange={(e) => updateField('taxId', e.target.value)}
                        placeholder="XX-XXXXXXX"
                      />
                    </div>

                    <div>
                      <Label htmlFor="purchaseOrderNumber">Purchase Order Number</Label>
                      <Input
                        id="purchaseOrderNumber"
                        value={formData.purchaseOrderNumber}
                        onChange={(e) => updateField('purchaseOrderNumber', e.target.value)}
                        placeholder="PO-123456"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Subscription */}
          {currentStep === 5 && (
            <Card>
              <CardHeader>
                <CardTitle>Subscription Plan</CardTitle>
                <CardDescription>
                  Select the plan tier and maximum users for this organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="planType">Plan Type *</Label>
                    <Select
                      value={formData.planType}
                      onValueChange={(value) => updateField('planType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free (1 user) - $0/month</SelectItem>
                        <SelectItem value="individual">Individual (1 user) - $45/month</SelectItem>
                        <SelectItem value="team">Team (2-10 users) - $40.50/user/month</SelectItem>
                        <SelectItem value="enterprise">Enterprise (10+ users) - $36.45/user/month</SelectItem>
                        <SelectItem value="custom">Custom - Contact for pricing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="maxSeats">Maximum Seats *</Label>
                    <Input
                      id="maxSeats"
                      type="number"
                      min="1"
                      value={formData.maxSeats}
                      onChange={(e) => updateField('maxSeats', e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum number of users allowed for this organization
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="billingCycle">Billing Cycle *</Label>
                    <Select
                      value={formData.billingCycle}
                      onValueChange={(value) => updateField('billingCycle', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="annual">Annual (Save 20%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => updateField('notes', e.target.value)}
                      placeholder="Any special requirements or notes..."
                      rows={4}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Card className="border-red-500 bg-red-50">
              <CardContent className="pt-6">
                <p className="text-sm text-red-800">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1 || saving}
            >
              Previous
            </Button>

            {currentStep < 5 ? (
              <Button
                type="button"
                onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
                disabled={saving}
              >
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={saving}>
                {saving ? 'Creating Organization...' : 'Create Organization'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

