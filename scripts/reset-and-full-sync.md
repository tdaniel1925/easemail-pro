# 🔄 Complete Reset and Full Sync - Get All 30,000+ Emails

## Problem
Your account currently shows only 276 emails synced, but you have 30,000+ emails in your Gmail account. This happened because:

1. The initial sync used a date filter (probably 7 or 90 days)
2. `initialSyncCompleted` was set to `true`, so subsequent syncs only fetch new emails

## Solution: Complete Reset and Full Sync

### Step 1: Delete All Synced Emails (Clean Slate)

Run this in **Supabase SQL Editor**:

```sql
-- 1. Delete all emails for your account (clean slate)
DELETE FROM emails 
WHERE account_id = 'b86a2dcc-e24c-46ef-8f5c-7b819d14dce1';

-- 2. Completely reset sync status
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

-- 3. Verify the reset
SELECT 
  email_address,
  initial_sync_completed,
  synced_email_count,
  sync_status,
  sync_progress
FROM email_accounts 
WHERE id = 'b86a2dcc-e24c-46ef-8f5c-7b819d14dce1';
```

**Expected Result:**
- `initial_sync_completed`: false
- `synced_email_count`: 0
- `sync_status`: idle
- `sync_progress`: 0

---

### Step 2: Verify Environment Variable

Go to **Vercel Dashboard**:
1. Settings → Environment Variables
2. Confirm `SYNC_HISTORY_DAYS` = `0`
3. If missing or wrong value, set it to `0`
4. **Redeploy** your app

**What this does:** `SYNC_HISTORY_DAYS=0` tells the system to sync ALL historical emails with no date limit.

---

### Step 3: Trigger Background Sync

Open your app at **www.easemail.app/accounts-v3**

Press **F12** to open browser console, then run:

```javascript
// Trigger full background sync with NO date limit
fetch('/api/nylas/sync/background', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    accountId: 'b86a2dcc-e24c-46ef-8f5c-7b819d14dce1'
  })
})
.then(r => r.json())
.then(result => {
  console.log('✅ Full sync started:', result);
  console.log('📊 Watch the progress bar on the Accounts page!');
  console.log('📧 It will fetch ALL 30,000+ emails from your Gmail');
});
```

---

### Step 4: Watch Real-Time Progress! 📊

You'll now see on the **Accounts V3** page:

1. **Live Download Counter:** `2,456 / 30,000` emails downloaded
2. **Progress Bar:** Updates every 2 seconds
3. **Sync Rate:** Shows emails/minute
4. **ETA:** Estimated time remaining
5. **🎉 100% Complete!** message when done

Example progress you'll see:
```
⚡ Downloading emails from server...  45%

    8,234 / 30,000
    emails downloaded

Rate: 234/min | ETA: 15m | Pages: 45/150
```

---

### Step 5: Monitor Progress (Optional)

To see detailed progress in console:

```javascript
// Check every 10 seconds
const monitor = setInterval(async () => {
  const res = await fetch('/api/nylas/sync/metrics?accountId=b86a2dcc-e24c-46ef-8f5c-7b819d14dce1');
  const data = await res.json();
  
  console.log(`📊 ${data.metrics.syncProgress}% | ${data.metrics.syncedEmailCount.toLocaleString()} / ${data.metrics.totalEmailCount > 0 ? data.metrics.totalEmailCount.toLocaleString() : '~30K'} emails`);
  console.log(`⚡ Rate: ${data.metrics.emailsPerMinute}/min | ETA: ${data.metrics.estimatedTimeRemaining || '?'}m`);
  
  if (data.metrics.syncProgress === 100) {
    console.log('🎉🎉🎉 SYNC COMPLETE! All emails downloaded! 🎉🎉🎉');
    clearInterval(monitor);
  }
}, 10000);

// To stop monitoring: clearInterval(monitor);
```

---

## Expected Timeline

Based on typical sync rates:

| Emails | Estimated Time |
|--------|---------------|
| 10,000 | ~10-15 min |
| 30,000 | ~30-45 min |
| 50,000 | ~60-90 min |
| 100,000+ | ~2-3 hours |

**Note:** The background sync will automatically handle:
- Pagination (fetches 200 emails at a time)
- Vercel timeouts (continues in next execution)
- Rate limiting (retries with backoff)
- Duplicate detection (skips already-synced emails)

---

## After Sync Completes

Once you see **"🎉 100% Complete!"**, you'll have:

✅ All 30,000+ emails in your database  
✅ Full search history (search will find emails from years ago)  
✅ All attachments accessible  
✅ Complete conversation threads  
✅ AI summaries for all emails  

**Test it:** Search for something from an old email (1+ years ago) - it should now appear!

---

## Troubleshooting

### "Sync stuck at X%"
- Check browser console for errors
- Refresh the page
- The sync continues in the background even if you close the page

### "Only synced 276 again"
- Did you run Step 1 (DELETE emails)?
- Did you set `SYNC_HISTORY_DAYS=0` in Vercel?
- Did you redeploy after setting the env var?

### "Rate limit errors"
- This is normal for Gmail
- The sync will automatically retry with backoff
- Just wait, it will continue

---

## Quick Checklist

- [ ] Run SQL to delete old emails and reset sync status
- [ ] Verify `SYNC_HISTORY_DAYS=0` in Vercel
- [ ] Redeploy Vercel
- [ ] Run background sync command in browser console
- [ ] Watch progress bar on Accounts page
- [ ] Wait for "100% Complete!"
- [ ] Test search with old emails

---

**Questions?** Check the browser console for detailed logs!

