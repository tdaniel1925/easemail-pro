/**
 * HIGH PRIORITY FIX: Standardized Error Response Format
 *
 * Provides consistent error responses across all API routes.
 * Makes client-side error handling predictable and easier.
 *
 * Benefits:
 * - Consistent error structure
 * - Better error categorization
 * - Improved client-side error handling
 * - Built-in logging
 * - HTTP status code helpers
 */

import { NextResponse } from 'next/server';

/**
 * Standard error response format
 */
export interface ErrorResponse {
  success: false;
  error: string;           // User-friendly error message
  code: string;            // Machine-readable error code
  details?: any;           // Additional error details (optional)
  timestamp: string;       // ISO timestamp
  path?: string;           // Request path (if available)
}

/**
 * Standard success response format
 */
export interface SuccessResponse<T = any> {
  success: true;
  data?: T;
  message?: string;
  timestamp: string;
}

/**
 * Error codes for categorization
 */
export const ERROR_CODES = {
  // Authentication errors (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  PLAN_LIMIT_EXCEEDED: 'PLAN_LIMIT_EXCEEDED',

  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Resource errors (404)
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

  // Conflict errors (409)
  CONFLICT: 'CONFLICT',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',

  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // External service errors (502, 503)
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',

  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',

  // Security errors
  CSRF_VALIDATION_FAILED: 'CSRF_VALIDATION_FAILED',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',

  // Business logic errors
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * HTTP status code to error code mapping
 */
const STATUS_TO_DEFAULT_CODE: Record<number, ErrorCode> = {
  400: ERROR_CODES.VALIDATION_ERROR,
  401: ERROR_CODES.UNAUTHORIZED,
  403: ERROR_CODES.FORBIDDEN,
  404: ERROR_CODES.NOT_FOUND,
  409: ERROR_CODES.CONFLICT,
  429: ERROR_CODES.RATE_LIMIT_EXCEEDED,
  500: ERROR_CODES.INTERNAL_ERROR,
  502: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
  503: ERROR_CODES.SERVICE_UNAVAILABLE,
};

/**
 * Create a standardized error response
 *
 * Usage:
 * ```typescript
 * return errorResponse('User not found', 404, ERROR_CODES.NOT_FOUND);
 * ```
 */
export function errorResponse(
  message: string,
  status: number = 500,
  code?: ErrorCode,
  details?: any,
  path?: string
): NextResponse<ErrorResponse> {
  const errorCode = code || STATUS_TO_DEFAULT_CODE[status] || ERROR_CODES.UNKNOWN_ERROR;

  const response: ErrorResponse = {
    success: false,
    error: message,
    code: errorCode,
    timestamp: new Date().toISOString(),
  };

  // Add optional fields
  if (details) response.details = details;
  if (path) response.path = path;

  // Log error server-side (don't log validation errors)
  if (status >= 500) {
    console.error(`[API Error ${status}]`, {
      code: errorCode,
      message,
      details,
      path,
    });
  }

  return NextResponse.json(response, { status });
}

/**
 * Create a standardized success response
 *
 * Usage:
 * ```typescript
 * return successResponse({ user: userData }, 'User created successfully');
 * ```
 */
export function successResponse<T = any>(
  data?: T,
  message?: string,
  status: number = 200
): NextResponse<SuccessResponse<T>> {
  const response: SuccessResponse<T> = {
    success: true,
    timestamp: new Date().toISOString(),
  };

  if (data !== undefined) response.data = data;
  if (message) response.message = message;

  return NextResponse.json(response, { status });
}

/**
 * Shorthand error response helpers
 */

export const badRequest = (message: string, details?: any) =>
  errorResponse(message, 400, ERROR_CODES.VALIDATION_ERROR, details);

export const unauthorized = (message: string = 'Unauthorized. Please log in.', details?: any) =>
  errorResponse(message, 401, ERROR_CODES.UNAUTHORIZED, details);

export const forbidden = (message: string = 'Forbidden. You do not have permission to access this resource.', details?: any) =>
  errorResponse(message, 403, ERROR_CODES.FORBIDDEN, details);

export const notFound = (message: string = 'Resource not found.', details?: any) =>
  errorResponse(message, 404, ERROR_CODES.NOT_FOUND, details);

export const conflict = (message: string, details?: any) =>
  errorResponse(message, 409, ERROR_CODES.CONFLICT, details);

export const rateLimited = (message: string = 'Too many requests. Please try again later.', details?: any) =>
  errorResponse(message, 429, ERROR_CODES.RATE_LIMIT_EXCEEDED, details);

export const internalError = (message: string = 'Internal server error. Please try again later.', details?: any) =>
  errorResponse(message, 500, ERROR_CODES.INTERNAL_ERROR, details);

export const serviceUnavailable = (message: string = 'Service temporarily unavailable. Please try again later.', details?: any) =>
  errorResponse(message, 503, ERROR_CODES.SERVICE_UNAVAILABLE, details);

/**
 * Wrap async route handlers with error handling
 *
 * Usage:
 * ```typescript
 * export const GET = withErrorHandling(async (request) => {
 *   const data = await fetchData();
 *   return successResponse(data);
 * });
 * ```
 */
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('[Unhandled Error]', error);

      // Handle known error types
      if (error instanceof Error) {
        // Check for specific error patterns
        if (error.message.includes('not found')) {
          return notFound(error.message);
        }
        if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
          return unauthorized(error.message);
        }
        if (error.message.includes('forbidden') || error.message.includes('permission')) {
          return forbidden(error.message);
        }
        if (error.message.includes('limit') || error.message.includes('quota')) {
          return forbidden(error.message, { code: ERROR_CODES.PLAN_LIMIT_EXCEEDED });
        }

        return internalError(error.message);
      }

      return internalError('An unexpected error occurred.');
    }
  };
}

/**
 * Parse and format Zod validation errors
 *
 * Usage:
 * ```typescript
 * const result = schema.safeParse(data);
 * if (!result.success) {
 *   return validationError(result.error);
 * }
 * ```
 */
export function validationError(zodError: any): NextResponse<ErrorResponse> {
  const errors = zodError.errors?.map((err: any) => ({
    field: err.path.join('.'),
    message: err.message,
  })) || [];

  return badRequest('Validation failed', { errors });
}

/**
 * Check if a response is an error response
 */
export function isErrorResponse(response: any): response is ErrorResponse {
  return response && response.success === false;
}

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  return 'An unknown error occurred';
}
