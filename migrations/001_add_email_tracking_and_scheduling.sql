-- Email Tracking and Scheduling Migration
-- Generated for manual execution

-- Table: email_tracking_events
-- Tracks email opens, clicks, delivery status, and bounces
CREATE TABLE IF NOT EXISTS "email_tracking_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "email_id" uuid REFERENCES "emails"("id") ON DELETE CASCADE,
  "draft_id" uuid REFERENCES "email_drafts"("id") ON DELETE CASCADE,
  "tracking_id" varchar(255) NOT NULL UNIQUE,
  "recipient_email" varchar(255) NOT NULL,
  "subject" text,
  "opened" boolean DEFAULT false,
  "open_count" integer DEFAULT 0,
  "first_opened_at" timestamp,
  "last_opened_at" timestamp,
  "click_count" integer DEFAULT 0,
  "first_clicked_at" timestamp,
  "last_clicked_at" timestamp,
  "delivered" boolean DEFAULT false,
  "delivered_at" timestamp,
  "bounced" boolean DEFAULT false,
  "bounced_at" timestamp,
  "bounce_reason" text,
  "user_agent" text,
  "ip_address" varchar(45),
  "location" jsonb,
  "device" jsonb,
  "sent_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes for email_tracking_events
CREATE INDEX IF NOT EXISTS "email_tracking_user_id_idx" ON "email_tracking_events" ("user_id");
CREATE INDEX IF NOT EXISTS "email_tracking_email_id_idx" ON "email_tracking_events" ("email_id");
CREATE INDEX IF NOT EXISTS "email_tracking_tracking_id_idx" ON "email_tracking_events" ("tracking_id");
CREATE INDEX IF NOT EXISTS "email_tracking_recipient_idx" ON "email_tracking_events" ("recipient_email");
CREATE INDEX IF NOT EXISTS "email_tracking_sent_at_idx" ON "email_tracking_events" ("sent_at");

-- Table: email_link_clicks
-- Individual click records for each link in tracked emails
CREATE TABLE IF NOT EXISTS "email_link_clicks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tracking_event_id" uuid NOT NULL REFERENCES "email_tracking_events"("id") ON DELETE CASCADE,
  "link_url" text NOT NULL,
  "link_index" integer,
  "clicked_at" timestamp DEFAULT now() NOT NULL,
  "user_agent" text,
  "ip_address" varchar(45),
  "location" jsonb,
  "device" jsonb
);

-- Indexes for email_link_clicks
CREATE INDEX IF NOT EXISTS "email_link_clicks_tracking_event_idx" ON "email_link_clicks" ("tracking_event_id");
CREATE INDEX IF NOT EXISTS "email_link_clicks_clicked_at_idx" ON "email_link_clicks" ("clicked_at");

-- Table: scheduled_emails
-- Emails scheduled for future delivery
CREATE TABLE IF NOT EXISTS "scheduled_emails" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "account_id" uuid NOT NULL REFERENCES "email_accounts"("id") ON DELETE CASCADE,
  "draft_id" uuid REFERENCES "email_drafts"("id") ON DELETE SET NULL,
  "to_recipients" jsonb NOT NULL,
  "cc" jsonb,
  "bcc" jsonb,
  "subject" text,
  "body_html" text,
  "body_text" text,
  "attachments" jsonb,
  "scheduled_for" timestamp NOT NULL,
  "timezone" varchar(50) DEFAULT 'UTC',
  "track_opens" boolean DEFAULT true,
  "track_clicks" boolean DEFAULT true,
  "status" varchar(50) DEFAULT 'pending',
  "sent_at" timestamp,
  "provider_message_id" varchar(255),
  "error_message" text,
  "retry_count" integer DEFAULT 0,
  "max_retries" integer DEFAULT 3,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes for scheduled_emails
CREATE INDEX IF NOT EXISTS "scheduled_emails_user_id_idx" ON "scheduled_emails" ("user_id");
CREATE INDEX IF NOT EXISTS "scheduled_emails_account_id_idx" ON "scheduled_emails" ("account_id");
CREATE INDEX IF NOT EXISTS "scheduled_emails_status_idx" ON "scheduled_emails" ("status");
CREATE INDEX IF NOT EXISTS "scheduled_emails_scheduled_for_idx" ON "scheduled_emails" ("scheduled_for");
CREATE INDEX IF NOT EXISTS "scheduled_emails_sent_at_idx" ON "scheduled_emails" ("sent_at");

-- Comments for documentation
COMMENT ON TABLE "email_tracking_events" IS 'Tracks email opens, clicks, delivery status, and recipient engagement';
COMMENT ON TABLE "email_link_clicks" IS 'Individual click records for links in tracked emails';
COMMENT ON TABLE "scheduled_emails" IS 'Emails scheduled for future delivery via cron job';

COMMENT ON COLUMN "email_tracking_events"."tracking_id" IS 'Unique tracking identifier embedded in email (nanoid 32 chars)';
COMMENT ON COLUMN "email_tracking_events"."location" IS 'Geo location data: {city, region, country}';
COMMENT ON COLUMN "email_tracking_events"."device" IS 'Device info: {type, browser, os}';
COMMENT ON COLUMN "scheduled_emails"."status" IS 'Status: pending, sent, failed, cancelled';
COMMENT ON COLUMN "scheduled_emails"."retry_count" IS 'Number of send attempts made';
