-- Migration: Comprehensive Billing & Usage Tracking System
-- Adds invoices, payment methods, AI usage, storage usage, and usage alerts

-- ============================================================================
-- INVOICES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Invoice Details
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  amount_usd DECIMAL(10,2) NOT NULL,
  tax_amount_usd DECIMAL(10,2) DEFAULT 0,
  total_usd DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Status & Dates
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'failed', 'refunded', 'void'
  due_date TIMESTAMP,
  paid_at TIMESTAMP,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  
  -- Line Items & Payment Info
  line_items JSONB, -- Detailed breakdown: [{description, quantity, unit_price, total}]
  payment_method VARCHAR(255),
  
  -- Integration IDs
  stripe_invoice_id VARCHAR(255) UNIQUE,
  stripe_payment_intent_id VARCHAR(255),
  
  -- Additional Info
  pdf_url VARCHAR(500),
  notes TEXT,
  metadata JSONB, -- Flexible storage for additional data
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  
  -- Constraint: Either org or user, but not both
  CONSTRAINT invoice_owner_check CHECK (
    (organization_id IS NOT NULL AND user_id IS NULL) OR
    (organization_id IS NULL AND user_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_period ON invoices(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_id ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

-- ============================================================================
-- PAYMENT METHODS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Payment Method Details
  type VARCHAR(50) NOT NULL, -- 'card', 'bank_account', 'paypal', 'other'
  is_default BOOLEAN DEFAULT false,
  
  -- Card Details (for cards)
  last_four VARCHAR(4),
  brand VARCHAR(50), -- 'visa', 'mastercard', 'amex', 'discover', etc.
  expiry_month INTEGER,
  expiry_year INTEGER,
  
  -- Billing Information
  billing_name VARCHAR(255),
  billing_email VARCHAR(255),
  billing_address JSONB, -- {street, city, state, zip, country}
  
  -- Integration IDs
  stripe_payment_method_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  
  -- Status
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'expired', 'failed', 'removed'
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  
  -- Constraint: Either org or user, but not both
  CONSTRAINT payment_method_owner_check CHECK (
    (organization_id IS NOT NULL AND user_id IS NULL) OR
    (organization_id IS NULL AND user_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_org ON payment_methods(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON payment_methods(is_default);
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe ON payment_methods(stripe_payment_method_id);

-- ============================================================================
-- AI USAGE TRACKING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- AI Feature Tracking
  feature VARCHAR(50) NOT NULL, -- 'summarize', 'write', 'transcribe', 'remix', 'dictation'
  request_count INTEGER DEFAULT 0,
  
  -- Period
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  
  -- Cost Calculation
  total_cost_usd DECIMAL(10,2) DEFAULT 0,
  included_requests INTEGER DEFAULT 0, -- How many were free tier
  overage_requests INTEGER DEFAULT 0, -- How many charged
  
  -- Metadata
  metadata JSONB, -- Store additional details like model used, tokens, etc.
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_org ON ai_usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature ON ai_usage(feature);
CREATE INDEX IF NOT EXISTS idx_ai_usage_period ON ai_usage(period_start, period_end);

-- ============================================================================
-- STORAGE USAGE TRACKING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS storage_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Storage Breakdown
  total_bytes BIGINT DEFAULT 0,
  attachments_bytes BIGINT DEFAULT 0,
  emails_bytes BIGINT DEFAULT 0,
  other_bytes BIGINT DEFAULT 0,
  
  -- Period
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  
  -- Cost Calculation
  included_gb DECIMAL(10,2) DEFAULT 50, -- Included storage per user
  overage_gb DECIMAL(10,2) DEFAULT 0,
  overage_cost_usd DECIMAL(10,2) DEFAULT 0,
  
  -- Snapshot
  snapshot_date TIMESTAMP DEFAULT NOW(),
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_storage_usage_user ON storage_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_storage_usage_org ON storage_usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_storage_usage_period ON storage_usage(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_storage_usage_snapshot ON storage_usage(snapshot_date);

-- ============================================================================
-- USAGE ALERTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Alert Configuration
  alert_type VARCHAR(50) NOT NULL, -- 'sms_threshold', 'ai_threshold', 'storage_threshold', 'budget_threshold'
  threshold_value DECIMAL(10,2) NOT NULL, -- Threshold amount (e.g., $100, 1000 messages, 50 GB)
  threshold_unit VARCHAR(50), -- 'usd', 'messages', 'gb', 'requests'
  
  -- Current Status
  current_value DECIMAL(10,2) DEFAULT 0,
  percentage_used DECIMAL(5,2) DEFAULT 0, -- 0-100%
  
  -- Alert Status
  is_active BOOLEAN DEFAULT true,
  triggered_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  acknowledged_by UUID REFERENCES users(id),
  
  -- Notification Settings
  notify_email BOOLEAN DEFAULT true,
  notify_in_app BOOLEAN DEFAULT true,
  notification_sent_at TIMESTAMP,
  
  -- Period
  period_start TIMESTAMP,
  period_end TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  
  -- Constraint: Either org or user, but not both
  CONSTRAINT usage_alert_owner_check CHECK (
    (organization_id IS NOT NULL AND user_id IS NULL) OR
    (organization_id IS NULL AND user_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_usage_alerts_user ON usage_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_alerts_org ON usage_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_alerts_type ON usage_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_usage_alerts_active ON usage_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_usage_alerts_triggered ON usage_alerts(triggered_at);

-- ============================================================================
-- AUDIT LOGS TABLE (Enhanced)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Action Details
  action VARCHAR(100) NOT NULL, -- 'member_added', 'member_removed', 'role_changed', 'plan_upgraded', etc.
  resource_type VARCHAR(50), -- 'user', 'organization', 'subscription', 'invoice', 'payment_method'
  resource_id UUID,
  
  -- Change Details
  old_value JSONB,
  new_value JSONB,
  
  -- Context
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  -- Metadata
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  current_month TEXT;
  sequence_num TEXT;
  next_num INTEGER;
BEGIN
  current_year := TO_CHAR(NOW(), 'YYYY');
  current_month := TO_CHAR(NOW(), 'MM');
  
  -- Get next sequence number for this month
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 10) AS INTEGER)), 0) + 1
  INTO next_num
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || current_year || current_month || '%';
  
  sequence_num := LPAD(next_num::TEXT, 4, '0');
  
  RETURN 'INV-' || current_year || current_month || '-' || sequence_num;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate storage overage cost
CREATE OR REPLACE FUNCTION calculate_storage_overage(
  total_gb DECIMAL,
  included_gb DECIMAL DEFAULT 50,
  cost_per_gb DECIMAL DEFAULT 0.10
)
RETURNS TABLE(overage_gb DECIMAL, overage_cost DECIMAL) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    GREATEST(total_gb - included_gb, 0) AS overage_gb,
    GREATEST(total_gb - included_gb, 0) * cost_per_gb AS overage_cost;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate AI overage cost
CREATE OR REPLACE FUNCTION calculate_ai_overage(
  total_requests INTEGER,
  included_requests INTEGER DEFAULT 1000,
  cost_per_request DECIMAL DEFAULT 0.001
)
RETURNS TABLE(overage_requests INTEGER, overage_cost DECIMAL) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    GREATEST(total_requests - included_requests, 0) AS overage_requests,
    GREATEST(total_requests - included_requests, 0) * cost_per_request AS overage_cost;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert default usage alerts for existing organizations
-- (Can be run manually or as part of onboarding)

COMMENT ON TABLE invoices IS 'Stores billing invoices for organizations and individual users';
COMMENT ON TABLE payment_methods IS 'Stores payment methods (cards, bank accounts) for billing';
COMMENT ON TABLE ai_usage IS 'Tracks AI feature usage for billing calculations';
COMMENT ON TABLE storage_usage IS 'Tracks storage usage for billing calculations';
COMMENT ON TABLE usage_alerts IS 'Configurable alerts for usage thresholds';
COMMENT ON TABLE audit_logs IS 'Audit trail for all significant actions';

-- Migration complete

