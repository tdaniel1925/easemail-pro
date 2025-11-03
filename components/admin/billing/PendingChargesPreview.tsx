'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PendingChargesPreview() {
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<any>(null);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/billing/pending');
      const data = await response.json();

      if (data.success) {
        setPending(data);
      }
    } catch (error) {
      console.error('Failed to fetch pending charges:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Charges</CardTitle>
          <CardDescription>Preview of upcoming billing charges</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pending) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Pending Charges</CardTitle>
          <CardDescription>Preview of upcoming billing charges</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchPending}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Accounts</p>
            <p className="text-2xl font-bold">{pending.summary.totalAccounts}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Charges</p>
            <p className="text-2xl font-bold text-green-600">
              ${pending.summary.totalCharges.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Without Payment Method</p>
            <p className="text-2xl font-bold text-red-600">
              {pending.summary.accountsWithoutPaymentMethod}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Breakdown</p>
            <div className="space-y-1 mt-2">
              <p className="text-xs">SMS: ${pending.summary.breakdown.sms.toFixed(2)}</p>
              <p className="text-xs">AI: ${pending.summary.breakdown.ai.toFixed(2)}</p>
              <p className="text-xs">Storage: ${pending.summary.breakdown.storage.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {pending.summary.accountsWithoutPaymentMethod > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              ⚠️ {pending.summary.accountsWithoutPaymentMethod} account(s) have pending charges but no payment method on file.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

