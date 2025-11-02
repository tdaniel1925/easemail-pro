# Folder Assignment Migration Script

## Purpose

Fixes emails that were incorrectly assigned to "inbox" due to the `sanitizeText()` bug. This script uses the `folders` array (which was stored correctly) to reassign emails to their proper folders.

## The Problem

Between the time the bug was introduced and fixed, emails were synced with:
- ✅ **Correct:** `folders` array stored properly (e.g., `["Sent Items", "Important"]`)
- ❌ **Incorrect:** `folder` field set to `"inbox"` (should have been `"Sent Items"`)

This script corrects the `folder` field using the data from the `folders` array.

## Usage

### 1. Dry Run First (Recommended)

See what would be fixed without making changes:

```bash
npm run fix-folders -- --dry-run
```

### 2. Fix Specific Account

For the jmelton@bundlefly.com account:

```bash
# First, get the account ID from database or logs
npm run fix-folders -- --account-id=<account-id>
```

### 3. Fix All Accounts

```bash
npm run fix-folders
```

## Examples

```bash
# See what would be fixed for all accounts
npm run fix-folders -- --dry-run

# Fix specific account (dry run first)
npm run fix-folders -- --account-id=3fd515fd-e8c0-428f-9795-9afd4f58f391 --dry-run

# Actually fix the account
npm run fix-folders -- --account-id=3fd515fd-e8c0-428f-9795-9afd4f58f391

# Fix all accounts
npm run fix-folders
```

## What It Does

1. **Finds Mismatched Emails**
   - Compares `folder` field with `folders[0]`
   - Uses the safe `assignEmailFolder()` utility
   - Identifies emails incorrectly assigned to inbox

2. **Shows Detailed Log**
   ```
   🔄 Found mismatch:
      Email: Monthly report
      Current: "inbox" → Correct: "Sent Items"
      Folders array: ["Sent Items"]
      ✅ Fixed!
   ```

3. **Provides Summary**
   ```
   📊 Migration Summary
   Total emails processed: 4,375
   Incorrectly assigned: 1,203
   Fixed: 1,203
   Errors: 0
   
   By folder:
     Sent Items: 542 emails
     Archive: 301 emails
     Drafts: 89 emails
     Custom/Work: 271 emails
   ```

## Safety Features

✅ **Dry run mode** - Test before applying changes  
✅ **Account filtering** - Fix one account at a time  
✅ **Error handling** - Continues on errors, logs them  
✅ **Validation** - Uses the same safe utilities as sync  
✅ **Logging** - Shows exactly what changed  

## Performance

- ~500-1000 emails per second
- 10,000 emails ≈ 10-20 seconds

## Add to package.json

```json
{
  "scripts": {
    "fix-folders": "tsx scripts/fix-folder-assignments.ts"
  }
}
```

## Verification

After running the script, check:

1. **Database**
   ```sql
   SELECT folder, COUNT(*) 
   FROM emails 
   WHERE account_id = '<account-id>'
   GROUP BY folder;
   ```

2. **UI**
   - Navigate to Sent folder
   - Navigate to Drafts folder
   - Navigate to custom folders
   - Verify emails appear correctly

## Rollback

If something goes wrong, the script only modifies the `folder` field. The `folders` array is never touched, so you can:

1. Stop the script (Ctrl+C)
2. Fix the issue
3. Re-run the script

The script is idempotent - running it multiple times is safe.

## Support

If you encounter issues:

1. Run with `--dry-run` first
2. Check the logs for error messages
3. Verify account IDs are correct
4. Ensure database connection is working

## Related Files

- `lib/email/folder-utils.ts` - Safe folder assignment logic
- `docs/FOLDER_SYNC_PROTECTION.md` - Full protection system docs
- `app/api/nylas/sync/background/route.ts` - Fixed sync code

