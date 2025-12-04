-- MS Teams Integration Tables
-- Run this in Supabase SQL Editor

-- MS Graph Accounts (OAuth tokens for MS Teams)
CREATE TABLE IF NOT EXISTS ms_graph_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- MS Graph user info
  ms_user_id VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  user_principal_name VARCHAR(255),

  -- OAuth tokens (encrypted)
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP NOT NULL,
  scopes JSONB,

  -- Connection status
  is_connected BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP,
  last_error TEXT,
  refresh_failures INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  UNIQUE(user_id, ms_user_id)
);

CREATE INDEX IF NOT EXISTS idx_ms_graph_accounts_user_id ON ms_graph_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_ms_graph_accounts_ms_user_id ON ms_graph_accounts(ms_user_id);

-- MS Teams Cache
CREATE TABLE IF NOT EXISTS ms_teams_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ms_account_id UUID NOT NULL REFERENCES ms_graph_accounts(id) ON DELETE CASCADE,

  -- Team info
  ms_team_id VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  web_url TEXT,
  is_archived BOOLEAN DEFAULT false,

  -- Sync metadata
  last_synced_at TIMESTAMP DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  UNIQUE(ms_account_id, ms_team_id)
);

CREATE INDEX IF NOT EXISTS idx_ms_teams_cache_account_id ON ms_teams_cache(ms_account_id);
CREATE INDEX IF NOT EXISTS idx_ms_teams_cache_team_id ON ms_teams_cache(ms_team_id);

-- MS Channels Cache
CREATE TABLE IF NOT EXISTS ms_channels_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_cache_id UUID NOT NULL REFERENCES ms_teams_cache(id) ON DELETE CASCADE,

  -- Channel info
  ms_channel_id VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  web_url TEXT,
  membership_type VARCHAR(50),

  -- Sync metadata
  last_synced_at TIMESTAMP DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  UNIQUE(team_cache_id, ms_channel_id)
);

CREATE INDEX IF NOT EXISTS idx_ms_channels_cache_team_id ON ms_channels_cache(team_cache_id);
CREATE INDEX IF NOT EXISTS idx_ms_channels_cache_channel_id ON ms_channels_cache(ms_channel_id);

-- MS Chats Cache
CREATE TABLE IF NOT EXISTS ms_chats_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ms_account_id UUID NOT NULL REFERENCES ms_graph_accounts(id) ON DELETE CASCADE,

  -- Chat info
  ms_chat_id VARCHAR(255) NOT NULL,
  chat_type VARCHAR(50) NOT NULL,
  topic VARCHAR(255),
  members JSONB,

  -- Last message preview
  last_message_preview TEXT,
  last_message_at TIMESTAMP,
  unread_count INTEGER DEFAULT 0,

  -- Sync metadata
  last_synced_at TIMESTAMP DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  UNIQUE(ms_account_id, ms_chat_id)
);

CREATE INDEX IF NOT EXISTS idx_ms_chats_cache_account_id ON ms_chats_cache(ms_account_id);
CREATE INDEX IF NOT EXISTS idx_ms_chats_cache_chat_id ON ms_chats_cache(ms_chat_id);
CREATE INDEX IF NOT EXISTS idx_ms_chats_cache_last_message ON ms_chats_cache(last_message_at);

-- MS Messages Cache
CREATE TABLE IF NOT EXISTS ms_messages_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ms_account_id UUID NOT NULL REFERENCES ms_graph_accounts(id) ON DELETE CASCADE,

  -- Message location
  chat_cache_id UUID REFERENCES ms_chats_cache(id) ON DELETE CASCADE,
  channel_cache_id UUID REFERENCES ms_channels_cache(id) ON DELETE CASCADE,

  -- Message info
  ms_message_id VARCHAR(255) NOT NULL,
  content_type VARCHAR(50) DEFAULT 'text',
  content TEXT,

  -- Sender info
  sender_user_id VARCHAR(255),
  sender_display_name VARCHAR(255),

  -- Attachments
  has_attachments BOOLEAN DEFAULT false,
  attachments JSONB,

  -- Message metadata
  is_from_me BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  message_date_time TIMESTAMP NOT NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ms_messages_cache_account_id ON ms_messages_cache(ms_account_id);
CREATE INDEX IF NOT EXISTS idx_ms_messages_cache_chat_id ON ms_messages_cache(chat_cache_id);
CREATE INDEX IF NOT EXISTS idx_ms_messages_cache_channel_id ON ms_messages_cache(channel_cache_id);
CREATE INDEX IF NOT EXISTS idx_ms_messages_cache_message_id ON ms_messages_cache(ms_message_id);
CREATE INDEX IF NOT EXISTS idx_ms_messages_cache_datetime ON ms_messages_cache(message_date_time);

-- MS Presence Settings
CREATE TABLE IF NOT EXISTS ms_presence_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ms_account_id UUID NOT NULL REFERENCES ms_graph_accounts(id) ON DELETE CASCADE,

  -- Auto-sync presence
  auto_sync_presence BOOLEAN DEFAULT true,

  -- Custom status
  custom_status_message TEXT,
  custom_status_expiry TIMESTAMP,

  -- Notification preferences
  show_desktop_notifications BOOLEAN DEFAULT true,
  show_badge_count BOOLEAN DEFAULT true,
  play_sound_on_message BOOLEAN DEFAULT true,

  -- Working hours
  working_hours_enabled BOOLEAN DEFAULT false,
  working_hours_start VARCHAR(10),
  working_hours_end VARCHAR(10),
  working_hours_timezone VARCHAR(50),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  UNIQUE(ms_account_id)
);

CREATE INDEX IF NOT EXISTS idx_ms_presence_settings_account_id ON ms_presence_settings(ms_account_id);

-- MS Meetings Cache
CREATE TABLE IF NOT EXISTS ms_meetings_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ms_account_id UUID NOT NULL REFERENCES ms_graph_accounts(id) ON DELETE CASCADE,

  -- Meeting info
  ms_meeting_id VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  start_date_time TIMESTAMP NOT NULL,
  end_date_time TIMESTAMP NOT NULL,
  join_web_url TEXT,

  -- Organizer
  organizer_user_id VARCHAR(255),
  organizer_display_name VARCHAR(255),

  -- Participants
  participants JSONB,

  -- Status
  status VARCHAR(50) DEFAULT 'scheduled',

  -- Sync metadata
  last_synced_at TIMESTAMP DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  UNIQUE(ms_account_id, ms_meeting_id)
);

CREATE INDEX IF NOT EXISTS idx_ms_meetings_cache_account_id ON ms_meetings_cache(ms_account_id);
CREATE INDEX IF NOT EXISTS idx_ms_meetings_cache_meeting_id ON ms_meetings_cache(ms_meeting_id);
CREATE INDEX IF NOT EXISTS idx_ms_meetings_cache_start ON ms_meetings_cache(start_date_time);

-- Enable Row Level Security
ALTER TABLE ms_graph_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ms_teams_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ms_channels_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ms_chats_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ms_messages_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ms_presence_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ms_meetings_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY "Users can access their own MS Graph accounts"
  ON ms_graph_accounts FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Users can access their own MS Teams cache"
  ON ms_teams_cache FOR ALL
  USING (ms_account_id IN (SELECT id FROM ms_graph_accounts WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their own MS Channels cache"
  ON ms_channels_cache FOR ALL
  USING (team_cache_id IN (
    SELECT tc.id FROM ms_teams_cache tc
    JOIN ms_graph_accounts mga ON tc.ms_account_id = mga.id
    WHERE mga.user_id = auth.uid()
  ));

CREATE POLICY "Users can access their own MS Chats cache"
  ON ms_chats_cache FOR ALL
  USING (ms_account_id IN (SELECT id FROM ms_graph_accounts WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their own MS Messages cache"
  ON ms_messages_cache FOR ALL
  USING (ms_account_id IN (SELECT id FROM ms_graph_accounts WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their own MS Presence settings"
  ON ms_presence_settings FOR ALL
  USING (ms_account_id IN (SELECT id FROM ms_graph_accounts WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their own MS Meetings cache"
  ON ms_meetings_cache FOR ALL
  USING (ms_account_id IN (SELECT id FROM ms_graph_accounts WHERE user_id = auth.uid()));
