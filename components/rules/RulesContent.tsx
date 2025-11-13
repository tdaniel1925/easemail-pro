'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Zap, TrendingUp, Loader2, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import RuleCard from './RuleCard';
import RuleTemplates from './RuleTemplates';
import RuleBuilder from './RuleBuilder';
import type { SimpleEmailRule, SimpleRuleTemplate } from '@/lib/rules/types-simple';

type Tab = 'active' | 'templates';

export default function RulesContent() {
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [rules, setRules] = useState<SimpleEmailRule[]>([]);
  const [templates, setTemplates] = useState<SimpleRuleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState<SimpleEmailRule | null>(null);
  const [filterEnabled, setFilterEnabled] = useState<boolean | null>(null);

  // Fetch rules
  useEffect(() => {
    if (activeTab === 'active') {
      fetchRules();
    }
  }, [activeTab, filterEnabled]);

  // Fetch templates
  useEffect(() => {
    if (activeTab === 'templates') {
      fetchTemplates();
    }
  }, [activeTab]);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterEnabled !== null) {
        params.append('enabled', String(filterEnabled));
      }

      const response = await fetch(`/api/rules?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setRules(data.rules);
      }
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/rules/templates');
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = () => {
    setEditingRule(null);
    setShowBuilder(true);
  };

  const handleEditRule = (rule: SimpleEmailRule) => {
    setEditingRule(rule);
    setShowBuilder(true);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) {
      return;
    }

    try {
      const response = await fetch(`/api/rules/${ruleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/rules/${ruleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: enabled }),
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error('Error toggling rule:', error);
    }
  };

  const handleSaveRule = async (ruleData: Partial<SimpleEmailRule>) => {
    try {
      const url = editingRule ? `/api/rules/${editingRule.id}` : '/api/rules';
      const method = editingRule ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ruleData),
      });

      if (response.ok) {
        setShowBuilder(false);
        setEditingRule(null);
        fetchRules();
      }
    } catch (error) {
      console.error('Error saving rule:', error);
    }
  };

  const handleUseTemplate = (templateId: string) => {
    // This will be handled in RuleTemplates component
    // which will call the API and then refresh rules
    fetchRules();
  };

  const filteredRules = rules.filter(rule =>
    rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rule.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sections = [
    { id: 'active' as Tab, name: 'Active Rules', icon: Zap, count: rules.length },
    { id: 'templates' as Tab, name: 'Rule Templates', icon: TrendingUp },
  ];

  return (
    <>
      <div className="flex w-full h-screen">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border bg-card p-4 overflow-y-auto flex-shrink-0 h-screen">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 text-foreground">Rules & Automation</h2>
            <a
              href="/inbox"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 19-7-7 7-7"/>
                <path d="M19 12H5"/>
              </svg>
              Back to Inbox
            </a>
          </div>
          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveTab(section.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    activeTab === section.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{section.name}</span>
                  {section.count !== undefined && (
                    <span className="ml-auto text-xs">{section.count}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                {activeTab === 'active' && (
                  <>
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search rules..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant={filterEnabled === null ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterEnabled(null)}
                      >
                        All
                      </Button>
                      <Button
                        variant={filterEnabled === true ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterEnabled(true)}
                      >
                        Enabled
                      </Button>
                      <Button
                        variant={filterEnabled === false ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterEnabled(false)}
                      >
                        Disabled
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {activeTab === 'active' && (
                <Button onClick={handleCreateRule} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Rule
                </Button>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : activeTab === 'active' ? (
              filteredRules.length > 0 ? (
                <div className="max-w-4xl space-y-4">
                  {filteredRules.map((rule) => (
                    <RuleCard
                      key={rule.id}
                      rule={rule}
                      onEdit={handleEditRule}
                      onDelete={handleDeleteRule}
                      onToggle={handleToggleRule}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Zap className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No rules yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first rule to automate your email workflow
                  </p>
                  <Button onClick={handleCreateRule}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Rule
                  </Button>
                </div>
              )
            ) : (
              <RuleTemplates
                templates={templates}
                onUseTemplate={handleUseTemplate}
              />
            )}
          </div>
        </main>
      </div>

      {/* Rule Builder Modal/Sheet */}
      {showBuilder && (
        <RuleBuilder
          rule={editingRule}
          onClose={() => {
            setShowBuilder(false);
            setEditingRule(null);
          }}
          onSave={handleSaveRule}
        />
      )}
    </>
  );
}
