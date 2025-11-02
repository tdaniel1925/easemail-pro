/**
 * Production-Ready Logging Service
 * Replaces console.log with structured logging for production environments
 * Compatible with Vercel, Sentry, LogRocket, and other monitoring services
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogContext {
  userId?: string;
  email?: string;
  accountId?: string;
  organizationId?: string;
  requestId?: string;
  [key: string]: any;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  timestamp: string;
  environment: string;
}

class Logger {
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Format log entry for production
   */
  private formatLog(entry: LogEntry): string {
    return JSON.stringify({
      ...entry,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });
  }

  /**
   * Send to external monitoring service (Sentry, LogRocket, etc.)
   */
  private sendToMonitoring(entry: LogEntry) {
    // TODO: Integrate with your monitoring service
    // Examples:
    // - Sentry.captureException(entry.error)
    // - LogRocket.error(entry.message, entry.context)
    // - Custom API endpoint
  }

  /**
   * Debug - Development only
   */
  debug(message: string, context?: LogContext) {
    if (!this.isDevelopment) return;

    console.debug(`🔍 ${message}`, context || '');
  }

  /**
   * Info - General information
   */
  info(message: string, context?: LogContext) {
    const entry: LogEntry = {
      level: 'info',
      message,
      context,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };

    if (this.isDevelopment) {
      console.log(`ℹ️  ${message}`, context || '');
    } else {
      console.log(this.formatLog(entry));
    }
  }

  /**
   * Warn - Warning that doesn't break functionality
   */
  warn(message: string, context?: LogContext) {
    const entry: LogEntry = {
      level: 'warn',
      message,
      context,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };

    if (this.isDevelopment) {
      console.warn(`⚠️  ${message}`, context || '');
    } else {
      console.warn(this.formatLog(entry));
    }
  }

  /**
   * Error - Recoverable error
   */
  error(message: string, error?: Error | unknown, context?: LogContext) {
    const entry: LogEntry = {
      level: 'error',
      message,
      context,
      error: error instanceof Error ? error : undefined,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };

    if (this.isDevelopment) {
      console.error(`❌ ${message}`, error, context || '');
    } else {
      console.error(this.formatLog(entry));
      this.sendToMonitoring(entry);
    }
  }

  /**
   * Fatal - Critical error requiring immediate attention
   */
  fatal(message: string, error?: Error | unknown, context?: LogContext) {
    const entry: LogEntry = {
      level: 'fatal',
      message,
      context,
      error: error instanceof Error ? error : undefined,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };

    if (this.isDevelopment) {
      console.error(`🚨 FATAL: ${message}`, error, context || '');
    } else {
      console.error(this.formatLog(entry));
      this.sendToMonitoring(entry);
    }
  }

  /**
   * HTTP - Log HTTP requests/responses
   */
  http(method: string, url: string, statusCode: number, duration?: number, context?: LogContext) {
    const entry: LogEntry = {
      level: statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info',
      message: `${method} ${url} ${statusCode}`,
      context: {
        ...context,
        method,
        url,
        statusCode,
        duration,
      },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };

    if (this.isDevelopment) {
      const emoji = statusCode >= 500 ? '🔴' : statusCode >= 400 ? '🟡' : '🟢';
      console.log(`${emoji} ${method} ${url} - ${statusCode}${duration ? ` (${duration}ms)` : ''}`);
    } else {
      console.log(this.formatLog(entry));
    }
  }

  /**
   * Success - Operation completed successfully
   */
  success(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.log(`✅ ${message}`, context || '');
    } else {
      this.info(message, context);
    }
  }

  /**
   * Database - Log database operations
   */
  db(operation: string, table: string, duration?: number, context?: LogContext) {
    const entry: LogEntry = {
      level: 'debug',
      message: `DB: ${operation} on ${table}`,
      context: {
        ...context,
        operation,
        table,
        duration,
      },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };

    if (this.isDevelopment && duration && duration > 1000) {
      console.warn(`🐌 Slow query: ${operation} on ${table} (${duration}ms)`);
    } else if (this.isDevelopment) {
      console.debug(`🗄️  ${operation} ${table}${duration ? ` (${duration}ms)` : ''}`);
    }
  }

  /**
   * Email - Log email operations
   */
  email(operation: string, to: string, success: boolean, context?: LogContext) {
    const entry: LogEntry = {
      level: success ? 'info' : 'error',
      message: `Email ${operation} to ${to}: ${success ? 'success' : 'failed'}`,
      context: {
        ...context,
        operation,
        to,
        success,
      },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };

    if (this.isDevelopment) {
      const emoji = success ? '✅' : '❌';
      console.log(`${emoji} Email ${operation} to ${to}`);
    } else {
      console.log(this.formatLog(entry));
    }
  }

  /**
   * SMS - Log SMS operations
   */
  sms(operation: string, to: string, success: boolean, context?: LogContext) {
    const entry: LogEntry = {
      level: success ? 'info' : 'error',
      message: `SMS ${operation} to ${to}: ${success ? 'success' : 'failed'}`,
      context: {
        ...context,
        operation,
        to: this.maskPhone(to),
        success,
      },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };

    if (this.isDevelopment) {
      const emoji = success ? '✅' : '❌';
      console.log(`${emoji} SMS ${operation} to ${to}`);
    } else {
      console.log(this.formatLog(entry));
    }
  }

  /**
   * Mask phone number for privacy
   */
  private maskPhone(phone: string): string {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 4) {
      return `***-***-${digits.slice(-4)}`;
    }
    return '***-***-****';
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const log = {
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  fatal: logger.fatal.bind(logger),
  http: logger.http.bind(logger),
  success: logger.success.bind(logger),
  db: logger.db.bind(logger),
  email: logger.email.bind(logger),
  sms: logger.sms.bind(logger),
};

export default logger;

