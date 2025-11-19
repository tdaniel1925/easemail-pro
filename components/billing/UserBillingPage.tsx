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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  DollarSign, 
  TrendingUp, 
  Sparkles,
  MessageSquare,
  Database,
  Calendar,
  Info,
  Building2
} from 'lucide-react';
import { format } from 'date-fns';

interface UsageData {
  summary: {
    totalCost: number;
    totalTransactions: number;
    averageCostPerTransaction: number;
    billedToOrganization: boolean;
  };
  byService: Record<string, { count: number; cost: number }>;
  byFeature: Record<string, { count: number; cost: number }>;
  dailyBreakdown: Record<string, number>;
  recentTransactions: Array<{
    id: string;
    service: string;
    feature: string | null;
    cost: number;
    quantity: string | null;
    unit: string | null;
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
};

const serviceColors: Record<string, string> = {
  openai: 'text-blue-500',
  sms: 'text-green-500',
  storage: 'text-purple-500',
  whisper: 'text-yellow-500',
};

const serviceNames: Record<string, string> = {
  openai: 'AI Services',
  sms: 'SMS',
  storage: 'Storage',
  whisper: 'Transcription',
};

export default function UserBillingPage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('current_month');

  useEffect(() => {
    fetchUsage();
  }, [period]);

  const fetchUsage = async () => {
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
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      }
      
      params.append('periodStart', startDate.toISOString());
      params.append('periodEnd', endDate.toISOString());
      
      const response = await fetch(`/api/user/billing/usage?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-muted-foreground">Loading usage data...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-muted-foreground">Failed to load usage data</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Usage & Billing</h2>
          <p className="text-muted-foreground mt-1">
            Track your usage and costs across all services
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
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Organization Billing Notice */}
      {data.summary.billedToOrganization && (
        <Alert>
          <Building2 className="h-4 w-4" />
          <AlertTitle>Organization Billing</AlertTitle>
          <AlertDescription>
            These costs are billed to your organization. Contact your organization admin for payment details.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage Cost</CardTitle>
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
            <CardTitle className="text-sm font-medium">Average per Use</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.summary.averageCostPerTransaction.toFixed(4)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all features
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Used Service</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {Object.entries(data.byService).length > 0 ? (
              <>
                <div className="text-2xl font-bold capitalize">
                  {serviceNames[Object.entries(data.byService).sort(([, a], [, b]) => b.count - a.count)[0][0]]}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {Object.entries(data.byService).sort(([, a], [, b]) => b.count - a.count)[0][1].count} uses
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services">By Service</TabsTrigger>
          <TabsTrigger value="features">By Feature</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage by Service</CardTitle>
              <CardDescription>Breakdown of your usage by service type</CardDescription>
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
                            <span className="font-medium">{serviceNames[service] || service}</span>
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
                            {stats.count.toLocaleString()} uses
                          </div>
                        </div>
                      </div>
                    );
                  })}
                {Object.keys(data.byService).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No usage data for this period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage by Feature</CardTitle>
              <CardDescription>Detailed breakdown by individual features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(data.byFeature)
                  .sort(([, a], [, b]) => b.cost - a.cost)
                  .slice(0, 20)
                  .map(([feature, stats]) => (
                    <div key={feature} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <div className="font-medium capitalize">{feature.replace(/_/g, ' ')}</div>
                        <div className="text-xs text-muted-foreground">
                          {stats.count} uses
                        </div>
                      </div>
                      <Badge variant="secondary">
                        ${stats.cost.toFixed(4)}
                      </Badge>
                    </div>
                  ))}
                {Object.keys(data.byFeature).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No usage data for this period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your recent usage transactions</CardDescription>
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
                          <div className="font-medium text-sm capitalize">
                            {txn.feature?.replace(/_/g, ' ') || serviceNames[txn.service]}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(txn.occurredAt), 'MMM dd, yyyy HH:mm')}
                            {txn.quantity && ` • ${txn.quantity} ${txn.unit || 'units'}`}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${txn.cost.toFixed(4)}</div>
                      </div>
                    </div>
                  );
                })}
                {data.recentTransactions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No transactions in this period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Understanding Your Usage</AlertTitle>
        <AlertDescription>
          These costs represent your actual usage of platform services. Depending on your plan, 
          some or all of these costs may be included in your subscription.
        </AlertDescription>
      </Alert>
    </div>
  );
}

