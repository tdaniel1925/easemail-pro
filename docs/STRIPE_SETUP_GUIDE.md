# Stripe Payment Integration Guide

## Overview
Configure Stripe to enable subscription payments for EaseMail tiers (Free, Starter, Pro, Enterprise).

**Time Required**: 2 hours
**Prerequisites**: Stripe account (test mode is free)

---

## Step 1: Create Stripe Account

1. Go to [stripe.com](https://stripe.com)
2. Click **Sign Up**
3. Complete account setup
4. **Stay in Test Mode** for now (toggle in top-right)

---

## Step 2: Get API Keys

### Navigate to API Keys
1. Dashboard → **Developers** → **API keys**

### Copy Keys to .env.local
```bash
# .env.local
STRIPE_SECRET_KEY=sk_test_51...your_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...your_publishable_key
```

**⚠️ IMPORTANT**:
- `sk_test_*` = Test mode (use for development)
- `sk_live_*` = Live mode (use for production)
- Never commit secret keys to git!

---

## Step 3: Create Products and Prices

### Method 1: Stripe Dashboard (Recommended for beginners)

1. Dashboard → **Products** → **Add product**

#### Product 1: Starter Plan
```
Name:        Starter Plan
Description: 100 AI requests per month
Pricing:     $9.99 / month (or your price)
```
- Click **Add pricing**
- Select **Recurring**
- Set **Monthly** interval
- Copy the **Price ID** (starts with `price_...`)

#### Product 2: Pro Plan
```
Name:        Pro Plan
Description: 500 AI requests per month
Pricing:     $29.99 / month
```

#### Product 3: Enterprise Plan
```
Name:        Enterprise Plan
Description: Unlimited AI requests + priority support
Pricing:     $99.99 / month
```

### Method 2: Stripe CLI (Faster for multiple products)

```bash
# Install Stripe CLI
# Windows (PowerShell as Admin):
scoop install stripe

# Mac:
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Create products
stripe products create \\
  --name="Starter Plan" \\
  --description="100 AI requests per month"

stripe prices create \\
  --product=prod_...YOUR_PRODUCT_ID \\
  --unit-amount=999 \\
  --currency=usd \\
  --recurring[interval]=month
```

---

## Step 4: Configure Webhook Endpoint

### Why Webhooks?
Stripe sends events (payment succeeded, subscription canceled, etc.) to your app via webhooks.

### Create Webhook in Stripe

1. Dashboard → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. **Endpoint URL**: `https://your-domain.com/api/webhooks/stripe`
   - For local testing: Use ngrok or Stripe CLI
4. **Events to listen for**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### Get Webhook Secret
1. Click on the webhook you just created
2. Copy **Signing secret** (starts with `whsec_...`)
3. Add to .env.local:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...your_webhook_secret
```

---

## Step 5: Create Webhook Handler

The webhook endpoint is already scaffolded at:
`app/api/webhooks/stripe/route.ts`

Make sure it handles these events:

```typescript
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;

      // Update user subscription in database
      await db.update(users)
        .set({
          subscriptionTier: 'starter', // or pro/enterprise based on product
          subscriptionStatus: 'active',
          stripeCustomerId: session.customer as string,
        })
        .where(eq(users.id, session.metadata?.userId!));

      console.log('✅ Subscription activated:', session.id);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;

      // Downgrade to free tier
      await db.update(users)
        .set({
          subscriptionTier: 'free',
          subscriptionStatus: 'canceled',
        })
        .where(eq(users.stripeCustomerId, subscription.customer as string));

      console.log('❌ Subscription canceled:', subscription.id);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;

      // Mark subscription as past_due
      await db.update(users)
        .set({
          subscriptionStatus: 'past_due',
        })
        .where(eq(users.stripeCustomerId, invoice.customer as string));

      console.log('⚠️ Payment failed:', invoice.id);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
```

---

## Step 6: Test Webhook Locally

### Option 1: Stripe CLI (Recommended)

```bash
# Forward Stripe events to your local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# In another terminal, trigger a test event
stripe trigger checkout.session.completed
```

### Option 2: ngrok

```bash
# Install ngrok
npm install -g ngrok

# Start tunnel
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Add to Stripe webhook: https://abc123.ngrok.io/api/webhooks/stripe
```

---

## Step 7: Create Checkout Flow

### Client-Side (Pricing Page)

```typescript
// app/(marketing)/pricing/page.tsx
'use client';

import { useState } from 'react';

export default function PricingPage() {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async (priceId: string) => {
    setLoading(true);

    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId }),
    });

    const { url } = await response.json();
    window.location.href = url; // Redirect to Stripe Checkout
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Starter Plan */}
      <div className="border rounded-lg p-6">
        <h3 className="text-2xl font-bold">Starter</h3>
        <p className="text-4xl font-bold mt-4">$9.99<span className="text-sm">/mo</span></p>
        <button
          onClick={() => handleCheckout('price_...STARTER_PRICE_ID')}
          disabled={loading}
          className="mt-6 w-full bg-primary text-white py-2 rounded"
        >
          Subscribe
        </button>
      </div>

      {/* Pro Plan */}
      <div className="border rounded-lg p-6">
        <h3 className="text-2xl font-bold">Pro</h3>
        <p className="text-4xl font-bold mt-4">$29.99<span className="text-sm">/mo</span></p>
        <button
          onClick={() => handleCheckout('price_...PRO_PRICE_ID')}
          disabled={loading}
          className="mt-6 w-full bg-primary text-white py-2 rounded"
        >
          Subscribe
        </button>
      </div>
    </div>
  );
}
```

### Server-Side (Checkout API)

```typescript
// app/api/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const { priceId } = await req.json();

  // Get current user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    customer_email: user.email,
    metadata: {
      userId: user.id,
    },
  });

  return NextResponse.json({ url: session.url });
}
```

---

## Step 8: Add Price IDs to Environment

```bash
# .env.local
NEXT_PUBLIC_STRIPE_PRICE_STARTER=price_...your_starter_price_id
NEXT_PUBLIC_STRIPE_PRICE_PRO=price_...your_pro_price_id
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE=price_...your_enterprise_price_id
```

---

## Step 9: Test Full Flow

1. Start your app: `npm run dev`
2. Go to `/pricing`
3. Click **Subscribe** on Starter plan
4. Use Stripe test card: `4242 4242 4242 4242`
5. Expiry: Any future date (e.g., `12/34`)
6. CVC: Any 3 digits (e.g., `123`)
7. Complete checkout
8. Verify user's `subscriptionTier` updated to `starter` in database

---

## Step 10: Go Live

### Switch to Live Mode

1. Stripe Dashboard → Toggle **Test mode** to **Live mode**
2. Get live API keys (start with `sk_live_*` and `pk_live_*`)
3. Create live products and prices
4. Update webhook endpoint to production URL
5. Update .env.production:

```bash
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...live_webhook_secret
```

### Activate Stripe Account
- Complete business verification
- Add bank account for payouts
- Set up tax settings (if applicable)

---

## Troubleshooting

### Webhook Not Receiving Events
- Check webhook URL is correct (HTTPS required in production)
- Verify signing secret matches .env.local
- Check Stripe Dashboard → Webhooks → Event logs

### Checkout Session Failing
- Verify price IDs are correct
- Check `success_url` and `cancel_url` are valid
- Ensure user is authenticated before creating session

### Payment Declined
- Use Stripe test cards: https://stripe.com/docs/testing
- Check for insufficient funds error

---

## Security Checklist

- [ ] Never expose `STRIPE_SECRET_KEY` in client-side code
- [ ] Always verify webhook signatures
- [ ] Use HTTPS in production
- [ ] Validate amount/currency server-side (don't trust client)
- [ ] Log all payment events for audit trail

---

## Monitoring

### Stripe Dashboard
- **Payments** → View all transactions
- **Subscriptions** → Manage recurring payments
- **Reports** → Financial analytics

### Set Up Alerts
1. Dashboard → **Settings** → **Notifications**
2. Enable email alerts for:
   - Failed payments
   - Disputed charges
   - Subscription cancellations

---

## Estimated Impact
- **Revenue Enablement**: 100% (can't charge without Stripe!)
- **Effort**: 2 hours for full integration
- **Ongoing Maintenance**: ~1 hour/month

**Status**: CRITICAL for monetization
