/**
 * Centralized Logging Utility
 * Provides structured logging with levels, context, and external service integration
 * Replaces scattered console.log/console.error statements
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  userId?: string;
  accountId?: string;
  requestId?: string;
  component?: string;
  action?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export class Logger {
  private minLevel: LogLevel = 'info';
  private enableConsole: boolean = true;

  constructor() {
    // Configure based on environment
    if (process.env.NODE_ENV === 'development') {
      this.minLevel = 'debug';
      this.enableConsole = true;
    } else if (process.env.NODE_ENV === 'production') {
      this.minLevel = 'info';
      this.enableConsole = process.env.ENABLE_CONSOLE_LOGS === 'true';
    } else if (process.env.NODE_ENV === 'test') {
      this.minLevel = 'error';
      this.enableConsole = false;
    }
  }

  private getLevelPriority(level: LogLevel): number {
    const priorities = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      fatal: 4,
    };
    return priorities[level];
  }

  private shouldLog(level: LogLevel): boolean {
    return this.getLevelPriority(level) >= this.getLevelPriority(this.minLevel);
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      fatal: '🔥',
    };

    let formatted = `${emoji[level]} [${level.toUpperCase()}] ${message}`;

    if (context?.component) {
      formatted += ` [${context.component}]`;
    }

    if (context?.action) {
      formatted += ` (${context.action})`;
    }

    return formatted;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return entry;
  }

  private writeLog(entry: LogEntry): void {
    // Console output (development)
    if (this.enableConsole) {
      const formattedMessage = this.formatMessage(entry.level, entry.message, entry.context);

      switch (entry.level) {
        case 'debug':
          console.debug(formattedMessage, entry.context);
          break;
        case 'info':
          console.info(formattedMessage, entry.context);
          break;
        case 'warn':
          console.warn(formattedMessage, entry.context);
          break;
        case 'error':
        case 'fatal':
          console.error(formattedMessage, entry.context, entry.error);
          break;
      }
    }

    // External logging service integration
    // TODO: Add Sentry, LogRocket, Datadog, etc.
    if (entry.level === 'error' || entry.level === 'fatal') {
      this.sendToExternalService(entry);
    }
  }

  private sendToExternalService(entry: LogEntry): void {
    // Send to external logging/monitoring service
    // Examples: Sentry, LogRocket, Datadog, etc.

    // Sentry example (if enabled):
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(entry.error || new Error(entry.message), {
        level: entry.level,
        extra: entry.context,
      });
    }

    // Server-side Sentry (if imported)
    if (typeof window === 'undefined') {
      try {
        // Dynamic import to avoid bundling if not used
        // import * as Sentry from '@sentry/nextjs';
        // Sentry.captureException(entry.error || new Error(entry.message), { ... });
      } catch (error) {
        // Sentry not available, continue
      }
    }
  }

  /**
   * Log debug message (development only)
   */
  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog('debug')) return;

    const entry = this.createLogEntry('debug', message, context);
    this.writeLog(entry);
  }

  /**
   * Log informational message
   */
  info(message: string, context?: LogContext): void {
    if (!this.shouldLog('info')) return;

    const entry = this.createLogEntry('info', message, context);
    this.writeLog(entry);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog('warn')) return;

    const entry = this.createLogEntry('warn', message, context);
    this.writeLog(entry);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (!this.shouldLog('error')) return;

    const err = error instanceof Error ? error : undefined;
    const entry = this.createLogEntry('error', message, context, err);
    this.writeLog(entry);
  }

  /**
   * Log fatal error (critical system failure)
   */
  fatal(message: string, error?: Error | unknown, context?: LogContext): void {
    const err = error instanceof Error ? error : undefined;
    const entry = this.createLogEntry('fatal', message, context, err);
    this.writeLog(entry);
  }

  /**
   * Create a child logger with inherited context
   */
  child(baseContext: LogContext): Logger {
    const childLogger = new Logger();
    const originalDebug = childLogger.debug.bind(childLogger);
    const originalInfo = childLogger.info.bind(childLogger);
    const originalWarn = childLogger.warn.bind(childLogger);
    const originalError = childLogger.error.bind(childLogger);
    const originalFatal = childLogger.fatal.bind(childLogger);

    childLogger.debug = (message: string, context?: LogContext) => {
      originalDebug(message, { ...baseContext, ...context });
    };

    childLogger.info = (message: string, context?: LogContext) => {
      originalInfo(message, { ...baseContext, ...context });
    };

    childLogger.warn = (message: string, context?: LogContext) => {
      originalWarn(message, { ...baseContext, ...context });
    };

    childLogger.error = (message: string, error?: Error | unknown, context?: LogContext) => {
      originalError(message, error, { ...baseContext, ...context });
    };

    childLogger.fatal = (message: string, error?: Error | unknown, context?: LogContext) => {
      originalFatal(message, error, { ...baseContext, ...context });
    };

    return childLogger;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export factory function for component-specific loggers
export function createLogger(component: string): Logger {
  return logger.child({ component });
}

// Backward compatibility helpers (for gradual migration)
export const log = {
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  fatal: logger.fatal.bind(logger),
};
