/**
 * API Response Helpers
 *
 * Provides standardized response formats for all API routes.
 * Ensures consistent structure across the entire application.
 */

import { NextResponse } from 'next/server';

/**
 * Standard API response structure
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Error codes used throughout the API
 */
export const ErrorCodes = {
  // Authentication errors (401)
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  ADMIN_REQUIRED: 'ADMIN_REQUIRED',
  ORG_ADMIN_REQUIRED: 'ORG_ADMIN_REQUIRED',
  RESOURCE_ACCESS_DENIED: 'RESOURCE_ACCESS_DENIED',

  // Not found errors (404)
  NOT_FOUND: 'NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  MISSING_PARAMETER: 'MISSING_PARAMETER',

  // Rate limiting (429)
  RATE_LIMITED: 'RATE_LIMITED',

  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Create a success response
 *
 * @example
 * return apiSuccess({ users: [...] });
 * return apiSuccess(user, { requestId: '123' });
 */
export function apiSuccess<T>(
  data: T,
  meta?: { requestId?: string }
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  });
}

/**
 * Create an error response
 *
 * @example
 * return apiError('User not found', ErrorCodes.NOT_FOUND, 404);
 * return apiError('Invalid email format', ErrorCodes.VALIDATION_ERROR, 400, { field: 'email' });
 */
export function apiError(
  message: string,
  code: ErrorCode = ErrorCodes.INTERNAL_ERROR,
  status: number = 500,
  details?: unknown
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

/**
 * Common error response helpers
 */
export const ApiErrors = {
  unauthorized: (message = 'Authentication required') =>
    apiError(message, ErrorCodes.AUTH_REQUIRED, 401),

  forbidden: (message = 'Access denied') =>
    apiError(message, ErrorCodes.FORBIDDEN, 403),

  notFound: (resource = 'Resource') =>
    apiError(`${resource} not found`, ErrorCodes.NOT_FOUND, 404),

  badRequest: (message: string, details?: unknown) =>
    apiError(message, ErrorCodes.VALIDATION_ERROR, 400, details),

  validationError: (field: string, message: string) =>
    apiError(`Validation error: ${message}`, ErrorCodes.VALIDATION_ERROR, 400, { field }),

  rateLimited: (retryAfter?: number) =>
    apiError(
      'Too many requests. Please try again later.',
      ErrorCodes.RATE_LIMITED,
      429,
      retryAfter ? { retryAfter } : undefined
    ),

  internalError: (message = 'An unexpected error occurred') =>
    apiError(message, ErrorCodes.INTERNAL_ERROR, 500),

  databaseError: (message = 'Database operation failed') =>
    apiError(message, ErrorCodes.DATABASE_ERROR, 500),
};

/**
 * Wrap an async handler with standard error handling
 *
 * @example
 * export const GET = withErrorHandler(async (request) => {
 *   const data = await fetchSomething();
 *   return apiSuccess(data);
 * });
 */
export function withErrorHandler<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('[API Error]', error);

      if (error instanceof Error) {
        // Check for known error types
        if (error.message.includes('Unauthorized')) {
          return ApiErrors.unauthorized();
        }
        if (error.message.includes('Forbidden')) {
          return ApiErrors.forbidden(error.message);
        }
        if (error.message.includes('not found')) {
          return ApiErrors.notFound();
        }

        return ApiErrors.internalError(
          process.env.NODE_ENV === 'development' ? error.message : undefined
        );
      }

      return ApiErrors.internalError();
    }
  };
}

/**
 * Type guard to check if a value is an Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Extract error message safely from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}
