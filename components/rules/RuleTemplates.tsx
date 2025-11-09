'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Star, Archive, Mail, Clock, Sparkles, TrendingUp, Newspaper } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SimpleRuleTemplate, TemplateCategory } from '@/lib/rules/types-simple';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RuleTemplatesProps {
  templates: SimpleRuleTemplate[];
  onUseTemplate: (templateId: string) => void;
}

const categoryIcons: Record<TemplateCategory, any> = {
  newsletters: Newspaper,
  work: Archive,
  cleanup: TrendingUp,
};

const categoryColors: Record<TemplateCategory, string> = {
  newsletters: 'text-blue-500',
  work: 'text-green-500',
  cleanup: 'text-purple-500',
};

export default function RuleTemplates({ templates, onUseTemplate }: RuleTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<SimpleRuleTemplate | null>(null);
  const [customName, setCustomName] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [grantId, setGrantId] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch user's grant ID
  useEffect(() => {
    const fetchGrantId = async () => {
      try {
        const response = await fetch('/api/nylas/grants');
        const data = await response.json();
        if (data.grants && data.grants.length > 0) {
          setGrantId(data.grants[0].id);
        }
      } catch (error) {
        console.error('Error fetching grant ID:', error);
      }
    };
    fetchGrantId();
  }, []);

  const handleUseTemplate = async () => {
    if (!selectedTemplate || !grantId) return;

    setLoading(true);
    try {
      const customizations: any = {};

      if (customName) {
        customizations.name = customName;
      }

      // Apply custom value to first condition if provided
      if (customValue && selectedTemplate.conditions.length > 0) {
        customizations.conditions = [{
          ...selectedTemplate.conditions[0],
          value: customValue,
        }];
      }

      const response = await fetch('/api/rules/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          grantId,
          customizations,
        }),
      });

      if (response.ok) {
        setSelectedTemplate(null);
        setCustomName('');
        setCustomValue('');
        onUseTemplate(selectedTemplate.id);
      }
    } catch (error) {
      console.error('Error using template:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group templates by category
  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<TemplateCategory, SimpleRuleTemplate[]>);

  return (
    <div className="space-y-8">
      {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => {
        const Icon = categoryIcons[category as TemplateCategory];
        const colorClass = categoryColors[category as TemplateCategory];

        return (
          <div key={category}>
            <div className="flex items-center gap-3 mb-4">
              <Icon className={cn('h-5 w-5', colorClass)} />
              <h2 className="text-lg font-semibold capitalize">{category}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryTemplates.map((template) => (
                <div
                  key={template.id}
                  className="border border-border rounded-lg p-4 bg-card hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{template.icon}</span>
                      <h3 className="font-semibold">{template.name}</h3>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {template.description}
                  </p>

                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => setSelectedTemplate(template)}
                  >
                    Use Template
                  </Button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {templates.length === 0 && (
        <div className="text-center py-12">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No templates available</h3>
          <p className="text-muted-foreground">
            Check back later for pre-built rule templates
          </p>
        </div>
      )}

      {/* Customization Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customize Rule Template</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Rule Name (Optional)</Label>
              <Input
                id="name"
                placeholder={selectedTemplate?.name || ''}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>

            {selectedTemplate && selectedTemplate.conditions.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="value">
                  {selectedTemplate.conditions[0].type === 'from' ? 'Email or Domain' : 'Value'}
                </Label>
                <Input
                  id="value"
                  placeholder={String(selectedTemplate.conditions[0].value)}
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Current: {String(selectedTemplate.conditions[0].value)}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setSelectedTemplate(null)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleUseTemplate}
              disabled={loading || !grantId}
            >
              {loading ? 'Creating...' : 'Create Rule'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

