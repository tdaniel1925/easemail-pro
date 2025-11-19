-- Migration: Enhanced Cost Tracking and Pro-Rating System
-- Description: Adds comprehensive cost tracking, pro-rated billing, revenue recognition, and credit notes

-- =============================================================================
-- 1. COST ENTRIES TABLE
-- =============================================================================
-- Unified cost tracking for all services (OpenAI, SMS, Storage, Whisper, etc.)
CREATE TABLE IF NOT EXISTS cost_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  organization_id UUID REFERENCES organizations(id),
  
  -- Cost details
  service VARCHAR(50) NOT NULL, -- 'openai', 'sms', 'storage', 'whisper', 'stripe_fee'
  feature VARCHAR(100), -- 'ai_compose', 'ai_summary', 'dictation', etc
  cost_usd DECIMAL(10,4) NOT NULL,
  quantity DECIMAL(10,2), -- tokens, messages, GB, etc
  unit VARCHAR(50), -- 'tokens', 'messages', 'gb', 'api_call'
  
  -- Attribution
  billable_to_org BOOLEAN DEFAULT false,
  
  -- Time tracking
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  occurred_at TIMESTAMP DEFAULT NOW(),
  
  -- Billing linkage
  invoice_id UUID,
  invoice_line_item_id UUID,
  transaction_id UUID,
  
  -- Additional data
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for cost_entries
CREATE INDEX IF NOT EXISTS idx_cost_user ON cost_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_cost_org ON cost_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_cost_period ON cost_entries(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_cost_service ON cost_entries(service);
CREATE INDEX IF NOT EXISTS idx_cost_invoice ON cost_entries(invoice_id);
CREATE INDEX IF NOT EXISTS idx_cost_unbilled ON cost_entries(invoice_id) WHERE invoice_id IS NULL;

-- =============================================================================
-- 2. SUBSCRIPTION PERIODS TABLE
-- =============================================================================
-- Track pro-rated subscription periods for billing
CREATE TABLE IF NOT EXISTS subscription_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id) NOT NULL,
  user_id UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  
  -- Period details
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  is_pro_rated BOOLEAN DEFAULT false,
  days_in_period INTEGER,
  days_in_full_month INTEGER,
  
  -- Pricing
  base_price DECIMAL(10,2),
  pro_rated_price DECIMAL(10,2),
  
  -- Billing status
  invoice_id UUID,
  billed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for subscription_periods
CREATE INDEX IF NOT EXISTS idx_subperiod_subscription ON subscription_periods(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subperiod_period ON subscription_periods(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_subperiod_unbilled ON subscription_periods(billed_at) WHERE billed_at IS NULL;

-- =============================================================================
-- 3. REVENUE SCHEDULE TABLE
-- =============================================================================
-- Revenue recognition for accounting (for annual subscriptions)
CREATE TABLE IF NOT EXISTS revenue_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL,
  invoice_line_item_id UUID,
  
  -- Revenue details
  total_amount DECIMAL(10,2) NOT NULL,
  recognized_amount DECIMAL(10,2) DEFAULT 0,
  unrecognized_amount DECIMAL(10,2),
  
  -- Schedule
  recognition_start TIMESTAMP NOT NULL,
  recognition_end TIMESTAMP NOT NULL,
  recognition_method VARCHAR(50), -- 'immediate', 'monthly', 'daily'
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'recognizing', 'complete'
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for revenue_schedule
CREATE INDEX IF NOT EXISTS idx_revenue_invoice ON revenue_schedule(invoice_id);
CREATE INDEX IF NOT EXISTS idx_revenue_period ON revenue_schedule(recognition_start, recognition_end);
CREATE INDEX IF NOT EXISTS idx_revenue_status ON revenue_schedule(status);

-- =============================================================================
-- 4. CREDIT NOTES TABLE
-- =============================================================================
-- Track refunds, adjustments, and credits
CREATE TABLE IF NOT EXISTS credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_number VARCHAR(50) UNIQUE NOT NULL,
  invoice_id UUID,
  user_id UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  
  -- Amounts
  amount_usd DECIMAL(10,2) NOT NULL,
  reason TEXT,
  type VARCHAR(50), -- 'refund', 'adjustment', 'goodwill', 'dispute'
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'issued', 'applied', 'void'
  issued_at TIMESTAMP,
  applied_at TIMESTAMP,
  
  -- Stripe integration
  stripe_credit_note_id VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Indexes for credit_notes
CREATE INDEX IF NOT EXISTS idx_credit_invoice ON credit_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_user ON credit_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_org ON credit_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_credit_status ON credit_notes(status);

-- =============================================================================
-- 5. RLS POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE cost_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;

-- Cost entries policies
CREATE POLICY "Users can view their own cost entries"
  ON cost_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all cost entries"
  ON cost_entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'platform_admin'
  ));

-- Subscription periods policies
CREATE POLICY "Users can view their own subscription periods"
  ON subscription_periods FOR SELECT
  USING (auth.uid() = user_id);

-- Revenue schedule policies (admin only)
CREATE POLICY "Admins can view revenue schedule"
  ON revenue_schedule FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'platform_admin'
  ));

-- Credit notes policies
CREATE POLICY "Users can view their own credit notes"
  ON credit_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all credit notes"
  ON credit_notes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'platform_admin'
  ));

-- =============================================================================
-- 6. HELPER FUNCTIONS
-- =============================================================================

-- Function to generate credit note numbers
CREATE OR REPLACE FUNCTION generate_credit_note_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  credit_note_number TEXT;
BEGIN
  -- Get the next number from a sequence
  SELECT COALESCE(MAX(CAST(SUBSTRING(credit_note_number FROM 3) AS INTEGER)), 0) + 1
  INTO next_number
  FROM credit_notes
  WHERE credit_note_number LIKE 'CN%';
  
  -- Format as CN000001, CN000002, etc.
  credit_note_number := 'CN' || LPAD(next_number::TEXT, 6, '0');
  
  RETURN credit_note_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update revenue_schedule updated_at
CREATE OR REPLACE FUNCTION update_revenue_schedule_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER revenue_schedule_updated_at
  BEFORE UPDATE ON revenue_schedule
  FOR EACH ROW
  EXECUTE FUNCTION update_revenue_schedule_timestamp();

