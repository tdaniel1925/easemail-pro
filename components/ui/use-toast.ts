/**
 * Toast Hook - Compatible with shadcn/ui toast pattern
 * Wraps our custom toast component to match the expected API
 */

'use client';

import { useToast as useCustomToast } from './toast';

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const customToast = useCustomToast();

  const toast = (options: ToastOptions) => {
    const message = options.title 
      ? `${options.title}${options.description ? ': ' + options.description : ''}`
      : options.description || '';
    
    const type = options.title?.toLowerCase().includes('error') || options.variant === 'destructive'
      ? 'error'
      : options.title?.toLowerCase().includes('success')
      ? 'success'
      : options.title?.toLowerCase().includes('warning')
      ? 'warning'
      : 'info';
    
    customToast.showToast(type, message);
  };

  return {
    toast,
    toasts: customToast.toasts,
    dismiss: customToast.closeToast,
  };
}

