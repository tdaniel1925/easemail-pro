'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle2, XCircle, Search } from 'lucide-react';
import type { SimpleEmailRule } from '@/lib/rules/types-simple';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/utils';

interface Email {
  id: string;
  subject: string;
  fromEmail: string;
  fromName?: string;
  receivedAt: Date | string;
  hasAttachments: boolean;
}

interface TestRuleModalProps {
  rule: SimpleEmailRule | null;
  onClose: () => void;
}

export default function TestRuleModal({ rule, onClose }: TestRuleModalProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (rule) {
      fetchEmails();
    }
  }, [rule]);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      // Fetch recent emails from the database
      const response = await fetch('/api/search/emails-db?limit=50');
      const data = await response.json();

      if (data.success && data.emails) {
        setEmails(data.emails);
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
      toast({
        title: 'Error',
        description: 'Failed to load emails',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const testRuleOnEmail = async (emailId: string) => {
    if (!rule) return;

    setTesting(true);
    try {
      const response = await fetch('/api/rules/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ruleId: rule.id,
          emailId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResults(prev => ({
          ...prev,
          [emailId]: data.matched,
        }));

        toast({
          title: data.matched ? 'Rule Matched!' : 'No Match',
          description: data.matched
            ? `This rule would apply to this email`
            : 'This rule would not apply to this email',
        });
      }
    } catch (error) {
      console.error('Error testing rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to test rule',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const filteredEmails = emails.filter(email =>
    email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.fromEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.fromName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!rule) return null;

  return (
    <Dialog open={!!rule} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Test Rule: {rule.name}</DialogTitle>
          <DialogDescription>
            Select an email to test if this rule would match it
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search emails..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Email List */}
          <div className="flex-1 overflow-y-auto border border-border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredEmails.length > 0 ? (
              <div className="divide-y divide-border">
                {filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    className="p-4 hover:bg-accent transition-colors cursor-pointer flex items-start justify-between gap-4"
                    onClick={() => testRuleOnEmail(email.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{email.subject}</h4>
                        {email.hasAttachments && (
                          <span className="text-xs text-muted-foreground">📎</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {email.fromName || email.fromEmail}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(email.receivedAt)}
                      </p>
                    </div>

                    <div className="flex-shrink-0">
                      {testResults[email.id] === true && (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="text-sm font-medium">Match</span>
                        </div>
                      )}
                      {testResults[email.id] === false && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <XCircle className="h-5 w-5" />
                          <span className="text-sm font-medium">No Match</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>No emails found</p>
              </div>
            )}
          </div>

          {/* Rule Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-2">Rule Configuration</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Conditions:</span>
                <span className="ml-2 font-medium">
                  {rule.conditions.length} ({rule.matchAll ? 'ALL must match' : 'ANY can match'})
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Actions:</span>
                <span className="ml-2 font-medium">{rule.actions.length}</span>
              </div>
            </div>
          </div>
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
