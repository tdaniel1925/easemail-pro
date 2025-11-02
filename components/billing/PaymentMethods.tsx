'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Plus, Trash2, Check } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PaymentMethod {
  id: string;
  type: string;
  lastFour: string | null;
  brand: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  isDefault: boolean;
  billingName: string | null;
}

interface PaymentMethodsProps {
  paymentMethods: PaymentMethod[];
  isLoading?: boolean;
  onAddPaymentMethod?: () => void;
  onRemovePaymentMethod?: (methodId: string) => void;
  onSetDefault?: (methodId: string) => void;
}

export function PaymentMethods({
  paymentMethods,
  isLoading = false,
  onAddPaymentMethod,
  onRemovePaymentMethod,
  onSetDefault,
}: PaymentMethodsProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleRemove = async (methodId: string) => {
    if (!onRemovePaymentMethod) return;
    
    setActionLoading(methodId);
    try {
      await onRemovePaymentMethod(methodId);
      setDeleteConfirm(null);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    if (!onSetDefault) return;
    
    setActionLoading(methodId);
    try {
      await onSetDefault(methodId);
    } finally {
      setActionLoading(null);
    }
  };

  const getCardIcon = (brand: string | null) => {
    // You can expand this with actual brand icons
    return <CreditCard className="w-5 h-5" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>Loading payment methods...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Manage your payment methods</CardDescription>
          </div>
          {onAddPaymentMethod && (
            <Button onClick={onAddPaymentMethod} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Card
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {paymentMethods.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <CreditCard className="w-12 h-12 mb-4 opacity-50" />
              <p>No payment methods added</p>
              {onAddPaymentMethod && (
                <Button onClick={onAddPaymentMethod} variant="outline" size="sm" className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Add your first payment method
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    method.isDefault ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-muted-foreground">
                      {getCardIcon(method.brand)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">
                          {method.brand || method.type} •••• {method.lastFour}
                        </span>
                        {method.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            <Check className="w-3 h-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {method.billingName && <span>{method.billingName} · </span>}
                        {method.expiryMonth && method.expiryYear && (
                          <span>
                            Expires {method.expiryMonth.toString().padStart(2, '0')}/
                            {method.expiryYear}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!method.isDefault && onSetDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(method.id)}
                        disabled={actionLoading === method.id}
                      >
                        {actionLoading === method.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        ) : (
                          'Set as Default'
                        )}
                      </Button>
                    )}
                    {onRemovePaymentMethod && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(method.id)}
                        disabled={actionLoading === method.id || method.isDefault}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Payment Method</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this payment method? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleRemove(deleteConfirm)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {actionLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                'Remove'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

