-- Create Cal.com integration tables

-- Table to store user's Cal.com API credentials
CREATE TABLE IF NOT EXISTS calcom_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL, -- Encrypted Cal.com API key
  api_key_label TEXT, -- User-friendly label for the API key
  webhook_secret TEXT, -- Secret for verifying webhook authenticity
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id) -- One Cal.com connection per user
);

-- Table to store Cal.com bookings/events
CREATE TABLE IF NOT EXISTS calcom_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calcom_connection_id UUID NOT NULL REFERENCES calcom_connections(id) ON DELETE CASCADE,

  -- Cal.com booking data
  booking_id INTEGER NOT NULL, -- Cal.com booking ID
  booking_uid TEXT NOT NULL, -- Cal.com booking UID
  event_type_id INTEGER NOT NULL,
  event_type_title TEXT NOT NULL,

  -- Booking details
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL, -- ACCEPTED, CANCELLED, PENDING, REJECTED

  -- Organizer
  organizer_name TEXT,
  organizer_email TEXT,
  organizer_timezone TEXT,

  -- Attendees (stored as JSONB array)
  attendees JSONB DEFAULT '[]'::jsonb,

  -- Location
  location TEXT,
  meeting_url TEXT,

  -- Additional data
  custom_inputs JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, booking_uid) -- Prevent duplicate bookings
);

-- Table to store webhook events log
CREATE TABLE IF NOT EXISTS calcom_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  calcom_connection_id UUID REFERENCES calcom_connections(id) ON DELETE CASCADE,

  trigger_event TEXT NOT NULL, -- BOOKING_CREATED, BOOKING_CANCELLED, etc.
  booking_uid TEXT,
  payload JSONB NOT NULL,
  verified BOOLEAN DEFAULT false, -- Whether signature was verified
  processed BOOLEAN DEFAULT false,
  error_message TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_calcom_bookings_user_id ON calcom_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_calcom_bookings_start_time ON calcom_bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_calcom_bookings_status ON calcom_bookings(status);
CREATE INDEX IF NOT EXISTS idx_calcom_bookings_booking_uid ON calcom_bookings(booking_uid);
CREATE INDEX IF NOT EXISTS idx_calcom_webhook_events_user_id ON calcom_webhook_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calcom_webhook_events_processed ON calcom_webhook_events(processed);

-- Enable RLS
ALTER TABLE calcom_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE calcom_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calcom_webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calcom_connections
CREATE POLICY "Users can view their own Cal.com connections"
  ON calcom_connections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Cal.com connections"
  ON calcom_connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Cal.com connections"
  ON calcom_connections
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Cal.com connections"
  ON calcom_connections
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for calcom_bookings
CREATE POLICY "Users can view their own Cal.com bookings"
  ON calcom_bookings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Cal.com bookings"
  ON calcom_bookings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Cal.com bookings"
  ON calcom_bookings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Cal.com bookings"
  ON calcom_bookings
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for calcom_webhook_events
CREATE POLICY "Users can view their own Cal.com webhook events"
  ON calcom_webhook_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert webhook events (for webhook endpoint)
CREATE POLICY "Service role can insert webhook events"
  ON calcom_webhook_events
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- Comments
COMMENT ON TABLE calcom_connections IS 'Stores user Cal.com API credentials and connection settings';
COMMENT ON TABLE calcom_bookings IS 'Stores synchronized Cal.com bookings/events';
COMMENT ON TABLE calcom_webhook_events IS 'Logs all incoming webhook events from Cal.com';

COMMENT ON COLUMN calcom_connections.api_key IS 'Encrypted Cal.com API key (cal_live_ prefix)';
COMMENT ON COLUMN calcom_connections.webhook_secret IS 'Secret for verifying webhook signature (X-Cal-Signature-256)';
COMMENT ON COLUMN calcom_bookings.booking_uid IS 'Cal.com unique booking identifier';
COMMENT ON COLUMN calcom_bookings.attendees IS 'Array of attendee objects with name, email, timezone';
COMMENT ON COLUMN calcom_webhook_events.trigger_event IS 'Type of webhook event (BOOKING_CREATED, BOOKING_CANCELLED, etc.)';
