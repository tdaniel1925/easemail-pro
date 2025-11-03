'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UsageTrendsChartProps {
  dateRange: {
    start: string;
    end: string;
  };
}

export default function UsageTrendsChart({ dateRange }: UsageTrendsChartProps) {
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<any>(null);
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day');

  useEffect(() => {
    fetchTrends();
  }, [dateRange, granularity]);

  const fetchTrends = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate: dateRange.start,
        endDate: dateRange.end,
        granularity,
        type: 'all',
      });

      const response = await fetch(`/api/admin/usage/trends?${params}`);
      const data = await response.json();

      if (data.success) {
        setTrends(data.trends);
      }
    } catch (error) {
      console.error('Failed to fetch usage trends:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Loading trends...</p>
      </div>
    );
  }

  if (!trends) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No trend data available
      </div>
    );
  }

  // Format data for charts
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (granularity === 'day') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (granularity === 'week') {
      return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  const smsData = trends.sms?.map((item: any) => ({
    date: formatDate(item.date),
    messages: item.messages,
    cost: item.cost,
  })) || [];

  const aiData = trends.ai?.map((item: any) => ({
    date: formatDate(item.date),
    requests: item.requests,
    cost: item.cost,
  })) || [];

  const storageData = trends.storage?.map((item: any) => ({
    date: formatDate(item.date),
    gb: parseFloat(item.gb),
    cost: item.cost,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Granularity Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setGranularity('day')}
          className={`px-3 py-1 text-sm rounded-md ${
            granularity === 'day'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground'
          }`}
        >
          Daily
        </button>
        <button
          onClick={() => setGranularity('week')}
          className={`px-3 py-1 text-sm rounded-md ${
            granularity === 'week'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground'
          }`}
        >
          Weekly
        </button>
        <button
          onClick={() => setGranularity('month')}
          className={`px-3 py-1 text-sm rounded-md ${
            granularity === 'month'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground'
          }`}
        >
          Monthly
        </button>
      </div>

      <Tabs defaultValue="sms" className="w-full">
        <TabsList>
          <TabsTrigger value="sms">SMS</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
        </TabsList>

        <TabsContent value="sms" className="space-y-4">
          {smsData.length > 0 ? (
            <>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={smsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="messages" stroke="#8884d8" name="Messages Sent" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={smsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="cost" fill="#82ca9d" name="Cost ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">No SMS data for this period</p>
          )}
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          {aiData.length > 0 ? (
            <>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={aiData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="requests" stroke="#8884d8" name="AI Requests" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aiData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="cost" fill="#ffc658" name="Cost ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">No AI data for this period</p>
          )}
        </TabsContent>

        <TabsContent value="storage" className="space-y-4">
          {storageData.length > 0 ? (
            <>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={storageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="gb" stroke="#8884d8" name="Storage (GB)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={storageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="cost" fill="#ff7c7c" name="Overage Cost ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">No storage data for this period</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

