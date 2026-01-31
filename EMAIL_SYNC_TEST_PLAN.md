# Email Sync & Folder Test Plan
**Created:** 2026-01-31
**Purpose:** Verify email syncing and folder assignment fixes are working correctly

---

## 🎯 Test Objective

Verify that all emails sync to the correct folders, including:
- ✅ System folders (Inbox, Sent, Drafts, Trash, Spam)
- ✅ Custom user folders
- ✅ Sent emails from external clients (Gmail web, Outlook web)
- ✅ Emails moved to custom folders

---

## 📋 Pre-Test Checklist

Before running tests, ensure:

```bash
# 1. TypeScript compiles without errors
npx tsc --noEmit

# 2. Migration 040 has been applied
npx tsx scripts/apply-migration-040.ts

# 3. Dev server is running
pnpm dev

# 4. Check current folder distribution (baseline)
npx tsx scripts/debug-folders.ts YOUR_EMAIL@gmail.com
```

---

## 🧪 Test Suite

### **Test 1: Webhook - Sent Email Detection**
**Objective:** Verify sent emails are correctly assigned to "sent" folder

**Steps:**
1. Open Gmail web interface (https://mail.google.com)
2. Send a new email from your connected Gmail account
3. Wait 10-30 seconds for webhook to fire
4. Check EaseMail UI - email should appear in "Sent" folder
5. Check database:
   ```bash
   npx tsx scripts/debug-folders.ts YOUR_EMAIL@gmail.com
   ```

**Expected Result:**
- ✅ Email appears in "Sent" folder in EaseMail
- ✅ Database shows `folder = 'sent'` (NOT `inbox`)
- ✅ Console logs show: `📤 Webhook: Overriding folder "inbox" → "sent" for email from account owner`

**Pass Criteria:** Email is in "sent" folder, not inbox

---

### **Test 2: Webhook - Custom Folder Creation**
**Objective:** Verify custom folders are synced from Nylas to database

**Steps:**
1. Open Gmail web interface
2. Create a new label/folder: "Project Apollo"
3. Assign the new label to an existing email
4. Wait 30-60 seconds for folder webhook
5. Check EaseMail UI - custom folder should appear in sidebar
6. Refresh the page if needed
7. Check database:
   ```bash
   npx tsx scripts/debug-folders.ts YOUR_EMAIL@gmail.com
   ```

**Expected Result:**
- ✅ "Project Apollo" appears in folder sidebar
- ✅ Database shows folder with `folderType = 'custom'`
- ✅ Console logs show: `📁 Folder webhook: Project Apollo (type: custom)`

**Pass Criteria:** Custom folder is visible in UI and database

---

### **Test 3: Webhook - Email in Custom Folder**
**Objective:** Verify emails assigned to custom folders sync correctly

**Steps:**
1. In Gmail web, move an email to your custom folder "Project Apollo"
2. Wait 10-30 seconds for webhook
3. Check EaseMail UI - email should appear under "Project Apollo"
4. Check database:
   ```bash
   npx tsx scripts/debug-folders.ts YOUR_EMAIL@gmail.com
   ```

**Expected Result:**
- ✅ Email appears under "Project Apollo" in EaseMail
- ✅ Database shows correct folder assignment
- ✅ Email count for custom folder > 0

**Pass Criteria:** Email appears in correct custom folder

---

### **Test 4: Bulk Move to Custom Folder**
**Objective:** Verify bulk move operations normalize folder names

**Steps:**
1. In EaseMail UI, select 2-3 emails
2. Click "Move" → Select custom folder "Project Apollo"
3. Check that emails move correctly
4. Verify in database:
   ```bash
   npx tsx scripts/debug-folders.ts YOUR_EMAIL@gmail.com
   ```

**Expected Result:**
- ✅ Emails disappear from current folder
- ✅ Emails appear in "Project Apollo"
- ✅ Database shows normalized folder name
- ✅ Console logs show: `📁 Bulk move: "Project Apollo" → "project apollo"`

**Pass Criteria:** Emails moved successfully without errors

---

### **Test 5: Microsoft Outlook Account**
**Objective:** Verify Microsoft folder IDs are resolved to display names

**Prerequisites:** Connected Microsoft/Outlook account

**Steps:**
1. Connect an Outlook.com account if not already connected
2. Trigger sync for the account
3. Send an email from Outlook web (https://outlook.live.com)
4. Create a custom folder in Outlook
5. Move an email to the custom folder
6. Wait for webhooks
7. Check database:
   ```bash
   npx tsx scripts/debug-folders.ts YOUR_OUTLOOK_EMAIL@outlook.com
   ```

**Expected Result:**
- ✅ Sent email appears in "Sent" folder (NOT inbox)
- ✅ Custom folder appears with display name (NOT base64 ID)
- ✅ Console logs show: `🔍 Resolved Microsoft folder ID "AQMkAD..." → "My Custom Folder"`
- ✅ No emails in database with folder = `AQMkAD...` (base64 string)

**Pass Criteria:** No Microsoft folder IDs in database, all resolved to names

---

### **Test 6: Background Sync - Full Account**
**Objective:** Verify background sync respects folder assignments

**Steps:**
1. Trigger background sync:
   ```bash
   # Make API call to start sync
   curl -X POST http://localhost:3000/api/nylas/sync/background \
     -H "Content-Type: application/json" \
     -d '{"accountId": "YOUR_ACCOUNT_ID"}'
   ```
2. Monitor console logs for folder assignment messages
3. Wait for sync to complete (may take 5-10 minutes for large mailboxes)
4. Check final distribution:
   ```bash
   npx tsx scripts/debug-folders.ts YOUR_EMAIL@gmail.com
   ```

**Expected Result:**
- ✅ All sent emails in "sent" folder
- ✅ Custom folders are synced
- ✅ Emails in custom folders are present
- ✅ No emails with Microsoft folder IDs
- ✅ Console logs show: `📁 Folder assignment sample:` for each page

**Pass Criteria:** All folders correctly populated, no IDs instead of names

---

### **Test 7: Deep Sync - Per-Folder Query**
**Objective:** Verify deep sync catches emails missed by main sync

**Steps:**
1. Create a custom folder with 10+ emails in Gmail
2. Run background sync (it will run deep sync automatically)
3. Monitor console for deep sync messages:
   ```
   🔍 Starting DEEP SYNC - querying individual folders...
   📂 Found X folders to deep sync
   📥 Deep syncing folder: "Your Custom Folder" (ID: ...)
   ```
4. Check database after sync:
   ```bash
   npx tsx scripts/debug-folders.ts YOUR_EMAIL@gmail.com
   ```

**Expected Result:**
- ✅ Console shows deep sync started
- ✅ Custom folder is queried individually
- ✅ Console shows: `✅ DEEP SYNC COMPLETE - Deep sync added X emails that were missed by main sync`
- ✅ All emails from custom folder appear in EaseMail

**Pass Criteria:** Deep sync runs and finds all custom folder emails

---

### **Test 8: Folder Sync Endpoint**
**Objective:** Verify folder sync endpoint handles pagination and custom folders

**Steps:**
1. Call folder sync endpoint:
   ```bash
   curl -X POST "http://localhost:3000/api/nylas/folders/sync?accountId=YOUR_ACCOUNT_ID"
   ```
2. Check response for folder count
3. Check database:
   ```bash
   npx tsx scripts/debug-folders.ts YOUR_EMAIL@gmail.com
   ```

**Expected Result:**
- ✅ Response: `{"success": true, "foldersSynced": X}`
- ✅ All folders synced (including custom ones)
- ✅ Console logs show: `✅ Fetched X folders (Total so far: Y)`
- ✅ Custom folders have `folderType = 'custom'`
- ✅ System folders have correct types (inbox, sent, drafts, etc.)

**Pass Criteria:** All folders synced with correct types

---

### **Test 9: Real-Time SSE Updates**
**Objective:** Verify real-time updates via Server-Sent Events

**Steps:**
1. Open EaseMail in browser
2. Open browser DevTools → Network tab → Filter by "EventStream"
3. Look for SSE connection to `/api/nylas/sync/sse`
4. Send an email from Gmail web
5. Observe network tab for SSE message
6. Check if email appears in UI without refresh

**Expected Result:**
- ✅ SSE connection established
- ✅ Receive event: `event: message.created`
- ✅ Event data contains: `{"type":"message.created","folder":"sent",...}`
- ✅ Email appears in UI within 5 seconds (no manual refresh)

**Pass Criteria:** Real-time updates work without page refresh

---

### **Test 10: Migration 040 Cleanup**
**Objective:** Verify migration fixed historical data

**Steps:**
1. Query database for problematic folders:
   ```sql
   -- Check for Microsoft folder IDs (should be 0)
   SELECT COUNT(*) FROM emails WHERE folder ~ '^[A-Za-z0-9=\-_]{50,}$';

   -- Check for unnormalized Gmail folders (should be 0)
   SELECT COUNT(*) FROM emails WHERE folder LIKE '[Gmail]%';

   -- Check for unnormalized Microsoft folders (should be 0)
   SELECT COUNT(*) FROM emails WHERE folder LIKE 'Sent Items%';
   ```

**Expected Result:**
- ✅ 0 emails with Microsoft folder IDs
- ✅ 0 emails with `[Gmail]/Sent Mail` (should be normalized to `sent`)
- ✅ 0 emails with `Sent Items` (should be normalized to `sent`)

**Pass Criteria:** All historical data normalized

---

## 🔍 Debug Commands

Use these commands during testing:

```bash
# 1. Check account folders and email distribution
npx tsx scripts/debug-folders.ts YOUR_EMAIL@gmail.com

# 2. Check specific account details
npx tsx scripts/check-email-account.ts YOUR_EMAIL@gmail.com

# 3. Tail application logs
# (If using PM2 or similar)
tail -f logs/app.log

# 4. Check database folder table
# (If you have psql access)
psql $DATABASE_URL -c "SELECT display_name, folder_type, unread_count FROM email_folders WHERE account_id = 'YOUR_ACCOUNT_ID';"
```

---

## 📊 Success Criteria Summary

**All tests must pass for the fixes to be considered complete:**

| Test | Criteria | Status |
|------|----------|--------|
| Test 1 | Sent emails → "sent" folder | ⬜ |
| Test 2 | Custom folders appear in UI | ⬜ |
| Test 3 | Emails in custom folders sync | ⬜ |
| Test 4 | Bulk move normalizes folders | ⬜ |
| Test 5 | Microsoft IDs resolved | ⬜ |
| Test 6 | Background sync correct | ⬜ |
| Test 7 | Deep sync finds all emails | ⬜ |
| Test 8 | Folder sync handles pagination | ⬜ |
| Test 9 | Real-time SSE updates work | ⬜ |
| Test 10 | Migration cleaned data | ⬜ |

**Overall Test Status:** ⬜ Not Started / 🟡 In Progress / ✅ Passed / ❌ Failed

---

## 🐛 Known Limitations

1. **IMAP Accounts:** Nylas only stores IMAP messages for 90 days. Historical emails older than 90 days will not sync.

2. **Provider Rate Limits:** Gmail has quota limits. If you hit rate limits during testing, wait 1-2 minutes before retrying.

3. **Webhook Delays:** Webhooks from Gmail/Outlook typically arrive within 10-30 seconds, but can occasionally take up to 2 minutes.

4. **Microsoft Folder IDs:** If folders are created BEFORE folder sync runs, emails may temporarily have folder IDs. Running folder sync will resolve them.

---

## 📞 Troubleshooting

### Issue: Emails still going to inbox instead of sent

**Cause:** Webhook might not be detecting account ownership correctly

**Fix:**
1. Check console logs for: `📤 Webhook: Overriding folder`
2. Verify account email matches: `isFromAccountOwner = true`
3. Check database: `account.emailAddress` field is correct

### Issue: Custom folders not appearing

**Cause:** Folder sync may not have run, or folders not created in Nylas

**Fix:**
1. Call folder sync endpoint: `POST /api/nylas/folders/sync`
2. Check Nylas dashboard for folder list
3. Verify webhook is configured for folder events

### Issue: Microsoft folder IDs in database

**Cause:** Background sync ran before folder sync

**Fix:**
1. Run folder sync: `POST /api/nylas/folders/sync`
2. Re-run background sync to resolve IDs
3. Apply migration 040 again: `npx tsx scripts/apply-migration-040.ts`

### Issue: Deep sync not running

**Cause:** Background sync may have errored before deep sync phase

**Fix:**
1. Check logs for: `🔍 Starting DEEP SYNC`
2. Ensure sync completes without timeout
3. Check for error messages in console

---

## ✅ Test Completion Checklist

After completing all tests, verify:

- [ ] All 10 tests passed
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] No console errors in application
- [ ] Folder distribution looks correct: `npx tsx scripts/debug-folders.ts`
- [ ] Real-time updates working
- [ ] Migration applied successfully
- [ ] No Microsoft folder IDs in database
- [ ] Custom folders syncing correctly
- [ ] Sent emails in "sent" folder

---

## 📝 Report Template

```markdown
# Email Sync Test Results
Date: YYYY-MM-DD
Tester: [Your Name]

## Summary
- Tests Run: X/10
- Tests Passed: Y/10
- Tests Failed: Z/10

## Failed Tests
1. [Test Name]
   - Issue: [Description]
   - Logs: [Relevant log output]
   - Screenshots: [If applicable]

## Notes
[Any additional observations]

## Recommendation
[Pass / Fail / Needs Review]
```

---

**Happy Testing! 🚀**
