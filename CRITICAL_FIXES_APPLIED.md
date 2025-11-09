# Critical Production-Ready Fixes Applied

## Status: IN PROGRESS

### 1. AI Cost Tracking Implementation ✅ PARTIALLY COMPLETE

**Completed:**
- ✅ [ai/summarize/route.ts](app/api/ai/summarize/route.ts) - Already had cost tracking (lines 152-158)
- ✅ [ai/assistant/route.ts](app/api/ai/assistant/route.ts) - Already had cost tracking (lines 61-67)
- ✅ [ai/write/route.ts](app/api/ai/write/route.ts) - Cost tracking added (lines 91-97)

**Remaining Tasks:**
- ⏳ [ai/remix/route.ts](app/api/ai/remix/route.ts) - Needs cost tracking implementation
  - Service returns usage data but route doesn't track costs
  - Update remix service to return inputTokens/outputTokens separately
  - Add `trackAICost()` call after API call

- ⏳ [ai/transcribe/route.ts](app/api/ai/transcribe/route.ts) - Needs cost tracking implementation
  - Already calculates cost at line 114 but doesn't track it
  - Add `trackAICost()` call after Whisper API call
  - Note: Whisper charges per duration, not tokens

- ⏳ [contacts/enrich/route.ts](app/api/contacts/enrich/route.ts) - Check if AI is used

### 2. API Rate Limiting 🔴 NOT STARTED

**Critical Security Risk:** No rate limiting except SMS endpoints

**Files to Create:**
```typescript
// lib/security/rate-limiter.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
});

export async function checkRateLimit(identifier: string) {
  const { success, limit, reset, remaining } = await ratelimit.limit(identifier);
  if (!success) {
    throw new Error("Rate limit exceeded");
  }
  return { limit, reset, remaining };
}
```

**Endpoints to Protect:**
1. All `/api/auth/*` endpoints
2. All `/api/ai/*` endpoints
3. All `/api/nylas/*` endpoints
4. `/api/webhooks/*` endpoints

**Dependencies Needed:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

**Environment Variables:**
```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### 3. Plan Limits Enforcement 🔴 NOT STARTED

**Current State:** Plan limits defined but not enforced

**Files to Create:**
```typescript
// lib/billing/plan-limits.ts
export async function checkAILimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
}> {
  const user = await getUserWithPlan(userId);
  const usage = await getMonthlyAIUsage(userId);

  const limit = AI_LIMITS[user.plan];
  const remaining = Math.max(0, limit - usage.count);

  return {
    allowed: remaining > 0 || user.plan !== 'free',
    remaining,
    limit,
  };
}
```

**Limits to Enforce:**
- Free: 10 AI requests/month
- Individual: 100 AI requests/month
- Team: 500 AI requests/month
- Enterprise: Unlimited

### 4. Environment Variable Validation 🔴 NOT STARTED

**File to Create:**
```typescript
// lib/config/validate-env.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  // ... all required env vars
});

export function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.format());
    process.exit(1);
  }
}
```

Call in `instrumentation.ts` or entry point.

### 5. Privacy Policy & Terms of Service 🔴 NOT STARTED

**Pages to Create:**
- `/app/(marketing)/legal/privacy/page.tsx`
- `/app/(marketing)/legal/terms/page.tsx`
- `/app/(marketing)/legal/cookies/page.tsx`

**Cookie Consent:**
- Add cookie consent banner component
- Use library like `cookie-consent` or `cookieyes`

### 6. Fix Unauthenticated Admin Setup 🔴 CRITICAL SECURITY ISSUE

**Issue:** Anyone can become platform admin

**File:** Check `/api/admin/setup/route.ts` or similar

**Fix:** Add authentication check before allowing admin creation

---

## Next Steps (Priority Order)

1. **Complete AI cost tracking** for remix and transcribe endpoints (15 min)
2. **Implement rate limiting** on all API endpoints (2 hours)
3. **Add plan limits enforcement** for AI features (1 hour)
4. **Fix admin setup security issue** (30 min)
5. **Add environment validation** (30 min)
6. **Create legal pages** (2 hours)

## Estimated Time to Complete Critical Fixes: 6-8 hours

---

## Long-term TODO (Post-Launch)

### Database Backups
- Enable Supabase automated backups
- Set up point-in-time recovery (7 days)
- Test restoration quarterly

### Email Deliverability
- Configure custom domain in Resend
- Set up DKIM/SPF/DMARC DNS records
- Verify domain and test delivery

### Stripe Integration
- Add Stripe API keys to environment
- Configure webhook endpoint
- Test subscription lifecycle
- Enable customer portal

### Monitoring & Alerting
- Set up PagerDuty or similar
- Configure critical alerts:
  - High error rates
  - Failed payments
  - Sync failures
  - High AI costs
  - Database connection exhaustion

### CDN Setup
- Deploy to Vercel (automatic CDN)
- Or configure Cloudflare
- Set proper cache headers

### Data Retention
- Implement automated cleanup
- Add user-configurable settings
- Document retention policies
