-- Migration: Add Pricing and Billing Management System
-- This enables comprehensive pricing control for all plans and usage-based billing

-- ============================================================================
-- PRICING PLANS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE, -- 'individual', 'team', 'enterprise', 'custom'
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  base_price_monthly DECIMAL(10,2) NOT NULL, -- Price per user per month
  base_price_annual DECIMAL(10,2) NOT NULL,  -- Price per user per year
  min_seats INTEGER DEFAULT 1,
  max_seats INTEGER, -- NULL for unlimited
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pricing_plans_active ON pricing_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_pricing_plans_name ON pricing_plans(name);

-- Insert default plans
-- Free: $0 (no SMS, 10 AI requests/month)
-- Individual: $45/month, $36/year (20% annual discount)
-- Team: $40.50/month, $32.40/year (10% off Individual)
-- Enterprise: $36.45/month, $29.16/year (10% off Team)
INSERT INTO pricing_plans (name, display_name, description, base_price_monthly, base_price_annual, min_seats, max_seats) VALUES
('free', 'Free Plan', 'Perfect for trying out EaseMail with basic features - no SMS, 10 AI requests per month', 0.00, 0.00, 1, 1),
('individual', 'Individual Plan', 'Perfect for solo professionals with unlimited features', 45.00, 36.00, 1, 1),
('team', 'Team Plan', 'For small teams of 2-10 users (10% discount per user)', 40.50, 32.40, 2, 10),
('enterprise', 'Enterprise Plan', 'For large organizations with 10+ users (additional 10% discount)', 36.45, 29.16, 10, NULL),
('custom', 'Custom Plan', 'Custom pricing for specific organizations', 0.00, 0.00, 1, NULL)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- USAGE-BASED PRICING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type VARCHAR(50) NOT NULL UNIQUE, -- 'sms', 'ai', 'storage'
  pricing_model VARCHAR(50) NOT NULL, -- 'per_unit', 'tiered', 'overage'
  base_rate DECIMAL(10,4) NOT NULL,
  unit VARCHAR(50) NOT NULL, -- 'message', 'request', 'gb'
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_usage_pricing_type ON usage_pricing(service_type);
CREATE INDEX IF NOT EXISTS idx_usage_pricing_active ON usage_pricing(is_active);

-- Insert default usage pricing
INSERT INTO usage_pricing (service_type, pricing_model, base_rate, unit, description) VALUES
('sms', 'tiered', 0.0300, 'message', 'SMS messaging cost per message'),
('ai', 'overage', 0.0010, 'request', 'AI request cost after free tier'),
('storage', 'overage', 0.1000, 'gb', 'Storage cost per GB over included amount')
ON CONFLICT (service_type) DO NOTHING;

-- ============================================================================
-- PRICING TIERS TABLE (for volume discounts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usage_pricing_id UUID NOT NULL REFERENCES usage_pricing(id) ON DELETE CASCADE,
  min_quantity INTEGER NOT NULL,
  max_quantity INTEGER, -- NULL for unlimited
  rate_per_unit DECIMAL(10,4) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(usage_pricing_id, min_quantity)
);

-- Add tier_name column if it doesn't exist (for existing tables)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pricing_tiers' AND column_name = 'tier_name'
  ) THEN
    ALTER TABLE pricing_tiers ADD COLUMN tier_name VARCHAR(100);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pricing_tiers_usage ON pricing_tiers(usage_pricing_id);

-- Insert default SMS tiers
INSERT INTO pricing_tiers (usage_pricing_id, tier_name, min_quantity, max_quantity, rate_per_unit)
SELECT 
  id,
  'Standard Rate',
  0,
  1000,
  0.0300
FROM usage_pricing WHERE service_type = 'sms';

INSERT INTO pricing_tiers (usage_pricing_id, tier_name, min_quantity, max_quantity, rate_per_unit)
SELECT 
  id,
  'Volume Discount',
  1001,
  10000,
  0.0250
FROM usage_pricing WHERE service_type = 'sms';

INSERT INTO pricing_tiers (usage_pricing_id, tier_name, min_quantity, max_quantity, rate_per_unit)
SELECT 
  id,
  'High Volume',
  10001,
  NULL,
  0.0200
FROM usage_pricing WHERE service_type = 'sms';

-- ============================================================================
-- ORGANIZATION PRICING OVERRIDES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_pricing_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES pricing_plans(id),
  custom_monthly_rate DECIMAL(10,2),
  custom_annual_rate DECIMAL(10,2),
  custom_sms_rate DECIMAL(10,4),
  custom_ai_rate DECIMAL(10,4),
  custom_storage_rate DECIMAL(10,4),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(organization_id)
);

CREATE INDEX IF NOT EXISTS idx_org_pricing_org ON organization_pricing_overrides(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_pricing_plan ON organization_pricing_overrides(plan_id);

-- ============================================================================
-- BILLING SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS billing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  data_type VARCHAR(20) NOT NULL, -- 'string', 'number', 'boolean', 'json'
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_billing_settings_key ON billing_settings(setting_key);

-- Insert default billing settings (skip if already exist)
INSERT INTO billing_settings (setting_key, setting_value, data_type, description) VALUES
('trial_period_days', '30', 'number', 'Default free trial period in days'),
('annual_discount_percent', '20', 'number', 'Discount percentage for annual billing'),
('grace_period_days', '7', 'number', 'Days after failed payment before suspension'),
('default_sms_rate', '0.03', 'number', 'Default cost per SMS message in USD'),
('ai_free_requests_monthly', '1000', 'number', 'Free AI requests per user per month'),
('ai_overage_rate', '0.001', 'number', 'Cost per AI request over free tier in USD'),
('storage_included_gb', '50', 'number', 'GB of storage included per user'),
('storage_overage_rate', '0.10', 'number', 'Cost per GB over included storage in USD'),
('auto_suspend_on_failure', 'true', 'boolean', 'Automatically suspend account after grace period'),
('allow_overage_charges', 'true', 'boolean', 'Allow overage charges for SMS, AI, and storage')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================================
-- PLAN FEATURE LIMITS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS plan_feature_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES pricing_plans(id) ON DELETE CASCADE,
  feature_key VARCHAR(100) NOT NULL,
  limit_value TEXT NOT NULL, -- Can be number, 'unlimited', or 'disabled'
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(plan_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_plan_feature_limits_plan ON plan_feature_limits(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_feature_limits_feature ON plan_feature_limits(feature_key);

-- Insert feature limits for each plan
-- Use a function to avoid ON CONFLICT issues with INSERT...SELECT
DO $$
DECLARE
  free_plan_id UUID;
  individual_plan_id UUID;
  team_plan_id UUID;
  enterprise_plan_id UUID;
BEGIN
  -- Get plan IDs
  SELECT id INTO free_plan_id FROM pricing_plans WHERE name = 'free';
  SELECT id INTO individual_plan_id FROM pricing_plans WHERE name = 'individual';
  SELECT id INTO team_plan_id FROM pricing_plans WHERE name = 'team';
  SELECT id INTO enterprise_plan_id FROM pricing_plans WHERE name = 'enterprise';

  -- Free Plan limits
  IF free_plan_id IS NOT NULL THEN
    INSERT INTO plan_feature_limits (plan_id, feature_key, limit_value, description)
    VALUES 
      (free_plan_id, 'sms_enabled', 'false', 'SMS messaging disabled on free plan'),
      (free_plan_id, 'ai_requests_monthly', '10', 'AI email generation limited to 10 per month'),
      (free_plan_id, 'email_accounts', 'unlimited', 'Unlimited email accounts')
    ON CONFLICT (plan_id, feature_key) DO NOTHING;
  END IF;

  -- Individual Plan limits
  IF individual_plan_id IS NOT NULL THEN
    INSERT INTO plan_feature_limits (plan_id, feature_key, limit_value, description)
    VALUES 
      (individual_plan_id, 'sms_enabled', 'true', 'SMS messaging enabled'),
      (individual_plan_id, 'ai_requests_monthly', 'unlimited', 'Unlimited AI requests'),
      (individual_plan_id, 'email_accounts', 'unlimited', 'Unlimited email accounts')
    ON CONFLICT (plan_id, feature_key) DO NOTHING;
  END IF;

  -- Team Plan limits
  IF team_plan_id IS NOT NULL THEN
    INSERT INTO plan_feature_limits (plan_id, feature_key, limit_value, description)
    VALUES 
      (team_plan_id, 'sms_enabled', 'true', 'SMS messaging enabled'),
      (team_plan_id, 'ai_requests_monthly', 'unlimited', 'Unlimited AI requests'),
      (team_plan_id, 'email_accounts', 'unlimited', 'Unlimited email accounts')
    ON CONFLICT (plan_id, feature_key) DO NOTHING;
  END IF;

  -- Enterprise Plan limits
  IF enterprise_plan_id IS NOT NULL THEN
    INSERT INTO plan_feature_limits (plan_id, feature_key, limit_value, description)
    VALUES 
      (enterprise_plan_id, 'sms_enabled', 'true', 'SMS messaging enabled'),
      (enterprise_plan_id, 'ai_requests_monthly', 'unlimited', 'Unlimited AI requests'),
      (enterprise_plan_id, 'email_accounts', 'unlimited', 'Unlimited email accounts')
    ON CONFLICT (plan_id, feature_key) DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE pricing_plans IS 'Subscription plan configurations';
COMMENT ON TABLE usage_pricing IS 'Usage-based pricing for SMS, AI, and storage';
COMMENT ON TABLE pricing_tiers IS 'Volume-based pricing tiers for discounts';
COMMENT ON TABLE organization_pricing_overrides IS 'Custom pricing for specific organizations';
COMMENT ON TABLE billing_settings IS 'Global billing configuration settings';

