-- Add user_activity_logs table for tracking user activities
CREATE TABLE IF NOT EXISTS "user_activity_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,

  -- Activity details
  "activity_type" varchar(100) NOT NULL,
  "activity_name" varchar(255) NOT NULL,
  "path" text,
  "method" varchar(10),

  -- Status and error tracking
  "status" varchar(50) DEFAULT 'success',
  "error_message" text,
  "error_stack" text,
  "is_flagged" boolean DEFAULT false,

  -- Context and metadata
  "metadata" jsonb,
  "duration" integer,

  -- Request details
  "ip_address" varchar(45),
  "user_agent" text,
  "browser" varchar(100),
  "os" varchar(100),
  "device" varchar(100),

  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "activity_logs_user_id_idx" ON "user_activity_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "activity_logs_activity_type_idx" ON "user_activity_logs" ("activity_type");
CREATE INDEX IF NOT EXISTS "activity_logs_status_idx" ON "user_activity_logs" ("status");
CREATE INDEX IF NOT EXISTS "activity_logs_is_flagged_idx" ON "user_activity_logs" ("is_flagged");
CREATE INDEX IF NOT EXISTS "activity_logs_created_at_idx" ON "user_activity_logs" ("created_at");
