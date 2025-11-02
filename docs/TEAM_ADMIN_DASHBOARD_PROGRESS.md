# Team Admin & User Dashboard Implementation Guide

## ✅ PHASE 1: CORE BILLING - COMPLETED

### Database Schema ✅
- **File:** `migrations/022_comprehensive_billing_system.sql`
- **Tables Created:**
  - `invoices` - Billing invoices with line items
  - `payment_methods` - Credit cards and payment methods
  - `ai_usage` - AI feature usage tracking
  - `storage_usage` - Storage usage and overage tracking
  - `usage_alerts` - Configurable usage threshold alerts
  - `audit_logs` - Enhanced audit trail system

### Drizzle ORM Schema ✅
- **File:** `lib/db/schema.ts`
- Added all new table definitions
- Added relations to organizations and users

### Invoice Generation System ✅
- **File:** `lib/billing/invoice-generator.ts`
- Functions:
  - `generateInvoiceNumber()` - Creates INV-YYYYMM-XXXX format
  - `generateInvoice()` - Complete invoice with all usage
  - `calculateSubscriptionCost()` - Base plan cost
  - `calculateSMSCost()` - Tiered SMS pricing
  - `calculateAICost()` - AI overage pricing
  - `calculateStorageCost()` - Storage overage
  - `getInvoices()` - Fetch invoice list
  - `markInvoicePaid()` - Payment tracking

### API Endpoints Started ✅
- **File:** `app/api/team/billing/invoices/route.ts`
- `GET /api/team/billing/invoices` - List invoices
- `POST /api/team/billing/invoices` - Generate invoice

---

## 🚧 REMAINING IMPLEMENTATION

### Phase 1 (Remaining):
1. **Invoice Detail API** - `GET /api/team/billing/invoices/[id]`
2. **Payment Methods API** - Full CRUD for payment methods
3. **Stripe Integration** - Actual payment processing
4. **Billing History Component** - React component for invoice list

### Phase 2: Usage Analytics
1. **AI Usage Tracking** - Track per-feature AI requests
2. **Storage Calculator** - Real-time storage calculation
3. **Usage APIs**:
   - `/api/team/usage` - Aggregate usage stats
   - `/api/team/usage/sms` - SMS breakdown
   - `/api/team/usage/ai` - AI breakdown
   - `/api/team/usage/storage` - Storage breakdown
4. **Chart Components** - Recharts-based visualizations

### Phase 3: Team Admin Dashboard
1. **Dashboard Page** - `/app/(dashboard)/team/admin/page.tsx`
2. **Overview Tab** - Stats cards and quick actions
3. **Billing Tab** - Subscription and payment management
4. **Usage Tab** - Interactive usage charts
5. **Members Tab** - Enhanced with usage per member
6. **Reports Tab** - Custom report generation

### Phase 4: Individual Dashboard
1. **User Billing Page** - `/app/(dashboard)/settings/billing/page.tsx`
2. **Subscription Card** - Current plan and upgrade options
3. **Usage Dashboard** - Personal usage breakdown
4. **Payment Methods** - Add/edit cards
5. **Billing History** - Personal invoices

### Phase 5: Advanced Features
1. **Report Generator** - CSV/PDF exports
2. **Usage Alerts** - Automated threshold monitoring
3. **Audit Log Viewer** - Activity tracking
4. **Email Notifications** - Invoice and alert emails

---

## 📊 DATABASE MIGRATION INSTRUCTIONS

### Run the Migration:
```bash
# Option 1: SQL Editor in Supabase Dashboard
# Copy contents of migrations/022_comprehensive_billing_system.sql
# Paste into SQL Editor and run

# Option 2: CLI (if using Supabase CLI)
supabase db push
```

### Verify Tables Created:
```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('invoices', 'payment_methods', 'ai_usage', 'storage_usage', 'usage_alerts', 'audit_logs');
```

---

## 🔧 NEXT STEPS

### Immediate (Continue Phase 1):
1. Create invoice detail API endpoint
2. Build payment methods management system
3. Add Stripe integration (requires Stripe keys)
4. Create React components for billing history

### Environment Variables Needed:
```env
# Add to .env.local
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Dependencies to Install:
```bash
npm install @stripe/stripe-js stripe
npm install recharts  # For charts
npm install jspdf     # For PDF generation
npm install papaparse @types/papaparse  # For CSV exports
```

---

## 📁 FILE STRUCTURE

```
app/
├── api/
│   ├── team/
│   │   ├── billing/
│   │   │   ├── invoices/
│   │   │   │   ├── route.ts ✅
│   │   │   │   └── [id]/route.ts (TODO)
│   │   │   ├── payment-methods/route.ts (TODO)
│   │   │   └── subscription/route.ts (TODO)
│   │   └── usage/
│   │       ├── route.ts (TODO)
│   │       ├── sms/route.ts (TODO)
│   │       ├── ai/route.ts (TODO)
│   │       └── storage/route.ts (TODO)
│   └── user/
│       ├── billing/
│       │   ├── invoices/route.ts (TODO)
│       │   └── subscription/route.ts (TODO)
│       └── usage/route.ts (TODO)
└── (dashboard)/
    ├── team/
    │   └── admin/
    │       └── page.tsx (TODO)
    └── settings/
        └── billing/
            └── page.tsx (TODO)

lib/
├── billing/
│   ├── invoice-generator.ts ✅
│   ├── payment-processor.ts (TODO)
│   └── stripe-integration.ts (TODO)
├── usage/
│   ├── ai-tracker.ts (TODO)
│   ├── storage-calculator.ts (TODO)
│   └── usage-aggregator.ts (TODO)
└── components/ (TODO)

migrations/
└── 022_comprehensive_billing_system.sql ✅
```

---

## 🎯 ROLE-BASED ACCESS SUMMARY

| Endpoint | platform_admin | org_admin | org_user | individual |
|----------|---------------|-----------|----------|------------|
| `/api/team/billing/*` | ✅ (all orgs) | ✅ (own org) | ❌ | ❌ |
| `/api/team/usage/*` | ✅ | ✅ | ❌ | ❌ |
| `/api/user/billing/*` | ✅ | ✅ | ✅ | ✅ |
| `/api/user/usage/*` | ✅ | ✅ | ✅ | ✅ |

---

## 💡 USAGE EXAMPLES

### Generate Monthly Invoice:
```typescript
import { generateInvoice } from '@/lib/billing/invoice-generator';

const invoice = await generateInvoice({
  organizationId: 'org-uuid',
  periodStart: new Date('2025-01-01'),
  periodEnd: new Date('2025-01-31'),
  notes: 'January 2025 billing'
});
```

### Fetch Team Invoices:
```typescript
// API Route
const response = await fetch('/api/team/billing/invoices?limit=12');
const { invoices } = await response.json();
```

### Calculate Current Month Usage:
```typescript
const now = new Date();
const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

const invoice = await generateInvoice({
  userId: 'user-uuid',
  periodStart,
  periodEnd,
});
```

---

## 📈 ESTIMATED COMPLETION TIME

- ✅ Phase 1 (Core): ~30% complete (2 days estimated)
- ⏳ Phase 2 (Analytics): 0% complete (2-3 days)
- ⏳ Phase 3 (Team Admin UI): 0% complete (3-4 days)
- ⏳ Phase 4 (User Dashboard): 0% complete (2 days)
- ⏳ Phase 5 (Advanced): 0% complete (2-3 days)

**Total Estimated:** 11-14 days for complete implementation

---

## 🐛 KNOWN CONSIDERATIONS

1. **Tax Calculation** - Currently set to 0%, needs location-based logic
2. **Stripe Webhooks** - Need to set up webhook endpoint for payment events
3. **PDF Generation** - Invoice PDF generation not yet implemented
4. **Email Sending** - Invoice email notifications not yet implemented
5. **Proration** - Plan changes mid-cycle need proration logic

---

## 📞 USER ACTIONS REQUIRED

1. **Run Database Migration** - Execute `022_comprehensive_billing_system.sql`
2. **Add Stripe Keys** - Set up Stripe account and add keys to `.env.local`
3. **Install Dependencies** - Run `npm install` for new packages
4. **Test Permission System** - Verify role-based access works

---

**Last Updated:** $(date)
**Status:** Phase 1 - 30% Complete
**Next:** Complete remaining Phase 1 tasks

