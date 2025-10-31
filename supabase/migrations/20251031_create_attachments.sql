-- EaseMail Attachments V1 - Database Schema
-- Migration: Create attachments infrastructure
-- Date: October 31, 2025

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy search

-- ============================================================================
-- ATTACHMENTS TABLE
-- ============================================================================

CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_id UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  thread_id UUID, -- Optional: link to thread if threads table exists
  
  -- ===== File Metadata =====
  filename TEXT NOT NULL,
  file_extension TEXT, -- e.g., 'pdf', 'jpg', 'docx'
  mime_type TEXT NOT NULL, -- e.g., 'application/pdf'
  file_size_bytes BIGINT NOT NULL,
  
  -- ===== Storage Information =====
  storage_path TEXT NOT NULL, -- Supabase storage path
  storage_bucket TEXT NOT NULL DEFAULT 'email-attachments',
  thumbnail_path TEXT, -- Path to thumbnail (for images/PDFs)
  
  -- ===== Email Context =====
  sender_email TEXT,
  sender_name TEXT,
  email_subject TEXT,
  email_date TIMESTAMP WITH TIME ZONE,
  
  -- ===== AI Classification (V1 Killer Feature) =====
  document_type VARCHAR(50), -- 'invoice', 'receipt', 'contract', 'report', 'presentation', 'image', 'other'
  classification_confidence DECIMAL(3,2), -- 0.00 to 1.00
  
  -- ===== Extracted Metadata (JSONB for flexibility) =====
  extracted_metadata JSONB DEFAULT '{}',
  /*
    Examples:
    
    Invoice:
    {
      "amount": 2450.00,
      "currency": "USD",
      "invoiceNumber": "INV-2025-1234",
      "dueDate": "2025-11-15",
      "vendor": "Acme Corp",
      "vendorEmail": "billing@acme.com",
      "isPaid": false,
      "lineItems": [...]
    }
    
    Receipt:
    {
      "merchant": "Starbucks",
      "total": 4.50,
      "date": "2025-10-30",
      "location": "123 Main St",
      "paymentMethod": "Visa ****1234"
    }
    
    Contract:
    {
      "parties": ["Company A", "Company B"],
      "effectiveDate": "2025-01-01",
      "expirationDate": "2026-12-31",
      "contractValue": 50000,
      "type": "Service Agreement"
    }
  */
  
  -- ===== Key Terms (for enhanced search) =====
  key_terms TEXT[] DEFAULT '{}', -- 3-5 important terms extracted by AI
  
  -- ===== AI Processing Status =====
  ai_processed BOOLEAN DEFAULT FALSE,
  ai_processed_at TIMESTAMP WITH TIME ZONE,
  ai_processing_error TEXT, -- Store error if AI processing fails
  ai_model_version VARCHAR(20), -- Track which AI model was used
  
  -- ===== Search Optimization =====
  search_vector tsvector,
  
  -- ===== Usage Tracking =====
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  
  -- ===== Timestamps =====
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- ===== Constraints =====
  CONSTRAINT valid_confidence CHECK (
    classification_confidence IS NULL OR 
    (classification_confidence >= 0 AND classification_confidence <= 1)
  ),
  CONSTRAINT valid_file_size CHECK (file_size_bytes > 0)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Primary lookup indexes
CREATE INDEX idx_attachments_user_id ON attachments(user_id);
CREATE INDEX idx_attachments_email_id ON attachments(email_id);
-- Note: Add thread_id index later if threads table exists
-- CREATE INDEX idx_attachments_thread_id ON attachments(thread_id) WHERE thread_id IS NOT NULL;

-- Filtering indexes
CREATE INDEX idx_attachments_user_date ON attachments(user_id, email_date DESC);
CREATE INDEX idx_attachments_user_type ON attachments(user_id, document_type) WHERE document_type IS NOT NULL;
CREATE INDEX idx_attachments_file_extension ON attachments(user_id, file_extension);
CREATE INDEX idx_attachments_sender ON attachments(user_id, sender_email);

-- Full-text search index
CREATE INDEX idx_attachments_search_vector ON attachments USING GIN(search_vector);

-- JSONB metadata search
CREATE INDEX idx_attachments_metadata ON attachments USING GIN(extracted_metadata);

-- AI processing status
CREATE INDEX idx_attachments_ai_pending ON attachments(user_id, created_at) 
  WHERE ai_processed = FALSE;

-- Filename fuzzy search
CREATE INDEX idx_attachments_filename_trgm ON attachments USING GIN(filename gin_trgm_ops);

-- ============================================================================
-- ATTACHMENT PROCESSING QUEUE
-- ============================================================================

CREATE TABLE attachment_processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attachment_id UUID NOT NULL REFERENCES attachments(id) ON DELETE CASCADE,
  
  -- Processing status
  status VARCHAR(20) DEFAULT 'pending',
  -- 'pending', 'processing', 'completed', 'failed', 'retrying'
  
  -- Priority (higher = more urgent)
  priority INTEGER DEFAULT 5,
  
  -- Retry logic
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_error TEXT,
  
  -- Processing metadata
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_priority CHECK (priority BETWEEN 1 AND 10),
  CONSTRAINT valid_attempts CHECK (attempts >= 0 AND attempts <= max_attempts)
);

CREATE INDEX idx_queue_status_priority ON attachment_processing_queue(status, priority DESC)
  WHERE status IN ('pending', 'retrying');

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachment_processing_queue ENABLE ROW LEVEL SECURITY;

-- Users can only see their own attachments
CREATE POLICY "Users can view own attachments"
  ON attachments FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own attachments (system creates these during email sync)
CREATE POLICY "Users can insert own attachments"
  ON attachments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own attachments (for metadata like access count)
CREATE POLICY "Users can update own attachments"
  ON attachments FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own attachments
CREATE POLICY "Users can delete own attachments"
  ON attachments FOR DELETE
  USING (auth.uid() = user_id);

-- Processing queue is service-only (no user access)
CREATE POLICY "Service role only for queue"
  ON attachment_processing_queue FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_attachments_updated_at
  BEFORE UPDATE ON attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_queue_updated_at
  BEFORE UPDATE ON attachment_processing_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update search_vector automatically
CREATE OR REPLACE FUNCTION update_attachment_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.filename, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.sender_name, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.email_subject, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.key_terms, ' '), '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_attachments_search_vector
  BEFORE INSERT OR UPDATE ON attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_attachment_search_vector();

-- Automatically queue new attachments for AI processing
CREATE OR REPLACE FUNCTION queue_attachment_for_processing()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO attachment_processing_queue (attachment_id, priority)
  VALUES (
    NEW.id,
    CASE 
      -- Higher priority for common business documents
      WHEN NEW.file_extension IN ('pdf', 'doc', 'docx') THEN 8
      -- Medium priority for images (might be receipts/invoices)
      WHEN NEW.file_extension IN ('jpg', 'jpeg', 'png') THEN 6
      -- Lower priority for other files
      ELSE 4
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER queue_new_attachments
  AFTER INSERT ON attachments
  FOR EACH ROW
  EXECUTE FUNCTION queue_attachment_for_processing();

-- Function to increment access count
CREATE OR REPLACE FUNCTION increment_attachment_access(attachment_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE attachments
  SET 
    access_count = access_count + 1,
    last_accessed_at = NOW()
  WHERE id = attachment_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View for attachment statistics per user
CREATE OR REPLACE VIEW attachment_stats AS
SELECT 
  user_id,
  COUNT(*) as total_attachments,
  SUM(file_size_bytes) as total_size_bytes,
  COUNT(*) FILTER (WHERE ai_processed = TRUE) as ai_processed_count,
  COUNT(*) FILTER (WHERE document_type = 'invoice') as invoice_count,
  COUNT(*) FILTER (WHERE document_type = 'receipt') as receipt_count,
  COUNT(*) FILTER (WHERE document_type = 'contract') as contract_count,
  COUNT(*) FILTER (WHERE file_extension IN ('jpg', 'jpeg', 'png', 'gif')) as image_count,
  COUNT(*) FILTER (WHERE file_extension = 'pdf') as pdf_count,
  MAX(email_date) as latest_attachment_date
FROM attachments
GROUP BY user_id;

-- View for recently processed attachments
CREATE OR REPLACE VIEW recently_processed_attachments AS
SELECT 
  a.*,
  q.completed_at as processing_completed_at
FROM attachments a
INNER JOIN attachment_processing_queue q ON a.id = q.attachment_id
WHERE 
  q.status = 'completed' 
  AND q.completed_at > NOW() - INTERVAL '7 days'
ORDER BY q.completed_at DESC;

-- ============================================================================
-- STORAGE BUCKETS (Execute via Supabase client or dashboard)
-- ============================================================================

-- Create storage bucket for attachments (execute separately in Supabase)
-- Storage buckets are created via Supabase API/Dashboard, not SQL
--
-- Bucket name: email-attachments
-- Public: false
-- File size limit: 50MB
-- Allowed MIME types: 
--   - application/pdf
--   - image/*
--   - application/msword
--   - application/vnd.openxmlformats-officedocument.*
--   - application/vnd.ms-*
--   - text/*
--
-- RLS Policies for storage:
-- - Users can upload to their own folder (user_id)
-- - Users can read from their own folder
-- - Users can delete from their own folder

-- ============================================================================
-- SAMPLE DATA FOR TESTING (Optional)
-- ============================================================================

-- Uncomment to insert test data
/*
INSERT INTO attachments (
  user_id, 
  email_id, 
  filename, 
  file_extension, 
  mime_type, 
  file_size_bytes,
  storage_path,
  sender_email,
  sender_name,
  email_subject,
  email_date,
  document_type,
  classification_confidence,
  extracted_metadata,
  key_terms,
  ai_processed
) VALUES (
  'YOUR_USER_UUID',
  'SAMPLE_EMAIL_UUID',
  'Invoice_Acme_Corp_2025.pdf',
  'pdf',
  'application/pdf',
  524288,
  'YOUR_USER_UUID/attachments/invoice_123.pdf',
  'billing@acme.com',
  'Acme Corp Billing',
  'Invoice #INV-2025-1234',
  NOW() - INTERVAL '5 days',
  'invoice',
  0.95,
  '{"amount": 2450.00, "currency": "USD", "invoiceNumber": "INV-2025-1234", "dueDate": "2025-11-15", "vendor": "Acme Corp", "isPaid": false}',
  ARRAY['invoice', 'acme corp', 'payment', 'services'],
  TRUE
);
*/

-- ============================================================================
-- MIGRATION ROLLBACK (if needed)
-- ============================================================================

-- DROP VIEW IF EXISTS recently_processed_attachments;
-- DROP VIEW IF EXISTS attachment_stats;
-- DROP TRIGGER IF EXISTS queue_new_attachments ON attachments;
-- DROP TRIGGER IF EXISTS update_queue_updated_at ON attachment_processing_queue;
-- DROP TRIGGER IF EXISTS update_attachments_updated_at ON attachments;
-- DROP FUNCTION IF EXISTS increment_attachment_access(UUID);
-- DROP FUNCTION IF EXISTS queue_attachment_for_processing();
-- DROP FUNCTION IF EXISTS update_updated_at_column();
-- DROP TABLE IF EXISTS attachment_processing_queue CASCADE;
-- DROP TABLE IF EXISTS attachments CASCADE;

