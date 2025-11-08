/**
 * Nylas v3 Error Handling
 * Comprehensive error handling for Nylas API v3
 */

export class NylasV3Error extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public retryable: boolean = false,
    public requiresReauth: boolean = false
  ) {
    super(message);
    this.name = 'NylasV3Error';
  }
}

export function handleNylasError(error: any): NylasV3Error {
  // Authentication errors (401)
  if (error.statusCode === 401 || error.message?.includes('Authentication')) {
    return new NylasV3Error(
      'Authentication failed. Please re-authenticate your account.',
      'INVALID_GRANT',
      401,
      false,
      true // Requires re-authentication
    );
  }

  // Rate limit errors (429)
  if (error.statusCode === 429) {
    const retryAfter = error.headers?.['retry-after'];
    return new NylasV3Error(
      `Rate limit exceeded. ${retryAfter ? `Retry after ${retryAfter} seconds.` : 'Please try again later.'}`,
      'RATE_LIMIT',
      429,
      true
    );
  }

  // Provider unavailable (503)
  if (error.statusCode === 503) {
    return new NylasV3Error(
      'Email provider service unavailable. Please try again later.',
      'PROVIDER_UNAVAILABLE',
      503,
      true
    );
  }

  // Bad request (400)
  if (error.statusCode === 400) {
    return new NylasV3Error(
      error.message || 'Invalid request parameters.',
      'BAD_REQUEST',
      400,
      false
    );
  }

  // Not found (404)
  if (error.statusCode === 404) {
    return new NylasV3Error(
      'Resource not found.',
      'NOT_FOUND',
      404,
      false
    );
  }

  // Network errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return new NylasV3Error(
      'Network error. Please check your connection.',
      'NETWORK_ERROR',
      undefined,
      true
    );
  }

  // Grant-specific errors
  if (error.message?.includes('grant') && error.message?.includes('expired')) {
    return new NylasV3Error(
      'Grant has expired. Please re-authenticate.',
      'GRANT_EXPIRED',
      401,
      false,
      true
    );
  }

  // Default error
  return new NylasV3Error(
    error.message || 'An unexpected error occurred',
    'UNKNOWN_ERROR',
    error.statusCode,
    false
  );
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, error: any) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      const nylasError = handleNylasError(error);

      // Don't retry if not retryable or if last attempt
      if (!nylasError.retryable || attempt === maxRetries) {
        throw nylasError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt, nylasError);
      }

      console.log(`⏳ Retry attempt ${attempt}/${maxRetries} in ${delay}ms - ${nylasError.message}`);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Check if an error requires re-authentication
 */
export function requiresReauth(error: any): boolean {
  if (error instanceof NylasV3Error) {
    return error.requiresReauth;
  }

  const errorMessage = error.message?.toLowerCase() || '';
  return (
    error.statusCode === 401 ||
    errorMessage.includes('authentication') ||
    errorMessage.includes('expired') ||
    errorMessage.includes('invalid grant')
  );
}
