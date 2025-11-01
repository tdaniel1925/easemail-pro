/**
 * Communication Timeline Component
 * Display all non-email interactions (SMS, calls, notes) with a contact
 */

'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, Phone, Calendar, FileText, Loader2, ExternalLink, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface TimelineItem {
  id: string;
  type: string;
  direction?: string;
  body?: string;
  snippet?: string;
  status?: string;
  metadata?: any;
  occurredAt: Date;
  itemType: 'communication' | 'note';
  sms?: any;
  isPinned?: boolean;
}

interface CommunicationTimelineProps {
  contactId: string;
}

export function CommunicationTimeline({ contactId }: CommunicationTimelineProps) {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchTimeline();
  }, [contactId]);

  const fetchTimeline = async () => {
    try {
      const response = await fetch(`/api/contacts/${contactId}/timeline`);
      const data = await response.json();
      if (data.success) {
        setTimeline(data.timeline);
      }
    } catch (error) {
      console.error('Failed to fetch timeline:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTimeline = filter === 'all' 
    ? timeline 
    : timeline.filter(item => item.type === filter || item.itemType === filter);

  const getIcon = (type: string) => {
    switch (type) {
      case 'sms_sent':
      case 'sms_received':
        return <MessageSquare className="h-4 w-4" />;
      case 'call_made':
      case 'call_received':
        return <Phone className="h-4 w-4" />;
      case 'meeting':
        return <Calendar className="h-4 w-4" />;
      case 'note':
        return <FileText className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getIconColor = (type: string, direction?: string) => {
    if (type.includes('sms')) {
      return direction === 'outbound' 
        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
        : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
    }
    if (type.includes('call')) {
      return direction === 'outbound'
        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
        : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400';
    }
    if (type === 'note') {
      return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
    }
    return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;

    const statusColors: Record<string, string> = {
      delivered: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      sent: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      failed: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    };

    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || statusColors.pending}`}>
        {status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Communication Timeline
        </h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-xs px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
        >
          <option value="all">All</option>
          <option value="sms_sent">SMS</option>
          <option value="call_made">Calls</option>
          <option value="meeting">Meetings</option>
          <option value="note">Notes</option>
        </select>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {filteredTimeline.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
            No communications yet
          </div>
        ) : (
          filteredTimeline.map((item, index) => (
            <div key={item.id} className="flex gap-3">
              {/* Timeline Line */}
              <div className="flex flex-col items-center">
                <div className={`p-2 rounded-full ${getIconColor(item.type, item.direction)}`}>
                  {getIcon(item.type)}
                </div>
                {index < filteredTimeline.length - 1 && (
                  <div className="w-0.5 h-full min-h-[20px] bg-gray-200 dark:bg-gray-700 my-1" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                      {item.type.replace('_', ' ')}
                    </span>
                    {item.direction && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        {item.direction === 'outbound' ? (
                          <>
                            <ArrowUpRight className="h-3 w-3" />
                            Sent
                          </>
                        ) : (
                          <>
                            <ArrowDownLeft className="h-3 w-3" />
                            Received
                          </>
                        )}
                      </span>
                    )}
                    {getStatusBadge(item.status)}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatDistanceToNow(new Date(item.occurredAt), { addSuffix: true })}
                  </span>
                </div>

                {/* Body/Snippet */}
                {(item.body || item.snippet) && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap mb-2">
                    {item.snippet || item.body}
                  </p>
                )}

                {/* Metadata */}
                {item.metadata && (
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                    {item.metadata.segments && (
                      <span>{item.metadata.segments} segment{item.metadata.segments > 1 ? 's' : ''}</span>
                    )}
                    {item.metadata.cost && (
                      <span>${item.metadata.cost}</span>
                    )}
                    {item.metadata.encoding && (
                      <span>{item.metadata.encoding}</span>
                    )}
                    {item.metadata.country && (
                      <span>🌍 {item.metadata.country}</span>
                    )}
                  </div>
                )}

                {/* Full Date */}
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {format(new Date(item.occurredAt), 'PPpp')}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

