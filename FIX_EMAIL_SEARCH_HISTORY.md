# 🔍 Fix: Search Only Finds Recent Emails

## The Problem
Email search only finds today's/recent emails because **your database only has the last 90 days of emails synced**.

The search works perfectly - it's searching your local database. But older emails were never synced from Nylas into the database yet.

## The Solution: Sync All Historical Emails

### Step 1: Set Environment Variable

Add this to force sync of ALL emails (no time limit):

**In `.env.local` (local development):**
```bash
SYNC_HISTORY_DAYS=0
```

**In Vercel (production):**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add: `SYNC_HISTORY_DAYS` = `0`
3. Click Save
4. Redeploy

**What `0` means:** Sync ALL historical emails with no date filter.

**Other options:**
- `SYNC_HISTORY_DAYS=365` - Last 1 year
- `SYNC_HISTORY_DAYS=730` - Last 2 years  
- `SYNC_HISTORY_DAYS=90` - Last 90 days (current default)

### Step 2: Trigger a Full Resync

**Option A: Via Browser Console**

Open your app, press F12 → Console, and run:

```javascript
// Get your account ID first
fetch('/api/nylas/accounts')
  .then(r => r.json())
  .then(data => {
    console.log('Accounts:', data.accounts);
    const accountId = data.accounts[0].id;
    
    // Trigger full sync
    return fetch('/api/nylas/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        accountId: accountId, 
        limit: 200, 
        fullSync: true 
      })
    });
  })
  .then(r => r.json())
  .then(data => console.log('Sync started:', data));
```

**Option B: Via API Endpoint**

Create a one-time endpoint to trigger sync for all your accounts:

```javascript
// In browser console on your app
fetch('/api/nylas/sync/background', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    accountId: 'YOUR_ACCOUNT_ID_HERE' // Replace with your account ID
  })
}).then(r => r.json()).then(console.log);
```

**Option C: Reset Sync Status (Forces Complete Resync)**

Run this in Supabase SQL Editor:

```sql
-- Reset sync status to force complete resync
UPDATE email_accounts 
SET 
  sync_cursor = NULL,
  initial_sync_completed = false,
  last_synced_at = NULL
WHERE email_address = 'trenttdaniel@gmail.com'; -- Use your email

-- Verify
SELECT email_address, initial_sync_completed, last_synced_at 
FROM email_accounts 
WHERE email_address = 'trenttdaniel@gmail.com';
```

Then visit your inbox - it will automatically start a full sync.

### Step 3: Monitor Progress

Watch the sync progress in your browser console or check:

```javascript
// Check sync status
fetch('/api/nylas/sync/background?accountId=YOUR_ACCOUNT_ID')
  .then(r => r.json())
  .then(data => console.log('Sync status:', data));
```

## How It Works

### Current Behavior (90-day default):
```typescript
// Only syncs last 90 days
const SYNC_HISTORY_DAYS = 90;
const historyStart = Date.now() - (90 * 24 * 60 * 60 * 1000);
// Nylas only returns emails after this date
```

### With SYNC_HISTORY_DAYS=0:
```typescript
// No date filter - syncs ALL emails
if (SYNC_HISTORY_DAYS === 0) {
  console.log('📅 Initial sync - fetching ALL historical emails (no time limit)');
  // No receivedAfter parameter - Nylas returns everything
}
```

## Expected Results

After setting `SYNC_HISTORY_DAYS=0` and resyncing:
- ✅ Search will find emails from years ago
- ✅ All historical emails will be in your inbox
- ✅ Attachments from old emails will appear
- ✅ Complete email history available

## Performance Notes

**Syncing ALL emails may take time depending on your email volume:**
- 1,000 emails: ~1-2 minutes
- 10,000 emails: ~10-15 minutes  
- 50,000 emails: ~45-60 minutes
- 100,000+ emails: May need multiple sync runs

The background sync will automatically paginate and continue until all emails are synced.

## Verify It Worked

After sync completes, test search:

1. Search for something you KNOW is in an old email (from 1+ years ago)
2. It should now appear in search results
3. Check the email count in your inbox - should be much higher

---

**Quick Summary:**
1. Set `SYNC_HISTORY_DAYS=0` in environment variables
2. Redeploy (or restart local server)
3. Trigger a full resync
4. Wait for completion
5. Search now finds ALL your emails! 🎉

