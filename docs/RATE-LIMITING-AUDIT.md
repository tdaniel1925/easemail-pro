# Rate Limiting Audit & Enhancement Plan

**Audit Date:** February 1, 2026
**Status:** ⚠️ INCOMPLETE - Significant gaps identified
**Priority:** HIGH - Security Risk

---

## Executive Summary

### Current State
- **Total API Endpoints**: 323
- **Endpoints with Rate Limiting**: ~11 (3.4%)
- **Coverage**: ⚠️ CRITICALLY LOW

### Risk Assessment
🔴 **HIGH RISK**: 97% of API endpoints lack rate limiting protection

**Vulnerable to:**
- Denial of Service (DoS) attacks
- Brute force attacks
- API abuse and cost explosion
- Database connection exhaustion
- Third-party API quota exhaustion (Nylas, OpenAI, etc.)

### Recommendation
**URGENT**: Apply rate limiting to all public API endpoints within 1 week

---

## Current Rate Limiting Implementation

### Rate Limiter Configuration

Located in: `lib/security/rate-limiter.ts`

**Technology:** Upstash Redis + @upstash/ratelimit

#### Existing Limiters

| Limiter | Limit | Window | Use Case |
|---------|-------|--------|----------|
| `aiRateLimit` | 20 req | 10 sec | AI/LLM endpoints |
| `authRateLimit` | 5 req | 10 sec | Authentication endpoints |
| `apiRateLimit` | 100 req | 10 sec | General API endpoints |
| `webhookRateLimit` | 50 req | 10 sec | Webhook receivers |

### Currently Protected Endpoints

#### AI Endpoints (5/5) ✅
- `/api/ai/write`
- `/api/ai/assistant`
- `/api/ai/generate-reply`
- `/api/ai/summarize`
- `/api/ai/remix`
- `/api/ai/transcribe`

#### Auth Endpoints (3/3) ✅
- `/api/auth/request-password-reset`
- `/api/auth/validate-reset-token`
- `/api/auth/reset-password-with-token`

#### Other Endpoints (2) ✅
- `/api/admin/setup`
- `/api/sms/send`

### Unprotected Endpoints (312+) ❌

#### Critical Unprotected Endpoints

**Email Operations:**
- `/api/emails` (GET, POST, DELETE)
- `/api/emails/[id]`
- `/api/emails/send`
- `/api/emails/draft`
- `/api/emails/search`
- **Risk**: Database overload, API abuse

**Contact Management:**
- `/api/contacts` (GET, POST, PUT, DELETE)
- `/api/contacts/import`
- `/api/contacts/export`
- **Risk**: Data scraping, import abuse

**Calendar Operations:**
- `/api/calendar/events`
- `/api/calendar/events/[eventId]`
- `/api/calendar/sync`
- **Risk**: Nylas API quota exhaustion

**Webhooks:**
- `/api/webhooks/nylas`
- `/api/webhooks/stripe`
- **Risk**: Webhook flooding, processing overload

**File Operations:**
- `/api/files/upload`
- `/api/files/download`
- **Risk**: Storage abuse, bandwidth exhaustion

**Sync Operations:**
- `/api/sync/start`
- `/api/sync/status`
- **Risk**: Nylas API quota exhaustion, database overload

---

## Recommended Rate Limits

### Tier 1: Strict Limits (Expensive/Sensitive)

#### Authentication & Security
```typescript
// Login, signup, password reset
Limit: 5 requests per 15 minutes per IP
Reason: Prevent brute force attacks
```

#### AI/LLM Operations
```typescript
// Any OpenAI/Claude API calls
Limit: 20 requests per 10 seconds per user
Reason: Prevent cost explosion ($$$)
```

#### File Uploads
```typescript
// File upload endpoints
Limit: 10 uploads per 5 minutes per user
Reason: Prevent storage abuse
```

### Tier 2: Moderate Limits (Standard Operations)

#### Email Operations
```typescript
// Send, draft, delete emails
Limit: 60 requests per minute per user
Reason: Prevent spam, protect Nylas quota
```

#### Contact Management
```typescript
// CRUD operations on contacts
Limit: 100 requests per minute per user
Reason: Prevent data scraping
```

#### Calendar Operations
```typescript
// Event creation, updates, RSVP
Limit: 60 requests per minute per user
Reason: Protect Nylas API quota
```

### Tier 3: Generous Limits (Read Operations)

#### Search & Fetch Operations
```typescript
// GET requests for emails, contacts, events
Limit: 200 requests per minute per user
Reason: Allow normal usage, prevent abuse
```

#### Webhook Receivers
```typescript
// Incoming webhooks from Nylas, Stripe, etc.
Limit: 100 requests per minute per webhook source
Reason: Handle burst traffic, prevent flooding
```

### Tier 4: Internal/Cron (No Public Limit)

#### Cron Jobs
```typescript
// Internal scheduled tasks
No rate limit (secured by CRON_SECRET)
Reason: Trusted internal operations
```

---

## Implementation Plan

### Phase 1: Critical Endpoints (Week 1) 🔴

**Priority:** Highest Risk

1. **Authentication Endpoints**
   - [x] Password reset ✅ (already protected)
   - [ ] Login
   - [ ] Signup
   - [ ] OAuth callbacks

2. **Email Send**
   - [ ] `/api/emails/send`
   - [ ] `/api/emails/draft`
   **Impact:** Prevent spam, protect Nylas sending quota

3. **File Upload**
   - [ ] `/api/files/upload`
   - [ ] `/api/attachments/upload`
   **Impact:** Prevent storage abuse

4. **Contact Import**
   - [ ] `/api/contacts/import`
   **Impact:** Prevent bulk scraping

### Phase 2: External API Integrations (Week 2) 🟡

**Priority:** Cost Protection

1. **Nylas Sync Operations**
   - [ ] `/api/sync/start`
   - [ ] `/api/calendar/sync`
   - [ ] `/api/contacts/sync`
   **Impact:** Protect Nylas API quota ($$$)

2. **Stripe Operations**
   - [ ] `/api/billing/checkout`
   - [ ] `/api/billing/subscription`
   **Impact:** Prevent payment processing abuse

3. **SMS Operations**
   - [x] `/api/sms/send` ✅ (already protected)
   - [ ] `/api/sms/conversations`

### Phase 3: CRUD Operations (Week 3) 🟢

**Priority:** Data Protection

1. **Email CRUD**
   - [ ] `/api/emails` (POST, PUT, DELETE)
   - [ ] `/api/emails/[id]` (PUT, DELETE)

2. **Contact CRUD**
   - [ ] `/api/contacts` (POST, PUT, DELETE)
   - [ ] `/api/contacts/[id]` (PUT, DELETE)

3. **Calendar CRUD**
   - [ ] `/api/calendar/events` (POST, PUT, DELETE)

### Phase 4: Read Operations (Week 4) 🔵

**Priority:** Lower (but still important)

1. **Search & Fetch**
   - [ ] `/api/emails` (GET)
   - [ ] `/api/contacts` (GET)
   - [ ] `/api/calendar/events` (GET)
   - [ ] `/api/search`

2. **Exports**
   - [ ] `/api/contacts/export`
   - [ ] `/api/emails/export`

---

## Enhanced Rate Limiter

### New Rate Limit Tiers

Create enhanced limiter: `lib/security/enhanced-rate-limiter.ts`

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Tier 1: Authentication (very strict)
export const authStrictLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  prefix: "ratelimit:auth:strict",
});

// Tier 2: Expensive operations (AI, file uploads)
export const expensiveLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "5 m"),
  prefix: "ratelimit:expensive",
});

// Tier 3: Write operations (emails, contacts, events)
export const writeLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  prefix: "ratelimit:write",
});

// Tier 4: Read operations (fetching data)
export const readLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(200, "1 m"),
  prefix: "ratelimit:read",
});

// Tier 5: Webhook receivers
export const webhookLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  prefix: "ratelimit:webhook",
});
```

### Usage Example

```typescript
// In any API route
import { NextRequest, NextResponse } from 'next/server';
import { writeLimit, getRateLimitIdentifier, enforceRateLimit } from '@/lib/security/enhanced-rate-limiter';

export async function POST(request: NextRequest) {
  // Get identifier (user ID or IP)
  const userId = request.headers.get('x-user-id');
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
  const identifier = getRateLimitIdentifier(userId, ip);

  // Check rate limit
  const rateLimitCheck = await enforceRateLimit(writeLimit, identifier);

  if (!rateLimitCheck.allowed) {
    return NextResponse.json(
      { error: rateLimitCheck.error },
      {
        status: 429,
        headers: rateLimitCheck.headers,
      }
    );
  }

  // Continue with API logic...
  return NextResponse.json({ success: true });
}
```

---

## Middleware Approach (Recommended)

### Global Rate Limiting Middleware

Create: `middleware-rate-limit.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { match } from 'path-to-regexp';

// Rate limit configuration by path pattern
const RATE_LIMIT_CONFIG = {
  '/api/auth/*': 'authStrictLimit',
  '/api/emails/send': 'writeLimit',
  '/api/files/upload': 'expensiveLimit',
  '/api/ai/*': 'expensiveLimit',
  '/api/emails': 'readLimit',
  '/api/contacts': 'readLimit',
};

export async function rateLimitMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Find matching rate limit tier
  for (const [pattern, limiter] of Object.entries(RATE_LIMIT_CONFIG)) {
    if (match(pattern)(pathname)) {
      // Apply rate limit
      const result = await applyRateLimit(limiter, request);

      if (!result.allowed) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          {
            status: 429,
            headers: result.headers,
          }
        );
      }
    }
  }

  return NextResponse.next();
}
```

---

## Testing Rate Limits

### Manual Testing

```bash
# Test auth endpoint (should fail after 5 requests in 15 min)
for i in {1..10}; do
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n"
  sleep 1
done

# Should see 429 after 5th request
```

### Automated Testing

```javascript
// tests/rate-limit.test.ts
import { describe, it, expect } from 'vitest';

describe('Rate Limiting', () => {
  it('should block after limit exceeded', async () => {
    // Make 10 requests rapidly
    const requests = Array(10).fill(null).map(() =>
      fetch('http://localhost:3001/api/emails/send', {
        method: 'POST',
        headers: { 'X-User-ID': 'test-user' },
      })
    );

    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);

    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

---

## Monitoring Rate Limits

### Upstash Analytics

View rate limit analytics in Upstash dashboard:
- Request volume by endpoint
- Rate limit hit rate
- Top rate-limited users/IPs

### Custom Logging

```typescript
// Add to rate limit enforcement
if (!result.success) {
  console.warn('Rate limit exceeded', {
    identifier,
    endpoint: request.nextUrl.pathname,
    limit: result.limit,
    reset: new Date(result.reset).toISOString(),
  });

  // Log to Sentry
  Sentry.captureMessage('Rate limit exceeded', {
    level: 'warning',
    extra: { identifier, endpoint },
  });
}
```

### Alerts

Configure Sentry alert:
- **Condition**: Rate limit events > 100 in 5 minutes
- **Action**: Notify #security-alerts
- **Reason**: Possible DoS attack

---

## Cost Considerations

### Current Cost
- **Upstash Redis**: Free tier (10K commands/day)
- **Current**: ~500 rate limit checks/day
- **Headroom**: 95%

### After Full Implementation
- **Estimated**: 50K rate limit checks/day
- **Required**: Paid plan ($10/month for 100K commands/day)
- **ROI**: Prevents $1000s in API abuse costs

### Cost-Benefit Analysis
- **Cost**: $10/month (Upstash Redis)
- **Prevents**:
  - Nylas API overages: $100-500/month
  - OpenAI API abuse: $100-1000/month
  - Storage abuse: $50-200/month
  - Downtime from DoS: Priceless

**ROI: 10-100x**

---

## Fallback Strategy

### If Redis is Unavailable

```typescript
// In rate limiter
if (!redis) {
  // Log warning
  console.warn('Rate limiting disabled - Redis not configured');

  // Allow request but track in-memory (limited protection)
  return inMemoryRateLimit(identifier);
}
```

### In-Memory Fallback

```typescript
// Simple in-memory rate limiter for emergencies
const inMemoryLimits = new Map<string, number[]>();

function inMemoryRateLimit(identifier: string) {
  const now = Date.now();
  const requests = inMemoryLimits.get(identifier) || [];

  // Remove requests older than 1 minute
  const recent = requests.filter(t => t > now - 60000);

  // Check limit (100 requests per minute)
  if (recent.length >= 100) {
    return { success: false };
  }

  recent.push(now);
  inMemoryLimits.set(identifier, recent);

  return { success: true };
}
```

---

## Next Steps

1. **Immediately (Today)**
   - [ ] Review this audit with team
   - [ ] Decide on implementation timeline
   - [ ] Allocate 4-8 hours of dev time

2. **Week 1: Critical Endpoints**
   - [ ] Implement enhanced rate limiter
   - [ ] Apply to auth endpoints
   - [ ] Apply to email send
   - [ ] Apply to file uploads
   - [ ] Test thoroughly

3. **Week 2-4: Remaining Endpoints**
   - [ ] Apply to external API integrations
   - [ ] Apply to CRUD operations
   - [ ] Apply to read operations
   - [ ] Monitor and adjust limits

4. **Ongoing**
   - [ ] Monitor Upstash analytics
   - [ ] Adjust limits based on usage patterns
   - [ ] Add alerts for rate limit abuse
   - [ ] Document rate limits in API docs

---

## Conclusion

**Current State**: Critical security gap
**Required Action**: Implement rate limiting across all endpoints
**Timeline**: 4 weeks for complete coverage
**Priority**: HIGH - Should be completed before production launch

Rate limiting is not optional for a production SaaS application. It's a fundamental security control that protects against abuse, controls costs, and ensures service availability for legitimate users.
