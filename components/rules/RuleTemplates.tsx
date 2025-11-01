'use client';

import { Button } from '@/components/ui/button';
import { Star, Archive, Mail, Clock, Sparkles, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RuleTemplate, TemplateCategory } from '@/lib/rules/types';

interface RuleTemplatesProps {
  templates: RuleTemplate[];
  onUseTemplate: (templateId: string) => void;
}

const categoryIcons: Record<TemplateCategory, any> = {
  productivity: Clock,
  organization: Archive,
  vip: Star,
  cleanup: TrendingUp,
  automation: Sparkles,
};

const categoryColors: Record<TemplateCategory, string> = {
  productivity: 'text-blue-500',
  organization: 'text-green-500',
  vip: 'text-yellow-500',
  cleanup: 'text-purple-500',
  automation: 'text-pink-500',
};

export default function RuleTemplates({ templates, onUseTemplate }: RuleTemplatesProps) {
  const handleUseTemplate = async (templateId: string) => {
    try {
      const response = await fetch('/api/rules/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      });

      if (response.ok) {
        onUseTemplate(templateId);
      }
    } catch (error) {
      console.error('Error using template:', error);
    }
  };

  // Group templates by category
  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<TemplateCategory, RuleTemplate[]>);

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
                    {template.isPopular && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                        Popular
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {template.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Used {template.timesUsed} times
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleUseTemplate(template.id)}
                    >
                      Use Template
                    </Button>
                  </div>
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
    </div>
  );
}

