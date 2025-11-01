-- ============================================================================
-- SMS SYSTEM MIGRATION
-- Adds SMS messaging, notes, and communication timeline features
-- ============================================================================

-- SMS Messages Table
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  -- Message details
  to_phone VARCHAR(50) NOT NULL,
  from_phone VARCHAR(50) NOT NULL,
  message_body TEXT NOT NULL,
  
  -- Twilio integration
  twilio_sid VARCHAR(255),
  twilio_status VARCHAR(50),
  twilio_error_code VARCHAR(50),
  twilio_error_message TEXT,
  
  -- Billing
  cost_usd VARCHAR(20),
  price_charged_usd VARCHAR(20),
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Metadata
  direction VARCHAR(20) DEFAULT 'outbound',
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for sms_messages
CREATE INDEX IF NOT EXISTS idx_sms_messages_user_id ON sms_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_contact_id ON sms_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_twilio_sid ON sms_messages(twilio_sid);
CREATE INDEX IF NOT EXISTS idx_sms_messages_created_at ON sms_messages(created_at DESC);

-- SMS Usage Tracking Table
CREATE TABLE IF NOT EXISTS sms_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  
  total_messages_sent INTEGER DEFAULT 0,
  total_cost_usd VARCHAR(20) DEFAULT '0',
  total_charged_usd VARCHAR(20) DEFAULT '0',
  
  billing_status VARCHAR(50) DEFAULT 'pending',
  invoice_id VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for sms_usage
CREATE INDEX IF NOT EXISTS idx_sms_usage_user_id ON sms_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_usage_period ON sms_usage(period_start, period_end);

-- Contact Communications Timeline Table
CREATE TABLE IF NOT EXISTS contact_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Communication type (SMS, calls, notes - NO EMAILS)
  type VARCHAR(50) NOT NULL, -- 'sms_sent', 'sms_received', 'call_inbound', 'call_outbound', 'note'
  direction VARCHAR(20), -- 'inbound', 'outbound', 'internal'
  
  -- Content
  subject TEXT,
  body TEXT,
  snippet TEXT,
  
  -- Reference to SMS
  sms_id UUID REFERENCES sms_messages(id) ON DELETE SET NULL,
  
  -- Metadata (JSON)
  metadata JSONB,
  
  -- Status
  status VARCHAR(50),
  
  -- Timestamps
  occurred_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for contact_communications
CREATE INDEX IF NOT EXISTS idx_contact_comms_contact_id ON contact_communications(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_comms_user_id ON contact_communications(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_comms_type ON contact_communications(type);
CREATE INDEX IF NOT EXISTS idx_contact_comms_occurred_at ON contact_communications(occurred_at DESC);

-- Contact Notes Table
CREATE TABLE IF NOT EXISTS contact_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  category VARCHAR(50),
  is_pinned BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for contact_notes
CREATE INDEX IF NOT EXISTS idx_contact_notes_contact_id ON contact_notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_notes_user_id ON contact_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_notes_created_at ON contact_notes(created_at DESC);

-- Add SMS consent field to contacts table (if doesn't exist)
-- This stores in custom_fields JSONB column that already exists
-- No migration needed, we'll use: custom_fields->>'smsConsent'

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'SMS system tables created successfully!';
  RAISE NOTICE 'Tables: sms_messages, sms_usage, contact_communications, contact_notes';
END $$;

