'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Zap,
  HardDrive,
  Users,
  Download,
  Calendar,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';

interface CostMetrics {
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  activeSubscriptions: number;
  totalUsers: number;

  costs: {
    sms: {
      totalMessages: number;
      totalCost: number;
      averageCostPerMessage: number;
    };
    ai: {
      totalRequests: number;
      totalCost: number;
      averageCostPerRequest: number;
    };
    storage: {
      totalGB: number;
      totalCost: number;
      averageCostPerGB: number;
    };
    nylas: {
      totalAccounts: number;
      totalCost: number;
      averageCostPerAccount: number;
    };
  };

  trends: {
    revenueGrowth: number;
    costGrowth: number;
    userGrowth: number;
  };
}

interface TopSpender {
  userId: string;
  userName: string;
  userEmail: string;
  totalCost: number;
  breakdown: {
    sms: number;
    ai: number;
    storage: number;
  };
}

export default function CostCenterContent() {
  const [metrics, setMetrics] = useState<CostMetrics | null>(null);
  const [topSpenders, setTopSpenders] = useState<TopSpender[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    fetchCostMetrics();
  }, [dateRange]);

  const fetchCostMetrics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/cost-center?range=${dateRange}`);
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
        setTopSpenders(data.topSpenders || []);
      }
    } catch (error) {
      console.error('Failed to fetch cost metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    try {
      const response = await fetch('/api/admin/cost-center/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateRange }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cost-center-report-${dateRange}-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Failed to load cost metrics</p>
        <Button onClick={fetchCostMetrics}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8 space-y-6">
        {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cost Center Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Monitor revenue, costs, and profit margins across all services
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {['week', 'month', 'quarter', 'year'].map((range) => (
              <Button
                key={range}
                variant={dateRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateRange(range as any)}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </Button>
            ))}
          </div>
          <Button variant="outline" onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3 pt-6 px-6">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
            <div className="flex items-center gap-1 mt-1 text-sm">
              {metrics.trends.revenueGrowth >= 0 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">+{metrics.trends.revenueGrowth}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-red-600">{metrics.trends.revenueGrowth}%</span>
                </>
              )}
              <span className="text-muted-foreground">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 pt-6 px-6">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Costs
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalCosts)}</div>
            <div className="flex items-center gap-1 mt-1 text-sm">
              {metrics.trends.costGrowth >= 0 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-red-600" />
                  <span className="text-red-600">+{metrics.trends.costGrowth}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">{metrics.trends.costGrowth}%</span>
                </>
              )}
              <span className="text-muted-foreground">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 pt-6 px-6">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Profit
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="text-2xl font-bold">{formatCurrency(metrics.netProfit)}</div>
            <div className="flex items-center gap-1 mt-1 text-sm">
              <Badge variant={metrics.profitMargin >= 50 ? 'default' : 'secondary'}>
                {metrics.profitMargin}% margin
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 pt-6 px-6">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-1 text-sm">
              {metrics.trends.userGrowth >= 0 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">+{metrics.trends.userGrowth}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-red-600">{metrics.trends.userGrowth}%</span>
                </>
              )}
              <span className="text-muted-foreground">vs last period</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>SMS Costs</CardTitle>
            <CardDescription>Twilio messaging costs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Messages</span>
              </div>
              <span className="font-semibold">
                {metrics.costs.sms.totalMessages.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Cost</span>
              <span className="font-semibold">{formatCurrency(metrics.costs.sms.totalCost)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg per Message</span>
              <span className="font-semibold">
                {formatCurrency(metrics.costs.sms.averageCostPerMessage)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Costs</CardTitle>
            <CardDescription>OpenAI/Anthropic API costs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Requests</span>
              </div>
              <span className="font-semibold">
                {metrics.costs.ai.totalRequests.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Cost</span>
              <span className="font-semibold">{formatCurrency(metrics.costs.ai.totalCost)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg per Request</span>
              <span className="font-semibold">
                {formatCurrency(metrics.costs.ai.averageCostPerRequest)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Storage Costs</CardTitle>
            <CardDescription>Cloud storage costs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Storage</span>
              </div>
              <span className="font-semibold">{metrics.costs.storage.totalGB.toFixed(2)} GB</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Cost</span>
              <span className="font-semibold">
                {formatCurrency(metrics.costs.storage.totalCost)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg per GB</span>
              <span className="font-semibold">
                {formatCurrency(metrics.costs.storage.averageCostPerGB)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nylas Costs</CardTitle>
            <CardDescription>Email API platform costs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Email Accounts</span>
              </div>
              <span className="font-semibold">
                {metrics.costs.nylas.totalAccounts.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Cost</span>
              <span className="font-semibold">{formatCurrency(metrics.costs.nylas.totalCost)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg per Account</span>
              <span className="font-semibold">
                {formatCurrency(metrics.costs.nylas.averageCostPerAccount)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Spenders */}
      <Card>
        <CardHeader className="pb-3 pt-6 px-6">
          <CardTitle>Top Cost Centers</CardTitle>
          <CardDescription>Users generating the highest costs this period</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {topSpenders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No usage data available
            </div>
          ) : (
            <div className="space-y-4">
              {topSpenders.map((spender, idx) => (
                <div key={spender.userId} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-medium">{spender.userName || 'Unknown User'}</div>
                      <div className="text-sm text-muted-foreground">{spender.userEmail}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">SMS: </span>
                        <span className="font-medium">{formatCurrency(spender.breakdown.sms)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">AI: </span>
                        <span className="font-medium">{formatCurrency(spender.breakdown.ai)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Storage: </span>
                        <span className="font-medium">{formatCurrency(spender.breakdown.storage)}</span>
                      </div>
                    </div>
                    <div className="text-right min-w-[100px]">
                      <div className="font-bold text-lg">{formatCurrency(spender.totalCost)}</div>
                      <div className="text-xs text-muted-foreground">Total Cost</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
