-- Create email_summaries table to store AI-generated summaries
CREATE TABLE IF NOT EXISTS email_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Composite unique constraint to prevent duplicate summaries
  UNIQUE(message_id, account_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_summaries_message_id ON email_summaries(message_id);
CREATE INDEX IF NOT EXISTS idx_email_summaries_account_id ON email_summaries(account_id);

-- Add RLS policies
ALTER TABLE email_summaries ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies are permissive for now since we're storing by account_id
-- In production, you may want to add more restrictive policies based on your nylas_accounts table

-- Allow authenticated users to read all summaries (adjust based on your security requirements)
CREATE POLICY "Users can view email summaries"
  ON email_summaries
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert summaries
CREATE POLICY "Users can create email summaries"
  ON email_summaries
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Add comment
COMMENT ON TABLE email_summaries IS 'Stores AI-generated summaries for emails to avoid regeneration';
COMMENT ON COLUMN email_summaries.message_id IS 'Nylas message ID';
COMMENT ON COLUMN email_summaries.account_id IS 'Nylas account ID';
COMMENT ON COLUMN email_summaries.summary IS 'AI-generated summary of the email content';
