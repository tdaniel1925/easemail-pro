-- Migration 035: Fix RLS Security Issues (Safe Version)
-- Addresses critical security vulnerabilities in Row Level Security policies
-- Date: 2026-01-22
-- Only applies policies to tables that exist

-- =====================================================
-- PART 1: Fix Service Bypass Policies
-- =====================================================
DROP POLICY IF EXISTS "Service can insert emails" ON emails;
DROP POLICY IF EXISTS "Service can manage email folders" ON email_folders;
DROP POLICY IF EXISTS "Service can manage sync logs" ON sync_logs;
DROP POLICY IF EXISTS "Service can manage webhook events" ON webhook_events;
DROP POLICY IF EXISTS "Service can manage webhook logs" ON webhook_logs;

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
-- PART 2: Add RLS to Missing Tables (Conditional)
-- =====================================================

-- Email Rules (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_rules') THEN
    EXECUTE 'ALTER TABLE email_rules ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their email rules" ON email_rules';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create their email rules" ON email_rules';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their email rules" ON email_rules';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete their email rules" ON email_rules';
    EXECUTE 'CREATE POLICY "Users can view their email rules" ON email_rules FOR SELECT USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Users can create their email rules" ON email_rules FOR INSERT WITH CHECK (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Users can update their email rules" ON email_rules FOR UPDATE USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Users can delete their email rules" ON email_rules FOR DELETE USING (user_id = auth.uid())';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_email_rules_user_id ON email_rules(user_id) WHERE is_deleted = false';
  END IF;
END $$;

-- Rule Executions (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rule_executions') THEN
    EXECUTE 'ALTER TABLE rule_executions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their rule executions" ON rule_executions';
    EXECUTE 'DROP POLICY IF EXISTS "Service can insert rule executions" ON rule_executions';
    EXECUTE 'CREATE POLICY "Users can view their rule executions" ON rule_executions FOR SELECT USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Service can insert rule executions" ON rule_executions FOR INSERT WITH CHECK ((current_setting(''request.jwt.claims'', true)::jsonb->>''role'') = ''service_role'')';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_rule_executions_user_id ON rule_executions(user_id)';
  END IF;
END $$;

-- Scheduled Actions (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'scheduled_actions') THEN
    EXECUTE 'ALTER TABLE scheduled_actions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their scheduled actions" ON scheduled_actions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create scheduled actions" ON scheduled_actions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their scheduled actions" ON scheduled_actions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete their scheduled actions" ON scheduled_actions';
    EXECUTE 'CREATE POLICY "Users can view their scheduled actions" ON scheduled_actions FOR SELECT USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Users can create scheduled actions" ON scheduled_actions FOR INSERT WITH CHECK (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Users can update their scheduled actions" ON scheduled_actions FOR UPDATE USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Users can delete their scheduled actions" ON scheduled_actions FOR DELETE USING (user_id = auth.uid())';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_scheduled_actions_user_id ON scheduled_actions(user_id) WHERE completed = false';
  END IF;
END $$;

-- Email Threads (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_threads') THEN
    EXECUTE 'ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their email threads" ON email_threads';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create email threads" ON email_threads';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their email threads" ON email_threads';
    EXECUTE 'CREATE POLICY "Users can view their email threads" ON email_threads FOR SELECT USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Users can create email threads" ON email_threads FOR INSERT WITH CHECK (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Users can update their email threads" ON email_threads FOR UPDATE USING (user_id = auth.uid())';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_email_threads_user_id ON email_threads(user_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_email_threads_priority_needs_reply ON email_threads(ai_priority, needs_reply) WHERE needs_reply = true';
  END IF;
END $$;

-- Thread Participants (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'thread_participants') THEN
    EXECUTE 'ALTER TABLE thread_participants ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view thread participants" ON thread_participants';
    EXECUTE 'DROP POLICY IF EXISTS "Users can manage thread participants" ON thread_participants';
    EXECUTE 'CREATE POLICY "Users can view thread participants" ON thread_participants FOR SELECT USING (thread_id IN (SELECT id FROM email_threads WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Users can manage thread participants" ON thread_participants FOR ALL USING (thread_id IN (SELECT id FROM email_threads WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_thread_participants_thread_id ON thread_participants(thread_id)';
  END IF;
END $$;

-- Thread Timeline Events (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'thread_timeline_events') THEN
    EXECUTE 'ALTER TABLE thread_timeline_events ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view thread timeline events" ON thread_timeline_events';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create thread timeline events" ON thread_timeline_events';
    EXECUTE 'CREATE POLICY "Users can view thread timeline events" ON thread_timeline_events FOR SELECT USING (thread_id IN (SELECT id FROM email_threads WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Users can create thread timeline events" ON thread_timeline_events FOR INSERT WITH CHECK (thread_id IN (SELECT id FROM email_threads WHERE user_id = auth.uid()))';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_thread_timeline_events_thread_id ON thread_timeline_events(thread_id)';
  END IF;
END $$;

-- SMS Messages (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sms_messages') THEN
    EXECUTE 'ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their SMS messages" ON sms_messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create SMS messages" ON sms_messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their SMS messages" ON sms_messages';
    EXECUTE 'DROP POLICY IF EXISTS "Service can update SMS status" ON sms_messages';
    EXECUTE 'CREATE POLICY "Users can view their SMS messages" ON sms_messages FOR SELECT USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Users can create SMS messages" ON sms_messages FOR INSERT WITH CHECK (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Users can update their SMS messages" ON sms_messages FOR UPDATE USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Service can update SMS status" ON sms_messages FOR UPDATE USING ((current_setting(''request.jwt.claims'', true)::jsonb->>''role'') = ''service_role'')';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_sms_messages_user_id ON sms_messages(user_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_sms_messages_created_at ON sms_messages(created_at DESC)';
  END IF;
END $$;

-- SMS Conversations (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sms_conversations') THEN
    EXECUTE 'ALTER TABLE sms_conversations ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their SMS conversations" ON sms_conversations';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create SMS conversations" ON sms_conversations';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their SMS conversations" ON sms_conversations';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete their SMS conversations" ON sms_conversations';
    EXECUTE 'CREATE POLICY "Users can view their SMS conversations" ON sms_conversations FOR SELECT USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Users can create SMS conversations" ON sms_conversations FOR INSERT WITH CHECK (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Users can update their SMS conversations" ON sms_conversations FOR UPDATE USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Users can delete their SMS conversations" ON sms_conversations FOR DELETE USING (user_id = auth.uid())';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_sms_conversations_user_id ON sms_conversations(user_id)';
  END IF;
END $$;

-- =====================================================
-- PART 3: Add Strategic Performance Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_emails_account_is_read ON emails(account_id, is_read) WHERE is_deleted = false AND is_trashed = false;
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status_created ON webhook_logs(status, created_at DESC) WHERE status = 'error';

-- Contacts indexes (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'contacts') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_contacts_user_last_contacted ON contacts(user_id, last_contacted_at DESC) WHERE is_deleted = false';
  END IF;
END $$;

-- Email accounts indexes (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_accounts') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_email_accounts_user_active ON email_accounts(user_id, is_active) WHERE is_active = true';
  END IF;
END $$;

-- Attachments indexes (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attachments') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_attachments_email_date ON attachments(email_id, created_at DESC)';
  END IF;
END $$;

-- =====================================================
-- PART 4: Contacts V4 Tables (if they exist)
-- =====================================================

-- Contacts V4
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'contacts_v4') THEN
    EXECUTE 'ALTER TABLE contacts_v4 ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their contacts v4" ON contacts_v4';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create contacts v4" ON contacts_v4';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their contacts v4" ON contacts_v4';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete their contacts v4" ON contacts_v4';
    EXECUTE 'CREATE POLICY "Users can view their contacts v4" ON contacts_v4 FOR SELECT USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Users can create contacts v4" ON contacts_v4 FOR INSERT WITH CHECK (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Users can update their contacts v4" ON contacts_v4 FOR UPDATE USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Users can delete their contacts v4" ON contacts_v4 FOR DELETE USING (user_id = auth.uid())';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_contacts_v4_user_id ON contacts_v4(user_id) WHERE is_deleted = false';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_contacts_v4_email ON contacts_v4(email) WHERE is_deleted = false';
  END IF;
END $$;

-- Contact Sync State
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'contact_sync_state') THEN
    EXECUTE 'ALTER TABLE contact_sync_state ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their contact sync state" ON contact_sync_state';
    EXECUTE 'DROP POLICY IF EXISTS "Service can manage contact sync state" ON contact_sync_state';
    EXECUTE 'CREATE POLICY "Users can view their contact sync state" ON contact_sync_state FOR SELECT USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Service can manage contact sync state" ON contact_sync_state FOR ALL USING ((current_setting(''request.jwt.claims'', true)::jsonb->>''role'') = ''service_role'')';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_contact_sync_state_user_account ON contact_sync_state(user_id, account_id)';
  END IF;
END $$;

-- Contact Sync Logs
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'contact_sync_logs') THEN
    EXECUTE 'ALTER TABLE contact_sync_logs ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their contact sync logs" ON contact_sync_logs';
    EXECUTE 'DROP POLICY IF EXISTS "Service can insert contact sync logs" ON contact_sync_logs';
    EXECUTE 'CREATE POLICY "Users can view their contact sync logs" ON contact_sync_logs FOR SELECT USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Service can insert contact sync logs" ON contact_sync_logs FOR INSERT WITH CHECK ((current_setting(''request.jwt.claims'', true)::jsonb->>''role'') = ''service_role'')';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_contact_sync_logs_user_id ON contact_sync_logs(user_id, created_at DESC)';
  END IF;
END $$;

-- Contact Conflicts
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'contact_conflicts') THEN
    EXECUTE 'ALTER TABLE contact_conflicts ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their contact conflicts" ON contact_conflicts';
    EXECUTE 'DROP POLICY IF EXISTS "Users can resolve their contact conflicts" ON contact_conflicts';
    EXECUTE 'CREATE POLICY "Users can view their contact conflicts" ON contact_conflicts FOR SELECT USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Users can resolve their contact conflicts" ON contact_conflicts FOR UPDATE USING (user_id = auth.uid())';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_contact_conflicts_user_id ON contact_conflicts(user_id) WHERE resolution_status = ''pending''';
  END IF;
END $$;

-- Contact Groups
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'contact_groups') THEN
    EXECUTE 'ALTER TABLE contact_groups ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their contact groups" ON contact_groups';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create contact groups" ON contact_groups';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their contact groups" ON contact_groups';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete their contact groups" ON contact_groups';
    EXECUTE 'CREATE POLICY "Users can view their contact groups" ON contact_groups FOR SELECT USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Users can create contact groups" ON contact_groups FOR INSERT WITH CHECK (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Users can update their contact groups" ON contact_groups FOR UPDATE USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Users can delete their contact groups" ON contact_groups FOR DELETE USING (user_id = auth.uid())';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_contact_groups_user_id ON contact_groups(user_id)';
  END IF;
END $$;

-- Contact Communications
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'contact_communications') THEN
    EXECUTE 'ALTER TABLE contact_communications ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their contact communications" ON contact_communications';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create contact communications" ON contact_communications';
    EXECUTE 'CREATE POLICY "Users can view their contact communications" ON contact_communications FOR SELECT USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Users can create contact communications" ON contact_communications FOR INSERT WITH CHECK (user_id = auth.uid())';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_contact_communications_user_id ON contact_communications(user_id, created_at DESC)';
  END IF;
END $$;

-- SMS Usage
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sms_usage') THEN
    EXECUTE 'ALTER TABLE sms_usage ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their SMS usage" ON sms_usage';
    EXECUTE 'DROP POLICY IF EXISTS "Service can track SMS usage" ON sms_usage';
    EXECUTE 'CREATE POLICY "Users can view their SMS usage" ON sms_usage FOR SELECT USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Service can track SMS usage" ON sms_usage FOR INSERT WITH CHECK ((current_setting(''request.jwt.claims'', true)::jsonb->>''role'') = ''service_role'')';
  END IF;
END $$;

-- Migration complete
SELECT 'Migration 035: RLS security fixes applied successfully' AS status;
