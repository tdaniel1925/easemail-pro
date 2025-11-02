-- Migration: Password Reset Tokens Table
-- Purpose: Store secure tokens for custom password reset flow via Resend
-- Bypasses Supabase auth rate limits while maintaining security

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast token lookups
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);

-- Index for user lookups
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- Index for cleanup of expired tokens
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Index for finding unused tokens
CREATE INDEX idx_password_reset_tokens_used_at ON password_reset_tokens(used_at) WHERE used_at IS NULL;

COMMENT ON TABLE password_reset_tokens IS 'Secure tokens for custom password reset flow via Resend';
COMMENT ON COLUMN password_reset_tokens.token IS 'Cryptographically secure random token (32 bytes)';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Token expiration time (default 1 hour)';
COMMENT ON COLUMN password_reset_tokens.used_at IS 'When token was used (NULL if unused)';
COMMENT ON COLUMN password_reset_tokens.ip_address IS 'IP address that requested reset (audit trail)';
COMMENT ON COLUMN password_reset_tokens.user_agent IS 'User agent that requested reset (audit trail)';

