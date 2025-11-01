-- SMS System Complete Migration
-- Run this in your Supabase SQL Editor

-- 1. SMS Messages Table
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contact_id UUID,
  to_phone VARCHAR(50) NOT NULL,
  from_phone VARCHAR(50) NOT NULL,
  message_body TEXT NOT NULL,
  twilio_sid VARCHAR(255),
  twilio_status VARCHAR(50) DEFAULT 'queued',
  twilio_error_code VARCHAR(50),
  twilio_error_message TEXT,
  cost_usd VARCHAR(20) DEFAULT '0',
  price_charged_usd VARCHAR(20) DEFAULT '0',
  currency VARCHAR(3) DEFAULT 'USD',
  direction VARCHAR(20) DEFAULT 'outbound',
  metadata JSONB,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_user_id ON sms_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_contact_id ON sms_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_sms_twilio_sid ON sms_messages(twilio_sid);
CREATE INDEX IF NOT EXISTS idx_sms_sent_at ON sms_messages(sent_at DESC);

-- 2. SMS Usage Tracking Table
CREATE TABLE IF NOT EXISTS sms_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_messages_sent INTEGER DEFAULT 0,
  total_messages_received INTEGER DEFAULT 0,
  total_cost_usd VARCHAR(20) DEFAULT '0',
  total_charged_usd VARCHAR(20) DEFAULT '0',
  currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_usage_user_id ON sms_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_usage_period ON sms_usage(period_start, period_end);

-- 3. Contact Communications Timeline (excludes emails)
CREATE TABLE IF NOT EXISTS contact_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'sms_sent', 'sms_received', 'call_made', 'call_received', 'meeting', etc.
  direction VARCHAR(20), -- 'inbound' or 'outbound'
  body TEXT,
  snippet TEXT,
  sms_id UUID,
  status VARCHAR(50),
  metadata JSONB,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_comms_user_id ON contact_communications(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_comms_contact_id ON contact_communications(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_comms_sms_id ON contact_communications(sms_id);
CREATE INDEX IF NOT EXISTS idx_contact_comms_occurred_at ON contact_communications(occurred_at DESC);

-- 4. Contact Notes Table
CREATE TABLE IF NOT EXISTS contact_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  note_text TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_notes_user_id ON contact_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_notes_contact_id ON contact_notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_notes_created_at ON contact_notes(created_at DESC);

-- 5. SMS Audit Log (for billing & compliance)
CREATE TABLE IF NOT EXISTS sms_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sms_id UUID,
  action VARCHAR(50) NOT NULL, -- 'sent', 'failed', 'delivered', 'refunded', 'billed'
  amount_charged NUMERIC(10, 4),
  metadata JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user_id ON sms_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_sms_id ON sms_audit_log(sms_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON sms_audit_log(created_at DESC);

-- Add foreign key constraints (optional but recommended)
ALTER TABLE sms_messages 
  ADD CONSTRAINT fk_sms_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE sms_messages 
  ADD CONSTRAINT fk_sms_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

ALTER TABLE sms_usage 
  ADD CONSTRAINT fk_usage_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE contact_communications 
  ADD CONSTRAINT fk_comms_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE contact_communications 
  ADD CONSTRAINT fk_comms_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

ALTER TABLE contact_communications 
  ADD CONSTRAINT fk_comms_sms FOREIGN KEY (sms_id) REFERENCES sms_messages(id) ON DELETE SET NULL;

ALTER TABLE contact_notes 
  ADD CONSTRAINT fk_notes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE contact_notes 
  ADD CONSTRAINT fk_notes_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

ALTER TABLE sms_audit_log 
  ADD CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Enable Row Level Security (RLS)
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only see their own data)
CREATE POLICY sms_messages_user_policy ON sms_messages
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY sms_usage_user_policy ON sms_usage
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY contact_comms_user_policy ON contact_communications
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY contact_notes_user_policy ON contact_notes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY sms_audit_user_policy ON sms_audit_log
  FOR ALL USING (auth.uid() = user_id);

-- Success message
SELECT 'SMS System tables created successfully! ✅' AS status;

