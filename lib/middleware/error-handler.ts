/**
 * Standardized Error Handling Middleware
 *
 * Provides consistent error responses across all API endpoints
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  details?: any;
}

export interface ApiSuccess<T = any> {
  success: true;
  data: T;
  meta?: Record<string, any>;
}

/**
 * Standard error response format
 */
export function errorResponse(
  error: unknown,
  defaultMessage: string = 'An error occurred'
): NextResponse {
  // Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    }, { status: 400 });
  }

  // Known application errors
  if (error instanceof Error) {
    // Check if it's a known error type
    if ('statusCode' in error && 'code' in error) {
      const appError = error as any;
      return NextResponse.json({
        error: appError.message,
        code: appError.code,
        ...(process.env.NODE_ENV !== 'production' && { details: appError.details }),
      }, { status: appError.statusCode });
    }

    // Generic Error object
    return NextResponse.json({
      error: process.env.NODE_ENV === 'production' ? defaultMessage : error.message,
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }

  // Unknown error type
  return NextResponse.json({
    error: defaultMessage,
    code: 'UNKNOWN_ERROR',
  }, { status: 500 });
}

/**
 * Standard success response format
 */
export function successResponse<T>(
  data: T,
  meta?: Record<string, any>
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({
    success: true,
    data,
    ...(meta && { meta }),
  });
}

/**
 * Custom error classes for different scenarios
 */
export class ValidationError extends Error implements ApiError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  details?: any;

  constructor(message: string, details?: any) {
    super(message);
    this.details = details;
  }
}

export class UnauthorizedError extends Error implements ApiError {
  statusCode = 401;
  code = 'UNAUTHORIZED';
  details?: any;

  constructor(message: string = 'Unauthorized') {
    super(message);
  }
}

export class ForbiddenError extends Error implements ApiError {
  statusCode = 403;
  code = 'FORBIDDEN';
  details?: any;

  constructor(message: string = 'Forbidden') {
    super(message);
  }
}

export class NotFoundError extends Error implements ApiError {
  statusCode = 404;
  code = 'NOT_FOUND';
  details?: any;

  constructor(message: string = 'Resource not found') {
    super(message);
  }
}

export class ConflictError extends Error implements ApiError {
  statusCode = 409;
  code = 'CONFLICT';
  details?: any;

  constructor(message: string = 'Resource already exists') {
    super(message);
  }
}

export class RateLimitError extends Error implements ApiError {
  statusCode = 429;
  code = 'RATE_LIMITED';
  details?: any;

  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message);
    this.details = { retryAfter };
  }
}

export class ExternalServiceError extends Error implements ApiError {
  statusCode = 502;
  code = 'EXTERNAL_SERVICE_ERROR';
  details?: any;

  constructor(service: string, message?: string) {
    super(message || `External service error: ${service}`);
    this.details = { service };
  }
}

/**
 * Helper to wrap async route handlers with error handling
 */
export function withErrorHandling<T = any>(
  handler: (...args: any[]) => Promise<NextResponse<T>>
) {
  return async (...args: any[]): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
