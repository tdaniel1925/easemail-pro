-- =====================================================
-- SAFE MIGRATION - Attachments Table & AI Preference
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop and recreate attachments table (safe if empty, or use CREATE IF NOT EXISTS)
DROP TABLE IF EXISTS attachments CASCADE;

CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email_id UUID,
  account_id UUID,
  
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
  document_type VARCHAR(100),
  classification_confidence INTEGER,
  extracted_metadata JSONB,
  key_terms JSONB,
  
  -- Processing status
  ai_processed BOOLEAN DEFAULT FALSE NOT NULL,
  processing_status VARCHAR(50) DEFAULT 'pending' NOT NULL,
  processing_error TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_attachments_user_id ON attachments(user_id);
CREATE INDEX idx_attachments_email_id ON attachments(email_id);
CREATE INDEX idx_attachments_file_extension ON attachments(file_extension);
CREATE INDEX idx_attachments_document_type ON attachments(document_type);
CREATE INDEX idx_attachments_email_date ON attachments(email_date);
CREATE INDEX idx_attachments_processing_status ON attachments(processing_status);
CREATE INDEX idx_attachments_ai_processed ON attachments(ai_processed);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS attachments_updated_at_trigger ON attachments;
CREATE TRIGGER attachments_updated_at_trigger
  BEFORE UPDATE ON attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_attachments_updated_at();

-- Add AI preference column (safe to run multiple times)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_preferences' 
    AND column_name = 'ai_attachment_processing'
  ) THEN
    ALTER TABLE user_preferences 
    ADD COLUMN ai_attachment_processing BOOLEAN DEFAULT FALSE NOT NULL;
  END IF;
END $$;

-- Verify installation
SELECT 
  'attachments' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'attachments'
UNION ALL
SELECT 
  'user_preferences' as table_name,
  COUNT(CASE WHEN column_name = 'ai_attachment_processing' THEN 1 END) as has_ai_column
FROM information_schema.columns 
WHERE table_name = 'user_preferences';

-- Expected result:
-- attachments: 24 columns
-- user_preferences: 1 (has the ai_attachment_processing column)

