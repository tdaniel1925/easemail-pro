# Logging Migration Guide

This guide explains how to migrate from console.* to the centralized logger.

## Quick Reference

| Old Code | New Code |
|----------|----------|
| `console.log('message')` | `logger.info('message')` |
| `console.info('message')` | `logger.info('message')` |
| `console.warn('message')` | `logger.warn('message')` |
| `console.error('error')` | `logger.error('Error message', error)` |
| `console.debug('debug')` | `logger.debug('message')` |

## Migration Patterns

### Pattern 1: Simple log statements
```typescript
// Before
console.log('User logged in');

// After
import { logger } from '@/lib/logger';
logger.info('User logged in', { component: 'Auth' });
```

### Pattern 2: Error logging
```typescript
// Before
console.error('Failed to fetch messages:', error);

// After
import { logger } from '@/lib/logger';
logger.error('Failed to fetch messages', error, {
  component: 'MessagesAPI',
  accountId: account.id,
});
```

### Pattern 3: Debug logging
```typescript
// Before
console.log('[Debug] Processing message:', messageId);

// After
import { logger } from '@/lib/logger';
logger.debug('Processing message', {
  component: 'MessageProcessor',
  messageId,
});
```

### Pattern 4: Component-specific logger
```typescript
// Create a logger for a specific component (preferred for files with many logs)
import { createLogger } from '@/lib/logger';

const logger = createLogger('EmailCompose');

// Then use it throughout the file:
logger.info('Compose dialog opened');
logger.warn('Draft save failed', { draftId });
logger.error('Send failed', error, { recipientCount: to.length });
```

### Pattern 5: API route logging
```typescript
// Before
export async function GET(request: NextRequest) {
  try {
    console.log('Fetching messages...');
    // ...
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// After
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    logger.info('Fetching messages', { component: 'MessagesAPI' });
    // ...
  } catch (error) {
    logger.error('Messages API failed', error, {
      component: 'MessagesAPI',
      url: request.url,
    });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

## Context Fields

Always include relevant context to make logs searchable:

```typescript
logger.info('Message sent', {
  component: 'EmailSender',    // Which component/file
  action: 'send',               // What action
  userId: user.id,              // Who
  accountId: account.id,        // Which account
  messageId: message.id,        // Which resource
  recipientCount: to.length,    // Additional data
});
```

## Log Levels

Use appropriate log levels:

- **debug**: Development-only debugging information
- **info**: Important informational messages (user actions, API calls)
- **warn**: Warning messages (degraded functionality, retries)
- **error**: Error messages (handled errors, recoverable failures)
- **fatal**: Critical errors (system failures, data corruption)

## Finding Files to Migrate

Search for files with console statements:

```bash
# Find all files with console.log
grep -r "console\.log" --include="*.ts" --include="*.tsx" app/ lib/ components/

# Find all files with console.error
grep -r "console\.error" --include="*.ts" --include="*.tsx" app/ lib/ components/

# Count console statements per file
grep -r "console\." --include="*.ts" --include="*.tsx" app/ lib/ components/ | cut -d: -f1 | sort | uniq -c | sort -rn
```

## Priority Files to Migrate

Migrate in this order:
1. **API routes** (app/api/**/route.ts) - High visibility errors
2. **Error boundaries** - Critical error handling
3. **Authentication** (lib/auth/*) - Security-related logs
4. **Database operations** (lib/db/*) - Data integrity logs
5. **Component files** - User-facing errors

## Configuration

### Development
- All log levels shown in console
- Structured format with emojis
- Context displayed

### Production
- Only info+ levels logged
- Console disabled (unless ENABLE_CONSOLE_LOGS=true)
- Errors sent to external service (Sentry)

### Test
- Only error+ levels logged
- Console disabled
- Prevents test output noise

## External Service Integration

To enable Sentry error tracking:

1. Install Sentry:
```bash
npm install @sentry/nextjs
```

2. Configure in lib/logger/index.ts (already set up)

3. Errors and fatal logs automatically sent to Sentry

## Best Practices

1. **Include context**: Always add component name and relevant IDs
2. **Don't log sensitive data**: Avoid passwords, tokens, full emails
3. **Be descriptive**: "Failed to fetch messages" not "Error in API"
4. **Use child loggers**: Create component-specific loggers for cleaner code
5. **Log user actions**: Track what users do for debugging
6. **Don't over-log**: Avoid logging in tight loops

## Examples

### Good Logging
```typescript
logger.info('Email sent successfully', {
  component: 'EmailSender',
  messageId: result.id,
  recipientCount: to.length,
  hasAttachments: attachments.length > 0,
});
```

### Bad Logging
```typescript
console.log('email sent'); // No context, vague message, wrong method
```

## Gradual Migration

You can migrate gradually:
1. Start with new code (use logger from day 1)
2. When touching old code, replace console statements
3. Run periodic sweeps to find remaining console.*

The logger is backward compatible with console API for easy drop-in replacement.
