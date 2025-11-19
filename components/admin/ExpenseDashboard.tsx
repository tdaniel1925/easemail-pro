'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Building2,
  Sparkles,
  MessageSquare,
  Database,
  Download,
  Calendar,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';

interface ExpenseData {
  summary: {
    totalCost: number;
    totalTransactions: number;
    averageCostPerTransaction: number;
  };
  byService: Record<string, { count: number; cost: number }>;
  byFeature: Record<string, { count: number; cost: number }>;
  topUsers: Array<{ userId: string; cost: number }>;
  topOrganizations: Array<{ organizationId: string; cost: number }>;
  dailyBreakdown: Record<string, number>;
  recentTransactions: Array<{
    id: string;
    service: string;
    feature: string | null;
    cost: number;
    quantity: string | null;
    unit: string | null;
    userId: string;
    organizationId: string | null;
    occurredAt: Date;
    metadata: any;
  }>;
  period: {
    start: string;
    end: string;
  };
}

const serviceIcons: Record<string, any> = {
  openai: Sparkles,
  sms: MessageSquare,
  storage: Database,
  whisper: Sparkles,
  stripe_fee: DollarSign,
};

const serviceColors: Record<string, string> = {
  openai: 'text-blue-500',
  sms: 'text-green-500',
  storage: 'text-purple-500',
  whisper: 'text-yellow-500',
  stripe_fee: 'text-gray-500',
};

export default function ExpenseDashboard() {
  const [data, setData] = useState<ExpenseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('current_month');
  const [serviceFilter, setServiceFilter] = useState('all');

  useEffect(() => {
    fetchExpenses();
  }, [period, serviceFilter]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // Calculate period
      const now = new Date();
      let startDate: Date;
      let endDate: Date;
      
      switch (period) {
        case 'current_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          break;
        case 'last_month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
          break;
        case 'last_3_months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          break;
        case 'year_to_date':
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = now;
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      }
      
      params.append('periodStart', startDate.toISOString());
      params.append('periodEnd', endDate.toISOString());
      
      if (serviceFilter !== 'all') {
        params.append('service', serviceFilter);
      }
      
      const response = await fetch(`/api/admin/billing/expenses?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!data) return;
    
    // Simple CSV export of recent transactions
    const csv = [
      ['Date', 'Service', 'Feature', 'Cost', 'Quantity', 'Unit', 'User ID', 'Org ID'].join(','),
      ...data.recentTransactions.map(t => 
        [
          format(new Date(t.occurredAt), 'yyyy-MM-dd HH:mm:ss'),
          t.service,
          t.feature || '',
          t.cost.toFixed(4),
          t.quantity || '',
          t.unit || '',
          t.userId,
          t.organizationId || '',
        ].join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-muted-foreground">Loading expense data...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-muted-foreground">Failed to load expense data</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Expense Analytics</h2>
          <p className="text-muted-foreground mt-1">
            Track costs across all services and users
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">Current Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_3_months">Last 3 Months</SelectItem>
              <SelectItem value="year_to_date">Year to Date</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              <SelectItem value="openai">AI Services</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="storage">Storage</SelectItem>
              <SelectItem value="whisper">Transcription</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={exportToCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.summary.totalCost.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.summary.totalTransactions.toLocaleString()} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per Transaction</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.summary.averageCostPerTransaction.toFixed(4)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all services
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Service</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {Object.entries(data.byService).length > 0 ? (
              <>
                <div className="text-2xl font-bold">
                  {Object.entries(data.byService).sort(([, a], [, b]) => b.cost - a.cost)[0][0]}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ${Object.entries(data.byService).sort(([, a], [, b]) => b.cost - a.cost)[0][1].cost.toFixed(2)}
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services">By Service</TabsTrigger>
          <TabsTrigger value="features">By Feature</TabsTrigger>
          <TabsTrigger value="users">Top Users</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="transactions">Recent</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost by Service</CardTitle>
              <CardDescription>Breakdown of expenses by service type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(data.byService)
                  .sort(([, a], [, b]) => b.cost - a.cost)
                  .map(([service, stats]) => {
                    const Icon = serviceIcons[service] || DollarSign;
                    const colorClass = serviceColors[service] || 'text-gray-500';
                    const percentage = (stats.cost / data.summary.totalCost) * 100;
                    
                    return (
                      <div key={service} className="flex items-center gap-4">
                        <Icon className={`w-5 h-5 ${colorClass}`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium capitalize">{service}</span>
                            <span className="font-bold">${stats.cost.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary rounded-full h-2 transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-12 text-right">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {stats.count.toLocaleString()} transactions
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost by Feature</CardTitle>
              <CardDescription>Detailed breakdown by feature usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(data.byFeature)
                  .sort(([, a], [, b]) => b.cost - a.cost)
                  .slice(0, 20)
                  .map(([feature, stats]) => (
                    <div key={feature} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <div className="font-medium">{feature}</div>
                        <div className="text-xs text-muted-foreground">
                          {stats.count} uses
                        </div>
                      </div>
                      <Badge variant="secondary">
                        ${stats.cost.toFixed(2)}
                      </Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Users by Spend</CardTitle>
              <CardDescription>Highest spending users this period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.topUsers.map((user, index) => (
                  <div key={user.userId} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium font-mono text-sm">{user.userId.slice(0, 8)}...</div>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      ${user.cost.toFixed(2)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organizations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Organizations by Spend</CardTitle>
              <CardDescription>Highest spending organizations this period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.topOrganizations.map((org, index) => (
                  <div key={org.organizationId} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <div className="font-medium font-mono text-sm">{org.organizationId.slice(0, 8)}...</div>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      ${org.cost.toFixed(2)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest expense entries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.recentTransactions.map((txn) => {
                  const Icon = serviceIcons[txn.service] || DollarSign;
                  const colorClass = serviceColors[txn.service] || 'text-gray-500';
                  
                  return (
                    <div key={txn.id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${colorClass}`} />
                        <div>
                          <div className="font-medium text-sm">
                            {txn.feature || txn.service}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(txn.occurredAt), 'MMM dd, yyyy HH:mm')}
                            {txn.quantity && ` • ${txn.quantity} ${txn.unit || 'units'}`}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${txn.cost.toFixed(4)}</div>
                        {txn.organizationId && (
                          <div className="text-xs text-muted-foreground">Org</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

