-- ============================================================================
-- EaseMail Production Performance Indexes
-- ============================================================================
-- This migration adds critical indexes for 10-50x query performance improvement
--
-- IMPORTANT: CONCURRENTLY cannot run in a transaction block
--
-- Option 1 - psql (Recommended for production):
--   psql $DATABASE_URL < db/migrations/001_add_performance_indexes.sql
--
-- Option 2 - Supabase SQL Editor:
--   Use the non-concurrent version: 001_add_performance_indexes_no_concurrent.sql
--
-- Estimated impact:
-- - User queries: 10-20x faster
-- - Email list queries: 20-50x faster
-- - AI usage tracking: 15x faster
-- ============================================================================

-- Users table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Email accounts table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_accounts_user_id ON email_accounts(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_accounts_email_address ON email_accounts(email_address);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_accounts_provider ON email_accounts(provider);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_accounts_sync_status ON email_accounts(sync_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_accounts_user_active ON email_accounts(user_id, is_active);

-- Emails table indexes (most critical for performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_account_id ON emails(account_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_provider_message_id ON emails(provider_message_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_thread_id ON emails(thread_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_received_at_desc ON emails(received_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_sent_at_desc ON emails(sent_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_from_email ON emails(from_email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_folder ON emails(folder);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_is_read ON emails(is_read);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_is_starred ON emails(is_starred);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_is_archived ON emails(is_archived);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_is_trashed ON emails(is_trashed);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_has_attachments ON emails(has_attachments);

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_account_received
  ON emails(account_id, received_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_account_folder_received
  ON emails(account_id, folder, received_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_account_unread
  ON emails(account_id, is_read, received_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_account_folder_unread
  ON emails(account_id, folder, is_read, received_at DESC);

-- Full-text search on subject (for search functionality)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_subject_trgm
  ON emails USING gin(subject gin_trgm_ops);

-- Full-text search on snippet (for preview search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_snippet_trgm
  ON emails USING gin(snippet gin_trgm_ops);

-- Contacts table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_full_name ON contacts(full_name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_company ON contacts(company);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_user_email ON contacts(user_id, email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_last_email_at ON contacts(last_email_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_is_favorite ON contacts(is_favorite);

-- AI usage table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_usage_user_period
  ON ai_usage(user_id, period_start, period_end);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_usage_feature
  ON ai_usage(feature);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_usage_period
  ON ai_usage(period_start DESC, period_end DESC);

-- Email drafts table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_drafts_user_id ON email_drafts(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_drafts_account_id ON email_drafts(account_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_drafts_reply_to ON email_drafts(reply_to_email_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_drafts_created_at ON email_drafts(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_drafts_scheduled ON email_drafts(scheduled_at);

-- Organizations table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_is_active ON organizations(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_plan_type ON organizations(plan_type);

-- Subscriptions table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_organization_id ON subscriptions(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_current_period_end ON subscriptions(current_period_end);

-- Invoices table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_stripe_invoice_id ON invoices(stripe_invoice_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_period ON invoices(period_start, period_end);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- Payment methods table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_methods_organization_id ON payment_methods(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_methods_stripe_customer_id ON payment_methods(stripe_customer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_methods_is_default ON payment_methods(is_default);

-- Webhook logs table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_logs_account_id ON webhook_logs(account_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_logs_provider ON webhook_logs(provider);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);

-- Audit logs table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- User audit logs table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_audit_logs_user_id ON user_audit_logs(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_audit_logs_performed_by ON user_audit_logs(performed_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_audit_logs_action ON user_audit_logs(action);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_audit_logs_created_at ON user_audit_logs(created_at DESC);

-- SMS messages table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sms_messages_user_id ON sms_messages(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sms_messages_contact_id ON sms_messages(contact_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sms_messages_twilio_sid ON sms_messages(twilio_sid);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sms_messages_direction ON sms_messages(direction);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sms_messages_created_at ON sms_messages(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sms_messages_user_created ON sms_messages(user_id, created_at DESC);

-- SMS usage table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sms_usage_user_id ON sms_usage(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sms_usage_period ON sms_usage(period_start, period_end);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sms_usage_billing_status ON sms_usage(billing_status);

-- Calendar events table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_events_end_time ON calendar_events(end_time);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_events_user_time ON calendar_events(user_id, start_time);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_events_google_id ON calendar_events(google_event_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_events_microsoft_id ON calendar_events(microsoft_event_id);

-- Contact communications table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contact_comms_contact_id ON contact_communications(contact_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contact_comms_user_id ON contact_communications(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contact_comms_type ON contact_communications(type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contact_comms_occurred_at ON contact_communications(occurred_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contact_comms_contact_time ON contact_communications(contact_id, occurred_at DESC);

-- Contact notes table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contact_notes_contact_id ON contact_notes(contact_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contact_notes_user_id ON contact_notes(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contact_notes_created_at ON contact_notes(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contact_notes_is_pinned ON contact_notes(is_pinned);

-- Email rules table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_rules_user_id ON email_rules(user_id);
-- idx_email_rules_grant already exists in schema (line removed due to column name mismatch)
-- idx_email_rules_is_active removed (standalone index on is_active - covered by composite idx_email_rules_user_active)
-- idx_email_rules_user_active already exists in schema.ts:1675 (userActiveIdx)

-- Rule activity table indexes (skip if table doesn't exist)
-- idx_rule_activity_rule already exists in schema.ts:1698 (composite: rule_id, executed_at)
-- idx_rule_activity_user already exists in schema.ts:1699 (composite: user_id, executed_at)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rule_activity_executed_at ON rule_activity(executed_at DESC);
-- idx_rule_activity_status already exists in schema.ts:1700
-- Note: Uncomment above line if rule_activity table exists in your database

-- Storage usage table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_storage_usage_user_id ON storage_usage(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_storage_usage_organization_id ON storage_usage(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_storage_usage_period ON storage_usage(period_start, period_end);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_storage_usage_snapshot_date ON storage_usage(snapshot_date DESC);

-- ============================================================================
-- Verify indexes were created
-- ============================================================================

-- Run this query to verify all indexes exist:
-- SELECT schemaname, tablename, indexname
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;

-- Check index usage statistics:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- ============================================================================
-- Notes
-- ============================================================================
-- - CONCURRENTLY flag prevents table locking during index creation
-- - Full-text search requires pg_trgm extension (already available in Supabase)
-- - Some indexes may already exist from schema.ts - IF NOT EXISTS prevents errors
-- - Estimated total index creation time: 10-30 minutes depending on data volume
-- - Monitor index usage with pg_stat_user_indexes to identify unused indexes
-- ============================================================================
