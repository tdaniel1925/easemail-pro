-- ============================================================================
-- CALENDAR SYSTEM
-- Complete calendar with Google/Microsoft sync support
-- ============================================================================

-- Calendar Events Table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Event Details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location TEXT,
  
  -- Time
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  all_day BOOLEAN DEFAULT false,
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- Recurrence
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT, -- RRULE format (e.g., "FREQ=WEEKLY;BYDAY=MO,WE,FR")
  recurrence_end_date TIMESTAMP,
  parent_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  
  -- Organization
  calendar_type VARCHAR(50) DEFAULT 'personal', -- 'personal', 'work', 'shared'
  color VARCHAR(20) DEFAULT 'blue',
  category VARCHAR(50), -- 'meeting', 'task', 'reminder', 'birthday'
  
  -- Participants
  organizer_email VARCHAR(255),
  attendees JSONB, -- [{email, name, status: 'accepted'/'declined'/'maybe'/'pending'}]
  
  -- Reminders
  reminders JSONB, -- [{type: 'email'/'sms'/'popup', minutes_before: 15}]
  
  -- Google Calendar Sync
  google_event_id VARCHAR(255),
  google_calendar_id VARCHAR(255),
  google_sync_status VARCHAR(50), -- 'synced', 'pending', 'failed', 'local_only'
  google_last_synced_at TIMESTAMP,
  
  -- Microsoft Calendar Sync
  microsoft_event_id VARCHAR(255),
  microsoft_calendar_id VARCHAR(255),
  microsoft_sync_status VARCHAR(50), -- 'synced', 'pending', 'failed', 'local_only'
  microsoft_last_synced_at TIMESTAMP,
  
  -- Metadata
  is_private BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'confirmed', -- 'confirmed', 'tentative', 'cancelled'
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_end_time ON calendar_events(end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_google_id ON calendar_events(google_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_microsoft_id ON calendar_events(microsoft_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_parent ON calendar_events(parent_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_time_range ON calendar_events(start_time, end_time);

-- Calendar Sync State Table (tracks last sync time per user/provider)
CREATE TABLE IF NOT EXISTS calendar_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
  
  provider VARCHAR(50) NOT NULL, -- 'google', 'microsoft'
  calendar_id VARCHAR(255), -- External calendar ID
  
  last_sync_at TIMESTAMP,
  sync_token TEXT, -- Delta sync token
  page_token TEXT, -- Pagination token
  
  sync_status VARCHAR(50) DEFAULT 'idle', -- 'idle', 'syncing', 'completed', 'error'
  last_error TEXT,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id, email_account_id, provider, calendar_id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_sync_user_id ON calendar_sync_state(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_account_id ON calendar_sync_state(email_account_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_provider ON calendar_sync_state(provider);

-- Success message
SELECT 'Calendar system tables created successfully!' as status;

