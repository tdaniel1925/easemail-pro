-- Migration: Add recipient columns to email_drafts
-- Purpose: Add to, cc, bcc columns for draft recipients
-- Date: 2025-11-04

-- Add recipient columns to email_drafts table
ALTER TABLE email_drafts 
ADD COLUMN IF NOT EXISTS to JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS cc JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS bcc JSONB DEFAULT '[]'::jsonb;

-- Add comments
COMMENT ON COLUMN email_drafts.to IS 'To recipients as JSON array of {email, name}';
COMMENT ON COLUMN email_drafts.cc IS 'CC recipients as JSON array of {email, name}';
COMMENT ON COLUMN email_drafts.bcc IS 'BCC recipients as JSON array of {email, name}';

