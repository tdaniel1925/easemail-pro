'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CreditCard,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PaymentMethod {
  id: string;
  type: string;
  brand: string;
  lastFour: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  status: string;
}

interface UsageData {
  sms: { count: number; cost: number };
  ai: { count: number; cost: number };
  storage: { usedGB: number; cost: number };
  total: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amountUsd: string;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  invoiceUrl: string | null;
  invoicePdfUrl: string | null;
  createdAt: string;
}

export default function BillingSettings() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      setLoading(true);

      // Fetch payment methods, usage, and invoices in parallel
      const [pmRes, usageRes, invoicesRes] = await Promise.all([
        fetch('/api/billing/payment-methods'),
        fetch('/api/billing/usage'),
        fetch('/api/billing/invoices'),
      ]);

      if (pmRes.ok) {
        const pmData = await pmRes.json();
        setPaymentMethods(pmData.paymentMethods || []);
      }

      if (usageRes.ok) {
        const usageData = await usageRes.json();
        setUsage(usageData);
      }

      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json();
        setInvoices(invoicesData.invoices || []);
      }

      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (paymentMethodId: string) => {
    try {
      const res = await fetch(`/api/billing/payment-methods/${paymentMethodId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setAsDefault: true }),
      });

      if (!res.ok) throw new Error('Failed to set default payment method');

      await fetchBillingData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemovePaymentMethod = async (paymentMethodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) return;

    try {
      const res = await fetch(`/api/billing/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to remove payment method');

      await fetchBillingData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Billing & Usage</h2>
        <p className="text-muted-foreground">
          Manage your payment methods, view usage, and download invoices
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Current Usage */}
      {usage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Current Usage
            </CardTitle>
            <CardDescription>
              Usage for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">SMS Messages</div>
                <div className="text-2xl font-bold">{usage.sms.count}</div>
                <div className="text-sm text-muted-foreground">${usage.sms.cost.toFixed(2)}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">AI Requests</div>
                <div className="text-2xl font-bold">{usage.ai.count}</div>
                <div className="text-sm text-muted-foreground">${usage.ai.cost.toFixed(2)}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Storage</div>
                <div className="text-2xl font-bold">{usage.storage.usedGB.toFixed(2)} GB</div>
                <div className="text-sm text-muted-foreground">${usage.storage.cost.toFixed(2)}</div>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Total Pending Charges</div>
              <div className="text-2xl font-bold text-primary">${usage.total.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Methods
              </CardTitle>
              <CardDescription>Manage your payment methods</CardDescription>
            </div>
            <Button onClick={() => window.location.href = '/settings/billing/add-payment'}>
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Method
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {paymentMethods.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payment methods on file. Add one to enable automatic billing.
            </div>
          ) : (
            <div className="space-y-4">
              {paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <CreditCard className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {pm.brand.charAt(0).toUpperCase() + pm.brand.slice(1)} •••• {pm.lastFour}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Expires {pm.expiryMonth}/{pm.expiryYear}
                      </div>
                    </div>
                    {pm.isDefault && (
                      <Badge variant="secondary" className="ml-2">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!pm.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(pm.id)}
                      >
                        Set as Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePaymentMethod(pm.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Invoices
          </CardTitle>
          <CardDescription>View and download your invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No invoices yet
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{invoice.invoiceNumber}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(invoice.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-bold">${invoice.amountUsd}</div>
                      <Badge
                        variant={
                          invoice.status === 'paid'
                            ? 'default'
                            : invoice.status === 'payment_failed'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </div>
                    {invoice.invoicePdfUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(invoice.invoicePdfUrl!, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
