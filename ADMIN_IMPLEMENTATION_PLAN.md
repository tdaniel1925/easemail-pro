# ADMIN & BILLING SYSTEM - COMPLETE IMPLEMENTATION PLAN

**Created:** 2026-02-03
**Status:** Ready to implement
**Estimated Work:** 50+ files, 3000+ lines of code
**Timeline:** 6-8 hours of implementation

---

## PHASE 1: CRITICAL SECURITY FIXES (30 min)

### 1.1 Fix Role Check in Billing Config
**File:** `app/api/admin/billing/config/route.ts`
**Change:** Line 41 - `dbUser.role !== 'admin'` → `dbUser.role !== 'platform_admin'`

### 1.2 Add Rate Limiting Middleware
**New File:** `lib/middleware/rate-limit.ts`
**Features:**
- Redis-based rate limiting using Upstash
- Configurable limits per endpoint
- IP-based tracking
- Proper error responses

### 1.3 Apply Rate Limiting to Admin Routes
**Files to modify:**
- `app/api/admin/users/route.ts` - 5 requests/minute
- `app/api/admin/organizations/route.ts` - 5 requests/minute
- `app/api/admin/users/[userId]/impersonate/route.ts` - 2 requests/minute

---

## PHASE 2: ORG CREATION WIZARD - ADD OWNER STEP (1 hour)

### 2.1 Add Step 6 to Creation Wizard
**File:** `app/(dashboard)/admin/organizations/create/page.tsx`
**New Step:** "Organization Owner"
**Fields:**
- Owner email *
- Owner full name *
- Owner phone (optional)
- Owner title (optional)
- Send welcome email (checkbox, default: true)

### 2.2 Update Organization Creation API
**File:** `app/api/admin/organizations/route.ts`
**Changes:**
- Accept ownerEmail, ownerFullName from request
- After creating org, create owner user automatically
- Assign owner user to org with 'owner' role
- Send welcome email with credentials
- Return both org and owner user in response

### 2.3 Test Flow
- Create org with owner
- Verify owner gets email
- Verify owner can login
- Verify owner has access to org admin dashboard

---

## PHASE 3: ORG ADMIN SELF-SERVICE DASHBOARD (2 hours)

### 3.1 Create Org Admin Layout
**New File:** `app/(dashboard)/organization/layout.tsx`
**Features:**
- Check for org_admin or owner role
- Sidebar navigation (dashboard, users, billing, settings)
- Organization context (show current org name)

### 3.2 Create Org Admin Dashboard
**New File:** `app/(dashboard)/organization/page.tsx`
**Features:**
- Organization stats (members, seats used/max, plan type)
- Quick actions (add user, view billing, settings)
- Recent activity feed
- Usage summary (current month)

### 3.3 Create User Management Page
**New File:** `app/(dashboard)/organization/users/page.tsx`
**Features:**
- List all organization members
- Search/filter by role, status
- Add new user (opens wizard modal)
- Edit user (role, status)
- Remove user (with confirmation)
- Cannot edit users outside their organization

### 3.4 Create User Management API
**New Files:**
- `app/api/organization/users/route.ts` - GET/POST
- `app/api/organization/users/[userId]/route.ts` - PATCH/DELETE

**Security:**
- Check caller is org_admin or owner
- Check user belongs to caller's organization
- Cannot modify users from other organizations
- Cannot promote self to owner

### 3.5 Create Organization Settings Page
**New File:** `app/(dashboard)/organization/settings/page.tsx`
**Features:**
- Organization name (editable)
- Organization contact details
- Billing email
- Organization preferences
- Danger zone (delete organization - requires confirmation)

### 3.6 Create Organization Settings API
**New File:** `app/api/organization/settings/route.ts`
**Security:**
- Only owner or admin can edit
- Cannot change slug after creation
- Cannot delete org if has active subscriptions

---

## PHASE 4: USER ADMIN ROLE ENFORCEMENT (1 hour)

### 4.1 Create User Admin Dashboard
**New File:** `app/(dashboard)/user-admin/page.tsx`
**Features:**
- Simplified view (only user management)
- Cannot access billing or settings
- Can add/edit/remove users
- Can reset passwords
- Can view user activity

### 4.2 Create User Admin API Middleware
**New File:** `lib/middleware/check-user-admin.ts`
**Features:**
- Check for user_admin role
- Allow only user management endpoints
- Deny access to billing, settings, admin panel

### 4.3 Apply User Admin Checks
**Files to modify:**
- `app/api/organization/users/route.ts` - Allow user_admin
- `app/api/organization/billing/route.ts` - Deny user_admin
- `app/api/organization/settings/route.ts` - Deny user_admin

---

## PHASE 5: IMPERSONATION EXIT BANNER (30 min)

### 5.1 Create Impersonation Banner Component
**New File:** `components/admin/ImpersonationBanner.tsx`
**Features:**
- Fixed banner at top of page
- Shows "Impersonating: user@example.com"
- Exit button (calls `/api/admin/impersonate/exit`)
- Visual indicator (orange/warning color)

### 5.2 Add Banner to Root Layout
**File:** `app/layout.tsx`
**Changes:**
- Check if session has `impersonating` flag
- Render banner if impersonating
- Push content down to avoid overlap

### 5.3 Update Impersonation API
**File:** `app/api/admin/users/[userId]/impersonate/route.ts`
**Changes:**
- Set session flag `impersonating: true`
- Store original admin ID in session
- Add 30-minute timeout
- Log impersonation start

**File:** `app/api/admin/impersonate/exit/route.ts`
**Changes:**
- Restore original admin session
- Clear impersonation flag
- Log impersonation end

---

## PHASE 6: COMPLETE BILLING SYSTEM (3 hours)

### 6.1 Stripe Integration Setup
**New Files:**
- `lib/billing/stripe-client.ts` - Stripe API wrapper
- `lib/billing/stripe-webhooks.ts` - Webhook handlers
- `lib/billing/subscription-manager.ts` - Subscription CRUD

**Features:**
- Create Stripe customer on user signup
- Create Stripe customer on org creation
- Sync customer IDs to database
- Handle payment method updates
- Handle subscription status changes

### 6.2 Subscription Plans
**Database Schema:**
```typescript
subscription_plans {
  id: uuid
  name: string
  slug: string (starter, pro, enterprise)
  monthlyPrice: number
  yearlyPrice: number
  features: jsonb
  limits: jsonb {
    maxSeats: number
    maxEmails: number
    maxStorage: number
    aiRequests: number
    smsMessages: number
  }
  isActive: boolean
  createdAt: timestamp
  updatedAt: timestamp
}
```

**API Routes:**
- `GET /api/billing/plans` - List available plans
- `POST /api/billing/subscribe` - Subscribe to plan
- `POST /api/billing/change-plan` - Change subscription
- `POST /api/billing/cancel` - Cancel subscription

### 6.3 Usage-Based Billing
**Database Schema:**
```typescript
usage_records {
  id: uuid
  userId: uuid
  organizationId: uuid | null
  type: enum (sms, ai, storage)
  quantity: number
  unitPrice: number
  totalCost: number
  billingPeriodStart: date
  billingPeriodEnd: date
  invoiceId: uuid | null
  createdAt: timestamp
}
```

**API Routes:**
- `POST /api/billing/usage/track` - Track usage event
- `GET /api/billing/usage/current` - Get current period usage
- `GET /api/billing/usage/estimate` - Estimate next bill

### 6.4 Invoice Generation
**Database Schema:**
```typescript
invoices {
  id: uuid
  userId: uuid
  organizationId: uuid | null
  stripeInvoiceId: string
  amount: number
  currency: string
  status: enum (draft, open, paid, void, uncollectible)
  subscriptionAmount: number
  usageAmount: number
  taxAmount: number
  items: jsonb[]
  paidAt: timestamp | null
  dueDate: date
  createdAt: timestamp
  updatedAt: timestamp
}
```

**API Routes:**
- `GET /api/billing/invoices` - List user's invoices
- `GET /api/billing/invoices/[invoiceId]` - Get invoice details
- `POST /api/billing/invoices/[invoiceId]/pay` - Pay invoice manually

### 6.5 Payment Methods
**API Routes:**
- `GET /api/billing/payment-methods` - List saved payment methods
- `POST /api/billing/payment-methods` - Add payment method
- `POST /api/billing/payment-methods/[pmId]/set-default` - Set default
- `DELETE /api/billing/payment-methods/[pmId]` - Remove payment method

### 6.6 Stripe Webhooks
**New File:** `app/api/webhooks/stripe/route.ts`
**Events to Handle:**
- `customer.subscription.created` - New subscription
- `customer.subscription.updated` - Subscription changed
- `customer.subscription.deleted` - Subscription cancelled
- `invoice.paid` - Invoice paid
- `invoice.payment_failed` - Payment failed
- `payment_method.attached` - Payment method added
- `payment_method.detached` - Payment method removed

### 6.7 Billing Dashboard (User-Facing)
**New File:** `app/(dashboard)/billing/page.tsx`
**Features:**
- Current plan details
- Usage summary (current month)
- Upcoming invoice preview
- Payment methods
- Invoice history
- Upgrade/downgrade buttons

### 6.8 Automated Billing Runs
**New File:** `lib/billing/billing-engine.ts`
**Features:**
- Calculate usage for billing period
- Generate Stripe invoices
- Finalize invoices
- Send invoice emails
- Handle failed payments
- Retry logic (3 attempts)
- Suspension after failed payment

**Cron Job:** `app/api/cron/monthly-billing/route.ts`
**Schedule:** Daily at 2 AM
**Tasks:**
- Find users with billing date = today
- Calculate usage charges
- Create Stripe invoice
- Finalize and charge
- Email invoice
- Update subscription status

### 6.9 Usage Tracking Implementation
**Files to Create:**
- `lib/billing/track-sms-usage.ts` - Track SMS sends
- `lib/billing/track-ai-usage.ts` - Track AI requests
- `lib/billing/track-storage-usage.ts` - Track storage

**Integration Points:**
- Call `trackSmsUsage()` after SMS send
- Call `trackAiUsage()` after AI request
- Call `trackStorageUsage()` daily via cron

### 6.10 Testing Checklist
- [ ] Create test Stripe customer
- [ ] Subscribe to plan
- [ ] Add payment method
- [ ] Send test SMS (track usage)
- [ ] Make AI request (track usage)
- [ ] Run billing engine manually
- [ ] Verify invoice created
- [ ] Pay invoice
- [ ] Change plan (upgrade/downgrade)
- [ ] Cancel subscription
- [ ] Test failed payment handling
- [ ] Test webhook delivery

---

## PHASE 7: UPDATE IT CHECKLIST (30 min)

### 7.1 Update Existing IT Checklist
**File:** `HELP_IT_MANUAL.md` (or similar)
**Sections to Add:**
- Super Admin Setup Guide
- Organization Admin Setup Guide
- User Management Guide
- Billing System Overview
- Troubleshooting Common Issues

### 7.2 Create Admin Quick Start Guide
**New File:** `docs/ADMIN_QUICK_START.md`
**Contents:**
- How to create first organization
- How to add users
- How to configure billing
- How to impersonate users
- How to view activity logs

---

## PHASE 8: END-TO-END TESTING (1 hour)

### 8.1 Super Admin Tests
- [ ] Login as platform admin
- [ ] Create organization with owner
- [ ] Verify owner gets email
- [ ] Impersonate owner
- [ ] Exit impersonation
- [ ] View activity logs
- [ ] Edit organization settings
- [ ] Delete organization

### 8.2 Org Admin Tests
- [ ] Login as org owner
- [ ] Access org admin dashboard
- [ ] Add new user
- [ ] Edit user role
- [ ] Remove user
- [ ] View organization billing
- [ ] Update payment method
- [ ] View invoices

### 8.3 User Admin Tests
- [ ] Login as user_admin
- [ ] Access user management only
- [ ] Cannot access billing (verify blocked)
- [ ] Cannot access settings (verify blocked)
- [ ] Add user
- [ ] Edit user

### 8.4 Billing Tests
- [ ] Subscribe to plan
- [ ] Send SMS (track usage)
- [ ] Make AI request (track usage)
- [ ] Run billing engine
- [ ] Verify invoice generated
- [ ] Pay invoice
- [ ] Upgrade plan
- [ ] Cancel subscription

---

## FILES TO CREATE (28 new files)

1. `lib/middleware/rate-limit.ts`
2. `lib/middleware/check-user-admin.ts`
3. `app/(dashboard)/organization/layout.tsx`
4. `app/(dashboard)/organization/page.tsx`
5. `app/(dashboard)/organization/users/page.tsx`
6. `app/(dashboard)/organization/settings/page.tsx`
7. `app/(dashboard)/user-admin/page.tsx`
8. `app/api/organization/users/route.ts`
9. `app/api/organization/users/[userId]/route.ts`
10. `app/api/organization/settings/route.ts`
11. `components/admin/ImpersonationBanner.tsx`
12. `lib/billing/stripe-client.ts`
13. `lib/billing/stripe-webhooks.ts`
14. `lib/billing/subscription-manager.ts`
15. `lib/billing/billing-engine.ts`
16. `lib/billing/track-sms-usage.ts`
17. `lib/billing/track-ai-usage.ts`
18. `lib/billing/track-storage-usage.ts`
19. `app/api/billing/plans/route.ts`
20. `app/api/billing/subscribe/route.ts`
21. `app/api/billing/change-plan/route.ts`
22. `app/api/billing/cancel/route.ts`
23. `app/api/billing/usage/track/route.ts`
24. `app/api/billing/usage/current/route.ts`
25. `app/api/billing/invoices/route.ts`
26. `app/api/billing/payment-methods/route.ts`
27. `app/api/webhooks/stripe/route.ts`
28. `app/(dashboard)/billing/page.tsx`

## FILES TO MODIFY (12 files)

1. `app/api/admin/billing/config/route.ts` - Fix role check
2. `app/(dashboard)/admin/organizations/create/page.tsx` - Add Step 6
3. `app/api/admin/organizations/route.ts` - Create owner user
4. `app/api/admin/users/route.ts` - Add rate limiting
5. `app/api/admin/organizations/route.ts` - Add rate limiting
6. `app/api/admin/users/[userId]/impersonate/route.ts` - Add session flag
7. `app/api/admin/impersonate/exit/route.ts` - Restore session
8. `app/layout.tsx` - Add impersonation banner
9. `lib/db/schema.ts` - Add billing tables
10. `migrations/XXX_add_billing_tables.sql` - New migration
11. `HELP_IT_MANUAL.md` - Add admin sections
12. `docs/ADMIN_QUICK_START.md` - New documentation

---

## ESTIMATED TIMELINE

| Phase | Task | Time | Files |
|-------|------|------|-------|
| 1 | Security fixes | 30 min | 4 files |
| 2 | Org wizard owner step | 1 hour | 2 files |
| 3 | Org admin dashboard | 2 hours | 7 files |
| 4 | User admin enforcement | 1 hour | 4 files |
| 5 | Impersonation banner | 30 min | 3 files |
| 6 | Complete billing system | 3 hours | 18 files |
| 7 | IT checklist updates | 30 min | 2 files |
| 8 | End-to-end testing | 1 hour | — |
| **Total** | **All phases** | **9.5 hours** | **40 files** |

---

## DEPENDENCIES NEEDED

```json
{
  "dependencies": {
    "stripe": "^14.25.0" // Already installed ✅
  }
}
```

---

## ENVIRONMENT VARIABLES NEEDED

```env
# Stripe (already configured)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Existing (already configured)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## READY TO PROCEED?

This is a comprehensive implementation that will take approximately 9-10 hours of focused work.

**Do you want me to:**
- **A)** Proceed with ALL phases sequentially (start now)
- **B)** Prioritize specific phases (which ones?)
- **C)** Review/adjust the plan first

**Recommendation:** Start with Phases 1-2 (security + org wizard), test, then proceed to billing system.
