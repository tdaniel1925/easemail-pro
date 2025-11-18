# Cal.com Integration Documentation

This document describes the Cal.com calendar integration for EaseMail, which allows users to sync their Cal.com bookings and receive real-time updates via webhooks.

## Features

- ✅ **API Integration**: Fetch bookings from Cal.com API v2
- ✅ **Real-time Webhooks**: Receive instant notifications when bookings are created, cancelled, or rescheduled
- ✅ **Secure Authentication**: API key-based authentication with webhook signature verification
- ✅ **Database Sync**: All bookings are cached in Supabase for fast access
- ✅ **User-friendly UI**: Easy setup through Settings page with visual booking list

## Architecture

### Database Tables

Three tables power the Cal.com integration:

1. **`calcom_connections`**: Stores user API credentials and webhook secrets
2. **`calcom_bookings`**: Caches synchronized bookings from Cal.com
3. **`calcom_webhook_events`**: Logs all incoming webhook events for debugging

### API Endpoints

- **`GET/POST/DELETE /api/calcom/connection`**: Manage Cal.com connection
- **`GET /api/calcom/bookings`**: Fetch and sync bookings from Cal.com
- **`POST /api/calcom/webhook`**: Receive webhook events from Cal.com

### Components

- **`CalcomSettings`**: Main settings UI component
- **`calcom-service.ts`**: Service layer for Cal.com API interactions

## Setup Instructions

### For End Users

1. **Get Cal.com API Key**:
   - Go to [Cal.com Settings → Security → API Keys](https://app.cal.com/settings/developer/api-keys)
   - Click "Create New API Key"
   - Give it a name (e.g., "EaseMail Integration")
   - Copy the API key (starts with `cal_live_` or `cal_test_`)

2. **Connect Cal.com in EaseMail**:
   - Navigate to Settings → Cal.com Calendar
   - Paste your API key
   - (Optional) Add a label to identify this connection
   - (Optional) Set a webhook secret for security
   - Click "Connect Cal.com"

3. **Sync Your Bookings**:
   - Click "Sync Bookings Now" to fetch your latest bookings
   - Your bookings will appear in the Recent Bookings section

4. **Setup Webhooks (Optional but Recommended)**:
   - Copy the Webhook URL shown in the settings
   - Go to [Cal.com Settings → Developer → Webhooks](https://app.cal.com/settings/developer/webhooks)
   - Click "New Webhook"
   - Paste the webhook URL
   - Select events to listen to:
     - BOOKING_CREATED
     - BOOKING_CANCELLED
     - BOOKING_RESCHEDULED
     - BOOKING_REQUESTED
   - Enter your webhook secret (if you set one)
   - Save the webhook

### For Developers

#### Environment Variables

No additional environment variables are required! The integration uses the existing Supabase setup.

#### Database Migration

Run the migration to create the required tables:

```bash
# If using Supabase CLI
npx supabase migration up

# Or apply directly via your migration system
node scripts/run-migration.js supabase/migrations/20250118000001_create_calcom_integration.sql
```

#### Cal.com API Details

- **Base URL**: `https://api.cal.com/v2`
- **API Version Header**: `cal-api-version: 2024-08-13`
- **Authentication**: Bearer token (API key)
- **Rate Limits**:
  - API Key: 120 requests/minute
  - OAuth: 500 requests/minute

## How It Works

### API Polling Mode

1. User clicks "Sync Bookings Now"
2. EaseMail calls Cal.com API with user's API key
3. Bookings are fetched (filtered by status: ACCEPTED, PENDING)
4. Each booking is upserted into `calcom_bookings` table
5. UI updates to show the latest bookings

### Webhook Mode (Real-time)

1. Cal.com sends a POST request to `/api/calcom/webhook` when an event occurs
2. EaseMail verifies the webhook signature using HMAC SHA256
3. Event is logged in `calcom_webhook_events` table
4. If verified, the booking is created/updated in `calcom_bookings`
5. User sees the update in real-time without manual sync

## Webhook Events

Cal.com supports the following webhook events:

- **BOOKING_CREATED**: New booking was created
- **BOOKING_RESCHEDULED**: Existing booking was rescheduled
- **BOOKING_CANCELLED**: Booking was cancelled
- **BOOKING_REJECTED**: Booking was rejected
- **BOOKING_REQUESTED**: Booking requires approval
- **BOOKING_PAID**: Booking was paid
- **BOOKING_NO_SHOW_UPDATED**: No-show status updated
- **MEETING_STARTED**: Meeting started (if using Cal Video)
- **MEETING_ENDED**: Meeting ended (if using Cal Video)
- **RECORDING_READY**: Meeting recording is ready
- **FORM_SUBMITTED**: Form submitted without booking

## Security

### API Key Storage

- API keys are stored encrypted in the `calcom_connections` table
- Row Level Security (RLS) ensures users can only access their own connections

### Webhook Verification

- Webhooks include an `X-Cal-Signature-256` header with HMAC SHA256 signature
- EaseMail verifies this signature against the webhook secret
- Unverified webhooks are logged but not processed

## Database Schema

### calcom_connections

```sql
CREATE TABLE calcom_connections (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  api_key TEXT NOT NULL,           -- Encrypted Cal.com API key
  api_key_label TEXT,              -- User-friendly label
  webhook_secret TEXT,             -- For webhook verification
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### calcom_bookings

```sql
CREATE TABLE calcom_bookings (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  calcom_connection_id UUID REFERENCES calcom_connections(id),
  booking_id INTEGER NOT NULL,     -- Cal.com booking ID
  booking_uid TEXT NOT NULL,       -- Cal.com booking UID
  event_type_id INTEGER,
  event_type_title TEXT,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status TEXT NOT NULL,            -- ACCEPTED, CANCELLED, PENDING, REJECTED
  organizer_name TEXT,
  organizer_email TEXT,
  organizer_timezone TEXT,
  attendees JSONB,                 -- Array of attendee objects
  location TEXT,
  meeting_url TEXT,
  custom_inputs JSONB,
  metadata JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(user_id, booking_uid)
);
```

### calcom_webhook_events

```sql
CREATE TABLE calcom_webhook_events (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  calcom_connection_id UUID REFERENCES calcom_connections(id),
  trigger_event TEXT NOT NULL,     -- Event type
  booking_uid TEXT,
  payload JSONB NOT NULL,          -- Full webhook payload
  verified BOOLEAN DEFAULT false,  -- Signature verified?
  processed BOOLEAN DEFAULT false, -- Successfully processed?
  error_message TEXT,
  created_at TIMESTAMP
);
```

## API Reference

### GET /api/calcom/connection

Get user's Cal.com connection status.

**Response**:
```json
{
  "connected": true,
  "connection": {
    "id": "uuid",
    "label": "My Cal.com Account",
    "isActive": true,
    "lastSynced": "2025-01-18T12:00:00Z",
    "createdAt": "2025-01-18T10:00:00Z"
  }
}
```

### POST /api/calcom/connection

Create or update Cal.com connection.

**Request**:
```json
{
  "apiKey": "cal_live_xxxxx",
  "label": "My Cal.com Account",
  "webhookSecret": "optional-secret-key"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Cal.com connection created successfully",
  "connection": { ... }
}
```

### DELETE /api/calcom/connection

Disconnect Cal.com account (cascades to delete bookings and webhook events).

**Response**:
```json
{
  "success": true,
  "message": "Cal.com disconnected successfully"
}
```

### GET /api/calcom/bookings

Fetch bookings from Cal.com API and sync to database.

**Query Parameters**:
- `fromDb` (boolean): If true, fetch from database instead of API
- `status` (string): Comma-separated status values (ACCEPTED,PENDING)
- `afterStart` (ISO 8601): Filter bookings starting after this date
- `beforeEnd` (ISO 8601): Filter bookings ending before this date

**Response**:
```json
{
  "success": true,
  "source": "api",
  "bookings": [ ... ],
  "count": 10,
  "lastSynced": "2025-01-18T12:00:00Z"
}
```

### POST /api/calcom/webhook

Receive webhook events from Cal.com.

**Headers**:
- `x-cal-signature-256`: HMAC SHA256 signature for verification

**Request**:
```json
{
  "triggerEvent": "BOOKING_CREATED",
  "payload": {
    "uid": "abc123",
    "id": 12345,
    "title": "30 Min Meeting",
    "startTime": "2025-01-20T10:00:00Z",
    "endTime": "2025-01-20T10:30:00Z",
    "status": "ACCEPTED",
    "organizer": { ... },
    "attendees": [ ... ]
  }
}
```

**Response**:
```json
{
  "received": true,
  "processed": true,
  "event": "BOOKING_CREATED"
}
```

## Troubleshooting

### Bookings Not Syncing

1. **Check API Key**: Ensure your API key is valid and starts with `cal_live_` or `cal_test_`
2. **Check Permissions**: API key must have read access to bookings
3. **Check Filters**: Make sure you're not filtering out all bookings with status filters
4. **Check Logs**: Look for errors in the browser console or server logs

### Webhooks Not Working

1. **Verify URL**: Webhook URL must be publicly accessible (not localhost)
2. **Check Secret**: Webhook secret in Cal.com must match the one in EaseMail
3. **Check Events**: Ensure you've subscribed to the correct event types
4. **Check Logs**: Look at `calcom_webhook_events` table for verification failures

### API Rate Limits

- API keys have 120 requests/minute limit
- If you hit the limit, wait 1 minute before retrying
- Consider using webhooks for real-time updates instead of frequent polling

## Future Enhancements

Potential improvements for future versions:

- [ ] Display bookings in email sidebar or calendar view
- [ ] Send email reminders for upcoming bookings
- [ ] Sync booking notes/responses to email
- [ ] Two-way sync: Create Cal.com bookings from EaseMail
- [ ] Support for multiple Cal.com accounts
- [ ] OAuth authentication instead of API keys
- [ ] Recurring event support
- [ ] Team booking support

## Resources

- [Cal.com API Documentation](https://cal.com/docs/api-reference/v2/introduction)
- [Cal.com Webhooks Guide](https://cal.com/docs/developing/guides/automation/webhooks)
- [Cal.com API Keys Setup](https://app.cal.com/settings/developer/api-keys)
- [Cal.com Webhook Settings](https://app.cal.com/settings/developer/webhooks)

## Support

For issues or questions about the Cal.com integration:

1. Check this documentation first
2. Review the troubleshooting section
3. Check the `calcom_webhook_events` table for webhook issues
4. Open an issue in the GitHub repository with:
   - Steps to reproduce
   - Error messages from console/logs
   - Your Cal.com plan type (free/pro/team)
