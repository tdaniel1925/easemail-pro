# Console.log Cleanup & Logging Migration Guide

## Overview

Replace 1,729 console.log statements with structured logging for better debugging and production monitoring.

**Status:** ✅ Infrastructure complete, ready for gradual migration

---

## Problem with console.log

### Current State
```typescript
console.log('User logged in:', user);
console.log('[API] Fetching data...');
console.error('Payment failed:', error);
console.log('🔵 Nylas callback received:', { code, state });
```

**Issues:**
- No log levels (debug vs error)
- No structured format
- Clutters production console
- No remote logging/monitoring
- Hard to filter/search
- Performance impact in production
- No context categorization

---

## New Logging System

### Features
- **Log Levels**: debug, info, warn, error
- **Context Categories**: auth, api, db, email, nylas, sync, payment, webhook, ui, performance, security, admin
- **Production Ready**: Different behavior in dev vs prod
- **Structured Format**: Consistent timestamps and data
- **Remote Logging**: Send errors to monitoring service
- **Performance Tracking**: Built-in timing utilities
- **Type Safe**: Full TypeScript support

---

## Usage Examples

### Basic Logging

```typescript
import { logger } from '@/lib/utils/logger';

// By context
logger.api.info('Request received', { method: 'GET', path: '/api/users' });
logger.auth.warn('Failed login attempt', { email: 'user@example.com' });
logger.db.error('Database connection failed', error);
logger.nylas.debug('Webhook payload', webhookData);

// Output format (development):
// 2026-01-31T12:00:00.000Z [API] Request received { method: 'GET', path: '/api/users' }
```

### Create Custom Logger

```typescript
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('email');

log.info('Email sent successfully', { to: recipient, subject });
log.warn('Email delivery delayed', { messageId, retryCount });
log.error('Email sending failed', error);
```

### Performance Tracking

```typescript
import { logger } from '@/lib/utils/logger';

// Simple timing
const endTimer = logger.performance.time('Database query');
const users = await db.query.users.findMany();
endTimer(); // Logs: "Database query took 45.23ms"

// Async function timing
import { measureAsync } from '@/lib/utils/logger';

const result = await measureAsync('fetchUser', async () => {
  return await fetchUserFromAPI(userId);
});
```

### Error Logging

```typescript
import { logger } from '@/lib/utils/logger';

try {
  await processPayment(paymentData);
} catch (error) {
  logger.payment.error('Payment processing failed', error);
  // Automatically sends to Sentry in production
  // Includes stack trace and error details
}
```

### Grouped Logs

```typescript
import { logger } from '@/lib/utils/logger';

logger.sync.group('Email sync operation');
logger.sync.info('Fetching folders');
logger.sync.info('Fetching messages');
logger.sync.info('Updating database');
logger.sync.groupEnd();

// Output:
// [SYNC] Email sync operation
//   [SYNC] Fetching folders
//   [SYNC] Fetching messages
//   [SYNC] Updating database
```

---

## Migration Examples

### Example 1: Simple Logs

#### Before
```typescript
console.log('User logged in:', user);
```

#### After
```typescript
import { logger } from '@/lib/utils/logger';

logger.auth.info('User logged in', { userId: user.id, email: user.email });
```

### Example 2: Error Logging

#### Before
```typescript
console.error('Failed to fetch data:', error);
```

#### After
```typescript
import { logger } from '@/lib/utils/logger';

logger.api.error('Failed to fetch data', error);
```

### Example 3: Debug Logging

#### Before
```typescript
console.log('[Debug] Request payload:', payload);
```

#### After
```typescript
import { logger } from '@/lib/utils/logger';

logger.api.debug('Request payload', payload);
// Only logs in development by default
```

### Example 4: Component Logging

#### Before
```typescript
export function MyComponent() {
  console.log('Component mounted');
  console.log('Props:', props);

  const handleClick = () => {
    console.log('Button clicked');
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

#### After
```typescript
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('ui');

export function MyComponent() {
  useEffect(() => {
    log.debug('Component mounted', { componentName: 'MyComponent' });
  }, []);

  const handleClick = () => {
    log.debug('Button clicked', { action: 'click', component: 'MyComponent' });
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

### Example 5: API Route Logging

#### Before
```typescript
export async function POST(request: NextRequest) {
  console.log('🔵 API endpoint hit');

  try {
    const data = await request.json();
    console.log('Request data:', data);

    const result = await processData(data);
    console.log('✅ Success:', result);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

#### After
```typescript
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  logger.api.info('POST /api/endpoint');

  try {
    const data = await request.json();
    logger.api.debug('Request data', data);

    const result = await processData(data);
    logger.api.info('Request processed successfully', { resultId: result.id });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    logger.api.error('Request processing failed', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

---

## Log Contexts Reference

| Context | Use For |
|---------|---------|
| `auth` | Authentication, login, logout, sessions |
| `api` | API requests, responses, routing |
| `db` | Database queries, connections, migrations |
| `email` | Email sending, receiving, processing |
| `nylas` | Nylas API interactions, webhooks |
| `sync` | Email sync, background jobs |
| `payment` | Payment processing, subscriptions |
| `webhook` | Webhook handling, validation |
| `ui` | UI components, user interactions |
| `performance` | Performance monitoring, timing |
| `security` | Security events, CSRF, RBAC |
| `admin` | Admin operations, user management |
| `general` | General application logs |

---

## Production Behavior

### Development Mode
- All log levels visible (debug, info, warn, error)
- Logs output to console
- Detailed timestamps
- Full stack traces

### Production Mode
- Only info, warn, error (debug hidden)
- Errors sent to remote monitoring
- Reduced console output
- Performance optimized

### Configuration

```typescript
// lib/utils/logger.ts config
const defaultConfig = {
  minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true,
  enableRemote: process.env.NODE_ENV === 'production',
  remoteEndpoint: process.env.NEXT_PUBLIC_LOG_ENDPOINT,
};
```

Set `NEXT_PUBLIC_LOG_ENDPOINT` in `.env` for remote logging:
```bash
NEXT_PUBLIC_LOG_ENDPOINT=https://your-logging-service.com/api/logs
```

---

## Migration Strategy

### Phase 1: New Code (Immediate)
- Use logger in all new code
- Set standard for team

### Phase 2: High-Priority (1-2 weeks)
- API routes (`/api/**`)
- Authentication flows
- Payment processing
- Error handling

### Phase 3: Components (2-4 weeks)
- Email components
- Dashboard components
- Forms and inputs

### Phase 4: Utilities (4-6 weeks)
- Helper functions
- Utility modules
- Background jobs

### Phase 5: Legacy Cleanup (Ongoing)
- Replace remaining console.logs
- Remove debug logs
- Optimize log levels

---

## Finding console.logs

### Search entire codebase
```bash
# Count console.logs
grep -r "console\.log" --include="*.ts" --include="*.tsx" | wc -l

# Find specific files
grep -r "console\.log" --include="*.ts" --include="*.tsx" -l

# Find with context
grep -r "console\.log" --include="*.ts" --include="*.tsx" -n -C 2
```

### Priority order
1. `/api/**` - API routes (high traffic)
2. `/lib/**` - Shared utilities
3. `/components/**` - UI components
4. `/app/**` - Pages

---

## Testing Logs

```typescript
import { createLogger, LogLevel } from '@/lib/utils/logger';

// Test in development
const log = createLogger('test');

log.debug('Debug message'); // Visible in dev
log.info('Info message');   // Visible always
log.warn('Warning message'); // Visible always
log.error('Error message');  // Visible always + sent to remote
```

---

## Integration with Monitoring Services

### Sentry Integration

```typescript
// Add to app/layout.tsx or _app.tsx
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

// Logger automatically sends errors to Sentry
logger.error('Something went wrong', error);
// Error captured in Sentry with full context
```

### Custom Remote Endpoint

```typescript
// Create custom logging endpoint
// /api/logs/route.ts
export async function POST(request: NextRequest) {
  const logEntry = await request.json();

  // Send to logging service (LogRocket, Datadog, etc.)
  await sendToLoggingService(logEntry);

  return NextResponse.json({ success: true });
}
```

---

## Best Practices

### ✅ DO

```typescript
// Use appropriate log level
logger.auth.info('User logged in', { userId }); // User action
logger.api.debug('Request details', { headers }); // Debug info
logger.payment.error('Payment failed', error); // Error

// Include context data
logger.sync.info('Sync completed', {
  accountId,
  messageCount,
  duration: endTime - startTime
});

// Use specific contexts
logger.nylas.info('Webhook received'); // Not logger.general
```

### ❌ DON'T

```typescript
// Don't mix console.log and logger
console.log('Old way');
logger.info('New way'); // Pick one!

// Don't log sensitive data
logger.info('User data', { password: 'secret123' }); // BAD

// Don't overuse error level
logger.error('Button clicked'); // Should be debug

// Don't log inside tight loops
for (let i = 0; i < 10000; i++) {
  logger.debug('Iteration', { i }); // Performance impact
}
```

---

## Summary

**Current State**: 1,729 console.log statements
**Goal**: Replace with structured logging
**Approach**: Gradual migration, new code first
**Timeline**: 4-6 weeks for full migration
**Status**: Infrastructure ready ✅

---

## Files Created

- `lib/utils/logger.ts` - Logging utility
- `LOGGING_MIGRATION_GUIDE.md` - This guide

---

**Next Steps:**
1. Start using logger in all new code
2. Migrate API routes first
3. Gradually replace console.logs in existing code
4. Set up remote logging endpoint (optional)
5. Integrate with Sentry or similar service (optional)
