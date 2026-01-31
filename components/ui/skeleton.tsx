/**
 * Skeleton Loader Component
 * 
 * Provides smooth loading animations while content loads
 * Like Superhuman: Professional polish with subtle animations
 */

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'skeleton-shimmer rounded-md bg-muted/50',
        className
      )}
    />
  );
}

/**
 * Folder Skeleton - Shows while folders are loading
 */
export function FolderSkeleton() {
  return (
    <div className="space-y-2 px-2">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * Email List Skeleton - Shows while emails are loading
 */
export function EmailListSkeleton() {
  return (
    <div className="space-y-1 p-4">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="border border-border rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20 ml-auto" />
          </div>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * Account Card Skeleton - Shows while accounts are loading
 */
export function AccountCardSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="border border-border rounded-lg p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Sync Dashboard Skeleton - Shows while sync metrics are loading
 */
export function SyncDashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      {/* Progress Card */}
      <div className="border border-border rounded-lg p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-3 w-full rounded-full" />
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  );
}

/**
 * Contact List Skeleton - Shows while contacts are loading
 */
export function ContactListSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border border-border rounded-lg">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * Settings Card Skeleton - Shows while settings are loading
 */
export function SettingsCardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="border border-border rounded-lg p-6 space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="flex items-center justify-between py-2">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Calendar Skeleton - Shows while calendar is loading
 */
export function CalendarSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day Headers */}
        {[...Array(7)].map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-8 w-full" />
        ))}
        {/* Calendar Days */}
        {[...Array(35)].map((_, i) => (
          <Skeleton key={`day-${i}`} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}

/**
 * Stats Card Skeleton - Shows while stats are loading
 */
export function StatsCardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="border border-border rounded-lg p-6 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-5 rounded" />
          </div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
      ))}
    </div>
  );
}

