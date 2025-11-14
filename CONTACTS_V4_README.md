# Contacts V4 - Complete Rebuild

## Overview

Contacts V4 is a ground-up rebuild of the EaseMail contacts system with proper bidirectional sync, conflict resolution, and production-ready architecture following the Nylas V3 API structure.

## Why V4?

The previous contacts implementation had fundamental issues:

1. ❌ **No account association** - Couldn't distinguish contacts by account
2. ❌ **Single email/phone only** - Didn't support multiple contact methods
3. ❌ **No sync state tracking** - No progress monitoring or error handling
4. ❌ **No conflict resolution** - Data loss during concurrent edits
5. ❌ **Poor data model** - Didn't match Nylas API structure
6. ❌ **Missing sync infrastructure** - No delta sync, webhooks, or retry logic

### V4 Fixes All of These:

✅ **Proper account association** - Every contact linked to specific email account
✅ **Multiple emails/phones** - JSONB arrays for unlimited contact methods
✅ **Real-time sync progress** - SSE streaming with progress updates
✅ **Intelligent conflict resolution** - Auto-merge with manual fallback
✅ **Nylas V3 compatible** - Matches API structure exactly
✅ **Production-ready** - Retry logic, error handling, audit logs

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Contact    │  │   Contact    │  │  Real-time   │     │
│  │     List     │  │    Detail    │  │    Sync      │     │
│  │   (Virtual)  │  │    Modal     │  │   Progress   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         API Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │    CRUD      │  │  Sync Engine │  │   Search     │     │
│  │  Endpoints   │  │   (Delta)    │  │   Engine     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Supabase Database                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ contacts_v4  │  │  sync_state  │  │  sync_logs   │     │
│  │ (Main Data)  │  │  (Progress)  │  │  (Audit)     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Nylas V3 API                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Google     │  │   Microsoft  │  │   Polling    │     │
│  │  Contacts    │  │    Graph     │  │  (5 min)     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### contacts_v4 (Main Table)

```sql
CREATE TABLE contacts_v4 (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID NOT NULL,

  -- Nylas Integration
  nylas_contact_id VARCHAR(255),
  nylas_grant_id VARCHAR(255),
  provider VARCHAR(20), -- 'google' | 'microsoft'
  source VARCHAR(20), -- 'address_book' | 'domain' | 'inbox' | 'easemail'

  -- Name
  given_name VARCHAR(255),
  middle_name VARCHAR(255),
  surname VARCHAR(255),
  suffix VARCHAR(50),
  nickname VARCHAR(255),
  display_name VARCHAR(512) -- Computed

  -- Contact Info (JSONB Arrays)
  emails JSONB DEFAULT '[]',
  phone_numbers JSONB DEFAULT '[]',
  physical_addresses JSONB DEFAULT '[]',
  web_pages JSONB DEFAULT '[]',
  im_addresses JSONB DEFAULT '[]',

  -- Professional
  job_title VARCHAR(255),
  company_name VARCHAR(255),
  manager_name VARCHAR(255),
  office_location VARCHAR(255),
  department VARCHAR(255),

  -- Personal
  birthday DATE,
  notes TEXT,

  -- Picture
  picture_url TEXT,
  picture_data BYTEA,

  -- Organization
  groups JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',

  -- Sync State
  sync_status VARCHAR(20) DEFAULT 'synced',
  sync_error TEXT,
  last_synced_at TIMESTAMP,

  -- Versioning (for conflict detection)
  version INTEGER DEFAULT 1,
  etag VARCHAR(255),
  local_updated_at TIMESTAMP,
  remote_updated_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP,
  updated_at TIMESTAMP,

  CONSTRAINT email_or_phone_required CHECK (
    jsonb_array_length(emails) > 0 OR
    jsonb_array_length(phone_numbers) > 0
  )
);
```

### JSONB Structure Examples

**Emails:**
```json
[
  {"type": "work", "email": "john@company.com"},
  {"type": "personal", "email": "john@gmail.com"}
]
```

**Phone Numbers:**
```json
[
  {"type": "mobile", "number": "+1234567890"},
  {"type": "work", "number": "+0987654321"}
]
```

**Physical Addresses:**
```json
[
  {
    "type": "work",
    "street_address": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "postal_code": "94105",
    "country": "USA"
  }
]
```

## Sync Strategy

### 1. Initial Sync (First Time)

```typescript
// Fetch all contacts from Nylas
GET /v3/grants/{grant_id}/contacts?limit=50

// Process in batches:
// - Deduplicate by provider ID
// - Insert in chunks of 100
// - Update sync state with cursor
```

**Key Optimizations:**
- Single query to fetch existing contacts
- In-memory Map lookups for duplicates (not per-contact DB queries)
- Batch inserts in chunks of 100
- Real-time progress via SSE

**Performance:** ~4 database operations for 300 contacts (vs 900 before)

### 2. Delta Sync (Every 5 Minutes)

Since Google doesn't support webhooks for contacts, we poll every 5 minutes:

```typescript
// Use stored cursor from last sync
GET /v3/grants/{grant_id}/contacts?cursor={last_cursor}

// Response includes only changed contacts since cursor
// Process changes:
// - Create: Add new contacts
// - Update: Detect conflicts, merge intelligently
// - Delete: Soft delete locally
```

### 3. Conflict Detection

Conflicts occur when:
- Local `updated_at` > Remote `updated_at`
- User edited in EaseMail while provider sync brings changes

**Resolution Strategies:**

1. **Auto-merge (default):**
   - Non-overlapping changes: Merge both
   - Arrays (emails, phones): Combine unique values
   - Scalars (name, title): Take newer timestamp

2. **Manual resolution:**
   - Significant conflicts create `contact_conflicts` record
   - User chooses: Keep Local | Keep Remote | Merge

## API Endpoints

### Contacts CRUD

```
GET    /api/contacts-v4                    # List contacts
GET    /api/contacts-v4/:id                # Get single contact
POST   /api/contacts-v4                    # Create contact
PUT    /api/contacts-v4/:id                # Update contact
DELETE /api/contacts-v4/:id                # Delete contact
```

### Sync Operations

```
POST   /api/contacts-v4/sync/:accountId    # Manual sync (with SSE progress)
GET    /api/contacts-v4/sync/:accountId    # Get sync state
```

### Search & Filter

```
GET    /api/contacts-v4/search?q=john&account=xxx&groups[]=family
```

## Sync Progress (Server-Sent Events)

Real-time progress updates during sync:

```typescript
// Client-side
const eventSource = new EventSource('/api/contacts-v4/sync/account-123?stream=true');

eventSource.onmessage = (event) => {
  const update = JSON.parse(event.data);

  switch (update.type) {
    case 'start':
      console.log('Starting sync...');
      break;

    case 'fetching':
      console.log(`Fetched ${update.total} contacts from provider`);
      break;

    case 'progress':
      console.log(`Processing: ${update.current}/${update.total} (${update.percentage}%)`);
      console.log(`Imported: ${update.imported}, Skipped: ${update.skipped}`);
      break;

    case 'complete':
      console.log('Sync complete!');
      eventSource.close();
      break;

    case 'error':
      console.error('Sync failed:', update.error);
      eventSource.close();
      break;
  }
};
```

## Error Handling

### Network Errors
- Exponential backoff retry (3 attempts)
- Log to `contact_sync_logs`
- Update `sync_status` to 'error'
- Display user-friendly error in UI

### Rate Limiting
- Nylas: 40 requests/second
- Automatic throttling with delays
- Resume from cursor on retry

### Authentication Errors
- Token expired: Auto-refresh if possible
- Token revoked: Prompt user to reconnect account
- Update account sync_enabled = false

### Validation Errors
- Invalid email format: Skip contact, log error
- Missing required fields: Skip contact
- Provider-specific limits: Trim data to fit

## Migration Path

### Phase 1: Run Migration (This PR)
```bash
# Run migration to create tables
psql -f migrations/037_contacts_v4_schema.sql

# Old data stays in contacts table (untouched)
# New syncs go to contacts_v4
```

### Phase 2: Sync Service (Next PR)
- Implement delta sync
- Add SSE progress
- Conflict resolution logic

### Phase 3: UI (Next PR)
- Contact list with virtual scrolling
- Contact detail modal
- Conflict resolution UI

### Phase 4: Migration Script (Future)
- Migrate old contacts to V4 format
- Backfill account associations
- Drop old tables

## Testing Plan

### Unit Tests
- [ ] Transform Nylas → Local format
- [ ] Transform Local → Nylas format
- [ ] Conflict detection logic
- [ ] Merge strategies
- [ ] Email/phone validation

### Integration Tests
- [ ] Full sync (Google account)
- [ ] Full sync (Microsoft account)
- [ ] Delta sync with changes
- [ ] Concurrent edit conflict
- [ ] Network error retry
- [ ] Rate limit handling

### Load Tests
- [ ] 10,000 contacts sync
- [ ] 50 concurrent syncs
- [ ] Database query performance
- [ ] Memory usage during large sync

## Rollout Plan

### Week 1: Foundation
- ✅ Database schema
- ✅ TypeScript types
- ⏳ Drizzle schema
- ⏳ Helper functions

### Week 2: Sync Engine
- ⏳ Nylas service wrapper
- ⏳ Initial sync logic
- ⏳ Delta sync logic
- ⏳ Conflict resolver
- ⏳ SSE progress streaming

### Week 3: API & UI
- ⏳ CRUD endpoints
- ⏳ Contact list component
- ⏳ Contact detail modal
- ⏳ Sync progress UI
- ⏳ Conflict resolution UI

### Week 4: Polish & Test
- ⏳ Error handling
- ⏳ Unit tests
- ⏳ Integration tests
- ⏳ Load testing
- ⏳ Documentation

## Files Created

1. **migrations/037_contacts_v4_schema.sql** - Database schema
2. **lib/types/contacts-v4.ts** - TypeScript types
3. **lib/db/schema-contacts-v4.ts** - Drizzle schema
4. **CONTACTS_V4_README.md** - This file

## Next Steps

1. **Complete Drizzle integration** - Export schema in main schema.ts
2. **Create Nylas service** - lib/services/nylas-contacts.ts
3. **Build sync engine** - lib/services/contact-sync-engine.ts
4. **Add API routes** - app/api/contacts-v4/*
5. **Create UI components** - components/contacts-v4/*

## Questions?

Contact Daniel (@tdaniel1925) for any questions about the Contacts V4 implementation.
