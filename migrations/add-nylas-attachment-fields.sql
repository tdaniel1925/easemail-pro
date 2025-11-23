-- Add Nylas attachment fields for on-demand proxying
-- This allows us to fetch attachments from Nylas instead of storing them

ALTER TABLE attachments
  ADD COLUMN IF NOT EXISTS nylas_attachment_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS nylas_message_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS nylas_grant_id VARCHAR(255);

-- Make storagePath optional (for backwards compatibility with existing records)
ALTER TABLE attachments
  ALTER COLUMN storage_path DROP NOT NULL;

-- Add index for faster Nylas lookups
CREATE INDEX IF NOT EXISTS attachments_nylas_attachment_id_idx ON attachments(nylas_attachment_id);
CREATE INDEX IF NOT EXISTS attachments_nylas_message_id_idx ON attachments(nylas_message_id);

-- For new records, these fields will be required, but we allow NULL for existing records
COMMENT ON COLUMN attachments.nylas_attachment_id IS 'Nylas attachment ID for on-demand fetching';
COMMENT ON COLUMN attachments.nylas_message_id IS 'Nylas message ID containing this attachment';
COMMENT ON COLUMN attachments.nylas_grant_id IS 'Nylas grant ID for API authentication';
