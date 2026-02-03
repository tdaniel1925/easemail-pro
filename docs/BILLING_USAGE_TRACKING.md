# Billing & Usage Tracking Documentation

**Last Updated:** 2026-02-03
**Status:** ✅ Fully Integrated

---

## Overview

EaseMail uses a comprehensive usage tracking system for PayPal-based billing. All billable resources (SMS, AI, Storage, Email) are automatically tracked and recorded in the `usage_records` table for invoice generation.

---

## Tracked Resources

### 1. SMS Messages

**Pricing:** $0.01 per message

**Tracking Location:** `app/api/sms/send/route.ts:238-252`

**What's Tracked:**
- Message count (by segments)
- Destination country
- Character encoding (GSM-7 vs UCS-2)
- Twilio SID for verification

**Integration:**
```typescript
await trackSmsUsage(
  user.id,
  organizationId,
  messageSegments,
  {
    country: phoneValidation.country,
    encoding: segments.encoding,
    toPhone: phoneValidation.e164,
    twilioSid: result.sid,
  }
);
```

**When Tracked:** Immediately after successful SMS send

---

### 2. AI Requests (OpenAI/Anthropic)

**Pricing:**
- GPT-4: $0.03 per 1K tokens
- GPT-3.5-turbo: $0.002 per 1K tokens
- Claude Sonnet: $0.003 per 1K tokens
- Claude Opus: $0.015 per 1K tokens

**Tracking Location:** `app/api/ai/summarize/route.ts:220-237`

**What's Tracked:**
- Total tokens (prompt + completion)
- Model used
- Feature name (summarize, generate-reply, etc.)
- Prompt/completion token breakdown

**Integration:**
```typescript
const totalTokens = (completion.usage?.prompt_tokens || 0) + (completion.usage?.completion_tokens || 0);
await trackAiUsage(
  userId,
  organizationId,
  totalTokens,
  'gpt-3.5-turbo',
  {
    feature: 'summarize',
    emailId,
    promptTokens: completion.usage?.prompt_tokens,
    completionTokens: completion.usage?.completion_tokens,
  }
);
```

**When Tracked:** Immediately after AI response

**Other AI Endpoints to Integrate:**
- `app/api/ai/generate-reply/route.ts`
- `app/api/ai/grammar-check/route.ts`
- `app/api/ai/assistant/route.ts`
- `app/api/calendar/assistant/route.ts`
- `app/api/contacts/enrich/route.ts`

---

### 3. Storage

**Pricing:** $0.02 per GB per month

**Tracking Location:** `app/api/cron/track-storage/route.ts`

**What's Tracked:**
- Total storage used across all email accounts
- Per-user aggregation
- Organization-level tracking

**Integration:**
```typescript
await trackStorageUsage(
  userId,
  organizationId,
  storageBytes,
  {
    source: 'cron_job',
    trackedAt: new Date().toISOString(),
  }
);
```

**When Tracked:** Daily via cron job at 2 AM UTC

**Cron Schedule:** `0 2 * * *` (defined in `vercel.json`)

---

### 4. Email Sending

**Pricing:** $0.001 per email sent

**Tracking Location:** `app/api/nylas-v3/messages/send/route.ts:188-203`

**What's Tracked:**
- Email count (by recipient)
- Message ID for verification
- Account ID
- Subject
- Attachments flag
- Tracking flag

**Integration:**
```typescript
const recipientCount = (to?.length || 0) + (cc?.length || 0) + (bcc?.length || 0);
await trackEmailUsage(
  user.id,
  organizationId,
  recipientCount || 1,
  {
    messageId: response.data.id,
    accountId: account.id,
    subject: messageData.subject,
    hasAttachments: !!attachments?.length,
    tracked: !!trackingId,
  }
);
```

**When Tracked:** Immediately after successful email send

---

## Database Schema

### `usage_records` Table

```sql
CREATE TABLE usage_records (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  type VARCHAR(50) NOT NULL, -- 'sms', 'ai', 'storage', 'email'
  quantity DECIMAL(15, 6) NOT NULL,
  unit_price DECIMAL(10, 6) NOT NULL,
  total_cost DECIMAL(10, 2) NOT NULL,
  billing_period_start TIMESTAMP NOT NULL,
  billing_period_end TIMESTAMP NOT NULL,
  invoice_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
- `idx_usage_user_id` on `user_id`
- `idx_usage_org_id` on `organization_id`
- `idx_usage_type` on `type`
- `idx_usage_billing_period` on `billing_period_start, billing_period_end`
- `idx_usage_invoice` on `invoice_id`

---

## API Endpoints

### View Current Usage

**Endpoint:** `GET /api/billing/usage/current`

**Response:**
```json
{
  "period": {
    "start": "2026-02-01T00:00:00.000Z",
    "end": "2026-02-28T23:59:59.999Z"
  },
  "usage": {
    "sms": { "count": 45, "cost": 0.45, "formatted": "$0.45" },
    "ai": { "tokens": 12500, "cost": 0.38, "formatted": "$0.38" },
    "storage": { "gb": 2.5, "cost": 0.05, "formatted": "$0.05" },
    "email": { "count": 120, "cost": 0.12, "formatted": "$0.12" }
  },
  "total": {
    "cost": 1.00,
    "formatted": "$1.00"
  },
  "organizationId": "uuid-or-null"
}
```

---

## Billing Period

**Calendar Month:** 1st - Last day of month
**Tracking Window:** Usage recorded during the month
**Invoice Generation:** 1st of following month
**Payment Due:** 15th of following month

---

## Organization vs Individual Billing

**Individual Users** (`organizationId` = null):
- Usage tracked per user
- Invoices generated per user
- Subscription per user

**Organization Users** (`organizationId` set):
- Usage aggregated to organization
- Single invoice per organization
- Shared subscription limits
- All members' usage combined

---

## Usage Tracking Functions

### `trackUsage(data: UsageTrackingData)`

Generic usage tracker - **not called directly**, use specific helpers below.

### `trackSmsUsage(userId, orgId, count, metadata?)`

**Parameters:**
- `userId`: User ID
- `organizationId`: Organization ID (optional)
- `messageCount`: Number of messages (default: 1)
- `metadata`: Additional data (country, encoding, etc.)

**Unit Price:** $0.01 per message

### `trackAiUsage(userId, orgId, tokens, model, metadata?)`

**Parameters:**
- `userId`: User ID
- `organizationId`: Organization ID (optional)
- `tokens`: Total tokens used
- `model`: AI model name ('gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet', etc.)
- `metadata`: Additional data (feature, emailId, etc.)

**Unit Price:** Varies by model

### `trackStorageUsage(userId, orgId, bytes, metadata?)`

**Parameters:**
- `userId`: User ID
- `organizationId`: Organization ID (optional)
- `bytes`: Storage in bytes
- `metadata`: Additional data (source, trackedAt, etc.)

**Unit Price:** $0.02 per GB per month

### `trackEmailUsage(userId, orgId, count, metadata?)`

**Parameters:**
- `userId`: User ID
- `organizationId`: Organization ID (optional)
- `emailCount`: Number of emails (default: 1)
- `metadata`: Additional data (messageId, accountId, etc.)

**Unit Price:** $0.001 per email

---

## Usage Summaries

### `getUsageSummary(userId, periodStart, periodEnd)`

Get usage summary for an individual user.

**Returns:**
```typescript
{
  sms: { quantity: number; cost: number };
  ai: { quantity: number; cost: number };
  storage: { quantity: number; cost: number };
  email: { quantity: number; cost: number };
  total: number;
}
```

### `getOrganizationUsageSummary(orgId, periodStart, periodEnd)`

Get aggregated usage for entire organization.

**Returns:** Same as above + `userCount: number`

---

## Cron Jobs

### Storage Tracking

**Path:** `/api/cron/track-storage`
**Schedule:** Daily at 2 AM UTC (`0 2 * * *`)
**Function:** Calculates storage usage for all users and tracks for billing

**Auth:** Requires `Bearer {CRON_SECRET}` header

**Test Manually:**
```bash
curl -X POST http://localhost:3001/api/cron/track-storage \
  -H "Authorization: Bearer your-cron-secret"
```

---

## Integration Checklist

### ✅ Completed Integrations

- [x] SMS sending (`app/api/sms/send/route.ts`)
- [x] AI summarization (`app/api/ai/summarize/route.ts`)
- [x] Email sending - Nylas v3 (`app/api/nylas-v3/messages/send/route.ts`)
- [x] Storage tracking cron job (`app/api/cron/track-storage/route.ts`)
- [x] Cron schedule added to `vercel.json`

### 🔄 Additional Integrations Needed

- [ ] `app/api/ai/generate-reply/route.ts` - Add AI tracking
- [ ] `app/api/ai/grammar-check/route.ts` - Add AI tracking
- [ ] `app/api/ai/assistant/route.ts` - Add AI tracking
- [ ] `app/api/calendar/assistant/route.ts` - Add AI tracking
- [ ] `app/api/contacts/enrich/route.ts` - Add AI tracking
- [ ] `app/api/nylas/messages/send/route.ts` - Add email tracking (v1 API)

---

## Testing

### Test SMS Tracking

1. Send an SMS via `/api/sms/send`
2. Check `usage_records` table:
```sql
SELECT * FROM usage_records WHERE type = 'sms' ORDER BY created_at DESC LIMIT 5;
```

### Test AI Tracking

1. Use AI summarize endpoint
2. Check `usage_records` table:
```sql
SELECT * FROM usage_records WHERE type = 'ai' ORDER BY created_at DESC LIMIT 5;
```

### Test Email Tracking

1. Send an email via Nylas
2. Check `usage_records` table:
```sql
SELECT * FROM usage_records WHERE type = 'email' ORDER BY created_at DESC LIMIT 5;
```

### Test Storage Tracking

1. Run cron manually:
```bash
curl -X POST http://localhost:3001/api/cron/track-storage \
  -H "Authorization: Bearer dev-secret"
```
2. Check `usage_records` table:
```sql
SELECT * FROM usage_records WHERE type = 'storage' ORDER BY created_at DESC LIMIT 5;
```

### View Current Usage

```bash
curl -X GET http://localhost:3001/api/billing/usage/current \
  -H "Authorization: Bearer {user-session-token}"
```

---

## Troubleshooting

### Usage not being tracked

1. **Check logs** - Look for warnings like:
   ```
   ⚠️ Failed to track SMS for billing: [error]
   ```

2. **Verify table exists**:
   ```sql
   SELECT * FROM information_schema.tables WHERE table_name = 'usage_records';
   ```

3. **Check user organization assignment**:
   ```sql
   SELECT id, email, organization_id FROM users WHERE id = 'user-id';
   ```

### Cron job not running

1. Check Vercel cron logs in dashboard
2. Verify `CRON_SECRET` environment variable is set
3. Test manually with curl (see above)

### Incorrect pricing

Check `lib/billing/track-usage.ts` constants:
- `SMS_PRICE_PER_MESSAGE = 0.01`
- `EMAIL_PRICE_PER_MESSAGE = 0.001`
- `STORAGE_PRICE_PER_GB = 0.02`
- `AI_PRICING` object for model prices

---

## Future Enhancements

1. **Usage alerts** - Notify users when approaching limits
2. **Usage dashboard** - Visual charts of usage over time
3. **Automated invoicing** - Generate invoices from usage_records
4. **Cost forecasting** - Predict next month's bill
5. **Usage limits** - Hard caps per subscription tier
6. **Overage charges** - Charge extra for usage above limits

---

## Related Documentation

- [Billing Tables Migration](../migrations/026_add_billing_tables.sql)
- [Admin Quick Start](./ADMIN_QUICK_START.md)
- [Admin Test Plan](./ADMIN_TEST_PLAN.md)
- [PayPal Client](../lib/billing/paypal-client.ts)
- [Track Usage Functions](../lib/billing/track-usage.ts)

---

*Generated: 2026-02-03*
*Version: 1.0*
