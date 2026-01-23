# 🚀 PayPal Integration Setup Guide
## EaseMail - Complete Payment Setup Instructions

**Status:** Frontend & Backend Complete ✅
**Requires:** PayPal Business Account + API Credentials
**Time to Complete:** 15-20 minutes

---

## 📋 PREREQUISITES

Before you begin, you'll need:
- ✅ Database migrations 035 & 036 applied (DONE)
- ✅ PayPal Business account (or Sandbox for testing)
- ✅ Access to PayPal Developer Dashboard
- ✅ Terminal access to run setup script

---

## STEP 1: Get PayPal API Credentials

### Option A: Testing with Sandbox (Recommended First)

1. **Go to PayPal Developer Dashboard**
   - Visit: https://developer.paypal.com/dashboard/
   - Log in with your PayPal account

2. **Create a Sandbox App**
   - Click "Apps & Credentials"
   - Switch to "Sandbox" tab
   - Click "Create App"
   - Name: "EaseMail Sandbox"
   - Click "Create App"

3. **Copy Your Credentials**
   You'll see:
   - **Client ID** (starts with `A...`)
   - **Secret** (click "Show" to reveal)

4. **Add to `.env.local`:**
   ```env
   # PayPal Sandbox Credentials
   PAYPAL_CLIENT_ID=your_sandbox_client_id_here
   PAYPAL_CLIENT_SECRET=your_sandbox_secret_here
   NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_sandbox_client_id_here
   PAYPAL_MODE=sandbox
   ```

### Option B: Production (After Testing)

1. **Switch to Live**
   - Go to https://developer.paypal.com/dashboard/
   - Click "Apps & Credentials"
   - Switch to **"Live"** tab
   - Click "Create App"
   - Name: "EaseMail Production"

2. **Get Live Credentials**
   - Copy Live **Client ID**
   - Copy Live **Secret**

3. **Update `.env` (Production):**
   ```env
   # PayPal Live Credentials
   PAYPAL_CLIENT_ID=your_live_client_id_here
   PAYPAL_CLIENT_SECRET=your_live_secret_here
   NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_live_client_id_here
   PAYPAL_MODE=production
   ```

---

## STEP 2: Create PayPal Billing Plans

This script creates your subscription products and billing plans in PayPal.

### Run the Setup Script:

```bash
npx tsx scripts/setup-paypal-plans.ts
```

### What It Creates:

**Products:**
- EaseMail Individual Plan
- EaseMail Team Plan

**Billing Plans:**
- Individual Monthly ($45/month)
- Individual Annual ($36/month, billed $432/year)
- Team Monthly ($40.50/seat/month)
- Team Annual ($32.40/seat/month, billed $388.80/seat/year)

### Expected Output:

```
✅ Created Product: Individual (PROD-XXX123)
✅ Created Plan: Individual Monthly (P-ABC123)
✅ Created Plan: Individual Annual (P-DEF456)
✅ Created Product: Team (PROD-YYY456)
✅ Created Plan: Team Monthly (P-GHI789)
✅ Created Plan: Team Annual (P-JKL012)

✅ All PayPal billing plans created and saved to database!
```

---

## STEP 3: Configure PayPal Webhook

Webhooks notify your app when subscription events occur (payment, cancellation, etc.).

### 3.1 Create Webhook in PayPal Dashboard

1. **Go to Webhooks**
   - Visit: https://developer.paypal.com/dashboard/webhooks
   - (Or: Dashboard → Apps & Credentials → [Your App] → Webhooks)

2. **Add Webhook**
   - Click "Add Webhook"
   - **Webhook URL:** `https://yourdomain.com/api/paypal/webhook`
     - For local testing: Use ngrok or similar
     - Example: `https://abc123.ngrok.io/api/paypal/webhook`

3. **Select Events** (check these):
   - ✅ `BILLING.SUBSCRIPTION.ACTIVATED`
   - ✅ `BILLING.SUBSCRIPTION.UPDATED`
   - ✅ `BILLING.SUBSCRIPTION.CANCELLED`
   - ✅ `BILLING.SUBSCRIPTION.SUSPENDED`
   - ✅ `BILLING.SUBSCRIPTION.EXPIRED`
   - ✅ `PAYMENT.SALE.COMPLETED`
   - ✅ `PAYMENT.SALE.REFUNDED`

4. **Save Webhook**
   - Click "Save"
   - **Copy the Webhook ID** (starts with `WH-...`)

### 3.2 Add Webhook ID to Environment

```env
PAYPAL_WEBHOOK_ID=WH-your-webhook-id-here
```

---

## STEP 4: Test the Integration

### 4.1 Start Your Dev Server

```bash
npm run dev
```

### 4.2 Test Subscription Flow

1. **Go to Pricing Page**
   - Visit: `http://localhost:3000/pricing`

2. **Select a Plan**
   - Click "Start 14-Day Trial" on Individual or Team plan
   - You'll be redirected to PayPal

3. **Complete Payment (Sandbox)**
   - Log in with a **Sandbox Test Account**
   - To create one:
     - Go to https://developer.paypal.com/dashboard/accounts
     - Click "Create Account"
     - Type: Personal
     - Country: Your country
     - Click "Create"
   - Approve the subscription

4. **Verify Success**
   - You'll be redirected back to `/settings/billing?success=true`
   - Check database: `subscriptions` table should have new entry
   - `payment_provider` should be `'paypal'`
   - `paypal_subscription_id` should be populated

### 4.3 Test Webhook Events

1. **Trigger a Test Webhook**
   - Go to PayPal Dashboard → Webhooks
   - Click your webhook
   - Click "Simulator"
   - Select event: `BILLING.SUBSCRIPTION.ACTIVATED`
   - Click "Send Test"

2. **Check Your Logs**
   - Your terminal should show webhook received
   - Database should update accordingly

---

## STEP 5: Environment Variables Checklist

Make sure you have all of these:

### Required:
```env
# PayPal API Credentials
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_secret
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_client_id

# PayPal Mode
PAYPAL_MODE=sandbox  # or 'production'

# PayPal Webhook (optional but recommended)
PAYPAL_WEBHOOK_ID=WH-your-webhook-id
```

### Already Have:
```env
# Database (should already be set)
DATABASE_URL=your_postgres_url
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 🎯 TESTING CHECKLIST

Before going live, verify:

### Subscription Flow
- [ ] Can create Individual Monthly subscription
- [ ] Can create Individual Annual subscription
- [ ] Can create Team Monthly subscription (2-10 seats)
- [ ] Can create Team Annual subscription
- [ ] Redirected to PayPal correctly
- [ ] Redirected back after approval
- [ ] Subscription stored in database

### Webhooks
- [ ] ACTIVATED event creates/updates subscription
- [ ] CANCELLED event updates status
- [ ] PAYMENT.SALE.COMPLETED creates invoice
- [ ] User role updated correctly

### Billing Management
- [ ] `/settings/billing` shows subscription details
- [ ] "Manage Subscription" opens PayPal account
- [ ] Subscription status reflects correctly

---

## 🔧 TROUBLESHOOTING

### "PayPal SDK not loaded"
**Fix:** Check that `NEXT_PUBLIC_PAYPAL_CLIENT_ID` is set in `.env.local`

### "No billing plans found"
**Fix:** Run `npx tsx scripts/setup-paypal-plans.ts` again

### "Webhook signature verification failed"
**Fix:**
- Make sure `PAYPAL_WEBHOOK_ID` matches your webhook in PayPal dashboard
- For local dev, webhook verification will log a warning but still process

### "Subscription creation failed"
**Fix:**
- Check PayPal API credentials are correct
- Verify `PAYPAL_MODE` matches your credentials (sandbox vs production)
- Check browser console for detailed error

### "Database error"
**Fix:**
- Verify migrations 035 and 036 were applied
- Check Drizzle schema is up to date (should have `paypal*` fields)

---

## 📊 WHAT HAPPENS WHEN USER SUBSCRIBES?

### Flow:

1. **User Clicks "Subscribe"** (pricing page)
   ↓
2. **Frontend calls** `/api/paypal/create-subscription`
   ↓
3. **Backend creates PayPal subscription**
   ↓
4. **User redirected to PayPal** (approvalUrl)
   ↓
5. **User approves on PayPal**
   ↓
6. **PayPal redirects back** to success URL
   ↓
7. **PayPal sends webhook** `BILLING.SUBSCRIPTION.ACTIVATED`
   ↓
8. **Backend receives webhook** at `/api/paypal/webhook`
   ↓
9. **Subscription activated in database**
   - Creates/updates `subscriptions` record
   - Sets `payment_provider = 'paypal'`
   - Stores `paypal_subscription_id`
   - Updates user role if needed
   - Creates invoice record

---

## 🚀 GOING TO PRODUCTION

### Pre-Launch Checklist:

1. **Switch to Live Credentials**
   - Get production Client ID and Secret
   - Update `.env` with live credentials
   - Set `PAYPAL_MODE=production`

2. **Create Production Webhook**
   - Use your actual domain
   - Get new Webhook ID
   - Update `PAYPAL_WEBHOOK_ID`

3. **Re-run Setup Script**
   ```bash
   PAYPAL_MODE=production npx tsx scripts/setup-paypal-plans.ts
   ```
   This creates plans in PayPal production environment

4. **Test with Real PayPal Account**
   - Do NOT use sandbox accounts
   - Use a real PayPal account
   - Test one subscription end-to-end

5. **Monitor Webhooks**
   - Check PayPal Dashboard → Webhooks → Event History
   - Verify events are being delivered
   - Check your app logs for processing

---

## 💡 TIPS & BEST PRACTICES

### Testing
- Always test in sandbox first
- Use PayPal's test credit cards for payments
- Check webhook event history in PayPal dashboard

### Security
- Never commit `.env` files to git
- Use different credentials for dev/staging/production
- Verify webhook signatures in production

### Monitoring
- Set up error tracking (Sentry recommended)
- Monitor webhook failures
- Track subscription lifecycle events

### User Experience
- PayPal handles the payment form (PCI compliant)
- Users manage subscriptions through their PayPal account
- Make sure your return URLs are correct

---

## 📚 DOCUMENTATION REFERENCES

- **PayPal Subscriptions API:** https://developer.paypal.com/docs/subscriptions/
- **Webhooks Guide:** https://developer.paypal.com/api/rest/webhooks/
- **Testing Guide:** https://developer.paypal.com/tools/sandbox/
- **Your Implementation:** See `PAYPAL_INTEGRATION_COMPLETE.md`

---

## ✅ SETUP COMPLETE!

Once you've completed all steps:

1. ✅ PayPal credentials in environment
2. ✅ Billing plans created (setup script ran successfully)
3. ✅ Webhook configured
4. ✅ Test subscription works end-to-end

You're ready to accept subscriptions! 🎉

---

## 🆘 NEED HELP?

**Check these files:**
- `PAYPAL_INTEGRATION_COMPLETE.md` - Full implementation details
- `lib/paypal/client.ts` - PayPal API client
- `app/api/paypal/*` - API endpoints
- `scripts/setup-paypal-plans.ts` - Setup script

**Debugging:**
- Check browser console for frontend errors
- Check terminal logs for backend errors
- Check PayPal Dashboard → Webhooks → Event History
- Check database `subscriptions` and `paypal_billing_plans` tables

---

**Last Updated:** January 23, 2026
**Version:** 1.0.0
