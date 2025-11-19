# 🔧 FIXED: Your Admin Access Issue

## The Problem
Your database is missing migration `026_account_status_system.sql` which adds new columns to the `users` table. When the API tries to query your user record, it fails because these columns don't exist yet.

Error: `"column "suspension_reason" does not exist"`

## The Solution: Run This Migration

### Step 1: Go to Supabase SQL Editor
1. Open your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Copy and Paste This ENTIRE SQL Script

```sql
-- Migration: Account Status and Suspension Management
-- Description: Adds account status tracking, billing notices, and suspension management

-- =============================================================================
-- 1. ADD ACCOUNT STATUS FIELDS TO USERS
-- =============================================================================
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMP;

-- Index for account status queries
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_grace_period ON users(grace_period_ends_at) WHERE grace_period_ends_at IS NOT NULL;

-- =============================================================================
-- 2. ADD ACCOUNT STATUS FIELDS TO ORGANIZATIONS
-- =============================================================================
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMP;

-- Index for account status queries
CREATE INDEX IF NOT EXISTS idx_orgs_account_status ON organizations(account_status);
CREATE INDEX IF NOT EXISTS idx_orgs_grace_period ON organizations(grace_period_ends_at) WHERE grace_period_ends_at IS NOT NULL;

-- =============================================================================
-- 3. ACCOUNT STATUS HISTORY TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS account_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  
  -- Status change
  previous_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  reason TEXT,
  
  -- Related entities
  invoice_id UUID,
  transaction_id UUID,
  
  -- Who/when
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT NOW() NOT NULL,
  
  -- Metadata
  metadata JSONB
);

-- Indexes for account_status_history
CREATE INDEX IF NOT EXISTS idx_status_history_user ON account_status_history(user_id);
CREATE INDEX IF NOT EXISTS idx_status_history_org ON account_status_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_status_history_date ON account_status_history(changed_at);

-- =============================================================================
-- 4. BILLING NOTICES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS billing_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  
  -- Notice details
  notice_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- Related entities
  invoice_id UUID,
  transaction_id UUID,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending',
  sent_at TIMESTAMP,
  read_at TIMESTAMP,
  dismissed_at TIMESTAMP,
  
  -- Expiry
  expires_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for billing_notices
CREATE INDEX IF NOT EXISTS idx_notices_user ON billing_notices(user_id);
CREATE INDEX IF NOT EXISTS idx_notices_org ON billing_notices(organization_id);
CREATE INDEX IF NOT EXISTS idx_notices_status ON billing_notices(status);
CREATE INDEX IF NOT EXISTS idx_notices_type ON billing_notices(notice_type);
CREATE INDEX IF NOT EXISTS idx_notices_active ON billing_notices(user_id, status) WHERE status = 'pending' OR status = 'sent';

-- =============================================================================
-- 5. RLS POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE account_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_notices ENABLE ROW LEVEL SECURITY;

-- Account status history policies
DROP POLICY IF EXISTS "Users can view their own status history" ON account_status_history;
CREATE POLICY "Users can view their own status history"
  ON account_status_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all status history" ON account_status_history;
CREATE POLICY "Admins can view all status history"
  ON account_status_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'platform_admin'
  ));

DROP POLICY IF EXISTS "Admins can insert status history" ON account_status_history;
CREATE POLICY "Admins can insert status history"
  ON account_status_history FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'platform_admin'
  ));

-- Billing notices policies
DROP POLICY IF EXISTS "Users can view their own billing notices" ON billing_notices;
CREATE POLICY "Users can view their own billing notices"
  ON billing_notices FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own billing notices" ON billing_notices;
CREATE POLICY "Users can update their own billing notices"
  ON billing_notices FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all billing notices" ON billing_notices;
CREATE POLICY "Admins can manage all billing notices"
  ON billing_notices FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'platform_admin'
  ));

-- =============================================================================
-- 6. NOW SET YOUR USER AS PLATFORM ADMIN
-- =============================================================================

UPDATE users 
SET role = 'platform_admin' 
WHERE email = 'tdaniel@botmakers.ai';

-- =============================================================================
-- 7. VERIFY EVERYTHING
-- =============================================================================

-- Check your user role
SELECT id, email, role, account_status, created_at 
FROM users 
WHERE email = 'tdaniel@botmakers.ai';
```

### Step 3: Click "Run" (or press Cmd/Ctrl + Enter)

You should see:
- ✅ `Success. No rows returned`
- ✅ At the end, a row showing your user with `role = 'platform_admin'`

### Step 4: Test Your Access

1. **Hard refresh** your browser (Ctrl+Shift+R)
2. Go to `/api/debug/my-role` - should now show your role
3. Click settings menu (bottom left "T" button)
4. **You should now see "Admin Dashboard" at the top!** 🎉

## What This Does

This migration adds:
- ✅ Account status tracking (active, suspended, grace_period)
- ✅ Suspension management fields
- ✅ Billing notices system
- ✅ Account status history
- ✅ All necessary indexes
- ✅ Row Level Security policies
- ✅ **Sets you as platform_admin**

## Why This Happened

The billing system we built requires these new database columns. They're in your codebase (migration file) but haven't been applied to your Supabase database yet.

---

**After running this, your admin dashboard will work!** 🚀

