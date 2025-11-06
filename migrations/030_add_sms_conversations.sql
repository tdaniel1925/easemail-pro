-- ============================================================================
-- SMS CONVERSATION TRACKING MIGRATION
-- Enables inbound SMS routing by mapping phone numbers to users
-- ============================================================================

-- Create sms_conversations table
CREATE TABLE IF NOT EXISTS sms_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Phone number mapping (for routing inbound SMS)
  contact_phone VARCHAR(50) NOT NULL,
  twilio_number VARCHAR(50) NOT NULL,
  
  -- Tracking
  last_message_at TIMESTAMP NOT NULL,
  message_count INTEGER DEFAULT 1,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  
  -- Unique constraint: one active conversation per phone pair
  CONSTRAINT sms_conv_unique UNIQUE(contact_phone, twilio_number)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_sms_conv_user_id ON sms_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_conv_contact_id ON sms_conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_sms_conv_phone ON sms_conversations(contact_phone);
CREATE INDEX IF NOT EXISTS idx_sms_conv_twilio ON sms_conversations(twilio_number);
CREATE INDEX IF NOT EXISTS idx_sms_conv_last_message ON sms_conversations(last_message_at DESC);

-- Comment
COMMENT ON TABLE sms_conversations IS 'Tracks active SMS conversations for routing inbound messages to correct user';
COMMENT ON COLUMN sms_conversations.contact_phone IS 'Contact phone number in E.164 format (+1234567890)';
COMMENT ON COLUMN sms_conversations.twilio_number IS 'Twilio phone number that received/sent the message';
COMMENT ON COLUMN sms_conversations.last_message_at IS 'Timestamp of last message in conversation (for cleanup/expiry)';
COMMENT ON COLUMN sms_conversations.message_count IS 'Total messages exchanged in this conversation';

