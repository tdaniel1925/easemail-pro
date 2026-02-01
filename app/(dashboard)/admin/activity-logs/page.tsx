'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Activity,
  Search,
  Download,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';

interface ActivityLog {
  id: string;
  userId: string;
  userEmail: string;
  userFullName: string | null;
  activityType: string;
  activityName: string;
  path: string | null;
  method: string | null;
  status: string;
  errorMessage: string | null;
  isFlagged: boolean;
  metadata: Record<string, any> | null;
  duration: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  createdAt: string;
}

interface Summary {
  byType: Array<{ activityType: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  flaggedCount: number;
}

const STATUS_COLORS = {
  success: 'bg-green-500/10 text-green-500 border-green-500/20',
  error: 'bg-red-500/10 text-red-500 border-red-500/20',
  warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
};

const STATUS_ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
};

export default function ActivityLogsPage() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [activityType, setActivityType] = useState('');
  const [status, setStatus] = useState('');
  const [isFlagged, setIsFlagged] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 50;

  useEffect(() => {
    fetchActivities();
  }, [page, activityType, status, isFlagged, startDate, endDate]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: ((page - 1) * limit).toString(),
      });

      if (search) params.append('search', search);
      if (activityType) params.append('activityType', activityType);
      if (status) params.append('status', status);
      if (isFlagged) params.append('isFlagged', isFlagged);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/admin/activity-logs?${params}`);
      const data = await response.json();

      if (data.success) {
        setActivities(data.activities);
        setSummary(data.summary);
        setTotalCount(data.pagination.total);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchActivities();
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        export: 'true',
      });

      if (search) params.append('search', search);
      if (activityType) params.append('activityType', activityType);
      if (status) params.append('status', status);
      if (isFlagged) params.append('isFlagged', isFlagged);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/admin/activity-logs/export?${params}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-logs-${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export activities:', error);
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Activity Logs
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor system activity and user actions across the platform
          </p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Status Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {summary.byStatus.map((s) => {
                    const StatusIcon = STATUS_ICONS[s.status as keyof typeof STATUS_ICONS] || Activity;
                    return (
                      <div key={s.status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <StatusIcon className="h-4 w-4" />
                          <span className="text-sm capitalize">{s.status}</span>
                        </div>
                        <span className="text-sm font-medium">{s.count.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Top Activity Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {summary.byType.slice(0, 5).map((type) => (
                    <div key={type.activityType} className="flex items-center justify-between">
                      <span className="text-sm">{type.activityType}</span>
                      <span className="text-sm font-medium">{type.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Flagged Activities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.flaggedCount.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Search</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search activities..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button size="icon" onClick={handleSearch}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Activity Type</label>
                <Select value={activityType} onValueChange={setActivityType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
                    {summary?.byType.map((type) => (
                      <SelectItem key={type.activityType} value={type.activityType}>
                        {type.activityType} ({type.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Flagged</label>
                <Select value={isFlagged} onValueChange={setIsFlagged}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="true">Flagged only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={fetchActivities} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={handleExport} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Activity Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activities</CardTitle>
              <div className="text-sm text-muted-foreground">
                Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, totalCount)} of {totalCount}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No activities found
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((activity) => {
                      const StatusIcon = STATUS_ICONS[activity.status as keyof typeof STATUS_ICONS] || Activity;
                      return (
                        <TableRow
                          key={activity.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedActivity(activity)}
                        >
                          <TableCell className="font-mono text-xs">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(activity.createdAt), 'MMM d, HH:mm:ss')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <div>
                                <div className="font-medium text-sm">
                                  {activity.userFullName || 'Unknown'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {activity.userEmail}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{activity.activityName}</div>
                            {activity.path && (
                              <div className="text-xs text-muted-foreground font-mono">
                                {activity.method} {activity.path}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{activity.activityType}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={STATUS_COLORS[activity.status as keyof typeof STATUS_COLORS]}
                            >
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {activity.status}
                            </Badge>
                            {activity.isFlagged && (
                              <Badge variant="destructive" className="ml-2">
                                Flagged
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {activity.duration ? `${activity.duration}ms` : '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedActivity(activity);
                              }}
                            >
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Activity Detail Dialog */}
        <Dialog open={!!selectedActivity} onOpenChange={() => setSelectedActivity(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Activity Details</DialogTitle>
              <DialogDescription>
                Detailed information about this activity log entry
              </DialogDescription>
            </DialogHeader>

            {selectedActivity && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Timestamp</label>
                    <p className="text-sm">{format(new Date(selectedActivity.createdAt), 'PPpp')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Duration</label>
                    <p className="text-sm">{selectedActivity.duration ? `${selectedActivity.duration}ms` : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">User</label>
                    <p className="text-sm">{selectedActivity.userEmail}</p>
                    <p className="text-xs text-muted-foreground">{selectedActivity.userFullName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Badge className={STATUS_COLORS[selectedActivity.status as keyof typeof STATUS_COLORS]}>
                      {selectedActivity.status}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Activity</label>
                  <p className="text-sm">{selectedActivity.activityName}</p>
                  <p className="text-xs text-muted-foreground">{selectedActivity.activityType}</p>
                </div>

                {selectedActivity.path && (
                  <div>
                    <label className="text-sm font-medium">Request</label>
                    <p className="text-sm font-mono bg-muted p-2 rounded">
                      {selectedActivity.method} {selectedActivity.path}
                    </p>
                  </div>
                )}

                {selectedActivity.errorMessage && (
                  <div>
                    <label className="text-sm font-medium">Error Message</label>
                    <p className="text-sm text-red-500">{selectedActivity.errorMessage}</p>
                  </div>
                )}

                {selectedActivity.ipAddress && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">IP Address</label>
                      <p className="text-sm font-mono">{selectedActivity.ipAddress}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Device</label>
                      <p className="text-sm">{selectedActivity.device || 'Unknown'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Browser</label>
                      <p className="text-sm">{selectedActivity.browser || 'Unknown'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">OS</label>
                      <p className="text-sm">{selectedActivity.os || 'Unknown'}</p>
                    </div>
                  </div>
                )}

                {selectedActivity.metadata && Object.keys(selectedActivity.metadata).length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Metadata</label>
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                      {JSON.stringify(selectedActivity.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
