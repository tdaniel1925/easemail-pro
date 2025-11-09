# Cost Tracking Implementation Guide

## Current Status

Your Cost Center dashboard is showing **estimates** instead of real costs because:

1. **SMS Tracking**: Partially implemented but using old field names
2. **AI Tracking**: NOT implemented - no cost recording in AI endpoints
3. **Storage Tracking**: NOT implemented - no periodic storage calculation
4. **Nylas Tracking**: Just a static estimate ($5/account)

## What You Need for Accurate Costs

### 1. SMS Costs (Twilio) ✅ Partially Done

**Current Implementation**: `app/api/sms/send/route.ts` (lines 228, 264-302)

**Problem**: Uses `totalCostUsd` field but your schema also has `cost` field as an alias

**Solution**: The new `trackSMSCost()` utility in `lib/utils/cost-tracking.ts` handles this correctly

**How to Get Actual Costs**:
- Twilio includes the actual price in webhooks (`MessageStatus` callbacks)
- File: `app/api/webhooks/twilio/route.ts` - Update this to capture the actual `Price` field from Twilio
- Twilio price format: `"-0.00750"` (negative because it's a charge)

**Example Twilio Webhook Data**:
```json
{
  "MessageSid": "SM...",
  "MessageStatus": "delivered",
  "Price": "-0.00750",
  "PriceUnit": "USD"
}
```

**Integration** (Replace lines 228 in sms/send/route.ts):
```typescript
import { trackSMSCost } from '@/lib/utils/cost-tracking';

// After successful SMS send (line 228):
await trackSMSCost({
  userId: user.id,
  messageCount: segments.messageCount,
  actualCost: result.cost || SMS_COST, // Use actual Twilio cost
});
```

---

### 2. AI Costs (OpenAI/Anthropic) ❌ Not Implemented

**Files to Update**:
- `app/api/ai/assistant/route.ts`
- `app/api/ai/summarize/route.ts`
- `app/api/ai/transcribe/route.ts`
- `app/api/contacts/enrich/route.ts`
- Any other AI-powered endpoints

**How to Get Actual Costs**:

Both OpenAI and Anthropic return token usage in their API responses:

**OpenAI Response**:
```json
{
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 80,
    "total_tokens": 230
  }
}
```

**Anthropic Response**:
```json
{
  "usage": {
    "input_tokens": 150,
    "output_tokens": 80
  }
}
```

**Integration Example** for `app/api/ai/assistant/route.ts`:

```typescript
import { trackAICost } from '@/lib/utils/cost-tracking';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Make API call
const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [...],
});

// Track cost IMMEDIATELY after API call
await trackAICost({
  userId: user.id,
  feature: 'assistant', // or 'compose', 'summarize', etc.
  model: 'claude-3-5-sonnet-20241022',
  inputTokens: response.usage.input_tokens,
  outputTokens: response.usage.output_tokens,
});
```

**For OpenAI**:
```typescript
import { trackAICost } from '@/lib/utils/cost-tracking';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const completion = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [...],
});

// Track cost
await trackAICost({
  userId: user.id,
  feature: 'compose',
  model: 'gpt-4',
  inputTokens: completion.usage?.prompt_tokens || 0,
  outputTokens: completion.usage?.completion_tokens || 0,
});
```

---

### 3. Storage Costs ❌ Not Implemented

**Current Problem**: No periodic storage calculation

**Solution**: Create a cron job or API endpoint that calculates storage usage

**Create**: `app/api/cron/calculate-storage/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { users, emailAccounts, emails } from '@/lib/db/schema';
import { trackStorageCost } from '@/lib/utils/cost-tracking';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * Cron job to calculate storage usage for all users
 * Run this daily or weekly via Vercel Cron or similar
 *
 * Vercel cron config in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/calculate-storage",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Storage Cron] Starting storage calculation...');

    // Get all users
    const allUsers = await db.query.users.findMany();

    let processed = 0;
    let errors = 0;

    for (const user of allUsers) {
      try {
        // Calculate total storage for this user
        // This is a simplified example - adjust based on your actual storage structure
        const storageStats = await db
          .select({
            totalAttachments: sql<number>`COALESCE(SUM(attachment_size), 0)`,
            totalEmails: sql<number>`COALESCE(COUNT(*) * 50000, 0)`, // Estimate 50KB per email
          })
          .from(emails)
          .where(sql`user_id = ${user.id}`);

        const attachmentsBytes = Number(storageStats[0]?.totalAttachments || 0);
        const emailsBytes = Number(storageStats[0]?.totalEmails || 0);
        const totalBytes = attachmentsBytes + emailsBytes;

        // Track storage cost
        await trackStorageCost({
          userId: user.id,
          totalBytes,
          attachmentsBytes,
          emailsBytes,
        });

        processed++;
      } catch (userError) {
        console.error(`[Storage Cron] Error processing user ${user.id}:`, userError);
        errors++;
      }
    }

    console.log(`[Storage Cron] Complete. Processed: ${processed}, Errors: ${errors}`);

    return NextResponse.json({
      success: true,
      processed,
      errors,
    });
  } catch (error) {
    console.error('[Storage Cron] Fatal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Setup Vercel Cron** in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/calculate-storage",
      "schedule": "0 0 * * *"
    }
  ]
}
```

---

### 4. Nylas Costs

**Current**: Static estimate of $5/account

**Reality**: Nylas pricing varies:
- Free tier: Limited accounts
- Paid: $5-15/account depending on features

**Solution**:
1. If you have Nylas webhook access, track actual billing events
2. Otherwise, the current estimate is reasonable - just make sure it matches your actual Nylas plan

**Update if needed** in `lib/utils/cost-tracking.ts`:
```typescript
export const PRICING = {
  // ...
  nylas: {
    perAccount: 5.0, // Update this to match your actual Nylas cost per account
  },
};
```

---

## Quick Start: Implement AI Tracking First

AI costs are usually the highest and easiest to track. Start here:

### Step 1: Find all AI endpoints
```bash
grep -r "anthropic\|openai" app/api --include="*.ts"
```

### Step 2: Add cost tracking to each endpoint

**Example for `app/api/ai/assistant/route.ts`**:

```typescript
// Add import at top
import { trackAICost } from '@/lib/utils/cost-tracking';

// Find where you make the AI API call, add tracking right after:
const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: conversationMessages,
});

// ADD THIS:
await trackAICost({
  userId: user.id,
  feature: 'assistant',
  model: 'claude-3-5-sonnet-20241022',
  inputTokens: response.usage.input_tokens,
  outputTokens: response.usage.output_tokens,
});

// Continue with rest of your code...
return NextResponse.json({ response: response.content[0].text });
```

### Step 3: Test it

1. Use an AI feature (e.g., AI Assistant)
2. Check your database:
   ```sql
   SELECT * FROM ai_usage ORDER BY created_at DESC LIMIT 10;
   ```
3. Check your Cost Center dashboard - it should now show real AI costs!

---

## Pricing Configuration

Update `lib/utils/cost-tracking.ts` with your **actual provider costs**:

```typescript
export const PRICING = {
  sms: {
    perMessage: 0.0075, // Check your Twilio console for exact rate
  },
  ai: {
    gpt4: {
      inputTokens: 0.03 / 1000,   // GPT-4: $0.03/1K input tokens
      outputTokens: 0.06 / 1000,  // GPT-4: $0.06/1K output tokens
    },
    gpt35: {
      inputTokens: 0.0015 / 1000, // GPT-3.5: $0.0015/1K input tokens
      outputTokens: 0.002 / 1000, // GPT-3.5: $0.002/1K output tokens
    },
    claude: {
      inputTokens: 0.015 / 1000,  // Claude 3.5: $0.015/1K input tokens
      outputTokens: 0.075 / 1000, // Claude 3.5: $0.075/1K output tokens
    },
  },
  storage: {
    perGB: 0.023, // AWS S3 standard: $0.023/GB/month
  },
  nylas: {
    perAccount: 5.0, // $5 per account per month
  },
};
```

---

## Testing & Validation

### 1. Test SMS Tracking
```sql
-- Check recent SMS costs
SELECT
  user_id,
  message_count,
  cost,
  period_start,
  period_end,
  created_at
FROM sms_usage
ORDER BY created_at DESC
LIMIT 10;
```

### 2. Test AI Tracking
```sql
-- Check recent AI costs
SELECT
  user_id,
  feature,
  request_count,
  cost,
  period_start,
  period_end,
  created_at
FROM ai_usage
ORDER BY created_at DESC
LIMIT 10;
```

### 3. Test Storage Tracking
```sql
-- Check storage snapshots
SELECT
  user_id,
  storage_used / 1024.0 / 1024.0 / 1024.0 as storage_gb,
  cost,
  snapshot_date
FROM storage_usage
ORDER BY snapshot_date DESC
LIMIT 10;
```

### 4. Validate Cost Center Accuracy

Compare your Cost Center dashboard totals against:
1. **Twilio Console**: Check actual SMS spend
2. **OpenAI/Anthropic Dashboard**: Check actual API spend
3. **Cloud Storage Provider**: Check actual storage costs

---

## Markup Calculation

Once you have accurate costs, you can calculate profit margins:

```
Revenue = Subscription fees (from subscriptions table)
Costs = SUM(sms_costs + ai_costs + storage_costs + nylas_costs)
Gross Profit = Revenue - Costs
Profit Margin = (Gross Profit / Revenue) * 100%
```

Your Cost Center already does this calculation! Just need the accurate underlying costs.

---

## Priority Implementation Order

1. **AI Tracking** (Highest impact, easiest to implement)
   - Add to all `/api/ai/*` endpoints
   - Should take 30-60 minutes

2. **SMS Cost Refinement** (Already partially done)
   - Update Twilio webhook to capture actual prices
   - Should take 15-30 minutes

3. **Storage Calculation** (Lower priority, requires cron setup)
   - Create cron endpoint
   - Set up Vercel cron or similar
   - Should take 1-2 hours

4. **Nylas Cost Validation** (Lowest priority)
   - Verify the $5/account estimate matches reality
   - Adjust if needed

---

## Next Steps

Would you like me to:
1. Implement AI cost tracking in your AI endpoints?
2. Update the Twilio webhook to capture actual SMS costs?
3. Create the storage calculation cron job?
4. All of the above?

Let me know what you want to tackle first!
