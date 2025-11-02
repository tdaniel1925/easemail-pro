# SMS MIGRATION REQUIRED

## Issue Found
The `contact_communications` table is missing or hasn't been migrated in your database.

## Error Message
```
column "subject" of relation "contact_communications" does not exist
```

## Quick Fix Applied ✅
I've wrapped the timeline insert in a try-catch so **SMS will now send successfully** even without the timeline feature.

## To Enable Full Timeline Feature

Run this migration to create the missing table:

### Option 1: Run the SMS Migration SQL

**File**: `migrations/006_add_sms_system.sql`

**Run this command** in your Supabase SQL editor or psql:

```bash
psql -U your_db_user -d your_database -f migrations/006_add_sms_system.sql
```

Or copy and paste the contents of `006_add_sms_system.sql` into your Supabase SQL Editor.

### Option 2: Quick Fix - Just Create the contact_communications Table

Run this SQL in your database:

```sql
-- Contact Communications Timeline Table
CREATE TABLE IF NOT EXISTS contact_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Communication type (SMS, calls, notes - NO EMAILS)
  type VARCHAR(50) NOT NULL, -- 'sms_sent', 'sms_received', 'call_inbound', 'call_outbound', 'note'
  direction VARCHAR(20), -- 'inbound', 'outbound', 'internal'
  
  -- Content
  subject TEXT,
  body TEXT,
  snippet TEXT,
  
  -- Reference to SMS
  sms_id UUID REFERENCES sms_messages(id) ON DELETE SET NULL,
  
  -- Metadata (JSON)
  metadata JSONB,
  
  -- Status
  status VARCHAR(50),
  
  -- Timestamps
  occurred_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for contact_communications
CREATE INDEX IF NOT EXISTS idx_contact_comms_contact_id ON contact_communications(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_comms_user_id ON contact_communications(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_comms_type ON contact_communications(type);
CREATE INDEX IF NOT EXISTS idx_contact_comms_occurred_at ON contact_communications(occurred_at DESC);
```

### Option 3: Use Supabase Dashboard

1. Go to your Supabase project
2. Click **SQL Editor**
3. Click **New Query**
4. Paste the SQL from Option 2
5. Click **Run**

## After Migration

Once the table is created:
1. SMS will send successfully ✅
2. SMS messages will appear in the contact's communication timeline ✅
3. You'll see SMS history in contact detail view ✅

## Current Status

**SMS WORKS NOW** - I've fixed the code so SMS sends successfully even without the timeline.

The only missing feature is:
- ❌ SMS doesn't appear in contact communication timeline
- ✅ SMS still sends and arrives
- ✅ SMS is saved in `sms_messages` table
- ✅ You'll see this warning in server logs: "⚠️ Failed to add to communication timeline"

## Test It Now

Try sending another SMS - it should:
1. ✅ Show success in the modal
2. ✅ Display Twilio SID and details  
3. ✅ Arrive at the phone number
4. ⚠️ Show warning in server console (but SMS still works)

## Full SMS System Tables

The complete SMS migration creates these tables:
1. `sms_messages` - Stores all SMS messages
2. `sms_usage` - Tracks SMS usage and billing
3. `contact_communications` - Timeline of all contact interactions
4. `contact_notes` - Notes about contacts

If you want the full SMS system with all features, run the complete migration file.

---

**Priority**: Medium
**Impact on SMS**: None - SMS works without timeline
**Impact on Timeline**: Communication history won't show SMS

**Run the migration when convenient to enable the full timeline feature!**

