-- ============================================================================
-- COMPLETE SMS SYSTEM FIX
-- Run this in Supabase SQL Editor to fix ALL SMS-related tables
-- ============================================================================

-- 1. Create sms_messages table
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sms_messages') THEN
    RAISE NOTICE 'Creating sms_messages table...';
    
    CREATE TABLE sms_messages (
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
    
    CREATE INDEX idx_sms_messages_user_id ON sms_messages(user_id);
    CREATE INDEX idx_sms_messages_contact_id ON sms_messages(contact_id);
    CREATE INDEX idx_sms_messages_twilio_sid ON sms_messages(twilio_sid);
    CREATE INDEX idx_sms_messages_created_at ON sms_messages(created_at DESC);
    
    RAISE NOTICE '✅ sms_messages table created!';
  ELSE
    RAISE NOTICE '✅ sms_messages table already exists';
  END IF;
END $$;

-- 2. Create sms_usage table
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sms_usage') THEN
    RAISE NOTICE 'Creating sms_usage table...';
    
    CREATE TABLE sms_usage (
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
    
    CREATE INDEX idx_sms_usage_user_id ON sms_usage(user_id);
    CREATE INDEX idx_sms_usage_period ON sms_usage(period_start, period_end);
    
    RAISE NOTICE '✅ sms_usage table created!';
  ELSE
    RAISE NOTICE '✅ sms_usage table already exists';
  END IF;
END $$;

-- 3. Create contact_communications table
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'contact_communications') THEN
    RAISE NOTICE 'Creating contact_communications table...';
    
    CREATE TABLE contact_communications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      
      -- Communication type (SMS, calls, notes - NO EMAILS)
      type VARCHAR(50) NOT NULL,
      direction VARCHAR(20),
      
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
    
    CREATE INDEX idx_contact_comms_contact_id ON contact_communications(contact_id);
    CREATE INDEX idx_contact_comms_user_id ON contact_communications(user_id);
    CREATE INDEX idx_contact_comms_type ON contact_communications(type);
    CREATE INDEX idx_contact_comms_occurred_at ON contact_communications(occurred_at DESC);
    
    RAISE NOTICE '✅ contact_communications table created!';
  ELSE
    RAISE NOTICE '✅ contact_communications table already exists';
  END IF;
END $$;

-- 4. Create contact_notes table
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'contact_notes') THEN
    RAISE NOTICE 'Creating contact_notes table...';
    
    CREATE TABLE contact_notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      
      content TEXT NOT NULL,
      category VARCHAR(50),
      is_pinned BOOLEAN DEFAULT false,
      
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    
    CREATE INDEX idx_contact_notes_contact_id ON contact_notes(contact_id);
    CREATE INDEX idx_contact_notes_user_id ON contact_notes(user_id);
    CREATE INDEX idx_contact_notes_created_at ON contact_notes(created_at DESC);
    
    RAISE NOTICE '✅ contact_notes table created!';
  ELSE
    RAISE NOTICE '✅ contact_notes table already exists';
  END IF;
END $$;

-- Final verification
SELECT 
  'SMS SYSTEM TABLES' as category,
  COUNT(*) FILTER (WHERE table_name = 'sms_messages') as sms_messages,
  COUNT(*) FILTER (WHERE table_name = 'sms_usage') as sms_usage,
  COUNT(*) FILTER (WHERE table_name = 'contact_communications') as contact_communications,
  COUNT(*) FILTER (WHERE table_name = 'contact_notes') as contact_notes
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sms_messages', 'sms_usage', 'contact_communications', 'contact_notes');

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✅ SMS SYSTEM MIGRATION COMPLETE!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'All SMS tables have been created:';
  RAISE NOTICE '  ✅ sms_messages';
  RAISE NOTICE '  ✅ sms_usage';
  RAISE NOTICE '  ✅ contact_communications';
  RAISE NOTICE '  ✅ contact_notes';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now:';
  RAISE NOTICE '  • Send SMS messages';
  RAISE NOTICE '  • Track SMS usage and billing';
  RAISE NOTICE '  • View SMS in contact timeline';
  RAISE NOTICE '  • Add notes to contacts';
  RAISE NOTICE '';
END $$;

