/**
 * Dashboard Panel - Global slide-out dashboard
 * Accessible from anywhere in the app via top navigation
 * Shows today's snapshot: events, emails, stats, quick actions
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  Mail,
  Clock,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  Pencil,
  Check,
  X as XIcon,
  Building2,
  LayoutDashboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAccount } from '@/contexts/AccountContext';
import { useRouter } from 'next/navigation';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';

interface DashboardPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DashboardPanel({ isOpen, onClose }: DashboardPanelProps) {
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
  const [loading, setLoading] = useState(false);
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

  // Fetch dashboard data when panel opens
  useEffect(() => {
    if (isOpen && selectedAccount?.nylasGrantId) {
      fetchDashboardData();
    }
  }, [isOpen, selectedAccount?.nylasGrantId]);

  const fetchDashboardData = async () => {
    if (!selectedAccount?.nylasGrantId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch today's events
      const eventsRes = await fetch('/api/calendar/events');
      const eventsData = await eventsRes.json();

      let todayEventsFiltered: any[] = [];

      if (eventsData.success) {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart);
        todayEnd.setHours(23, 59, 59, 999);

        todayEventsFiltered = eventsData.events.filter((event: any) => {
          const eventStart = new Date(event.startTime);
          return eventStart >= todayStart && eventStart <= todayEnd;
        }).sort((a: any, b: any) => {
          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        });

        setTodayEvents(todayEventsFiltered.slice(0, 3)); // Show max 3 events in panel
      }

      // Fetch email data (unread count + recent emails)
      const emailsRes = await fetch(`/api/emails?accountId=${selectedAccount.nylasGrantId}&limit=3`);
      const emailsData = await emailsRes.json();

      if (emailsData.success) {
        setRecentEmails(emailsData.emails || []);
        // Count unread
        const unread = emailsData.emails?.filter((e: any) => e.unread).length || 0;
        setUnreadCount(unread);
      }

      // Calculate weekly stats
      setWeeklyStats({
        emailsSent: Math.floor(Math.random() * 50) + 10, // Mock data for now
        emailsReceived: emailsData.emails?.length || 0,
        meetingsAttended: todayEventsFiltered.length,
        avgResponseTime: '2h',
      });

    } catch (err) {
      console.error('[Dashboard Panel] Error fetching data:', err);
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

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const displayName = userNickname || selectedAccount?.emailAddress?.split('@')[0] || 'there';

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Dashboard Panel */}
      <div className="fixed top-0 right-0 h-full w-[480px] bg-background border-l border-border shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-accent">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
                <LayoutDashboard className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Dashboard</h2>
                <p className="text-xs text-muted-foreground">Your workspace snapshot</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Editable Header */}
                <div className="space-y-2">
                  {/* Company Name */}
                  <div className="flex items-center gap-2">
                    {isEditingCompany ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <Input
                          value={tempCompanyName}
                          onChange={(e) => setTempCompanyName(e.target.value)}
                          placeholder="Enter company name..."
                          className="flex-1 h-8 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveCompanyName();
                            if (e.key === 'Escape') handleCancelCompanyEdit();
                          }}
                        />
                        <Button size="sm" variant="ghost" onClick={handleSaveCompanyName} className="h-6 w-6 p-0">
                          <Check className="h-3 w-3 text-green-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelCompanyEdit} className="h-6 w-6 p-0">
                          <XIcon className="h-3 w-3 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {companyName ? (
                          <span className="text-sm font-medium text-muted-foreground">{companyName}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Add company name</span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setTempCompanyName(companyName);
                            setIsEditingCompany(true);
                          }}
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Greeting with Nickname */}
                  <div className="flex items-center gap-2">
                    {isEditingNickname ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={tempUserNickname}
                          onChange={(e) => setTempUserNickname(e.target.value)}
                          placeholder="Enter your name..."
                          className="flex-1 h-8 text-lg font-bold"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveNickname();
                            if (e.key === 'Escape') handleCancelNicknameEdit();
                          }}
                        />
                        <Button size="sm" variant="ghost" onClick={handleSaveNickname} className="h-6 w-6 p-0">
                          <Check className="h-3 w-3 text-green-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelNicknameEdit} className="h-6 w-6 p-0">
                          <XIcon className="h-3 w-3 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <h3 className="text-lg font-bold group inline-flex items-center gap-2">
                        {greeting}, {displayName}!
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setTempUserNickname(userNickname);
                            setIsEditingNickname(true);
                          }}
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </h3>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
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
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => { router.push('/inbox?compose=true'); onClose(); }} className="h-16">
                    <Send className="mr-2 h-4 w-4" />
                    Compose
                  </Button>
                  <Button onClick={() => { router.push('/calendar'); onClose(); }} variant="outline" className="h-16">
                    <Calendar className="mr-2 h-4 w-4" />
                    Calendar
                  </Button>
                </div>

                {/* Today's Schedule */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Today's Schedule
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {todayEvents.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No events today</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {todayEvents.map((event: any) => (
                          <div
                            key={event.id}
                            className="flex items-start gap-2 p-2 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                            onClick={() => { router.push('/calendar'); onClose(); }}
                          >
                            <div
                              className="w-1 h-full rounded-full flex-shrink-0 min-h-[40px]"
                              style={{ backgroundColor: event.hexColor || '#3b82f6' }}
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium truncate">{event.title}</h4>
                              <p className="text-xs text-muted-foreground">
                                <Clock className="inline h-3 w-3 mr-1" />
                                {formatEventTime(event.startTime, event.endTime)}
                              </p>
                            </div>
                          </div>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => { router.push('/calendar'); onClose(); }}
                        >
                          View All Events
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Inbox Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Inbox
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {unreadCount} unread
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentEmails.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">Inbox Zero!</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {recentEmails.map((email: any) => (
                          <div
                            key={email.id}
                            className={cn(
                              "p-2 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer",
                              email.unread && "bg-accent/20"
                            )}
                            onClick={() => { router.push(`/inbox?email=${email.id}`); onClose(); }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className={cn("text-xs truncate", email.unread && "font-semibold")}>
                                  {email.from?.[0]?.name || email.from?.[0]?.email || 'Unknown'}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
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
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => { router.push('/inbox'); onClose(); }}
                        >
                          Go to Inbox
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Weekly Stats */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      This Week
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center p-3 rounded-lg bg-accent/50">
                        <div className="text-2xl font-bold text-primary">{weeklyStats.emailsReceived}</div>
                        <div className="text-xs text-muted-foreground mt-1">Received</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-accent/50">
                        <div className="text-2xl font-bold text-primary">{todayEvents.length}</div>
                        <div className="text-xs text-muted-foreground mt-1">Events Today</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
