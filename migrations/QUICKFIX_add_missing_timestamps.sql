-- Quick fix for missing created_at/updated_at columns
-- These should exist but may have been accidentally removed

-- Add created_at and updated_at to organization_members if missing
ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW() NOT NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL;

-- Add created_at to user_audit_logs if missing
ALTER TABLE user_audit_logs
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW() NOT NULL;

-- Verification
SELECT 'organization_members columns:' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'organization_members'
AND column_name IN ('created_at', 'updated_at');

SELECT 'user_audit_logs columns:' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_audit_logs'
AND column_name = 'created_at';
