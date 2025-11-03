'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface UserUsageTableProps {
  dateRange: {
    start: string;
    end: string;
  };
}

export default function UserUsageTable({ dateRange }: UserUsageTableProps) {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 20,
    total: 0,
  });

  useEffect(() => {
    fetchUsers();
  }, [dateRange, pagination.offset]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate: dateRange.start,
        endDate: dateRange.end,
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString(),
      });

      const response = await fetch(`/api/admin/usage/users?${params}`);
      const data = await response.json();

      if (data.success) {
        setUsers(data.users);
        setPagination(prev => ({ ...prev, total: data.pagination.total }));
      }
    } catch (error) {
      console.error('Failed to fetch user usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevPage = () => {
    setPagination(prev => ({
      ...prev,
      offset: Math.max(0, prev.offset - prev.limit),
    }));
  };

  const handleNextPage = () => {
    setPagination(prev => ({
      ...prev,
      offset: prev.offset + prev.limit,
    }));
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Loading user data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">SMS</TableHead>
              <TableHead className="text-right">AI</TableHead>
              <TableHead className="text-right">Storage</TableHead>
              <TableHead className="text-right">Total Cost</TableHead>
              <TableHead className="text-center">Billing</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No user data found for this period
                </TableCell>
              </TableRow>
            ) : (
              users.map((userData) => (
                <TableRow key={userData.user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{userData.user.fullName || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">{userData.user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant={userData.user.isPromoUser ? 'default' : 'secondary'}>
                        {userData.user.isPromoUser ? 'Promo' : userData.user.subscriptionTier || 'free'}
                      </Badge>
                      {userData.user.isPromoUser && (
                        <p className="text-xs text-muted-foreground">Free access</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div>
                      <p className="font-medium">{userData.usage.sms.messages.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        ${userData.usage.sms.cost.toFixed(2)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div>
                      <p className="font-medium">{userData.usage.ai.requests.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        ${userData.usage.ai.cost.toFixed(2)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div>
                      <p className="font-medium">{userData.usage.storage.gb} GB</p>
                      <p className="text-xs text-muted-foreground">
                        ${userData.usage.storage.cost.toFixed(2)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <p className="font-bold text-lg">
                      ${userData.usage.total.cost.toFixed(2)}
                    </p>
                  </TableCell>
                  <TableCell className="text-center">
                    {userData.user.isPromoUser ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Promo User
                      </Badge>
                    ) : userData.billing.hasPaymentMethod ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        ✓ Payment Method
                      </Badge>
                    ) : userData.billing.requiresPaymentMethod ? (
                      <Badge variant="destructive">
                        ⚠ No Payment Method
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        Free Tier
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} users
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={pagination.offset === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={pagination.offset + pagination.limit >= pagination.total}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

