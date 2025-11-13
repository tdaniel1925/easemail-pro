-- Migration: Add calendar and contact sync timestamps to email_accounts
-- Date: 2025-11-13
-- Description: Add lastCalendarSyncAt and lastContactSyncAt columns to track sync times

-- Add calendar sync timestamp
ALTER TABLE email_accounts
ADD COLUMN IF NOT EXISTS last_calendar_sync_at TIMESTAMP;

-- Add contact sync timestamp
ALTER TABLE email_accounts
ADD COLUMN IF NOT EXISTS last_contact_sync_at TIMESTAMP;
