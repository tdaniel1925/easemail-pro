-- Add is_read column to sms_messages table
ALTER TABLE sms_messages 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Create index for faster unread queries
CREATE INDEX IF NOT EXISTS sms_messages_is_read_idx ON sms_messages(user_id, direction, is_read) WHERE direction = 'inbound';

COMMENT ON COLUMN sms_messages.is_read IS 'Whether the SMS message has been read by the user';

