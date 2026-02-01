/**
 * Error Handling Hook
 * Provides utilities for consistent error handling across the application
 */

import { useToast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';

export interface APIError {
  message: string;
  code?: string;
  details?: any;
  statusCode?: number;
}

/**
 * Hook for handling errors with toast notifications
 */
export function useErrorHandler() {
  const { toast } = useToast();

  /**
   * Handle API errors with user-friendly toast messages
   */
  const handleAPIError = (
    error: unknown,
    context?: {
      action?: string;
      component?: string;
      fallbackMessage?: string;
    }
  ): void => {
    const { action = 'perform action', fallbackMessage = 'An unexpected error occurred' } = context || {};

    // Extract error message
    let errorMessage = fallbackMessage;
    let errorDetails: any;

    if (error instanceof Error) {
      errorMessage = error.message;
      logger.error(`Failed to ${action}`, error, context);
    } else if (typeof error === 'object' && error !== null) {
      const apiError = error as APIError;
      errorMessage = apiError.message || fallbackMessage;
      errorDetails = apiError.details;

      logger.error(`Failed to ${action}`, new Error(errorMessage), {
        ...context,
        statusCode: apiError.statusCode,
        code: apiError.code,
        details: errorDetails,
      });
    } else if (typeof error === 'string') {
      errorMessage = error;
      logger.error(`Failed to ${action}`, new Error(error), context);
    } else {
      logger.error(`Failed to ${action}`, new Error('Unknown error'), context);
    }

    // Show user-friendly toast
    toast({
      title: 'Error',
      description: getUserFriendlyMessage(errorMessage),
      variant: 'destructive',
    });
  };

  /**
   * Handle success with toast notification
   */
  const handleSuccess = (message: string): void => {
    toast({
      title: 'Success',
      description: message,
      variant: 'default',
    });
  };

  /**
   * Handle warnings with toast notification
   */
  const handleWarning = (message: string): void => {
    toast({
      title: 'Warning',
      description: message,
      variant: 'default',
    });
  };

  /**
   * Handle generic errors (non-API)
   */
  const handleError = (
    error: Error,
    context?: {
      component?: string;
      message?: string;
    }
  ): void => {
    const message = context?.message || 'Something went wrong';

    logger.error(message, error, {
      component: context?.component,
    });

    toast({
      title: 'Error',
      description: getUserFriendlyMessage(message),
      variant: 'destructive',
    });
  };

  return {
    handleAPIError,
    handleSuccess,
    handleWarning,
    handleError,
  };
}

/**
 * Convert technical error messages to user-friendly messages
 */
function getUserFriendlyMessage(message: string): string {
  const messageLower = message.toLowerCase();

  // Network errors
  if (messageLower.includes('network') || messageLower.includes('fetch')) {
    return 'Network error. Please check your internet connection and try again.';
  }

  // Authentication errors
  if (messageLower.includes('unauthorized') || messageLower.includes('auth')) {
    return 'Your session has expired. Please log in again.';
  }

  // Permission errors
  if (messageLower.includes('forbidden') || messageLower.includes('permission')) {
    return "You don't have permission to perform this action.";
  }

  // Not found errors
  if (messageLower.includes('not found') || messageLower.includes('404')) {
    return 'The requested resource was not found.';
  }

  // Rate limit errors
  if (messageLower.includes('rate limit') || messageLower.includes('too many')) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  // Server errors
  if (messageLower.includes('500') || messageLower.includes('server error')) {
    return 'Server error. Our team has been notified and is working on it.';
  }

  // Validation errors (keep as-is, they're already user-friendly)
  if (
    messageLower.includes('invalid') ||
    messageLower.includes('required') ||
    messageLower.includes('must be')
  ) {
    return message;
  }

  // Default: return original message but capitalize first letter
  return message.charAt(0).toUpperCase() + message.slice(1);
}

/**
 * Async wrapper that automatically handles errors
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorContext?: {
    action?: string;
    component?: string;
    onError?: (error: unknown) => void;
  }
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      // Log error
      logger.error(errorContext?.action || 'Function execution failed', error instanceof Error ? error : new Error('Unknown error'), errorContext);

      // Call custom error handler if provided
      errorContext?.onError?.(error);

      // Re-throw so caller can handle if needed
      throw error;
    }
  }) as T;
}
