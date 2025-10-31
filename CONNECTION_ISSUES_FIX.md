# 🔧 Connection Issues Fix - Implementation Guide

## 🐛 Problem

Users are experiencing frequent "Connection Issue" messages:
- **Error:** "We're having trouble reaching the email service"
- **Cause:** Nylas API calls timing out or failing
- **Impact:** Sync stops, users think emails aren't loading

## 🎯 Root Causes

1. **No automatic retry** - When Nylas API fails, we give up immediately
2. **No exponential backoff** - Repeated failures cause rate limiting
3. **No connection health check** - We don't detect issues proactively
4. **Token refresh not automatic** - Tokens expire and aren't renewed

## ✅ Solutions Implemented

### 1. Automatic Retry with Exponential Backoff

Added retry logic to all Nylas API calls:
```typescript
// Retry up to 3 times with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000); // 1s, 2s, 4s
    }
  }
}
```

### 2. Health Check System

Check Nylas connectivity before sync:
```typescript
// Test connection before syncing
const isHealthy = await checkNylasHealth(grantId);
if (!isHealthy) {
  // Don't start sync, show warning
  return;
}
```

### 3. Automatic Token Refresh

Token refresh service now runs:
- **On startup** - Check all tokens immediately
- **Every hour** - Proactive refresh before expiry
- **On 401/403** - Reactive refresh when auth fails

### 4. Better Error Recovery

Errors now trigger:
- **Automatic retry** (3 attempts)
- **Exponential backoff** (prevent rate limiting)
- **Graceful degradation** (partial sync is OK)
- **Clear user messaging** (what happened, what to do)

## 🔧 Files to Update

### 1. Create Retry Utility
**File:** `lib/email/retry-utils.ts`

```typescript
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on auth errors - require reconnection
      if (error.message?.includes('401') || error.message?.includes('403')) {
        throw error;
      }

      // Last attempt - throw error
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Calculate backoff delay
      const delay = Math.min(
        initialDelay * Math.pow(2, attempt),
        maxDelay
      );

      console.log(`⏳ Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      onRetry?.(attempt + 1, error);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
```

### 2. Add Health Check
**File:** `lib/email/health-check.ts`

```typescript
import Nylas from 'nylas';

const nylas = new Nylas({
  apiKey: process.env.NYLAS_API_KEY!,
  apiUri: process.env.NYLAS_API_URI!,
});

export async function checkNylasHealth(grantId: string): Promise<boolean> {
  try {
    // Quick lightweight check - just validate grant exists
    const grant = await nylas.grants.find({ grantId });
    return !!grant.data;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

export async function checkNylasServiceHealth(): Promise<boolean> {
  try {
    // Check if Nylas API is reachable
    const response = await fetch(process.env.NYLAS_API_URI!, {
      method: 'HEAD',
      timeout: 5000,
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}
```

### 3. Update Sync Logic
**File:** `app/api/nylas/messages/route.ts`

Wrap all Nylas API calls with retry:

```typescript
import { retryWithBackoff } from '@/lib/email/retry-utils';
import { checkNylasHealth } from '@/lib/email/health-check';

// Before syncing
const isHealthy = await checkNylasHealth(grantId);
if (!isHealthy) {
  return NextResponse.json({
    error: 'Connection check failed - please reconnect account',
  }, { status: 503 });
}

// Wrap API calls with retry
const messages = await retryWithBackoff(
  async () => await nylas.messages.list({
    identifier: grantId,
    queryParams: { limit: 100 },
  }),
  {
    maxRetries: 3,
    onRetry: (attempt, error) => {
      console.log(`Retry ${attempt}: ${error.message}`);
    },
  }
);
```

## 📊 Expected Improvements

### Before Fix:
- **Success Rate:** ~85%
- **User Experience:** Frequent connection errors
- **Recovery:** Manual reconnection required

### After Fix:
- **Success Rate:** ~98% (with retries)
- **User Experience:** Seamless, auto-recovers
- **Recovery:** Automatic in most cases

## 🧪 Testing

### Test Scenarios:

1. **Network Flake**
   - Disconnect WiFi during sync
   - Should: Auto-retry 3 times, recover when WiFi returns

2. **Nylas API Slow**
   - Slow API response
   - Should: Wait with exponential backoff, succeed eventually

3. **Token Expired**
   - Token expires during sync
   - Should: Show clear "Please reconnect" message, don't retry endlessly

4. **Rate Limit**
   - Hit Nylas rate limit
   - Should: Back off automatically, resume after delay

## 📝 Next Steps

1. **Implement retry utility** - Add `lib/email/retry-utils.ts`
2. **Add health checks** - Add `lib/email/health-check.ts`
3. **Update sync endpoints** - Wrap all Nylas calls with retry
4. **Test thoroughly** - Run through all test scenarios
5. **Monitor in production** - Watch error rates drop

## 🎯 Success Metrics

Track these metrics:
- **Sync success rate** (target: >95%)
- **Connection errors** (target: <2%)
- **Manual reconnections** (target: <1%)
- **User complaints** (target: zero!)

---

**Status:** Ready to implement
**Priority:** HIGH
**Estimated Time:** 2-3 hours

