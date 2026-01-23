/**
 * EmptyState Component
 * Reusable component for empty states throughout the app
 * Shows icon, title, description, and optional CTA
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div className={cn('empty-state fade-in', className)}>
      {Icon && (
        <div className="mb-4">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
      )}

      <h3 className="mb-2 text-lg font-semibold text-foreground">
        {title}
      </h3>

      {description && (
        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}

      {action && (
        <Button onClick={action.onClick} size="lg">
          {action.label}
        </Button>
      )}

      {children}
    </div>
  );
}

/**
 * Pre-built EmptyState variants for common scenarios
 */

import {
  Mail,
  Search,
  FileText,
  UserX,
  FolderOpen,
  WifiOff,
  Lock,
  CheckCircle2,
  AlertCircle,
  Inbox as InboxIcon
} from 'lucide-react';

export const EmptyInbox = ({ onCompose }: { onCompose?: () => void }) => (
  <EmptyState
    icon={InboxIcon}
    title="Inbox Zero! 🎉"
    description="You've read all your emails. Time to relax or start something new."
    action={onCompose ? { label: 'Compose New Email', onClick: onCompose } : undefined}
  />
);

export const EmptySearchResults = ({ onClear }: { onClear?: () => void }) => (
  <EmptyState
    icon={Search}
    title="No results found"
    description="Try different keywords or check your spelling."
    action={onClear ? { label: 'Clear Search', onClick: onClear } : undefined}
  />
);

export const EmptyFolder = ({ folderName }: { folderName?: string }) => (
  <EmptyState
    icon={FolderOpen}
    title={`No emails in ${folderName || 'this folder'}`}
    description="This folder is empty right now."
  />
);

export const NoContacts = ({ onImport }: { onImport?: () => void }) => (
  <EmptyState
    icon={UserX}
    title="No contacts yet"
    description="Import your contacts or add them manually to get started."
    action={onImport ? { label: 'Import Contacts', onClick: onImport } : undefined}
  />
);

export const NoDrafts = ({ onCompose }: { onCompose?: () => void }) => (
  <EmptyState
    icon={FileText}
    title="No drafts"
    description="Your draft emails will appear here."
    action={onCompose ? { label: 'Start Writing', onClick: onCompose } : undefined}
  />
);

export const OfflineState = () => (
  <EmptyState
    icon={WifiOff}
    title="You're offline"
    description="Check your internet connection and try again."
  />
);

export const UnauthorizedState = ({ onLogin }: { onLogin?: () => void }) => (
  <EmptyState
    icon={Lock}
    title="Upgrade required"
    description="This feature is available on Professional plan and above."
    action={onLogin ? { label: 'View Plans', onClick: onLogin } : undefined}
  />
);

export const SuccessState = ({
  title = "Success!",
  description,
  onContinue
}: {
  title?: string;
  description?: string;
  onContinue?: () => void;
}) => (
  <EmptyState
    icon={CheckCircle2}
    title={title}
    description={description}
    action={onContinue ? { label: 'Continue', onClick: onContinue } : undefined}
  />
);

export const ErrorState = ({
  title = "Something went wrong",
  description = "We encountered an error. Please try again.",
  onRetry
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) => (
  <EmptyState
    icon={AlertCircle}
    title={title}
    description={description}
    action={onRetry ? { label: 'Try Again', onClick: onRetry } : undefined}
  />
);
