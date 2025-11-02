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
        'animate-pulse rounded-md bg-muted/50',
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

