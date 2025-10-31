import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineAlertProps {
  variant?: 'error' | 'success' | 'warning' | 'info';
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function InlineAlert({ 
  variant = 'info', 
  title, 
  message, 
  onDismiss,
  className 
}: InlineAlertProps) {
  const variants = {
    error: {
      container: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900',
      icon: XCircle,
      iconColor: 'text-red-600 dark:text-red-400',
      title: 'text-red-900 dark:text-red-100',
      message: 'text-red-700 dark:text-red-300',
    },
    success: {
      container: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900',
      icon: CheckCircle,
      iconColor: 'text-green-600 dark:text-green-400',
      title: 'text-green-900 dark:text-green-100',
      message: 'text-green-700 dark:text-green-300',
    },
    warning: {
      container: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900',
      icon: AlertCircle,
      iconColor: 'text-amber-600 dark:text-amber-400',
      title: 'text-amber-900 dark:text-amber-100',
      message: 'text-amber-700 dark:text-amber-300',
    },
    info: {
      container: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900',
      icon: Info,
      iconColor: 'text-blue-600 dark:text-blue-400',
      title: 'text-blue-900 dark:text-blue-100',
      message: 'text-blue-700 dark:text-blue-300',
    },
  };

  const config = variants[variant];
  const Icon = config.icon;

  return (
    <div className={cn(
      'flex items-start gap-3 rounded-lg border p-4',
      config.container,
      className
    )}>
      <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', config.iconColor)} />
      <div className="flex-1 min-w-0">
        {title && (
          <p className={cn('font-medium text-sm mb-1', config.title)}>
            {title}
          </p>
        )}
        <p className={cn('text-sm', config.message)}>
          {message}
        </p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={cn('flex-shrink-0 hover:opacity-70', config.iconColor)}
        >
          <XCircle className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

