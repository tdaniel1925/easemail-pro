# 🔍 Sync Diagnostic - Why Only 39 Emails After 15 Minutes?

## Run These Diagnostics in Browser Console

### 1. Check Current Sync Status

Open www.easemail.app/accounts-v3 → Press F12 → Console → Run:

```javascript
// Check account sync status
fetch('/api/nylas/sync/metrics?accountId=b86a2dcc-e24c-46ef-8f5c-7b819d14dce1')
  .then(r => r.json())
  .then(data => {
    console.log('📊 SYNC METRICS:', data.metrics);
    console.log('');
    console.log('Status:', data.metrics.syncStatus);
    console.log('Progress:', data.metrics.syncProgress + '%');
    console.log('Synced:', data.metrics.syncedEmailCount);
    console.log('Total:', data.metrics.totalEmailCount || 'Unknown');
    console.log('Rate:', data.metrics.emailsPerMinute + '/min');
    console.log('Page:', data.metrics.currentPage + '/' + data.metrics.maxPages);
    console.log('Last Error:', data.metrics.lastError || 'None');
    console.log('Has Cursor:', data.metrics.hasSyncCursor);
    console.log('Continuations:', data.metrics.continuationCount);
  });
```

### 2. Check Background Sync Status

```javascript
// Check if background sync is actually running
fetch('/api/nylas/sync/background?accountId=b86a2dcc-e24c-46ef-8f5c-7b819d14dce1')
  .then(r => r.json())
  .then(data => {
    console.log('🔄 BACKGROUND SYNC STATUS:', data);
  });
```

### 3. Check Database Email Count

```javascript
// See how many emails are actually in the database
fetch('/api/nylas/accounts/b86a2dcc-e24c-46ef-8f5c-7b819d14dce1/stats')
  .then(r => r.json())
  .then(data => {
    console.log('📧 DATABASE STATS:', data);
    console.log('Emails in DB:', data.emailCount);
    console.log('Folders:', data.folderCount);
  });
```

### 4. Check Vercel Logs

Go to **Vercel Dashboard** → Your Project → Deployments → Latest → View Function Logs

Look for:
- `📧 Starting background email sync`
- `📊 Progress:` messages
- `❌` errors
- `⏰ Approaching Vercel timeout` messages

---

## Common Issues & Fixes

### Issue 1: Sync Never Started
**Symptoms:** 
- `syncStatus: 'idle'`
- `syncedEmailCount: 0` or stuck at low number
- No logs in Vercel

**Fix:** Run this to start sync:
```javascript
fetch('/api/nylas/sync/background', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ accountId: 'b86a2dcc-e24c-46ef-8f5c-7b819d14dce1' })
}).then(r => r.json()).then(console.log);
```

---

### Issue 2: Sync Stuck in Continuation Loop
**Symptoms:**
- `continuationCount: 5+`
- Progress not increasing
- `syncStatus: 'background_syncing'`

**Fix:** The sync hits Vercel timeout and should auto-continue, but might be stuck. Reset and restart:

**In Supabase SQL Editor:**
```sql
UPDATE email_accounts 
SET 
  sync_status = 'idle',
  continuation_count = 0,
  sync_cursor = NULL
WHERE id = 'b86a2dcc-e24c-46ef-8f5c-7b819d14dce1';
```

Then restart sync (use command from Issue 1).

---

### Issue 3: Rate Limiting
**Symptoms:**
- `lastError` contains "rate limit" or "429"
- Very slow progress
- Long gaps between updates

**What's happening:** Gmail is throttling your requests.

**Fix:** Wait 5-10 minutes, then check again. The sync has built-in retry logic with exponential backoff.

---

### Issue 4: Account Not Reset Properly
**Symptoms:**
- Shows 39 emails but you deleted everything
- `initialSyncCompleted: true`
- Not fetching historical emails

**Fix:** Complete reset:

**In Supabase SQL Editor:**
```sql
-- 1. Delete ALL emails
DELETE FROM emails WHERE account_id = 'b86a2dcc-e24c-46ef-8f5c-7b819d14dce1';

-- 2. Complete reset
UPDATE email_accounts 
SET 
  sync_cursor = NULL,
  initial_sync_completed = false,
  last_synced_at = NULL,
  synced_email_count = 0,
  sync_progress = 0,
  total_email_count = 0,
  sync_status = 'idle',
  retry_count = 0,
  last_error = NULL,
  metadata = NULL,
  continuation_count = 0
WHERE id = 'b86a2dcc-e24c-46ef-8f5c-7b819d14dce1';

-- 3. Verify
SELECT 
  email_address,
  sync_status,
  initial_sync_completed,
  synced_email_count,
  (SELECT COUNT(*) FROM emails WHERE account_id = email_accounts.id) as actual_email_count
FROM email_accounts 
WHERE id = 'b86a2dcc-e24c-46ef-8f5c-7b819d14dce1';
```

Should show:
- `sync_status`: idle
- `initial_sync_completed`: false
- `synced_email_count`: 0
- `actual_email_count`: 0

---

### Issue 5: Wrong Sync Endpoint
**Symptoms:**
- Only synced 200-300 emails
- Stopped after first batch
- `initialSyncCompleted: true` after just a few minutes

**What happened:** You used `/api/nylas/messages` POST instead of `/api/nylas/sync/background` POST.

**The difference:**
- `/api/nylas/messages` POST → Syncs ONE batch (200 emails max)
- `/api/nylas/sync/background` POST → Syncs EVERYTHING (up to 200,000 emails)

**Fix:** Use the correct endpoint:
```javascript
// ✅ CORRECT - Background sync (continues until done)
fetch('/api/nylas/sync/background', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ accountId: 'b86a2dcc-e24c-46ef-8f5c-7b819d14dce1' })
}).then(r => r.json()).then(console.log);
```

---

### Issue 6: `SYNC_HISTORY_DAYS` Not Set
**Symptoms:**
- Only recent emails synced
- Missing emails from months/years ago

**Check in Vercel:**
1. Settings → Environment Variables
2. Look for `SYNC_HISTORY_DAYS`
3. Should be set to `0`

If missing or wrong:
1. Add/Update: `SYNC_HISTORY_DAYS` = `0`
2. **Redeploy** your app
3. Reset sync (use Issue 4 fix)
4. Restart sync (use Issue 1 fix)

---

## Expected Behavior

After 15 minutes of syncing, you should see:

```
📊 SYNC METRICS:
Status: background_syncing
Progress: 25%
Synced: 7,500
Rate: 500/min
Page: 38/1000
Last Error: None
Has Cursor: true
Continuations: 1-2
```

**If you see:**
- `Synced: 39` → Something is wrong!
- `Status: completed` after 15min → Only synced a small batch
- `Status: error` → Check the error message
- `Status: idle` → Sync never started

---

## Next Steps

1. Run diagnostic #1, #2, #3 above
2. Paste results here
3. Check Vercel logs for errors
4. I'll tell you exactly what's wrong and how to fix it

---

## Quick Reset & Restart (If All Else Fails)

```sql
-- In Supabase
DELETE FROM emails WHERE account_id = 'b86a2dcc-e24c-46ef-8f5c-7b819d14dce1';
UPDATE email_accounts SET sync_cursor = NULL, initial_sync_completed = false, synced_email_count = 0, sync_status = 'idle', continuation_count = 0 WHERE id = 'b86a2dcc-e24c-46ef-8f5c-7b819d14dce1';
```

```javascript
// In Browser Console
fetch('/api/nylas/sync/background', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ accountId: 'b86a2dcc-e24c-46ef-8f5c-7b819d14dce1' })
}).then(r => r.json()).then(console.log);
```

Then wait and watch the progress bar!

