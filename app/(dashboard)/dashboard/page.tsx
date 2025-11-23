'use client';

import { useState, useEffect, Suspense } from 'react';
import {
  Calendar,
  Mail,
  Clock,
  TrendingUp,
  Plus,
  Send,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Users,
  BarChart3,
  Pencil,
  Check,
  X as XIcon,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAccount } from '@/contexts/AccountContext';
import { useRouter } from 'next/navigation';
import { format, isToday, isTomorrow, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';

function DashboardContent() {
  const { selectedAccount } = useAccount();
  const router = useRouter();

  // State
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [recentEmails, setRecentEmails] = useState<any[]>([]);
  const [weeklyStats, setWeeklyStats] = useState({
    emailsSent: 0,
    emailsReceived: 0,
    meetingsAttended: 0,
    avgResponseTime: '0h',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable title state
  const [companyName, setCompanyName] = useState<string>('');
  const [userNickname, setUserNickname] = useState<string>('');
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [tempCompanyName, setTempCompanyName] = useState('');
  const [tempUserNickname, setTempUserNickname] = useState('');

  // Load saved company name and nickname from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedAccount?.nylasGrantId) {
      const savedCompany = localStorage.getItem(`dashboard-company-${selectedAccount.nylasGrantId}`);
      const savedNickname = localStorage.getItem(`dashboard-nickname-${selectedAccount.nylasGrantId}`);

      if (savedCompany) setCompanyName(savedCompany);
      if (savedNickname) setUserNickname(savedNickname);
    }
  }, [selectedAccount?.nylasGrantId]);

  const handleSaveCompanyName = () => {
    if (typeof window !== 'undefined' && selectedAccount?.nylasGrantId) {
      localStorage.setItem(`dashboard-company-${selectedAccount.nylasGrantId}`, tempCompanyName);
      setCompanyName(tempCompanyName);
      setIsEditingCompany(false);
    }
  };

  const handleSaveNickname = () => {
    if (typeof window !== 'undefined' && selectedAccount?.nylasGrantId) {
      localStorage.setItem(`dashboard-nickname-${selectedAccount.nylasGrantId}`, tempUserNickname);
      setUserNickname(tempUserNickname);
      setIsEditingNickname(false);
    }
  };

  const handleCancelCompanyEdit = () => {
    setTempCompanyName(companyName);
    setIsEditingCompany(false);
  };

  const handleCancelNicknameEdit = () => {
    setTempUserNickname(userNickname);
    setIsEditingNickname(false);
  };

  // Fetch dashboard data
  useEffect(() => {
    if (selectedAccount?.nylasGrantId) {
      fetchDashboardData();
    }
  }, [selectedAccount?.nylasGrantId]);

  const fetchDashboardData = async () => {
    if (!selectedAccount?.nylasGrantId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch today's events
      const eventsRes = await fetch('/api/calendar/events');
      const eventsData = await eventsRes.json();

      if (eventsData.success) {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart);
        todayEnd.setHours(23, 59, 59, 999);

        const todayEventsFiltered = eventsData.events.filter((event: any) => {
          const eventStart = new Date(event.startTime);
          return eventStart >= todayStart && eventStart <= todayEnd;
        }).sort((a: any, b: any) => {
          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        });

        setTodayEvents(todayEventsFiltered.slice(0, 5)); // Show max 5 events
      }

      // Fetch email data (unread count + recent emails)
      const emailsRes = await fetch(`/api/emails?accountId=${selectedAccount.nylasGrantId}&limit=5`);
      const emailsData = await emailsRes.json();

      if (emailsData.success) {
        setRecentEmails(emailsData.emails || []);
        // Count unread
        const unread = emailsData.emails?.filter((e: any) => e.unread).length || 0;
        setUnreadCount(unread);
      }

      // Calculate weekly stats
      const weekStart = startOfWeek(new Date());
      const weekEnd = endOfWeek(new Date());

      // For MVP, use simple calculations
      // TODO: Add proper API endpoints for stats
      setWeeklyStats({
        emailsSent: Math.floor(Math.random() * 50) + 10, // Mock data for now
        emailsReceived: emailsData.emails?.length || 0,
        meetingsAttended: todayEventsFiltered.length,
        avgResponseTime: '2h',
      });

    } catch (err) {
      console.error('[Dashboard] Error fetching data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatEventTime = (startTime: string, endTime: string) => {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
    } catch {
      return 'Time unavailable';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  // Determine display name
  const displayName = userNickname || selectedAccount?.emailAddress?.split('@')[0] || 'there';

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="container max-w-7xl mx-auto p-6 space-y-6">
        {/* Header with Editable Company Name and Nickname */}
        <div className="flex flex-col gap-3">
          {/* Company Name Row */}
          <div className="flex items-center gap-2">
            {isEditingCompany ? (
              <div className="flex items-center gap-2 flex-1">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <Input
                  value={tempCompanyName}
                  onChange={(e) => setTempCompanyName(e.target.value)}
                  placeholder="Enter company name..."
                  className="max-w-md"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveCompanyName();
                    if (e.key === 'Escape') handleCancelCompanyEdit();
                  }}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSaveCompanyName}
                  className="h-8 w-8 p-0"
                >
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelCompanyEdit}
                  className="h-8 w-8 p-0"
                >
                  <XIcon className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                {companyName ? (
                  <span className="text-lg font-medium text-muted-foreground">{companyName}</span>
                ) : (
                  <span className="text-sm text-muted-foreground italic">Add company name</span>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setTempCompanyName(companyName);
                    setIsEditingCompany(true);
                  }}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Greeting Row with Editable Nickname */}
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">
              {greeting},{' '}
              {isEditingNickname ? (
                <span className="inline-flex items-center gap-2">
                  <Input
                    value={tempUserNickname}
                    onChange={(e) => setTempUserNickname(e.target.value)}
                    placeholder="Enter your name..."
                    className="inline-block w-64 h-10 text-3xl font-bold"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveNickname();
                      if (e.key === 'Escape') handleCancelNicknameEdit();
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSaveNickname}
                    className="h-8 w-8 p-0"
                  >
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelNicknameEdit}
                    className="h-8 w-8 p-0"
                  >
                    <XIcon className="h-4 w-4 text-red-600" />
                  </Button>
                </span>
              ) : (
                <span className="group inline-flex items-center gap-2">
                  {displayName}!
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setTempUserNickname(userNickname);
                      setIsEditingNickname(true);
                    }}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </span>
              )}
            </h1>
          </div>

          <p className="text-muted-foreground">
            {format(now, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Button
            onClick={() => router.push('/inbox?compose=true')}
            className="h-20 text-base font-semibold"
          >
            <Send className="mr-2 h-5 w-5" />
            Compose Email
          </Button>
          <Button
            onClick={() => router.push('/calendar')}
            variant="outline"
            className="h-20 text-base font-semibold"
          >
            <Calendar className="mr-2 h-5 w-5" />
            View Calendar
          </Button>
          <Button
            onClick={() => router.push('/inbox')}
            variant="outline"
            className="h-20 text-base font-semibold"
          >
            <Mail className="mr-2 h-5 w-5" />
            Check Inbox
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search everything..."
              className="h-20 pl-10 text-base"
              onFocus={() => router.push('/inbox')}
            />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Schedule - Left Column (2/3 width) */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Schedule
              </CardTitle>
              <CardDescription>
                {todayEvents.length === 0 ? 'No events scheduled' : `${todayEvents.length} event${todayEvents.length > 1 ? 's' : ''} today`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {todayEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Your calendar is clear today!</p>
                  <Button
                    variant="link"
                    className="mt-2"
                    onClick={() => router.push('/calendar')}
                  >
                    Schedule an event
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayEvents.map((event: any) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => router.push('/calendar')}
                    >
                      <div
                        className="w-1 h-full rounded-full flex-shrink-0 min-h-[60px]"
                        style={{ backgroundColor: event.hexColor || '#3b82f6' }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{event.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          <Clock className="inline h-3 w-3 mr-1" />
                          {formatEventTime(event.startTime, event.endTime)}
                        </p>
                        {event.location && (
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            📍 {event.location}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/calendar')}
                  >
                    View Full Calendar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email Summary - Right Column */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Inbox
              </CardTitle>
              <CardDescription>
                {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentEmails.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Inbox Zero!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentEmails.slice(0, 5).map((email: any) => (
                    <div
                      key={email.id}
                      className={cn(
                        "p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer",
                        email.unread && "bg-accent/20"
                      )}
                      onClick={() => router.push(`/inbox?email=${email.id}`)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm truncate",
                            email.unread && "font-semibold"
                          )}>
                            {email.from?.[0]?.name || email.from?.[0]?.email || 'Unknown'}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {email.subject || '(No subject)'}
                          </p>
                        </div>
                        {email.unread && (
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                        )}
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/inbox')}
                  >
                    Go to Inbox
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Weekly Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              This Week's Activity
            </CardTitle>
            <CardDescription>
              {format(startOfWeek(now), 'MMM d')} - {format(endOfWeek(now), 'MMM d, yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-accent/50">
                <div className="text-3xl font-bold text-primary">{weeklyStats.emailsReceived}</div>
                <div className="text-sm text-muted-foreground mt-1">Emails Received</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-accent/50">
                <div className="text-3xl font-bold text-primary">{weeklyStats.emailsSent}</div>
                <div className="text-sm text-muted-foreground mt-1">Emails Sent</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-accent/50">
                <div className="text-3xl font-bold text-primary">{todayEvents.length}</div>
                <div className="text-sm text-muted-foreground mt-1">Events Today</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-accent/50">
                <div className="text-3xl font-bold text-primary">{weeklyStats.avgResponseTime}</div>
                <div className="text-sm text-muted-foreground mt-1">Avg Response Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
