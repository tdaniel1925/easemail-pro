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
  TrendingDown,
  Users, 
  Building2,
  FileText,
  CreditCard,
  Calendar,
  Download,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface FinancialReport {
  period: {
    start: string;
    end: string;
  };
  revenue: {
    total: number;
    pending: number;
    failed: number;
    subscription: number;
    usage: number;
    deferred: number;
    byDay: Record<string, number>;
  };
  costs: {
    total: number;
    byDay: Record<string, number>;
  };
  profitability: {
    profit: number;
    profitMargin: number;
    grossMargin: number;
  };
  customers: {
    activeUsers: number;
    activeOrganizations: number;
    suspended: number;
    topCustomers: Array<{
      id: string;
      type: 'user' | 'organization';
      revenue: number;
      invoiceCount: number;
    }>;
  };
  invoices: {
    total: number;
    paid: number;
    pending: number;
    failed: number;
    paymentSuccessRate: number;
  };
  credits: {
    totalIssued: number;
    totalAmount: number;
  };
  mrr: number;
}

export default function FinancialReportingDashboard() {
  const [data, setData] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('current_month');

  useEffect(() => {
    fetchReport();
  }, [period]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
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
        case 'quarter':
          const currentQuarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
          endDate = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59);
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
      
      const response = await fetch(`/api/admin/billing/financial-report?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch financial report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-muted-foreground">Loading financial report...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-muted-foreground">Failed to load financial report</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Financial Reporting</h2>
          <p className="text-muted-foreground mt-1">
            Comprehensive financial metrics and revenue analytics
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
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year_to_date">Year to Date</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${data.revenue.total.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              MRR: ${data.mrr.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${data.costs.total.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Operating expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.profitability.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${data.profitability.profit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.profitability.profitMargin.toFixed(1)}% margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.customers.activeUsers + data.customers.activeOrganizations}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.customers.activeUsers} users, {data.customers.activeOrganizations} orgs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>Sources of revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Subscription Revenue</span>
                      <span className="text-sm font-bold">${data.revenue.subscription.toFixed(2)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full">
                      <div 
                        className="h-2 bg-blue-500 rounded-full"
                        style={{ width: `${(data.revenue.subscription / data.revenue.total) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Usage Revenue</span>
                      <span className="text-sm font-bold">${data.revenue.usage.toFixed(2)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full">
                      <div 
                        className="h-2 bg-green-500 rounded-full"
                        style={{ width: `${(data.revenue.usage / data.revenue.total) * 100}%` }}
                      />
                    </div>
                  </div>

                  {data.revenue.deferred > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Deferred Revenue</span>
                        <span className="text-sm font-bold">${data.revenue.deferred.toFixed(2)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full">
                        <div className="h-2 bg-yellow-500 rounded-full w-full" />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profitability Metrics</CardTitle>
                <CardDescription>Key financial indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm font-medium">Gross Margin</span>
                    <Badge variant="secondary" className="text-base">
                      {data.profitability.grossMargin.toFixed(1)}%
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm font-medium">Profit Margin</span>
                    <Badge variant="secondary" className="text-base">
                      {data.profitability.profitMargin.toFixed(1)}%
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm font-medium">Cost Ratio</span>
                    <Badge variant="secondary" className="text-base">
                      {data.revenue.total > 0 ? ((data.costs.total / data.revenue.total) * 100).toFixed(1) : 0}%
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium">Revenue / Customer</span>
                    <Badge variant="secondary" className="text-base">
                      ${(data.revenue.total / Math.max(1, data.customers.activeUsers + data.customers.activeOrganizations)).toFixed(2)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue & Cost Trends</CardTitle>
              <CardDescription>Daily breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.keys({...data.revenue.byDay, ...data.costs.byDay})
                  .sort()
                  .slice(-15)
                  .map(date => {
                    const revenue = data.revenue.byDay[date] || 0;
                    const cost = data.costs.byDay[date] || 0;
                    const profit = revenue - cost;
                    
                    return (
                      <div key={date} className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground w-24">
                          {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex-1 flex items-center gap-2">
                              <div className="h-6 bg-green-500/20 rounded" style={{ width: `${(revenue / Math.max(...Object.values(data.revenue.byDay))) * 100}%`, minWidth: revenue > 0 ? '4px' : '0' }}>
                                <div className="h-full bg-green-500 rounded" style={{ width: '100%' }} />
                              </div>
                              <span className="text-xs text-green-600 font-medium w-16">${revenue.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 flex items-center gap-2">
                              <div className="h-6 bg-red-500/20 rounded" style={{ width: `${(cost / Math.max(...Object.values(data.costs.byDay))) * 100}%`, minWidth: cost > 0 ? '4px' : '0' }}>
                                <div className="h-full bg-red-500 rounded" style={{ width: '100%' }} />
                              </div>
                              <span className="text-xs text-red-600 font-medium w-16">${cost.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                        <span className={`text-sm font-semibold w-20 text-right ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {profit >= 0 ? '+' : ''} ${profit.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Paid Revenue</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ${data.revenue.total.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Revenue</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  ${data.revenue.pending.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Revenue</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ${data.revenue.failed.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Credit Notes</CardTitle>
              <CardDescription>Refunds and adjustments issued</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{data.credits.totalIssued}</div>
                  <p className="text-sm text-muted-foreground mt-1">Credit notes issued</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">${data.credits.totalAmount.toFixed(2)}</div>
                  <p className="text-sm text-muted-foreground mt-1">Total amount</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Customer Base</CardTitle>
                <CardDescription>Active accounts breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">Individual Users</span>
                    </div>
                    <span className="text-2xl font-bold">{data.customers.activeUsers}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-medium">Organizations</span>
                    </div>
                    <span className="text-2xl font-bold">{data.customers.activeOrganizations}</span>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-medium">Suspended</span>
                    </div>
                    <span className="text-2xl font-bold text-red-600">{data.customers.suspended}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
                <CardDescription>Highest revenue contributors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.customers.topCustomers.slice(0, 5).map((customer, index) => (
                    <div key={customer.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="text-sm font-mono">{customer.id.slice(0, 8)}...</div>
                          <div className="text-xs text-muted-foreground capitalize">{customer.type}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">${customer.revenue.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">{customer.invoiceCount} invoices</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.invoices.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Paid</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{data.invoices.paid}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{data.invoices.pending}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{data.invoices.failed}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Payment Success Rate</CardTitle>
              <CardDescription>Percentage of successfully paid invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="h-8 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 flex items-center justify-center text-white text-sm font-semibold"
                      style={{ width: `${data.invoices.paymentSuccessRate}%` }}
                    >
                      {data.invoices.paymentSuccessRate.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <CreditCard className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

