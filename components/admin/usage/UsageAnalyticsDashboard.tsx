'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  MessageSquare, 
  Sparkles, 
  HardDrive, 
  TrendingUp,
  Download,
  RefreshCw
} from 'lucide-react';
import UserUsageTable from './UserUsageTable';
import UsageTrendsChart from './UsageTrendsChart';
import Link from 'next/link';

export default function UsageAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchOverview();
  }, [dateRange]);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate: dateRange.start,
        endDate: dateRange.end,
        type: 'all',
      });

      const response = await fetch(`/api/admin/usage?${params}`);
      const data = await response.json();

      if (data.success) {
        setOverview(data.usage);
      }
    } catch (error) {
      console.error('Failed to fetch usage overview:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOverview();
    setRefreshing(false);
  };

  const handleExport = async () => {
    // TODO: Implement export functionality
    alert('Export functionality coming soon!');
  };

  return (
    <div className="p-8 w-full h-full overflow-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usage Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Monitor SMS, AI, and storage usage across all users
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex gap-2 mt-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const start = new Date();
                  start.setDate(start.getDate() - 7);
                  setDateRange({
                    start: start.toISOString().split('T')[0],
                    end: new Date().toISOString().split('T')[0],
                  });
                }}
              >
                Last 7 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const start = new Date();
                  start.setDate(start.getDate() - 30);
                  setDateRange({
                    start: start.toISOString().split('T')[0],
                    end: new Date().toISOString().split('T')[0],
                  });
                }}
              >
                Last 30 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const start = new Date();
                  start.setMonth(0);
                  start.setDate(1);
                  setDateRange({
                    start: start.toISOString().split('T')[0],
                    end: new Date().toISOString().split('T')[0],
                  });
                }}
              >
                Year to Date
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading usage data...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* SMS Usage */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">SMS Messages</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overview?.sms?.totalMessages?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cost: ${(overview?.sms?.totalCost || 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>

            {/* AI Usage */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Requests</CardTitle>
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overview?.ai?.totalRequests?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cost: ${(overview?.ai?.totalCost || 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>

            {/* Storage Usage */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overview?.storage?.totalGb || '0'} GB
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Overage: ${(overview?.storage?.overageCost || 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>

            {/* Total Cost */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(
                    (overview?.sms?.totalCost || 0) +
                    (overview?.ai?.totalCost || 0) +
                    (overview?.storage?.overageCost || 0)
                  ).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Current period
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for detailed views */}
          <Tabs defaultValue="users" className="space-y-4">
            <TabsList>
              <TabsTrigger value="users">User Usage</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="ai-breakdown">AI Breakdown</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>User Usage Details</CardTitle>
                  <CardDescription>
                    Usage breakdown by user with billing status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UserUsageTable dateRange={dateRange} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Usage Trends</CardTitle>
                  <CardDescription>
                    Historical usage data over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UsageTrendsChart dateRange={dateRange} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai-breakdown" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>AI Feature Breakdown</CardTitle>
                  <CardDescription>
                    Usage by AI feature type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {overview?.ai?.byFeature && overview.ai.byFeature.length > 0 ? (
                    <div className="space-y-4">
                      {overview.ai.byFeature.map((feature: any) => (
                        <div key={feature.feature} className="flex items-center justify-between border-b pb-3">
                          <div>
                            <p className="font-medium capitalize">{feature.feature}</p>
                            <p className="text-sm text-muted-foreground">
                              {feature.requests.toLocaleString()} requests
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${feature.cost.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">
                              ${(feature.cost / feature.requests).toFixed(4)}/request
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No AI usage data for this period
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/admin/billing-config">
              <Card className="hover:bg-accent cursor-pointer transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Billing Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure automated billing and payment processing
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/admin/users">
              <Card className="hover:bg-accent cursor-pointer transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    User Management
                  </CardTitle>
                  <CardDescription>
                    Manage users, promo accounts, and subscriptions
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Card className="hover:bg-accent cursor-pointer transition-colors opacity-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Reports
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    Coming Soon
                  </span>
                </CardTitle>
                <CardDescription>
                  Generate and download usage reports
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

