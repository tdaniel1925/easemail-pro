'use client';

import { useState, useEffect } from 'react';
import { Plus, Mail, Settings, History, Send, Eye, EyeOff, Code, Edit2, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface EmailTemplate {
  id: string;
  templateKey: string;
  name: string;
  description: string | null;
  subjectTemplate: string;
  htmlTemplate: string;
  category: string;
  triggerEvent: string | null;
  requiredVariables: string[];
  version: number;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    fullName: string | null;
    email: string;
  };
  updater?: {
    id: string;
    fullName: string | null;
    email: string;
  };
}

interface TemplateVersion {
  id: string;
  version: number;
  subjectTemplate: string;
  htmlTemplate: string;
  changeNotes: string | null;
  createdAt: string;
  creator?: {
    id: string;
    fullName: string | null;
    email: string;
  };
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showCode, setShowCode] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subjectTemplate: '',
    htmlTemplate: '',
    category: 'general',
    triggerEvent: '',
    requiredVariables: [] as string[],
    changeNotes: '',
  });

  // Test email state
  const [testEmail, setTestEmail] = useState('');
  const [testData, setTestData] = useState<Record<string, string>>({});
  const [isSendingTest, setIsSendingTest] = useState(false);

  const { toast } = useToast();
  const { confirm, Dialog: ConfirmDialog } = useConfirm();

  // Fetch templates
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/admin/email-templates');
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch templates',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch email templates',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch template details with versions
  const fetchTemplateDetails = async (templateId: string) => {
    try {
      const response = await fetch(`/api/admin/email-templates/${templateId}`);
      const data = await response.json();
      if (data.success) {
        setSelectedTemplate(data.template);
        setVersions(data.template.versions || []);
        
        // Initialize form with template data
        setFormData({
          name: data.template.name,
          description: data.template.description || '',
          subjectTemplate: data.template.subjectTemplate,
          htmlTemplate: data.template.htmlTemplate,
          category: data.template.category,
          triggerEvent: data.template.triggerEvent || '',
          requiredVariables: data.template.requiredVariables || [],
          changeNotes: '',
        });

        // Initialize test data with placeholders
        const testDataInit: Record<string, string> = {};
        (data.template.requiredVariables || []).forEach((variable: string) => {
          testDataInit[variable] = `[${variable}]`;
        });
        setTestData(testDataInit);
      }
    } catch (error) {
      console.error('Error fetching template details:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch template details',
        variant: 'destructive',
      });
    }
  };

  // Handle template selection
  const handleSelectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsEditing(false);
    fetchTemplateDetails(template.id);
  };

  // Handle save changes
  const handleSave = async () => {
    if (!selectedTemplate) return;

    try {
      const response = await fetch(`/api/admin/email-templates/${selectedTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Template updated successfully',
        });
        setIsEditing(false);
        fetchTemplates();
        fetchTemplateDetails(selectedTemplate.id);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update template',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: 'Error',
        description: 'Failed to update template',
        variant: 'destructive',
      });
    }
  };

  // Handle delete
  const handleDelete = async (templateId: string) => {
    const confirmed = await confirm({
      title: 'Delete Template',
      message: 'Are you sure you want to delete this email template? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/email-templates/${templateId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Template deleted successfully',
        });
        setSelectedTemplate(null);
        fetchTemplates();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete template',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      });
    }
  };

  // Handle test email send
  const handleSendTest = async () => {
    if (!selectedTemplate || !testEmail) {
      toast({
        title: 'Error',
        description: 'Please enter a test email address',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingTest(true);

    try {
      const response = await fetch(`/api/admin/email-templates/${selectedTemplate.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail, testData }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: `Test email sent to ${testEmail}`,
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to send test email',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        title: 'Error',
        description: 'Failed to send test email',
        variant: 'destructive',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Render preview
  const renderPreview = () => {
    let subject = formData.subjectTemplate;
    let html = formData.htmlTemplate;

    // Replace variables
    Object.keys(testData).forEach(key => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      subject = subject.replace(regex, testData[key] || '');
      html = html.replace(regex, testData[key] || '');
    });

    return (
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Subject Preview</Label>
          <div className="mt-1 p-3 bg-muted rounded-lg font-medium">{subject}</div>
        </div>
        <div>
          <Label className="text-sm font-medium text-muted-foreground">HTML Preview</Label>
          <div className="mt-1 border border-border rounded-lg overflow-hidden">
            <iframe
              srcDoc={html}
              title="Email Preview"
              className="w-full h-[600px] bg-white"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar - Template List */}
      <aside className="w-80 border-r border-border bg-muted/30 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border bg-background">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              Email Templates
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Manage and customize email templates
          </p>
        </div>

        {/* Template List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {templates.map((template) => (
            <Card
              key={template.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                selectedTemplate?.id === template.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => handleSelectTemplate(template)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm">{template.name}</h3>
                <Badge variant={template.isActive ? 'default' : 'secondary'} className="text-xs">
                  {template.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{template.description}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono bg-muted px-2 py-1 rounded">{template.templateKey}</span>
                <span>v{template.version}</span>
              </div>
              {template.isDefault && (
                <Badge variant="outline" className="mt-2 text-xs">System Default</Badge>
              )}
            </Card>
          ))}
        </div>
      </aside>

      {/* Main Content - Template Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedTemplate ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-border bg-background flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{selectedTemplate.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedTemplate.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    {!selectedTemplate.isDefault && (
                      <Button
                        variant="outline"
                        onClick={() => handleDelete(selectedTemplate.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        fetchTemplateDetails(selectedTemplate.id);
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button onClick={handleSave}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column - Editor */}
                <div className="space-y-6">
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Template Content</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="subject">Subject Template</Label>
                        <Input
                          id="subject"
                          value={formData.subjectTemplate}
                          onChange={(e) => setFormData({ ...formData, subjectTemplate: e.target.value })}
                          disabled={!isEditing}
                          className="font-mono"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label htmlFor="html">HTML Template</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowCode(!showCode)}
                          >
                            <Code className="h-4 w-4 mr-2" />
                            {showCode ? 'Hide Code' : 'Show Code'}
                          </Button>
                        </div>
                        {showCode && (
                          <Textarea
                            id="html"
                            value={formData.htmlTemplate}
                            onChange={(e) => setFormData({ ...formData, htmlTemplate: e.target.value })}
                            disabled={!isEditing}
                            className="font-mono min-h-[400px]"
                          />
                        )}
                      </div>

                      {isEditing && (
                        <div>
                          <Label htmlFor="changeNotes">Change Notes</Label>
                          <Input
                            id="changeNotes"
                            value={formData.changeNotes}
                            onChange={(e) => setFormData({ ...formData, changeNotes: e.target.value })}
                            placeholder="Describe what you changed..."
                          />
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Test Variables */}
                  {selectedTemplate.requiredVariables && selectedTemplate.requiredVariables.length > 0 && (
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">Test Variables</h3>
                      <div className="space-y-3">
                        {selectedTemplate.requiredVariables.map((variable) => (
                          <div key={variable}>
                            <Label htmlFor={`var-${variable}`} className="font-mono text-xs">
                              {`{{${variable}}}`}
                            </Label>
                            <Input
                              id={`var-${variable}`}
                              value={testData[variable] || ''}
                              onChange={(e) => setTestData({ ...testData, [variable]: e.target.value })}
                              placeholder={`Enter ${variable}...`}
                            />
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Test Email */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Send Test Email</h3>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="testEmail">Test Email Address</Label>
                        <Input
                          id="testEmail"
                          type="email"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          placeholder="you@example.com"
                        />
                      </div>
                      <Button
                        onClick={handleSendTest}
                        disabled={isSendingTest || !testEmail}
                        className="w-full"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {isSendingTest ? 'Sending...' : 'Send Test Email'}
                      </Button>
                    </div>
                  </Card>
                </div>

                {/* Right Column - Preview */}
                <div className="space-y-6">
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Live Preview</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                      >
                        {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {showPreview && renderPreview()}
                  </Card>

                  {/* Version History */}
                  {versions.length > 0 && (
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Version History
                      </h3>
                      <div className="space-y-3">
                        {versions.slice(0, 5).map((version) => (
                          <div
                            key={version.id}
                            className="p-3 bg-muted rounded-lg text-sm"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold">v{version.version}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(version.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            {version.changeNotes && (
                              <p className="text-xs text-muted-foreground">{version.changeNotes}</p>
                            )}
                            {version.creator && (
                              <p className="text-xs text-muted-foreground mt-1">
                                by {version.creator.fullName || version.creator.email}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Mail className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a template to get started</p>
              <p className="text-sm">Choose from the list on the left to view and edit</p>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog />
    </div>
  );
}

