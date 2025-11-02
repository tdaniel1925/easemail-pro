# 📝 **PRODUCTION LOGGING GUIDE**

## **✅ Logger Implementation Complete**

A production-ready logging system has been implemented in `lib/logger.ts` to replace `console.log` statements throughout the codebase.

---

## **🎯 Why Replace console.log?**

### **Problems with console.log:**
- ❌ No log levels (can't filter by severity)
- ❌ No structured data
- ❌ No timestamps
- ❌ No context (user, request, etc.)
- ❌ Hard to search/analyze
- ❌ No integration with monitoring tools
- ❌ Clutters production logs

### **Benefits of Logger:**
- ✅ Structured JSON logs
- ✅ Log levels (debug, info, warn, error, fatal)
- ✅ Automatic timestamps
- ✅ Context tracking (userId, requestId, etc.)
- ✅ Ready for Sentry/LogRocket integration
- ✅ Clean development output with emojis
- ✅ Production-ready JSON format

---

## **📚 Usage Examples**

### **Import the Logger**
```typescript
import { log } from '@/lib/logger';
// or
import logger from '@/lib/logger';
```

### **Replace console.log**

**Before:**
```typescript
console.log('User logged in:', user.email);
console.error('Failed to fetch emails:', error);
console.warn('API rate limit approaching');
```

**After:**
```typescript
log.info('User logged in', { userId: user.id, email: user.email });
log.error('Failed to fetch emails', error, { accountId: account.id });
log.warn('API rate limit approaching', { remaining: 10 });
```

---

## **🔤 Log Levels**

### **1. debug() - Development Only**
```typescript
log.debug('Processing email batch', { batchSize: 50 });
```
- Only shows in development
- Use for detailed debugging info
- Not logged in production

### **2. info() - General Information**
```typescript
log.info('Email sync started', { accountId: '123', totalEmails: 500 });
```
- Normal operations
- Successful completions
- Status updates

### **3. warn() - Warnings (Non-Breaking)**
```typescript
log.warn('Email attachments skipped', { reason: 'size limit', size: '25MB' });
```
- Degraded performance
- Missing optional features
- Rate limits approaching
- Recoverable issues

### **4. error() - Errors (Recoverable)**
```typescript
log.error('Failed to send email', error, { 
  userId: user.id, 
  accountId: account.id 
});
```
- Failed operations
- Exceptions caught
- Retry-able errors
- User-facing errors

### **5. fatal() - Critical Errors**
```typescript
log.fatal('Database connection lost', error, { 
  database: 'postgres',
  host: 'db.supabase.co'
});
```
- System-wide failures
- Data corruption
- Security breaches
- Requires immediate action

---

## **🎨 Specialized Loggers**

### **HTTP Requests**
```typescript
log.http('POST', '/api/emails/send', 200, 1234, { userId: user.id });
// Output: 🟢 POST /api/emails/send - 200 (1234ms)
```

### **Database Operations**
```typescript
log.db('SELECT', 'emails', 45, { query: 'inbox', limit: 50 });
// Output: 🗄️  SELECT emails (45ms)
```

### **Email Operations**
```typescript
log.email('sent', 'user@example.com', true, { messageId: 'msg-123' });
// Output: ✅ Email sent to user@example.com
```

### **SMS Operations**
```typescript
log.sms('sent', '+15551234567', true, { messageId: 'sms-456' });
// Output: ✅ SMS sent to ***-***-4567 (auto-masked)
```

### **Success Messages**
```typescript
log.success('User created successfully', { userId: newUser.id });
// Output: ✅ User created successfully
```

---

## **📊 Context Object**

Always include relevant context for better debugging:

```typescript
log.info('Email synchronized', {
  userId: user.id,
  email: user.email,
  accountId: account.id,
  provider: 'nylas',
  emailsCount: 150,
  duration: 3456,
  requestId: req.headers['x-request-id'],
});
```

**Common Context Fields:**
- `userId` - User ID
- `email` - User email
- `accountId` - Email account ID
- `organizationId` - Organization ID
- `requestId` - Request trace ID
- `duration` - Operation duration (ms)
- `provider` - Service provider (nylas, aurinko, twilio)
- `error` - Error object

---

## **🔄 Migration Strategy**

### **High Priority (Replace These First):**
1. ✅ Error handlers in API routes
2. ✅ Database operations
3. ✅ External API calls (Nylas, Twilio, OpenAI)
4. ✅ Authentication/authorization failures
5. ✅ Billing/payment operations

### **Medium Priority:**
6. ⚠️ Background jobs
7. ⚠️ Webhook handlers
8. ⚠️ Email sync operations
9. ⚠️ Cron jobs

### **Low Priority:**
10. ⏳ Development-only debug logs
11. ⏳ Internal utility functions

---

## **📝 Before & After Examples**

### **Example 1: API Route**

**Before:**
```typescript
export async function POST(request: NextRequest) {
  try {
    console.log('Creating new user');
    const data = await request.json();
    const user = await createUser(data);
    console.log('User created:', user.id);
    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('User creation failed:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
```

**After:**
```typescript
import { log } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    log.info('Creating new user');
    const data = await request.json();
    const user = await createUser(data);
    log.success('User created successfully', { userId: user.id, email: user.email });
    return NextResponse.json({ success: true, user });
  } catch (error) {
    log.error('User creation failed', error, { email: data?.email });
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
```

### **Example 2: Email Sync**

**Before:**
```typescript
console.log('Starting email sync');
const emails = await fetchEmails(accountId);
console.log(`Fetched ${emails.length} emails`);
await saveEmails(emails);
console.log('Sync complete');
```

**After:**
```typescript
log.info('Starting email sync', { accountId });
const emails = await fetchEmails(accountId);
log.info('Emails fetched', { count: emails.length, accountId });
await saveEmails(emails);
log.success('Email sync completed', { emailsCount: emails.length, accountId });
```

---

## **🔌 Monitoring Integration**

### **Sentry (Recommended)**

Add to `lib/logger.ts`:
```typescript
import * as Sentry from '@sentry/nextjs';

private sendToMonitoring(entry: LogEntry) {
  if (this.isProduction && entry.level === 'error' || entry.level === 'fatal') {
    if (entry.error) {
      Sentry.captureException(entry.error, {
        contexts: { log: entry.context },
      });
    } else {
      Sentry.captureMessage(entry.message, {
        level: entry.level,
        contexts: { log: entry.context },
      });
    }
  }
}
```

### **LogRocket**

Add to `lib/logger.ts`:
```typescript
import LogRocket from 'logrocket';

private sendToMonitoring(entry: LogEntry) {
  if (this.isProduction) {
    LogRocket.error(entry.message, entry.context);
  }
}
```

---

## **📈 Production Benefits**

### **Vercel Logs:**
```json
{
  "level": "error",
  "message": "Email sync failed",
  "context": {
    "userId": "user-123",
    "accountId": "acc-456",
    "provider": "nylas",
    "error": "Rate limit exceeded"
  },
  "timestamp": "2025-11-02T10:30:00.000Z",
  "environment": "production"
}
```

### **Easy Filtering:**
```bash
# Vercel CLI - Filter by level
vercel logs --filter level=error

# Filter by user
vercel logs --filter userId=user-123

# Filter by operation
vercel logs --filter message=*sync*
```

---

## **✅ Current Status**

- ✅ Logger implemented (`lib/logger.ts`)
- ⚠️ 450+ console.log statements exist
- ⏳ Migration in progress

**Recommendation:** 
- Replace console.logs gradually during feature development
- Priority: Error handlers first, then info logs
- Keep development-friendly output (emojis in dev mode)

---

## **🎯 Quick Reference**

```typescript
// Import
import { log } from '@/lib/logger';

// Basic usage
log.debug('Debug info');
log.info('General info', { userId: '123' });
log.warn('Warning', { reason: 'rate limit' });
log.error('Error occurred', error, { userId: '123' });
log.fatal('Critical failure', error);

// Specialized
log.http('GET', '/api/emails', 200, 123);
log.db('SELECT', 'emails', 45);
log.email('sent', 'user@example.com', true);
log.sms('sent', '+15551234567', true);
log.success('Operation completed');
```

---

**Ready to use!** Start replacing console.logs in critical paths first, then expand gradually. 🚀

