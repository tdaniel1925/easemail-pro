/**
 * Toast Notification Component
 * Inline notifications without browser alerts
 */

'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  action?: ToastAction;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

function ToastItem({ toast, onClose }: ToastProps) {
  const icons = {
    success: <CheckCircle className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />,
    warning: <AlertTriangle className="h-5 w-5" />,
  };

  const colors = {
    success: 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400',
    error: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
  };

  useEffect(() => {
    if (toast.duration) {
      const timer = setTimeout(() => {
        onClose(toast.id);
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, toast.id, onClose]);

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm',
        'animate-in slide-in-from-top-5 duration-300',
        colors[toast.type]
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {icons[toast.type]}
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium">
          {toast.message}
        </div>
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick();
              onClose(toast.id);
            }}
            className="mt-2 text-sm font-semibold underline hover:no-underline transition-smooth"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-smooth"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-96 max-w-[calc(100vw-2rem)]">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (
    type: ToastType,
    message: string,
    duration = 5000,
    action?: ToastAction
  ) => {
    const id = Math.random().toString(36).substring(7);
    const newToast: Toast = { id, type, message, duration, action };
    setToasts((prev) => [...prev, newToast]);
  };

  const closeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return {
    toasts,
    showToast,
    closeToast,
    success: (message: string, duration?: number, action?: ToastAction) =>
      showToast('success', message, duration, action),
    error: (message: string, duration?: number, action?: ToastAction) =>
      showToast('error', message, duration, action),
    info: (message: string, duration?: number, action?: ToastAction) =>
      showToast('info', message, duration, action),
    warning: (message: string, duration?: number, action?: ToastAction) =>
      showToast('warning', message, duration, action),
  };
}

