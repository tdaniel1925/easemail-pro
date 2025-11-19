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
  notice_type VARCHAR(50) NOT NULL, -- 'payment_failed', 'payment_retry', 'grace_period', 'suspension_warning', 'suspended', 'reactivated'
  severity VARCHAR(20) NOT NULL, -- 'info', 'warning', 'critical'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- Related entities
  invoice_id UUID,
  transaction_id UUID,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'read', 'dismissed'
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
CREATE POLICY "Users can view their own status history"
  ON account_status_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all status history"
  ON account_status_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'platform_admin'
  ));

CREATE POLICY "Admins can insert status history"
  ON account_status_history FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'platform_admin'
  ));

-- Billing notices policies
CREATE POLICY "Users can view their own billing notices"
  ON billing_notices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own billing notices"
  ON billing_notices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all billing notices"
  ON billing_notices FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'platform_admin'
  ));

-- =============================================================================
-- 6. HELPER FUNCTIONS
-- =============================================================================

-- Function to get active billing notices for a user
CREATE OR REPLACE FUNCTION get_user_billing_notices(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  notice_type VARCHAR(50),
  severity VARCHAR(20),
  title VARCHAR(255),
  message TEXT,
  created_at TIMESTAMP,
  expires_at TIMESTAMP,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bn.id,
    bn.notice_type,
    bn.severity,
    bn.title,
    bn.message,
    bn.created_at,
    bn.expires_at,
    jsonb_build_object(
      'invoice_id', bn.invoice_id,
      'transaction_id', bn.transaction_id
    ) as metadata
  FROM billing_notices bn
  WHERE bn.user_id = p_user_id
    AND bn.status IN ('pending', 'sent')
    AND (bn.expires_at IS NULL OR bn.expires_at > NOW())
  ORDER BY bn.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to dismiss a billing notice
CREATE OR REPLACE FUNCTION dismiss_billing_notice(p_notice_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE billing_notices
  SET status = 'dismissed',
      dismissed_at = NOW()
  WHERE id = p_notice_id
    AND user_id = p_user_id
    AND status IN ('pending', 'sent');
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark billing notice as read
CREATE OR REPLACE FUNCTION mark_notice_read(p_notice_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE billing_notices
  SET status = CASE WHEN status = 'pending' THEN 'sent' ELSE status END,
      read_at = NOW()
  WHERE id = p_notice_id
    AND user_id = p_user_id
    AND read_at IS NULL;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

