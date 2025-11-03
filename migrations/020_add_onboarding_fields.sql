-- Migration: Add Onboarding Fields to Users Table
-- Description: Add fields to track user onboarding progress and completion
-- Date: 2024-01-20

-- Add onboarding fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_skipped BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP;

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed ON users(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_users_onboarding_step ON users(onboarding_step);

-- Comment on columns
COMMENT ON COLUMN users.onboarding_completed IS 'Whether user has completed the onboarding tour';
COMMENT ON COLUMN users.onboarding_step IS 'Current onboarding step (0-7): 0=Welcome, 1=ConnectAccount, 2=Signature, 3=AIWrite, 4=VoiceMessage, 5=SMS, 6=Navigation, 7=Complete';
COMMENT ON COLUMN users.onboarding_skipped IS 'Whether user skipped the onboarding tour';
COMMENT ON COLUMN users.onboarding_started_at IS 'Timestamp when user started onboarding';
COMMENT ON COLUMN users.onboarding_completed_at IS 'Timestamp when user completed onboarding';

-- Create help_articles table for tracking views and feedback
CREATE TABLE IF NOT EXISTS help_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  views INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create help_feedback table for tracking individual user feedback
CREATE TABLE IF NOT EXISTS help_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  helpful BOOLEAN NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_help_articles_category ON help_articles(category);
CREATE INDEX IF NOT EXISTS idx_help_articles_views ON help_articles(views DESC);
CREATE INDEX IF NOT EXISTS idx_help_feedback_article ON help_feedback(article_id);
CREATE INDEX IF NOT EXISTS idx_help_feedback_user ON help_feedback(user_id);

-- Comment on help tables
COMMENT ON TABLE help_articles IS 'Tracks view counts and feedback for help articles';
COMMENT ON TABLE help_feedback IS 'Stores individual user feedback on help articles';

