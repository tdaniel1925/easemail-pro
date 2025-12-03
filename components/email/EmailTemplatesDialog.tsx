'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Plus,
  Search,
  Loader2,
  Trash2,
  Edit,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmailTemplate {
  id: string;
  name: string;
  subject?: string;
  bodyHtml?: string;
  bodyText?: string;
  category?: string;
  usageCount?: number;
  lastUsedAt?: string;
}

interface EmailTemplatesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: EmailTemplate) => void;
  mode?: 'select' | 'manage';
}

export function EmailTemplatesDialog({
  isOpen,
  onClose,
  onSelectTemplate,
  mode = 'select',
}: EmailTemplatesDialogProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // New template form state
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    subject: '',
    bodyText: '',
    category: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/email/templates');
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/email/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate),
      });

      const data = await response.json();
      if (data.success) {
        setTemplates([data.template, ...templates]);
        setNewTemplate({ name: '', subject: '', bodyText: '', category: '' });
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Failed to create template:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/email/templates/${editingTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTemplate),
      });

      const data = await response.json();
      if (data.success) {
        setTemplates(templates.map(t =>
          t.id === editingTemplate.id ? data.template : t
        ));
        setEditingTemplate(null);
      }
    } catch (error) {
      console.error('Failed to update template:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const response = await fetch(`/api/email/templates/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTemplates(templates.filter(t => t.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleSelectTemplate = async (template: EmailTemplate) => {
    // Update usage count
    try {
      await fetch(`/api/email/templates/${template.id}/use`, {
        method: 'POST',
      });
    } catch (error) {
      // Ignore error
    }

    onSelectTemplate(template);
    onClose();
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Email Templates
          </DialogTitle>
          <DialogDescription>
            {mode === 'select'
              ? 'Select a template to use in your email'
              : 'Manage your email templates'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Create */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </div>

          {/* Create Template Form */}
          {isCreating && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Follow-up Email"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="subject">Subject Line</Label>
                  <Input
                    id="subject"
                    placeholder="e.g., Following up on our conversation"
                    value={newTemplate.subject}
                    onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="body">Email Body</Label>
                  <Textarea
                    id="body"
                    placeholder="Type your template content..."
                    rows={5}
                    value={newTemplate.bodyText}
                    onChange={(e) => setNewTemplate({ ...newTemplate, bodyText: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category (optional)</Label>
                  <Input
                    id="category"
                    placeholder="e.g., Sales, Support, Personal"
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsCreating(false);
                    setNewTemplate({ name: '', subject: '', bodyText: '', category: '' });
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateTemplate}
                  disabled={!newTemplate.name.trim() || isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Save Template
                </Button>
              </div>
            </div>
          )}

          {/* Templates List */}
          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery
                  ? 'No templates match your search'
                  : 'No templates yet. Create one to get started!'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={cn(
                      'border rounded-lg p-3 transition-colors',
                      editingTemplate?.id === template.id
                        ? 'bg-muted'
                        : 'hover:bg-accent cursor-pointer'
                    )}
                    onClick={() => {
                      if (!editingTemplate) {
                        handleSelectTemplate(template);
                      }
                    }}
                  >
                    {editingTemplate?.id === template.id ? (
                      <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={editingTemplate.name}
                          onChange={(e) =>
                            setEditingTemplate({ ...editingTemplate, name: e.target.value })
                          }
                          placeholder="Template name"
                        />
                        <Input
                          value={editingTemplate.subject || ''}
                          onChange={(e) =>
                            setEditingTemplate({ ...editingTemplate, subject: e.target.value })
                          }
                          placeholder="Subject line"
                        />
                        <Textarea
                          value={editingTemplate.bodyText || ''}
                          onChange={(e) =>
                            setEditingTemplate({ ...editingTemplate, bodyText: e.target.value })
                          }
                          placeholder="Email body"
                          rows={4}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingTemplate(null)}
                          >
                            Cancel
                          </Button>
                          <Button size="sm" onClick={handleUpdateTemplate} disabled={isSaving}>
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Save'
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium truncate">{template.name}</h4>
                            {template.category && (
                              <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                                {template.category}
                              </span>
                            )}
                          </div>
                          {template.subject && (
                            <p className="text-sm text-muted-foreground truncate mt-1">
                              {template.subject}
                            </p>
                          )}
                          {template.bodyText && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {template.bodyText}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTemplate(template);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(template.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
