/**
 * HIGH PRIORITY FIX: Production-Ready Logging Utility
 *
 * Replaces console.log with structured logging for better debugging and production monitoring.
 *
 * Features:
 * - Log levels (debug, info, warn, error)
 * - Contextual logging with prefixes
 * - Production vs development behavior
 * - Structured log format
 * - Integration-ready (Sentry, LogRocket, etc.)
 * - Performance tracking
 */

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

/**
 * Log context for categorization
 */
export type LogContext =
  | 'auth'
  | 'api'
  | 'db'
  | 'email'
  | 'nylas'
  | 'sync'
  | 'payment'
  | 'webhook'
  | 'ui'
  | 'performance'
  | 'security'
  | 'admin'
  | 'general';

/**
 * Structured log entry
 */
interface LogEntry {
  timestamp: string;
  level: string;
  context: LogContext;
  message: string;
  data?: any;
  userId?: string;
  requestId?: string;
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  includeTimestamp: boolean;
  includeContext: boolean;
}

/**
 * Default configuration
 */
const defaultConfig: LoggerConfig = {
  minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true,
  enableRemote: process.env.NODE_ENV === 'production',
  remoteEndpoint: process.env.NEXT_PUBLIC_LOG_ENDPOINT,
  includeTimestamp: true,
  includeContext: true,
};

/**
 * Logger class
 */
class Logger {
  private config: LoggerConfig;
  private context: LogContext;

  constructor(context: LogContext, config: Partial<LoggerConfig> = {}) {
    this.context = context;
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Format log message with context and timestamp
   */
  private format(level: string, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...(data && { data }),
    };
  }

  /**
   * Send log to remote endpoint (for production monitoring)
   */
  private async sendToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.enableRemote || !this.config.remoteEndpoint) {
      return;
    }

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    } catch (error) {
      // Fail silently to avoid infinite loop
      console.error('Failed to send log to remote:', error);
    }
  }

  /**
   * Output log to console
   */
  private output(level: LogLevel, entry: LogEntry, consoleMethod: 'log' | 'info' | 'warn' | 'error'): void {
    if (level < this.config.minLevel) {
      return; // Skip logs below minimum level
    }

    // Console output (development + production errors)
    if (this.config.enableConsole || level >= LogLevel.ERROR) {
      const prefix = `[${entry.context.toUpperCase()}]`;
      const timestamp = this.config.includeTimestamp ? `${entry.timestamp} ` : '';

      if (entry.data) {
        console[consoleMethod](`${timestamp}${prefix} ${entry.message}`, entry.data);
      } else {
        console[consoleMethod](`${timestamp}${prefix} ${entry.message}`);
      }
    }

    // Remote logging (production only)
    if (level >= LogLevel.WARN) {
      this.sendToRemote(entry);
    }
  }

  /**
   * Debug level (development only)
   */
  debug(message: string, data?: any): void {
    const entry = this.format('DEBUG', message, data);
    this.output(LogLevel.DEBUG, entry, 'log');
  }

  /**
   * Info level (general information)
   */
  info(message: string, data?: any): void {
    const entry = this.format('INFO', message, data);
    this.output(LogLevel.INFO, entry, 'info');
  }

  /**
   * Warning level (potential issues)
   */
  warn(message: string, data?: any): void {
    const entry = this.format('WARN', message, data);
    this.output(LogLevel.WARN, entry, 'warn');
  }

  /**
   * Error level (errors and exceptions)
   */
  error(message: string, error?: Error | any): void {
    const entry = this.format('ERROR', message, {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
    });
    this.output(LogLevel.ERROR, entry, 'error');

    // Send to error tracking service (Sentry, etc.)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error instanceof Error ? error : new Error(message), {
        contexts: { log: entry },
      });
    }
  }

  /**
   * Performance timing
   */
  time(label: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.debug(`${label} took ${duration.toFixed(2)}ms`, { duration });
    };
  }

  /**
   * Group logs (for related operations)
   */
  group(label: string): void {
    if (this.config.enableConsole) {
      console.group(`[${this.context.toUpperCase()}] ${label}`);
    }
  }

  /**
   * End log group
   */
  groupEnd(): void {
    if (this.config.enableConsole) {
      console.groupEnd();
    }
  }

  /**
   * Create child logger with same context
   */
  child(additionalContext: string): Logger {
    return new Logger(`${this.context}:${additionalContext}` as LogContext, this.config);
  }
}

/**
 * Create logger for specific context
 *
 * Usage:
 * ```typescript
 * const log = createLogger('api');
 * log.info('Request received', { method: 'GET', path: '/api/users' });
 * ```
 */
export function createLogger(context: LogContext, config?: Partial<LoggerConfig>): Logger {
  return new Logger(context, config);
}

/**
 * Default loggers for common contexts
 */
export const logger = {
  auth: createLogger('auth'),
  api: createLogger('api'),
  db: createLogger('db'),
  email: createLogger('email'),
  nylas: createLogger('nylas'),
  sync: createLogger('sync'),
  payment: createLogger('payment'),
  webhook: createLogger('webhook'),
  ui: createLogger('ui'),
  performance: createLogger('performance'),
  security: createLogger('security'),
  admin: createLogger('admin'),
  general: createLogger('general'),
};

/**
 * Quick access to default logger
 */
export const log = logger.general;

/**
 * Measure async function execution time
 *
 * Usage:
 * ```typescript
 * const result = await measureAsync('fetchUser', async () => {
 *   return await fetchUser(userId);
 * });
 * ```
 */
export async function measureAsync<T>(
  label: string,
  fn: () => Promise<T>,
  context: LogContext = 'performance'
): Promise<T> {
  const log = createLogger(context);
  const endTimer = log.time(label);
  try {
    return await fn();
  } finally {
    endTimer();
  }
}

/**
 * Measure sync function execution time
 */
export function measureSync<T>(
  label: string,
  fn: () => T,
  context: LogContext = 'performance'
): T {
  const log = createLogger(context);
  const endTimer = log.time(label);
  try {
    return fn();
  } finally {
    endTimer();
  }
}

/**
 * Deprecated console.log wrapper for gradual migration
 * @deprecated Use logger instead
 */
export function deprecatedLog(...args: any[]): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('[DEPRECATED] Use logger instead:', ...args);
  }
}
