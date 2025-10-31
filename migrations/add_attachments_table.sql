-- Create attachments table for email attachments with AI processing
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
  account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
  
  -- File details
  filename VARCHAR(500) NOT NULL,
  file_extension VARCHAR(50),
  mime_type VARCHAR(255),
  file_size_bytes BIGINT NOT NULL,
  
  -- Storage
  storage_path VARCHAR(1000) NOT NULL,
  storage_url TEXT,
  thumbnail_path VARCHAR(1000),
  thumbnail_url TEXT,
  
  -- Email context
  email_subject TEXT,
  sender_email VARCHAR(255),
  sender_name VARCHAR(255),
  email_date TIMESTAMP WITH TIME ZONE,
  thread_id UUID,
  
  -- AI Classification
  document_type VARCHAR(100), -- 'invoice', 'receipt', 'contract', 'report', 'image', etc.
  classification_confidence INTEGER, -- 0-100
  extracted_metadata JSONB, -- AI-extracted data
  key_terms JSONB, -- Array of key terms
  
  -- Processing status
  ai_processed BOOLEAN DEFAULT FALSE,
  processing_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  processing_error TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS attachments_user_id_idx ON attachments(user_id);
CREATE INDEX IF NOT EXISTS attachments_email_id_idx ON attachments(email_id);
CREATE INDEX IF NOT EXISTS attachments_file_extension_idx ON attachments(file_extension);
CREATE INDEX IF NOT EXISTS attachments_document_type_idx ON attachments(document_type);
CREATE INDEX IF NOT EXISTS attachments_email_date_idx ON attachments(email_date);
CREATE INDEX IF NOT EXISTS attachments_processing_status_idx ON attachments(processing_status);
CREATE INDEX IF NOT EXISTS attachments_ai_processed_idx ON attachments(ai_processed);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attachments_updated_at_trigger
  BEFORE UPDATE ON attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_attachments_updated_at();

-- Create Supabase Storage bucket for attachments
-- Run this in Supabase SQL editor:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', false);
-- 
-- Set RLS policies for attachments bucket:
-- CREATE POLICY "Users can upload their own attachments"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
-- 
-- CREATE POLICY "Users can view their own attachments"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

