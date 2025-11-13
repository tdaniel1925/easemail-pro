'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Activity,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  Mail,
  MessageSquare,
  Brain,
  HardDrive,
  Calendar
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  subscriptionTier: string;
  createdAt: Date;
}

interface ActivityLog {
  id: string;
  activityType: string;
  activityName: string;
  status: string;
  isFlagged: boolean;
  errorMessage: string | null;
  duration: number | null;
  path: string | null;
  metadata: any;
  createdAt: Date;
}

interface UsageStats {
  sms: {
    totalMessages: number;
    totalCost: number;
    byDay: any[];
  };
  ai: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    byDay: any[];
  };
  storage: {
    totalUsageBytes: number;
    totalUsageGB: string;
  };
  data: {
    emailAccounts: number;
    totalEmails: number;
  };
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [user, setUser] = useState<User | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);

      // Fetch user details
      const userRes = await fetch(`/api/admin/users/${userId}`);
      const userData = await userRes.json();
      if (userData.success) setUser(userData.user);

      // Fetch recent activities
      const activityRes = await fetch(`/api/admin/users/${userId}/activity?limit=50`);
      const activityData = await activityRes.json();
      if (activityData.success) setActivities(activityData.activities);

      // Fetch usage stats
      const usageRes = await fetch(`/api/admin/users/${userId}/usage?days=30`);
      const usageData = await usageRes.json();
      if (usageData.success) setUsage(usageData.usage);

    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isBetaUser = user?.subscriptionTier === 'beta';

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; label: string }> = {
      success: { color: 'bg-green-500/20 text-green-600 border-green-500/30', label: 'Success' },
      error: { color: 'bg-red-500/20 text-red-600 border-red-500/30', label: 'Error' },
      warning: { color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30', label: 'Warning' },
    };
    const variant = variants[status] || variants.success;
    return <Badge className={variant.color}>{variant.label}</Badge>;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-muted-foreground">Loading user details...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-destructive">User not found</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/users')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        </div>

        {/* User Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{user.fullName || 'No Name'}</CardTitle>
                <CardDescription className="text-base mt-1">{user.email}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge>{user.role}</Badge>
                <Badge variant={isBetaUser ? 'default' : 'secondary'}>
                  {user.subscriptionTier}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Member Since</div>
                <div className="font-medium">{formatDate(user.createdAt.toString())}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Email Accounts</div>
                <div className="font-medium">{usage?.data.emailAccounts || 0}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Emails</div>
                <div className="font-medium">{usage?.data.totalEmails || 0}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Storage Used</div>
                <div className="font-medium">{usage?.storage.totalUsageGB || '0'} GB</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">
              Activity {isBetaUser && <Badge className="ml-2" variant="default">Beta</Badge>}
            </TabsTrigger>
            <TabsTrigger value="usage">Usage Stats</TabsTrigger>
            <TabsTrigger value="errors" className="relative">
              Errors
              {activities.filter(a => a.isFlagged).length > 0 && (
                <Badge className="ml-2" variant="destructive">
                  {activities.filter(a => a.isFlagged).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {activities.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between text-sm">
                        <span className="truncate flex-1">{activity.activityName}</span>
                        <span className="text-muted-foreground text-xs ml-2">
                          {formatDate(activity.createdAt.toString())}
                        </span>
                      </div>
                    ))}
                    {activities.length === 0 && (
                      <div className="text-sm text-muted-foreground">No recent activity</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Usage Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">SMS Messages</span>
                      </div>
                      <span className="font-medium">{usage?.sms.totalMessages || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">AI Requests</span>
                      </div>
                      <span className="font-medium">{usage?.ai.totalRequests || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Storage</span>
                      </div>
                      <span className="font-medium">{usage?.storage.totalUsageGB || '0'} GB</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>
                  {isBetaUser ? 'Detailed activity tracking for beta user' : 'Recent user activities'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex-shrink-0">
                        {activity.status === 'success' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : activity.status === 'error' ? (
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{activity.activityName}</span>
                          {getStatusBadge(activity.status)}
                          {activity.isFlagged && (
                            <Badge variant="destructive">Flagged</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {activity.activityType} • {activity.path || 'N/A'}
                          {activity.duration && ` • ${activity.duration}ms`}
                        </div>
                        {activity.errorMessage && (
                          <div className="text-sm text-destructive mt-1">
                            {activity.errorMessage}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        {formatDate(activity.createdAt.toString())}
                      </div>
                    </div>
                  ))}
                  {activities.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No activity logs found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    SMS Usage (Last 30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Total Messages</div>
                      <div className="text-2xl font-bold">{usage?.sms.totalMessages || 0}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Total Cost</div>
                      <div className="text-2xl font-bold">${(usage?.sms.totalCost || 0).toFixed(2)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Usage (Last 30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Total Requests</div>
                      <div className="text-2xl font-bold">{usage?.ai.totalRequests || 0}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Total Tokens</div>
                      <div className="text-2xl font-bold">{(usage?.ai.totalTokens || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Total Cost</div>
                      <div className="text-2xl font-bold">${(usage?.ai.totalCost || 0).toFixed(2)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Connected Accounts</div>
                      <div className="text-2xl font-bold">{usage?.data.emailAccounts || 0}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Total Emails</div>
                      <div className="text-2xl font-bold">{(usage?.data.totalEmails || 0).toLocaleString()}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Errors Tab */}
          <TabsContent value="errors">
            <Card>
              <CardHeader>
                <CardTitle>Flagged Errors & Issues</CardTitle>
                <CardDescription>
                  Errors that need admin attention for troubleshooting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activities.filter(a => a.isFlagged).map((activity) => (
                    <div
                      key={activity.id}
                      className="p-4 border border-destructive/30 rounded-lg bg-destructive/5"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            <span className="font-medium">{activity.activityName}</span>
                            <Badge variant="destructive">Flagged</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mb-2">
                            {activity.activityType} • {activity.path || 'N/A'}
                          </div>
                          {activity.errorMessage && (
                            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded mt-2">
                              <div className="font-medium mb-1">Error Message:</div>
                              {activity.errorMessage}
                            </div>
                          )}
                          {activity.metadata && (
                            <details className="mt-2">
                              <summary className="text-sm cursor-pointer text-muted-foreground hover:text-foreground">
                                View metadata
                              </summary>
                              <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto">
                                {JSON.stringify(activity.metadata, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground text-right ml-4">
                          {formatDate(activity.createdAt.toString())}
                        </div>
                      </div>
                    </div>
                  ))}
                  {activities.filter(a => a.isFlagged).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                      No flagged errors - user is running smoothly!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
