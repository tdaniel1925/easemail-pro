-- Migration 039: Fix Calendar Orphaned Events
-- Adds constraints and foreign keys to prevent events without calendar associations
-- Fixes existing orphaned events

-- Step 1: Add nylas_event_id field for native Nylas events
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS nylas_event_id VARCHAR(255);

-- Add index for nylas_event_id lookups
CREATE INDEX IF NOT EXISTS idx_calendar_events_nylas_id ON calendar_events(nylas_event_id);

-- Step 2: Fix orphaned events (events without calendar_id)
-- Assign them to the user's primary calendar, or create a default one if needed

-- First, ensure every user has a primary calendar
DO $$
DECLARE
  user_record RECORD;
  default_calendar_id UUID;
BEGIN
  FOR user_record IN SELECT DISTINCT user_id FROM calendar_events WHERE calendar_id IS NULL
  LOOP
    -- Check if user has a primary calendar
    SELECT id INTO default_calendar_id
    FROM calendars
    WHERE user_id = user_record.user_id
      AND is_primary = true
    LIMIT 1;

    -- If no primary calendar, use any calendar for this user
    IF default_calendar_id IS NULL THEN
      SELECT id INTO default_calendar_id
      FROM calendars
      WHERE user_id = user_record.user_id
      LIMIT 1;
    END IF;

    -- If still no calendar (user has no calendars at all), create a default one
    IF default_calendar_id IS NULL THEN
      INSERT INTO calendars (
        id,
        user_id,
        provider_calendar_id,
        provider,
        name,
        description,
        is_primary,
        sync_enabled,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        user_record.user_id,
        'default-' || user_record.user_id,
        'local',
        'My Calendar',
        'Default calendar for events',
        true,
        true,
        NOW(),
        NOW()
      )
      RETURNING id INTO default_calendar_id;
    END IF;

    -- Update orphaned events to use this calendar
    UPDATE calendar_events
    SET calendar_id = default_calendar_id,
        updated_at = NOW()
    WHERE user_id = user_record.user_id
      AND calendar_id IS NULL;

    RAISE NOTICE 'Fixed orphaned events for user % using calendar %', user_record.user_id, default_calendar_id;
  END LOOP;
END $$;

-- Step 3: Make calendar_id NOT NULL (after fixing orphaned events)
ALTER TABLE calendar_events ALTER COLUMN calendar_id SET NOT NULL;

-- Step 4: Add foreign key constraint to maintain referential integrity
-- Use CASCADE to automatically handle calendar deletions
ALTER TABLE calendar_events
  DROP CONSTRAINT IF EXISTS fk_calendar_events_calendar,
  ADD CONSTRAINT fk_calendar_events_calendar
    FOREIGN KEY (calendar_id)
    REFERENCES calendars(id)
    ON DELETE CASCADE;

-- Step 5: Add index on calendar_id for join performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_calendar_id ON calendar_events(calendar_id);

-- Step 6: Verify the fix
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM calendar_events
  WHERE calendar_id IS NULL;

  IF orphaned_count > 0 THEN
    RAISE WARNING 'Still have % orphaned events - manual intervention needed', orphaned_count;
  ELSE
    RAISE NOTICE 'All orphaned events fixed successfully';
  END IF;
END $$;

-- Migration complete
RAISE NOTICE 'Migration 039: Calendar orphaned events fix completed';
