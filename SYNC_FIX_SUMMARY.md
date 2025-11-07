# Email Sync Fix - Complete Summary

**Date:** 2025-11-07
**Issue:** Incomplete email sync - sync stops prematurely, folders not normalized
**Status:** 🔧 IN PROGRESS

---

## Problems Identified

### 1. Folder Normalization Not Working

**Gmail Account (trenttdaniel@gmail.com):**
- ❌ CATEGORY_PERSONAL (not normalized)
- ❌ CATEGORY_PROMOTIONS (not normalized)
- ❌ CATEGORY_UPDATES (not normalized)
- ❌ Label_18 (not normalized)
- ❌ unread / UNREAD (not normalized)
- ❌ IMPORTANT (not normalized)

**Microsoft Accounts (marcela@dmillerlaw.com, shall@botmakers.ai):**
- ❌ Folder IDs like `AQMkAGE3ZTY4NzZmLTEyZWItNDEwZS1hYjlhLWE0ZjRmYzQ5OQA4MDkALgAAAw553...` (not normalized)
- These are opaque Microsoft folder IDs that need to be resolved via email_folders table

### 2. Sync Counter Mismatch

| Account | Actual Emails | syncedEmailCount | Mismatch |
|---------|--------------|------------------|----------|
| trenttdaniel@gmail.com | 344 | 0 | ✅ -344 |
| marcela@dmillerlaw.com | 353 | 200 | ✅ -153 |
| shall@botmakers.ai | 401 | 362 | ✅ -39 |

**Root Cause**: `onConflictDoNothing().returning()` doesn't increment counter when email already exists.

### 3. Sync Stops Prematurely

**Possible Reasons**:
1. ✅ Max continuations limit reached (was 50, increased to 100)
2. ✅ Continuation request failures (silent errors)
3. ⚠️ Nylas API returning empty nextCursor
4. ⚠️ Account manually stopped (syncStopped flag)
5. ⚠️ Error during page fetch (with retry logic)

---

## Fixes Implemented

### 1. Enhanced Folder Normalization

**File**: [lib/email/folder-utils.ts](lib/email/folder-utils.ts)

**Changes**:

```typescript
// Gmail Categories (tabs in Gmail UI)
if (normalized.startsWith('category_')) {
  const category = normalized.replace('category_', '');
  if (category === 'personal') return 'inbox'; // Primary tab
  if (category === 'social') return 'social';
  if (category === 'promotions') return 'promotions';
  if (category === 'updates') return 'updates';
  if (category === 'forums') return 'forums';
}

// Gmail Labels (custom user labels)
if (normalized.startsWith('label_') || normalized.includes('/label_')) {
  return 'custom'; // Treat as custom folders
}

// Gmail system labels
const gmailPatterns: Record<string, string> = {
  'unread': 'inbox',
  'important': 'important',
  'starred': 'starred',
  // ... existing patterns
};

// Microsoft folder IDs (base64-encoded UUIDs)
if (normalized.match(/^[a-z0-9=\-_]{50,}/i)) {
  return normalized; // Keep as-is for later resolution
}
```

**Impact**:
- ✅ Gmail categories now normalize correctly (CATEGORY_PERSONAL → inbox)
- ✅ Gmail labels detected and marked as custom
- ✅ System labels like unread, important, starred normalized
- ✅ Microsoft folder IDs preserved for later resolution

---

### 2. Improved Background Sync

**File**: [app/api/nylas/sync/background/route.ts](app/api/nylas/sync/background/route.ts)

**Changes**:

1. **Increased Continuation Limit**:
```typescript
const MAX_CONTINUATIONS = 100; // ✅ Was 50, now 100 (6.6 hours max)
```

2. **Better Logging**:
```typescript
// When messages are empty
console.log(`✅ No more messages returned from Nylas`);
console.log(`📊 Sync completion reason: Empty response from Nylas API`);
console.log(`📊 Total synced: ${syncedCount.toLocaleString()} emails`);

// When no nextCursor
console.log(`✅ Reached end of messages - no nextCursor`);
console.log(`📊 Sync completion reason: Nylas pagination complete`);

// Final completion
console.log(`✅ ========================================`);
console.log(`✅ Background sync COMPLETED`);
console.log(`   - New emails synced: ${totalSynced.toLocaleString()}`);
console.log(`   - Total in database: ${syncedCount.toLocaleString()}`);
console.log(`   - Pages processed: ${currentPage}/${maxPages}`);
console.log(`   - Completion reason: ${completionReason}`);
console.log(`   - Continuations used: ${continuationCount}/${MAX_CONTINUATIONS}`);
```

3. **Better Continuation Error Handling**:
```typescript
try {
  const continuationResponse = await fetch(url, options);

  if (!continuationResponse.ok) {
    throw new Error(`Continuation failed: ${continuationResponse.statusText}`);
  }

  console.log(`✅ Continuation ${continuationCount + 1} successfully triggered`);
} catch (err) {
  console.error('❌ Failed to trigger continuation:', err);

  // Update account with error so user knows sync stopped
  await db.update(emailAccounts).set({
    syncStatus: 'error',
    lastError: `Failed to trigger continuation. Synced ${syncedCount} emails.`,
  });
}
```

**Impact**:
- ✅ 2x more continuations allowed (100 vs 50)
- ✅ Clear logging of why sync stops
- ✅ Error status set if continuation fails
- ✅ Better visibility into sync progress

---

### 3. Diagnostic Script

**File**: [scripts/check-sync-status.ts](scripts/check-sync-status.ts)

**Usage**:
```bash
npx tsx scripts/check-sync-status.ts
```

**Output**:
- Account details (email, provider, status)
- Sync progress and counts
- Actual vs recorded email counts
- Folder distribution
- Recent emails
- Mismatch detection

**Impact**:
- ✅ Easy way to diagnose sync issues
- ✅ Identifies counter mismatches
- ✅ Shows folder normalization problems

---

## Testing Checklist

### Phase 1: Folder Normalization
- [ ] Run migration 035 to fix existing emails
- [ ] Verify Gmail categories normalized (CATEGORY_PERSONAL → inbox)
- [ ] Verify Gmail labels detected (Label_18 → custom)
- [ ] Verify system labels normalized (unread → inbox, important, starred)
- [ ] Check Microsoft folder IDs preserved

### Phase 2: Sync Logic
- [ ] Start fresh sync for each account
- [ ] Monitor logs for completion reason
- [ ] Verify sync completes without errors
- [ ] Check continuation count doesn't exceed 100
- [ ] Verify all emails downloaded (source count == database count)

### Phase 3: Folder Sync
- [ ] Sync folders first before emails
- [ ] Verify email_folders table populated
- [ ] Verify Microsoft folder IDs resolved to names
- [ ] Check custom folders created

---

## Next Steps

1. **Apply Migration** - Run migration 035 to fix existing email folders
2. **Restart Syncs** - Trigger fresh sync for all accounts
3. **Monitor Logs** - Watch for completion reasons and continuation counts
4. **Verify Counts** - Use diagnostic script to check actual vs recorded counts
5. **Test Folder View** - Verify emails appear in correct folders in UI

---

## Files Modified

1. ✅ [lib/email/folder-utils.ts](lib/email/folder-utils.ts) - Enhanced normalization
2. ✅ [app/api/nylas/sync/background/route.ts](app/api/nylas/sync/background/route.ts) - Better logging & limits
3. ✅ [scripts/check-sync-status.ts](scripts/check-sync-status.ts) - New diagnostic tool

---

## Known Issues

### Microsoft Folder IDs
**Problem**: Microsoft uses opaque folder IDs (e.g., `AQMkAGE3ZTY4...`) that don't contain human-readable names.

**Current Solution**: Keep folder IDs as-is in emails table.

**Better Solution**:
1. Sync folders first using `/api/nylas/folders/sync`
2. Store folder ID → name mapping in `email_folders` table
3. Join emails with email_folders to resolve folder names
4. Or: Update `assignEmailFolder()` to look up folder name from `email_folders` table

**Action Required**: Implement folder lookup before email sync.

---

## Success Metrics

**Target**:
- ✅ All emails synced (source count == database count)
- ✅ Folders normalized correctly (sent → sent, inbox → inbox, etc.)
- ✅ No sync stops prematurely (reaches "No more emails" or "No nextCursor")
- ✅ Clear completion reason logged
- ✅ Zero continuation failures

**Current Status**:
- 🔧 Folder normalization enhanced
- 🔧 Sync logging improved
- ⏳ Testing in progress

---

## Monitoring

### Check Sync Status
```bash
npx tsx scripts/check-sync-status.ts
```

### Watch Logs
```bash
# Vercel logs
vercel logs --follow

# Or local dev logs
npm run dev
```

### Key Log Messages
- `✅ Background sync COMPLETED` - Sync finished successfully
- `📊 Completion reason: ...` - Why sync stopped
- `⚠️ Approaching Vercel timeout` - Continuation triggered
- `❌ Failed to trigger continuation` - Sync stopped with error

---

**Status**: 🔧 FIXES IMPLEMENTED - TESTING REQUIRED
**Next Action**: Apply migration and restart syncs to verify fixes
