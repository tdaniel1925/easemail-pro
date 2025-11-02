-- Quick Setup: Password Reset System
-- Run this in Supabase SQL Editor or psql

-- Check if table already exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'password_reset_tokens') THEN
        RAISE NOTICE '✅ Table password_reset_tokens already exists!';
    ELSE
        RAISE NOTICE '⚠️  Table password_reset_tokens does not exist. Creating now...';
        
        -- Create the table
        CREATE TABLE password_reset_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token TEXT UNIQUE NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          used_at TIMESTAMP WITH TIME ZONE,
          ip_address TEXT,
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes
        CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
        CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
        CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
        CREATE INDEX idx_password_reset_tokens_used_at ON password_reset_tokens(used_at) WHERE used_at IS NULL;

        RAISE NOTICE '✅ Table password_reset_tokens created successfully!';
    END IF;
END $$;

-- Verify the table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'password_reset_tokens') 
        THEN '✅ Password reset system is ready!'
        ELSE '❌ Setup failed - please check errors above'
    END as status;

