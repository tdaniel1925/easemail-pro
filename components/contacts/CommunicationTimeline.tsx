/**
 * Communication Timeline Component
 * Display all non-email interactions (SMS, calls, notes) with a contact in a table format
 */

'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, Phone, Calendar, FileText, Loader2, ArrowUpRight, ArrowDownLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

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
  smsId?: string;
  isPinned?: boolean;
}

interface CommunicationTimelineProps {
  contactId: string;
}

export function CommunicationTimeline({ contactId }: CommunicationTimelineProps) {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

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
    : timeline.filter(item => {
        if (filter === 'sms') return item.type === 'sms_sent' || item.type === 'sms_received';
        if (filter === 'calls') return item.type === 'call_made' || item.type === 'call_received';
        return item.type === filter || item.itemType === filter;
      });

  // Pagination
  const totalPages = Math.ceil(filteredTimeline.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTimeline = filteredTimeline.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

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

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      sms_sent: 'SMS',
      sms_received: 'SMS',
      call_made: 'Call',
      call_received: 'Call',
      meeting: 'Meeting',
      note: 'Note',
    };
    return labels[type] || type;
  };

  const getDirectionIcon = (direction?: string) => {
    if (direction === 'outbound') {
      return <ArrowUpRight className="h-3 w-3 text-blue-600 dark:text-blue-400" />;
    } else if (direction === 'inbound') {
      return <ArrowDownLeft className="h-3 w-3 text-green-600 dark:text-green-400" />;
    }
    return null;
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return <span className="text-gray-400 dark:text-gray-500">-</span>;

    const statusColors: Record<string, string> = {
      delivered: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      sent: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      queued: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
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
      {/* Header with Filters and Per Page Selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Activity Timeline
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({filteredTimeline.length} total)
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-xs px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
          >
            <option value="all">All Types</option>
            <option value="sms">SMS</option>
            <option value="calls">Calls</option>
            <option value="meeting">Meetings</option>
            <option value="note">Notes</option>
          </select>
          
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="text-xs px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
          >
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 w-24">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 w-20">
                  Direction
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Message / Content
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 w-24">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 w-32">
                  Cost
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 w-44">
                  Date/Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedTimeline.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No communications yet
                  </td>
                </tr>
              ) : (
                paginatedTimeline.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    {/* Type */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="text-gray-600 dark:text-gray-400">
                          {getIcon(item.type)}
                        </div>
                        <span className="text-xs font-medium text-gray-900 dark:text-white">
                          {getTypeLabel(item.type)}
                        </span>
                      </div>
                    </td>

                    {/* Direction */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {getDirectionIcon(item.direction)}
                        {item.direction && (
                          <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                            {item.direction === 'outbound' ? 'Sent' : 'Received'}
                          </span>
                        )}
                        {!item.direction && <span className="text-gray-400 dark:text-gray-500">-</span>}
                      </div>
                    </td>

                    {/* Message/Content */}
                    <td className="px-4 py-3">
                      <div className="max-w-md">
                        {item.body ? (
                          <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 whitespace-pre-wrap">
                            {item.body}
                          </p>
                        ) : item.snippet ? (
                          <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                            {item.snippet}
                          </p>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {getStatusBadge(item.status)}
                    </td>

                    {/* Cost/Metadata */}
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                        {item.metadata?.cost ? (
                          <div className="font-medium">${item.metadata.cost.toFixed(4)}</div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                        {item.metadata?.segments && (
                          <div className="text-gray-500 dark:text-gray-500">
                            {item.metadata.segments} seg{item.metadata.segments > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Date/Time */}
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        <div className="font-medium">
                          {format(new Date(item.occurredAt), 'MMM d, yyyy')}
                        </div>
                        <div className="text-gray-500 dark:text-gray-500">
                          {format(new Date(item.occurredAt), 'h:mm a')}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredTimeline.length)} of {filteredTimeline.length} entries
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  // Show first page, last page, current page, and pages around current
                  return page === 1 || 
                         page === totalPages || 
                         Math.abs(page - currentPage) <= 1;
                })
                .map((page, index, array) => {
                  // Add ellipsis between non-consecutive pages
                  const prevPage = array[index - 1];
                  const showEllipsis = prevPage && page - prevPage > 1;
                  
                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && (
                        <span className="px-2 text-gray-400 dark:text-gray-500">...</span>
                      )}
                      <Button
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="min-w-[36px]"
                      >
                        {page}
                      </Button>
                    </React.Fragment>
                  );
                })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

