-- Migration 035: Fix RLS Security Issues
-- Addresses critical security vulnerabilities in Row Level Security policies
-- Date: 2026-01-22

-- =====================================================
-- PART 1: Fix Service Bypass Policies
-- =====================================================
-- Replace dangerous "true" policies with proper JWT claim checks

-- Drop existing overly permissive service policies
DROP POLICY IF EXISTS "Service can insert emails" ON emails;
DROP POLICY IF EXISTS "Service can manage email folders" ON email_folders;
DROP POLICY IF EXISTS "Service can manage sync logs" ON sync_logs;
DROP POLICY IF EXISTS "Service can manage webhook events" ON webhook_events;
DROP POLICY IF EXISTS "Service can manage webhook logs" ON webhook_logs;

-- Create secure service policies that verify service role JWT
CREATE POLICY "Service role can insert emails" ON emails
  FOR INSERT
  WITH CHECK (
    (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
  );

CREATE POLICY "Service role can update emails" ON emails
  FOR UPDATE
  USING (
    (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
  );

CREATE POLICY "Service role can manage email folders" ON email_folders
  FOR ALL
  USING (
    (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
  );

CREATE POLICY "Service role can manage sync logs" ON sync_logs
  FOR ALL
  USING (
    (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
  );

CREATE POLICY "Service role can manage webhook events" ON webhook_events
  FOR ALL
  USING (
    (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
  );

CREATE POLICY "Service role can manage webhook logs" ON webhook_logs
  FOR ALL
  USING (
    (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
  );

-- =====================================================
-- PART 2: Add RLS to Missing Tables
-- =====================================================

-- Enable RLS on tables that were missing it
ALTER TABLE email_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_email_templates ENABLE ROW LEVEL SECURITY;

-- Email Rules Policies
CREATE POLICY "Users can view their email rules" ON email_rules
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their email rules" ON email_rules
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their email rules" ON email_rules
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their email rules" ON email_rules
  FOR DELETE USING (user_id = auth.uid());

-- Rule Executions Policies
CREATE POLICY "Users can view their rule executions" ON rule_executions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service can insert rule executions" ON rule_executions
  FOR INSERT WITH CHECK (
    (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
  );

-- Scheduled Actions Policies
CREATE POLICY "Users can view their scheduled actions" ON scheduled_actions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create scheduled actions" ON scheduled_actions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their scheduled actions" ON scheduled_actions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their scheduled actions" ON scheduled_actions
  FOR DELETE USING (user_id = auth.uid());

-- Email Threads Policies
CREATE POLICY "Users can view their email threads" ON email_threads
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create email threads" ON email_threads
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their email threads" ON email_threads
  FOR UPDATE USING (user_id = auth.uid());

-- Thread Participants Policies
CREATE POLICY "Users can view thread participants" ON thread_participants
  FOR SELECT USING (
    thread_id IN (
      SELECT id FROM email_threads WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage thread participants" ON thread_participants
  FOR ALL USING (
    thread_id IN (
      SELECT id FROM email_threads WHERE user_id = auth.uid()
    )
  );

-- Thread Timeline Events Policies
CREATE POLICY "Users can view thread timeline events" ON thread_timeline_events
  FOR SELECT USING (
    thread_id IN (
      SELECT id FROM email_threads WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create thread timeline events" ON thread_timeline_events
  FOR INSERT WITH CHECK (
    thread_id IN (
      SELECT id FROM email_threads WHERE user_id = auth.uid()
    )
  );

-- SMS Messages Policies
CREATE POLICY "Users can view their SMS messages" ON sms_messages
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create SMS messages" ON sms_messages
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their SMS messages" ON sms_messages
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Service can update SMS status" ON sms_messages
  FOR UPDATE USING (
    (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
  );

-- SMS Conversations Policies
CREATE POLICY "Users can view their SMS conversations" ON sms_conversations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create SMS conversations" ON sms_conversations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their SMS conversations" ON sms_conversations
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their SMS conversations" ON sms_conversations
  FOR DELETE USING (user_id = auth.uid());

-- Email Templates Policies
CREATE POLICY "Users can view their email templates" ON user_email_templates
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create email templates" ON user_email_templates
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their email templates" ON user_email_templates
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their email templates" ON user_email_templates
  FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- PART 3: Performance Indexes for RLS
-- =====================================================

-- Add indexes to support RLS policy lookups efficiently
CREATE INDEX IF NOT EXISTS idx_email_rules_user_id ON email_rules(user_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_rule_executions_user_id ON rule_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_actions_user_id ON scheduled_actions(user_id) WHERE completed = false;
CREATE INDEX IF NOT EXISTS idx_email_threads_user_id ON email_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_thread_participants_thread_id ON thread_participants(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_timeline_events_thread_id ON thread_timeline_events(thread_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_user_id ON sms_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_conversations_user_id ON sms_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_email_templates_user_id ON user_email_templates(user_id);

-- =====================================================
-- PART 4: Add Strategic Performance Indexes
-- =====================================================

-- Unread email counts (missing in audit)
CREATE INDEX IF NOT EXISTS idx_emails_account_is_read ON emails(account_id, is_read) WHERE is_deleted = false AND is_trashed = false;

-- Recently contacted sorting
CREATE INDEX IF NOT EXISTS idx_contacts_user_last_contacted ON contacts(user_id, last_contacted_at DESC) WHERE is_deleted = false;

-- Active email accounts filtering
CREATE INDEX IF NOT EXISTS idx_email_accounts_user_active ON email_accounts(user_id, is_active) WHERE is_active = true;

-- SMS timeline queries
CREATE INDEX IF NOT EXISTS idx_sms_messages_created_at ON sms_messages(created_at DESC);

-- Smart inbox queries
CREATE INDEX IF NOT EXISTS idx_email_threads_priority_needs_reply ON email_threads(ai_priority, needs_reply) WHERE needs_reply = true;

-- Webhook error tracking
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status_created ON webhook_logs(status, created_at DESC) WHERE status = 'error';

-- Attachment queries
CREATE INDEX IF NOT EXISTS idx_attachments_email_date ON attachments(email_id, created_at DESC);

-- =====================================================
-- PART 5: Verify RLS is enabled on all tables
-- =====================================================

-- Contacts V4 tables (if they don't have RLS yet)
ALTER TABLE contacts_v4 ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_communications ENABLE ROW LEVEL SECURITY;

-- Contacts V4 Policies
CREATE POLICY "Users can view their contacts v4" ON contacts_v4
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create contacts v4" ON contacts_v4
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their contacts v4" ON contacts_v4
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their contacts v4" ON contacts_v4
  FOR DELETE USING (user_id = auth.uid());

-- Contact Sync State Policies
CREATE POLICY "Users can view their contact sync state" ON contact_sync_state
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service can manage contact sync state" ON contact_sync_state
  FOR ALL USING (
    (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
  );

-- Contact Sync Logs Policies
CREATE POLICY "Users can view their contact sync logs" ON contact_sync_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service can insert contact sync logs" ON contact_sync_logs
  FOR INSERT WITH CHECK (
    (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
  );

-- Contact Conflicts Policies
CREATE POLICY "Users can view their contact conflicts" ON contact_conflicts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can resolve their contact conflicts" ON contact_conflicts
  FOR UPDATE USING (user_id = auth.uid());

-- Contact Groups Policies
CREATE POLICY "Users can view their contact groups" ON contact_groups
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create contact groups" ON contact_groups
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their contact groups" ON contact_groups
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their contact groups" ON contact_groups
  FOR DELETE USING (user_id = auth.uid());

-- Contact Communications Policies
CREATE POLICY "Users can view their contact communications" ON contact_communications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create contact communications" ON contact_communications
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- SMS Usage Policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sms_usage') THEN
    EXECUTE 'ALTER TABLE sms_usage ENABLE ROW LEVEL SECURITY';

    EXECUTE '
      CREATE POLICY "Users can view their SMS usage" ON sms_usage
        FOR SELECT USING (user_id = auth.uid())
    ';

    EXECUTE '
      CREATE POLICY "Service can track SMS usage" ON sms_usage
        FOR INSERT WITH CHECK (
          (current_setting(''request.jwt.claims'', true)::jsonb->>''role'') = ''service_role''
        )
    ';
  END IF;
END $$;

-- =====================================================
-- PART 6: Add indexes for Contacts V4
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_contacts_v4_user_id ON contacts_v4(user_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_contacts_v4_email ON contacts_v4(email) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_contact_sync_state_user_account ON contact_sync_state(user_id, account_id);
CREATE INDEX IF NOT EXISTS idx_contact_sync_logs_user_id ON contact_sync_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_conflicts_user_id ON contact_conflicts(user_id) WHERE resolution_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_contact_groups_user_id ON contact_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_communications_user_id ON contact_communications(user_id, created_at DESC);
