'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Database, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Clock, Users, Mail } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface HealthCheck {
  healthy: boolean;
  responseTime?: number;
  rate?: number;
  errorCount?: number;
  totalRequests?: number;
  avgResponseTime?: number;
  message: string;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  checks: {
    database: HealthCheck;
    errorRate: HealthCheck;
    apiPerformance: HealthCheck;
  };
  metrics: {
    activeUsers: number;
    activeAccounts: number;
    requestsLast24Hours: number;
    errorsLast24Hours: number;
  };
  activity: {
    byHour: Array<{
      hour: string;
      requests: number;
      errors: number;
      avgDuration: number;
      errorRate: string;
    }>;
    byType: Array<{
      type: string;
      count: number;
      avgDuration: number;
    }>;
  };
  errors: {
    topEndpoints: Array<{
      path: string | null;
      method: string | null;
      count: number;
      lastError: string | null;
    }>;
    trend: Array<{
      date: string;
      errors: number;
      total: number;
      rate: string;
    }>;
  };
  flaggedActivities: Array<{
    id: string;
    userId: string;
    type: string;
    name: string;
    status: string;
    error: string | null;
    createdAt: Date;
  }>;
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/admin/system-health');
      const data = await response.json();
      if (data.success) {
        setHealth(data.data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch system health:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getHealthIcon = (healthy: boolean) => {
    return healthy ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : (
      <AlertTriangle className="h-5 w-5 text-yellow-600" />
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading system health...</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!health) {
    return (
      <AdminLayout>
        <div className="p-8">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <p className="text-muted-foreground">Failed to load system health data</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Health</h1>
            <p className="text-muted-foreground mt-2">
              Real-time monitoring and performance metrics
            </p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div>Last updated: {lastUpdated?.toLocaleTimeString()}</div>
            <div className="text-xs mt-1">Auto-refreshes every 30s</div>
          </div>
        </div>

        {/* Overall Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-6 w-6" />
                System Status
              </CardTitle>
              <Badge className={getStatusColor(health.status)}>
                {health.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Health Checks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Database Health */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Database</CardTitle>
              {getHealthIcon(health.checks.database.healthy)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {health.checks.database.responseTime}ms
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {health.checks.database.message}
              </p>
            </CardContent>
          </Card>

          {/* Error Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              {getHealthIcon(health.checks.errorRate.healthy)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {health.checks.errorRate.rate}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {health.checks.errorRate.errorCount} of {health.checks.errorRate.totalRequests} requests
              </p>
            </CardContent>
          </Card>

          {/* API Performance */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Performance</CardTitle>
              {getHealthIcon(health.checks.apiPerformance.healthy)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {health.checks.apiPerformance.avgResponseTime}ms
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {health.checks.apiPerformance.message}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{health.metrics.activeUsers}</div>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Email Accounts</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{health.metrics.activeAccounts}</div>
              <p className="text-xs text-muted-foreground">Active connections</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{health.metrics.requestsLast24Hours.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Errors</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{health.metrics.errorsLast24Hours}</div>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>
        </div>

        {/* Activity by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Top Activity Types (Last 24 Hours)</CardTitle>
            <CardDescription>Most common operations</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity Type</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Avg Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {health.activity.byType.slice(0, 10).map((type, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{type.type || 'Unknown'}</TableCell>
                    <TableCell className="text-right">{type.count.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{type.avgDuration}ms</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Error Endpoints */}
        {health.errors.topEndpoints.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Top Error Endpoints (Last 24 Hours)
              </CardTitle>
              <CardDescription>Endpoints with the most errors</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Error Count</TableHead>
                    <TableHead>Last Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {health.errors.topEndpoints.map((endpoint, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{endpoint.path || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{endpoint.method}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {endpoint.count}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-md">
                        {endpoint.lastError || 'No error message'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Error Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Error Trend (Last 7 Days)</CardTitle>
            <CardDescription>Daily error rate over time</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                  <TableHead className="text-right">Total Requests</TableHead>
                  <TableHead className="text-right">Error Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {health.errors.trend.map((day, index) => (
                  <TableRow key={index}>
                    <TableCell>{new Date(day.date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">{day.errors}</TableCell>
                    <TableCell className="text-right">{day.total.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={parseFloat(day.rate) > 5 ? 'text-red-600' : 'text-green-600'}
                      >
                        {day.rate}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Flagged Activities */}
        {health.flaggedActivities.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Flagged Activities (Last 24 Hours)
              </CardTitle>
              <CardDescription>Critical events requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {health.flaggedActivities.slice(0, 10).map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="text-sm">
                        {new Date(activity.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{activity.type}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{activity.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={activity.status === 'error' ? 'text-red-600' : ''}
                        >
                          {activity.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-xs">
                        {activity.error || 'No error message'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
