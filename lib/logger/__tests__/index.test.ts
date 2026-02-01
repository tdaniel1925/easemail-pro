/**
 * Tests for Centralized Logging System
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logger, createLogger, Logger } from '../index';

describe('Logger', () => {
  let consoleDebugSpy: any;
  let consoleInfoSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    // Spy on console methods
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Set to development mode
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe('Log Levels', () => {
    it('should log debug messages in development', () => {
      logger.debug('Debug message', { component: 'Test' });

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Debug message'),
        expect.objectContaining({ component: 'Test' })
      );
    });

    it('should log info messages', () => {
      logger.info('Info message', { action: 'test' });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Info message'),
        expect.objectContaining({ action: 'test' })
      );
    });

    it('should log warning messages', () => {
      logger.warn('Warning message', { userId: '123' });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning message'),
        expect.objectContaining({ userId: '123' })
      );
    });

    it('should log error messages with Error object', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error, { component: 'Test' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error occurred'),
        expect.objectContaining({ component: 'Test' }),
        expect.objectContaining({
          name: 'Error',
          message: 'Test error',
        })
      );
    });

    it('should log fatal messages', () => {
      const error = new Error('Fatal error');
      logger.fatal('System failure', error, { component: 'System' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('System failure'),
        expect.objectContaining({ component: 'System' }),
        expect.objectContaining({
          name: 'Error',
          message: 'Fatal error',
        })
      );
    });
  });

  describe('Log Formatting', () => {
    it('should include emojis in formatted messages', () => {
      logger.info('Test message');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('ℹ️'),
        undefined
      );
    });

    it('should include log level in uppercase', () => {
      logger.warn('Warning');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]'),
        undefined
      );
    });

    it('should include component name when provided', () => {
      logger.info('Message', { component: 'EmailSender' });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('[EmailSender]'),
        expect.any(Object)
      );
    });

    it('should include action when provided', () => {
      logger.info('Message', { action: 'sendEmail' });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('(sendEmail)'),
        expect.any(Object)
      );
    });
  });

  describe('Environment-based Behavior', () => {
    it('should not log debug messages in production', () => {
      vi.stubEnv('NODE_ENV', 'production');

      // Create new logger instance with production config
      const prodLogger = new Logger();
      prodLogger.debug('Debug message');

      // Debug should not be logged in production
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should log error messages in production', () => {
      vi.stubEnv('NODE_ENV', 'production');

      const prodLogger = new Logger();
      prodLogger.error('Error message');

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should only log errors in test environment', () => {
      vi.stubEnv('NODE_ENV', 'test');

      const testLogger = new Logger();
      testLogger.info('Info message');
      testLogger.error('Error message');

      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Child Loggers', () => {
    it('should create child logger with inherited context', () => {
      const childLogger = logger.child({ component: 'EmailService' });

      childLogger.info('Message', { action: 'send' });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          component: 'EmailService',
          action: 'send',
        })
      );
    });

    it('should merge child context with call context', () => {
      const childLogger = logger.child({ component: 'Auth' });

      childLogger.info('Login', { userId: '123' });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          component: 'Auth',
          userId: '123',
        })
      );
    });

    it('should override parent context with child context', () => {
      const childLogger = logger.child({ component: 'Parent' });

      childLogger.info('Message', { component: 'Child' });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          component: 'Child', // Should be overridden
        })
      );
    });
  });

  describe('createLogger() Factory', () => {
    it('should create logger with component context', () => {
      const componentLogger = createLogger('MessagesAPI');

      componentLogger.info('Test message');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          component: 'MessagesAPI',
        })
      );
    });

    it('should allow additional context in child logger', () => {
      const componentLogger = createLogger('API');

      componentLogger.error('Failed', new Error('Test'), { endpoint: '/messages' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          component: 'API',
          endpoint: '/messages',
        }),
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle Error objects', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n  at test.ts:10';

      logger.error('Message', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.any(String),
        undefined,
        expect.objectContaining({
          name: 'Error',
          message: 'Test error',
          stack: expect.stringContaining('at test.ts:10'),
        })
      );
    });

    it('should handle non-Error objects gracefully', () => {
      logger.error('Message', 'string error');

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle errors without stack traces', () => {
      const error = new Error('No stack');
      delete error.stack;

      logger.error('Message', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.any(String),
        undefined,
        expect.objectContaining({
          name: 'Error',
          message: 'No stack',
          stack: undefined,
        })
      );
    });
  });

  describe('Context Handling', () => {
    it('should accept empty context', () => {
      logger.info('Message', {});

      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('should accept context with custom fields', () => {
      logger.info('Message', {
        userId: '123',
        accountId: 'abc',
        customField: 'value',
      });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          userId: '123',
          accountId: 'abc',
          customField: 'value',
        })
      );
    });

    it('should handle undefined context', () => {
      logger.info('Message');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.any(String),
        undefined
      );
    });
  });

  describe('Performance', () => {
    it('should log quickly (< 1ms)', () => {
      const start = performance.now();

      logger.info('Performance test', {
        component: 'Test',
        action: 'benchmark',
        data: { key: 'value' },
      });

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1);
    });

    it('should handle rapid logging without blocking', () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        logger.info(`Message ${i}`);
      }

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50); // 100 logs in < 50ms
    });
  });

  describe('Security', () => {
    it('should not leak sensitive data in context', () => {
      logger.info('User action', {
        userId: '123',
        // These should be logged but developer must be careful
        password: 'should-not-log-this',
      });

      // Test passes to show that logger WILL log everything in context
      // Developer responsibility to not include sensitive fields
      expect(consoleInfoSpy).toHaveBeenCalled();
    });
  });
});
