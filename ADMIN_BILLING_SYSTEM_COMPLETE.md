# 💳 Admin Usage Analytics & Automated Billing System

## 📋 **OVERVIEW**

This comprehensive system provides platform admins with real-time usage monitoring, automated billing, payment processing, and subscription management with special handling for promo users.

**Built:** November 2025  
**Status:** ✅ **COMPLETE AND READY FOR PRODUCTION**

---

## 🎯 **KEY FEATURES**

### 1. **User Types & Billing Rules**
- ✅ **Free Tier Users**: No billing, no payment method required
- ✅ **Promo Users**: Full access to all features, no billing, no payment method required
- ✅ **Paid Tier Users** (Starter/Pro/Enterprise): Billing enabled, payment method required

### 2. **Usage Tracking**
- ✅ SMS messages with real-time cost tracking
- ✅ AI requests by feature (write, remix, dictate, transcribe, etc.)
- ✅ Storage usage with overage calculations
- ✅ Per-user and per-organization aggregation

### 3. **Automated Billing**
- ✅ Scheduled billing runs (daily/weekly/monthly)
- ✅ Automatic payment processing via Stripe
- ✅ Retry logic for failed charges
- ✅ Grace periods before service suspension
- ✅ Configurable charge thresholds

### 4. **Admin Dashboard**
- ✅ Real-time usage analytics with charts
- ✅ User-level usage breakdown
- ✅ Billing configuration panel
- ✅ Billing run history
- ✅ Pending charges preview

---

## 📁 **FILE STRUCTURE**

```
migrations/
  024_billing_automation_and_promo_users.sql   # Database schema

lib/
  db/
    schema.ts                                   # Updated with new tables
  billing/
    automated-billing.ts                        # Core billing automation
    payment-method-requirement.ts               # Payment method enforcement
    invoice-generator.ts                        # (existing) Invoice generation

app/
  api/
    admin/
      usage/
        route.ts                                # GET usage data
        users/route.ts                          # Per-user usage
        trends/route.ts                         # Time-series data
      billing/
        config/route.ts                         # Billing config CRUD
        process/route.ts                        # Manual billing trigger
        pending/route.ts                        # Preview charges
        retry/route.ts                          # Retry failed charges
        history/route.ts                        # Billing run history
    cron/
      billing/route.ts                          # Automated cron job

  (dashboard)/
    admin/
      usage-analytics/
        page.tsx                                # Usage analytics page
      billing-config/
        page.tsx                                # Billing config page

components/
  admin/
    usage/
      UsageAnalyticsDashboard.tsx              # Main dashboard
      UserUsageTable.tsx                        # User usage table
      UsageTrendsChart.tsx                      # Charts and trends
    billing/
      BillingConfigPanel.tsx                    # Config UI
      PendingChargesPreview.tsx                 # Pending charges card
      BillingRunHistory.tsx                     # History table
```

---

## 🗄️ **DATABASE SCHEMA**

### New Tables

#### `billing_config`
Configuration for automated billing system.
- `enabled` - Enable/disable automated billing
- `frequency` - 'daily', 'weekly', or 'monthly'
- `day_of_week` / `day_of_month` - Schedule
- `hour_of_day` - Time to run (UTC)
- `auto_retry` - Enable retry for failed charges
- `max_retries` - Maximum retry attempts
- `retry_delay_hours` - Delay between retries
- Charge thresholds and grace periods

#### `billing_runs`
History of automated billing runs.
- `started_at` / `completed_at` - Timestamps
- `status` - 'running', 'completed', 'partial', 'failed'
- `accounts_processed` - Number of accounts
- `charges_successful` / `charges_failed` - Results
- `total_amount_charged_usd` - Total revenue
- `metadata` - Detailed results

#### `billing_transactions`
Detailed transaction log for all charges.
- `user_id` / `organization_id` - Account
- `transaction_type` - 'charge', 'refund', 'credit'
- `amount_usd` - Charge amount
- `status` - 'pending', 'processing', 'success', 'failed'
- `payment_method_id` - Payment method used
- `stripe_charge_id` / `stripe_payment_intent_id` - Stripe refs
- `retry_count` / `next_retry_at` - Retry tracking
- `metadata` - Usage breakdown (SMS, AI, storage)

#### `payment_method_requirements`
Tracks which users must have payment methods.
- `user_id` - User reference
- `requires_payment_method` - Boolean flag
- `reason` - Why payment method is required
- `enforce_after` - Grace period end date
- `suspended_at` - Suspension timestamp
- `notification_count` - Notification tracking

### Updated Tables

#### `users`
Added:
- `is_promo_user` - Boolean flag for promo users
- `subscription_tier` - 'free', 'starter', 'pro', 'enterprise'

#### `sms_usage`, `ai_usage`
Added:
- `charged_at` - When charge was processed
- `charge_amount_usd` - Amount charged
- `transaction_id` - Reference to billing_transactions

---

## 🔧 **API ENDPOINTS**

### Usage Analytics

#### `GET /api/admin/usage`
Get aggregated usage data.
**Query Params:**
- `startDate` - ISO date string
- `endDate` - ISO date string
- `userId` - Optional filter
- `organizationId` - Optional filter
- `type` - 'sms' | 'ai' | 'storage' | 'all'

**Response:**
```json
{
  "success": true,
  "usage": {
    "period": { "start": "...", "end": "..." },
    "sms": { "totalMessages": 1000, "totalCost": 10.50 },
    "ai": { "totalRequests": 500, "totalCost": 5.00, "byFeature": [...] },
    "storage": { "totalGb": "10.5", "overageCost": 2.00 }
  }
}
```

#### `GET /api/admin/usage/users`
Get per-user usage breakdown.
**Query Params:**
- `startDate`, `endDate`, `limit`, `offset`

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "user": { "id": "...", "email": "...", "isPromoUser": false },
      "usage": { "sms": {...}, "ai": {...}, "storage": {...}, "total": {...} },
      "billing": { "hasPaymentMethod": true, "requiresPaymentMethod": true }
    }
  ],
  "pagination": { "limit": 50, "offset": 0, "total": 100 }
}
```

#### `GET /api/admin/usage/trends`
Get time-series usage data.
**Query Params:**
- `startDate`, `endDate`
- `granularity` - 'day' | 'week' | 'month'
- `type` - 'sms' | 'ai' | 'storage' | 'all'

### Billing Configuration

#### `GET /api/admin/billing/config`
Get current billing configuration.

#### `PUT /api/admin/billing/config`
Update billing configuration.
**Body:**
```json
{
  "enabled": true,
  "frequency": "monthly",
  "dayOfMonth": 1,
  "hourOfDay": 2,
  "autoRetry": true,
  "maxRetries": 3,
  "retryDelayHours": 24,
  "notifyOnFailure": true,
  "smsChargeThresholdUsd": 1.00,
  "aiChargeThresholdUsd": 5.00,
  "minimumChargeUsd": 0.50,
  "gracePeriodDays": 3
}
```

#### `POST /api/admin/billing/process`
Manually trigger billing process.
**Response:**
```json
{
  "success": true,
  "result": {
    "runId": "...",
    "accountsProcessed": 10,
    "chargesSuccessful": 8,
    "chargesFailed": 2,
    "totalAmountCharged": 150.00,
    "errors": [...]
  }
}
```

#### `GET /api/admin/billing/pending`
Preview upcoming charges.

#### `POST /api/admin/billing/retry`
Retry failed charges.

#### `GET /api/admin/billing/history`
Get billing run history.
**Query Params:** `limit`, `offset`

### Cron Job

#### `GET /api/cron/billing`
Automated billing cron endpoint (called by Vercel Cron).
**Headers:** `Authorization: Bearer <CRON_SECRET>`

---

## ⚙️ **SETUP INSTRUCTIONS**

### 1. Run Database Migration
```bash
# Connect to your Supabase SQL Editor and run:
migrations/024_billing_automation_and_promo_users.sql
```

### 2. Environment Variables
Add to your `.env.local`:
```bash
# Existing
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_APP_URL=https://easemail.app

# New for cron job
CRON_SECRET=<generate-random-secret>
```

Generate cron secret:
```bash
openssl rand -hex 32
```

### 3. Configure Vercel Cron (if using Vercel)
Create or update `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/billing",
      "schedule": "0 2 1 * *"
    }
  ]
}
```

Schedule formats:
- `0 2 * * *` - Daily at 2:00 AM
- `0 2 * * 1` - Weekly on Mondays at 2:00 AM
- `0 2 1 * *` - Monthly on 1st at 2:00 AM

### 4. Configure Stripe
Ensure your Stripe account is set up with:
- ✅ Payment methods enabled
- ✅ Customer objects created
- ✅ Webhook endpoints configured (if needed)

### 5. Initial Configuration
1. Navigate to `/admin/billing-config`
2. Set your billing schedule
3. Configure charge thresholds
4. Set notification email
5. Enable automated billing

---

## 👤 **MANAGING PROMO USERS**

### Mark a User as Promo User

**Via SQL:**
```sql
UPDATE users 
SET is_promo_user = true 
WHERE email = 'promotionaluser@example.com';
```

**Via Admin UI (Future Enhancement):**
- Go to `/admin/users`
- Select user
- Toggle "Promo User" flag

### Promo User Benefits
- ✅ Full access to all features (SMS, AI, Storage)
- ✅ No billing charges
- ✅ No payment method required
- ✅ Unlimited usage within system limits

### Viewing Promo Users
```sql
SELECT id, email, full_name, subscription_tier, is_promo_user
FROM users
WHERE is_promo_user = true;
```

---

## 📊 **USAGE MONITORING**

### Access the Dashboard
Navigate to: `/admin/usage-analytics`

### Features:
1. **Overview Cards**: SMS, AI, Storage, Total Cost
2. **Date Range Selector**: Custom date ranges or presets
3. **User Usage Table**: Sortable, filterable, paginated
4. **Trends Charts**: Line and bar charts for all metrics
5. **AI Feature Breakdown**: Usage by AI feature type
6. **Export Functionality**: (Coming soon)

### User Table Indicators:
- 🟢 **Promo User**: Free access badge
- 🔵 **✓ Payment Method**: Has active payment method
- 🔴 **⚠ No Payment Method**: Requires payment method but doesn't have one
- ⚪ **Free Tier**: No payment method required

---

## 💳 **BILLING PROCESS FLOW**

### Automated Billing (Scheduled)

1. **Cron Trigger** → `/api/cron/billing` at scheduled time
2. **Check Configuration** → Is billing enabled?
3. **Get Pending Accounts** → Query users with unpaid usage
4. **Filter Accounts**:
   - Skip promo users
   - Skip free tier users
   - Skip if charges below minimum threshold
5. **For Each Account**:
   - Check payment method exists
   - Calculate total charges (SMS + AI + Storage)
   - Create billing transaction record
   - Charge payment method via Stripe
   - Update usage records as charged
   - Handle failures (retry queue)
6. **Complete Run** → Log results, send notifications

### Manual Billing

1. Admin clicks "Run Billing Now" in `/admin/billing-config`
2. Same process as automated billing
3. Results displayed immediately in UI

### Failed Charge Retry

1. **Automatic** (if enabled):
   - Failed transactions marked with `next_retry_at`
   - Cron job checks for retries
   - Attempts charge again after delay
   - Increments retry count
2. **Manual**:
   - Admin clicks "Retry Failed Charges"
   - Retries all eligible failed transactions

---

## 🔐 **PAYMENT METHOD ENFORCEMENT**

### Automatic Enforcement
Run periodically (e.g., daily cron):
```typescript
import { enforceAllPaymentMethodRequirements } from '@/lib/billing/payment-method-requirement';

const result = await enforceAllPaymentMethodRequirements();
// result: { checked, requirementsCreated, notificationsSent, suspended }
```

### Enforcement Flow
1. Check all users for payment method requirement
2. If required but missing:
   - Create requirement record with grace period
   - Send notification email (once per day)
3. If grace period expires:
   - Suspend user account
   - Service restricted until payment method added

### Grace Period
- Default: 3 days (configurable)
- Daily email reminders
- Account suspended after grace period
- Automatically unsuspended when payment method added

---

## 🧪 **TESTING**

### Test Promo User Flow
```bash
# 1. Mark user as promo
UPDATE users SET is_promo_user = true WHERE email = 'test@example.com';

# 2. Generate usage (send SMS, use AI)

# 3. Run billing
curl -X POST http://localhost:3001/api/admin/billing/process \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie"

# 4. Verify no charges
SELECT * FROM billing_transactions WHERE user_id = 'user-id';
# Should be empty for promo users
```

### Test Regular User Flow
```bash
# 1. User with subscription tier (not free, not promo)
UPDATE users SET subscription_tier = 'pro', is_promo_user = false 
WHERE email = 'test@example.com';

# 2. Add payment method
# (Via UI or API)

# 3. Generate usage

# 4. Run billing

# 5. Verify charge
SELECT * FROM billing_transactions WHERE user_id = 'user-id';
```

### Test Payment Method Requirement
```bash
# 1. Remove payment methods
DELETE FROM payment_methods WHERE user_id = 'user-id';

# 2. Run enforcement
# (Via cron or manual API call)

# 3. Check requirement
SELECT * FROM payment_method_requirements WHERE user_id = 'user-id';

# 4. Verify notification sent

# 5. Wait for grace period to expire

# 6. Verify suspension
SELECT suspended FROM users WHERE id = 'user-id';
```

---

## 📈 **MONITORING & ALERTS**

### Key Metrics to Monitor
1. **Billing Success Rate**: `chargesSuccessful / accountsProcessed`
2. **Failed Charges**: Track and investigate patterns
3. **Users Without Payment Methods**: Flag for follow-up
4. **Revenue**: `totalAmountCharged` per billing run
5. **Usage Growth**: Trend analysis over time

### Logs to Review
- Billing run logs: Check `/api/admin/billing/history`
- Failed transactions: Query `billing_transactions` where `status = 'failed'`
- Payment requirements: Query `payment_method_requirements`

### Alerts to Set Up
1. Billing run failure
2. High failed charge rate (>10%)
3. Many users without payment methods
4. Usage spikes (potential abuse)

---

## 🚀 **PRODUCTION DEPLOYMENT**

### Pre-Launch Checklist
- ✅ Run database migration
- ✅ Set all environment variables
- ✅ Configure Vercel Cron (or alternative scheduler)
- ✅ Test billing process end-to-end
- ✅ Set up Stripe webhooks (optional)
- ✅ Configure notification email
- ✅ Test promo user flow
- ✅ Test payment method enforcement
- ✅ Set appropriate charge thresholds
- ✅ Enable billing in configuration

### Post-Launch Monitoring
- Day 1: Monitor first billing run closely
- Week 1: Review all failed charges, adjust thresholds if needed
- Month 1: Analyze revenue, usage patterns, user feedback

---

## 🆘 **TROUBLESHOOTING**

### Billing Run Failed
1. Check logs in `/api/admin/billing/history`
2. Review error messages in `billing_runs.metadata`
3. Common causes:
   - Stripe API key invalid
   - Database connection timeout
   - Invalid payment methods

### Charges Failing
1. Check Stripe dashboard for decline reasons
2. Review `billing_transactions` table
3. Common causes:
   - Expired cards
   - Insufficient funds
   - Bank declines
4. Solution: Retry or contact user

### Promo Users Being Charged
1. Verify `is_promo_user = true` in database
2. Check billing logs for user ID
3. If charged, issue refund:
```sql
INSERT INTO billing_transactions (user_id, transaction_type, amount_usd, description)
VALUES ('user-id', 'refund', -10.00, 'Promo user incorrectly charged');
```

### Cron Job Not Running
1. Verify `CRON_SECRET` is set
2. Check Vercel Cron configuration
3. Test manually: `curl -H "Authorization: Bearer <CRON_SECRET>" https://easemail.app/api/cron/billing`
4. Alternative: Use external cron service (cron-job.org, EasyCron, etc.)

---

## 📚 **RELATED DOCUMENTATION**
- Invoice System: `docs/TEAM_ADMIN_IMPLEMENTATION_COMPLETE.md`
- Email Sync: `SYNC_SYSTEM_IMPROVEMENTS.md`
- Settings Redesign: `SETTINGS_REDESIGN_COMPLETE.md`

---

## ✅ **COMPLETION STATUS**

**System Status: 🟢 PRODUCTION READY**

All components built and tested:
- ✅ Database schema and migration
- ✅ Automated billing logic
- ✅ Promo user support
- ✅ Payment method enforcement
- ✅ Admin usage analytics dashboard
- ✅ Billing configuration panel
- ✅ API endpoints (8 endpoints)
- ✅ Cron job integration
- ✅ Comprehensive documentation

**Next Steps:**
1. Run migration on production database
2. Configure environment variables
3. Enable billing in admin panel
4. Monitor first billing cycle

---

*Built with ❤️ for EaseMail - Making email management effortless.*

