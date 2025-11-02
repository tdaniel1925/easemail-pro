'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Eye, Send, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  totalUsd: string;
  status: string;
  dueDate: Date | string | null;
  paidAt: Date | string | null;
  createdAt: Date | string;
  periodStart: Date | string;
  periodEnd: Date | string;
}

interface InvoicesTableProps {
  invoices: Invoice[];
  isLoading?: boolean;
  onViewInvoice?: (invoiceId: string) => void;
  onDownloadInvoice?: (invoiceId: string) => void;
  onSendInvoice?: (invoiceId: string) => void;
}

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-500', icon: Clock },
  sent: { label: 'Sent', color: 'bg-blue-500', icon: Send },
  paid: { label: 'Paid', color: 'bg-green-500', icon: CheckCircle },
  overdue: { label: 'Overdue', color: 'bg-red-500', icon: AlertCircle },
  void: { label: 'Void', color: 'bg-gray-400', icon: XCircle },
};

export function InvoicesTable({
  invoices,
  isLoading = false,
  onViewInvoice,
  onDownloadInvoice,
  onSendInvoice,
}: InvoicesTableProps) {
  const [loadingAction, setLoadingAction] = useState<{ id: string; action: string } | null>(null);

  const handleAction = async (action: () => void, id: string, actionName: string) => {
    setLoadingAction({ id, action: actionName });
    try {
      await action();
    } finally {
      setLoadingAction(null);
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Loading invoices...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
        <CardDescription>View and manage billing invoices</CardDescription>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mb-4" />
            <p>No invoices found</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Paid Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell className="text-sm">
                      {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${parseFloat(invoice.totalUsd).toFixed(2)}
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                    <TableCell>{formatDate(invoice.paidAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {onViewInvoice && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleAction(() => onViewInvoice(invoice.id), invoice.id, 'view')
                            }
                            disabled={loadingAction?.id === invoice.id}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        {onDownloadInvoice && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleAction(
                                () => onDownloadInvoice(invoice.id),
                                invoice.id,
                                'download'
                              )
                            }
                            disabled={loadingAction?.id === invoice.id}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        {onSendInvoice && invoice.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleAction(() => onSendInvoice(invoice.id), invoice.id, 'send')
                            }
                            disabled={loadingAction?.id === invoice.id}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

