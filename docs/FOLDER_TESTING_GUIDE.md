# 🧪 Folder System Testing Guide

**Purpose:** Ensure folder syncing works perfectly like Superhuman/Outlook

---

## 🎯 Test Scenarios

### **Test 1: Basic Folder Navigation**

**Steps:**
1. Open app, log in
2. Click on "Inbox" folder
3. Click on "Sent" folder
4. Click on "Drafts" folder
5. Click on a custom folder (if any)

**Expected:**
- ✅ Active folder is highlighted in sidebar
- ✅ Emails displayed match the folder
- ✅ URL updates: `/inbox?folder=sent`
- ✅ Folder counts are accurate
- ✅ No loading delays (< 300ms)

**Actual:**
- [ ] Pass / [ ] Fail

**Notes:**
_________________________

---

### **Test 2: Account Switching**

**Prerequisites:** 2+ email accounts connected

**Steps:**
1. Note current account email (bottom of sidebar)
2. Click account selector
3. Select different account
4. Observe folders update
5. Click on "Sent" folder
6. Verify emails are from the NEW account

**Expected:**
- ✅ Folders clear instantly (no flickering)
- ✅ New account's folders load
- ✅ Emails belong to selected account
- ✅ No emails from previous account appear

**Actual:**
- [ ] Pass / [ ] Fail

**Notes:**
_________________________

---

### **Test 3: Case Sensitivity**

**Prerequisites:** Emails in various folders (INBOX, Sent, SENT, Drafts, etc.)

**Steps:**
1. Open DevTools → Network tab
2. Click "Inbox" folder
3. Check API request: `/api/nylas/messages?accountId=X&folder=inbox`
4. Verify response contains emails
5. Try folders with different cases (Sent vs SENT)

**Expected:**
- ✅ API uses lowercase folder names
- ✅ SQL comparison is case-insensitive
- ✅ All emails load regardless of case

**Actual:**
- [ ] Pass / [ ] Fail

**Notes:**
_________________________

---

### **Test 4: Security Validation**

**Prerequisites:** DevTools open

**Steps:**
1. Open Network tab
2. Click "Inbox" folder
3. Note the API request URL with `accountId=XXXXX`
4. Copy request as cURL
5. Change `accountId` to another user's ID (fake: `00000000-0000-0000-0000-000000000000`)
6. Send request

**Expected:**
- ✅ API returns `403 Forbidden`
- ✅ Error message: "Unauthorized access to account"
- ✅ No emails are returned

**Actual:**
- [ ] Pass / [ ] Fail

**Notes:**
_________________________

---

### **Test 5: Empty Folders**

**Prerequisites:** Account with some folders that have no emails

**Steps:**
1. Click on a folder with no emails (e.g., "Drafts" if empty)
2. Observe UI

**Expected:**
- ✅ Shows empty state: "No emails in this folder"
- ✅ No loading spinner stuck
- ✅ Can navigate to other folders

**Actual:**
- [ ] Pass / [ ] Fail

**Notes:**
_________________________

---

### **Test 6: Folder Counts**

**Prerequisites:** Accounts with unread emails

**Steps:**
1. Note unread count badge on "Inbox" (e.g., "12")
2. Open inbox, mark an email as read
3. Go back to sidebar
4. Verify count decreased (now "11")

**Expected:**
- ✅ Counts reflect unread emails
- ✅ Counts update after marking read (may require refresh for now)

**Actual:**
- [ ] Pass / [ ] Fail

**Notes:**
_________________________

---

### **Test 7: Custom Folders**

**Prerequisites:** Account with custom folders (not system folders)

**Steps:**
1. Look for custom folders in sidebar (below system folders)
2. Click on a custom folder (e.g., "Projects", "Archive")
3. Verify emails load

**Expected:**
- ✅ Custom folders appear after system folders
- ✅ Can click and view emails
- ✅ Active state works

**Actual:**
- [ ] Pass / [ ] Fail

**Notes:**
_________________________

---

### **Test 8: Rapid Folder Switching**

**Steps:**
1. Rapidly click between folders:
   - Inbox → Sent → Inbox → Drafts → Inbox
2. Do this 5-10 times quickly

**Expected:**
- ✅ No crashes or errors
- ✅ Correct emails load each time
- ✅ Active state updates correctly
- ✅ No "flash of wrong content"

**Actual:**
- [ ] Pass / [ ] Fail

**Notes:**
_________________________

---

### **Test 9: Browser Back/Forward**

**Steps:**
1. Click "Inbox" folder
2. Click "Sent" folder
3. Click "Drafts" folder
4. Press browser back button (should go to "Sent")
5. Press browser back button again (should go to "Inbox")
6. Press forward button (should go to "Sent")

**Expected:**
- ✅ URL changes correctly
- ✅ Folder highlighting updates
- ✅ Emails load for correct folder

**Actual:**
- [ ] Pass / [ ] Fail

**Notes:**
_________________________

---

### **Test 10: Window Focus/Blur**

**Steps:**
1. Open app in browser
2. Switch to another app (blur window)
3. Wait 10 seconds
4. Switch back to app (focus window)
5. Observe folders

**Expected:**
- ✅ Folders refresh silently (if needed)
- ✅ No UI disruption
- ✅ Token refresh happens in background

**Actual:**
- [ ] Pass / [ ] Fail

**Notes:**
_________________________

---

## 🔍 Console Debugging

Open DevTools → Console and look for these logs:

### **Good Logs (Expected):**
```
✅ Security validation passed for user: abc123 account: def456
📁 All folders from API: [...]
📬 Fetching emails for account: def456 Query:  Folder: inbox
📧 Fetched emails: 47 for folder: inbox
```

### **Bad Logs (Investigate):**
```
❌ Account not found: def456
❌ Unauthorized: Account does not belong to user
❌ Failed to fetch emails: ...
```

---

## 📊 Test Results Summary

| Test | Pass | Fail | Notes |
|------|------|------|-------|
| 1. Basic Navigation | [ ] | [ ] | |
| 2. Account Switching | [ ] | [ ] | |
| 3. Case Sensitivity | [ ] | [ ] | |
| 4. Security Validation | [ ] | [ ] | |
| 5. Empty Folders | [ ] | [ ] | |
| 6. Folder Counts | [ ] | [ ] | |
| 7. Custom Folders | [ ] | [ ] | |
| 8. Rapid Switching | [ ] | [ ] | |
| 9. Browser Back/Forward | [ ] | [ ] | |
| 10. Window Focus/Blur | [ ] | [ ] | |

**Overall Status:** _____ / 10 passed

---

## 🐛 Bug Report Template

**If any test fails, use this template:**

### Bug Report
**Test Failed:** [Test name]  
**Date:** [Date]  
**Browser:** [Chrome/Firefox/Safari]  
**Account:** [Email address]

**Steps to Reproduce:**
1. ...
2. ...
3. ...

**Expected Behavior:**
...

**Actual Behavior:**
...

**Console Errors:**
```
[Paste console errors here]
```

**Network Errors:**
```
[Paste failed API responses here]
```

**Screenshots:**
[Attach screenshots if applicable]

---

## ✅ Pre-Deployment Checklist

Before deploying to production:

- [ ] All 10 tests pass
- [ ] No console errors
- [ ] Tested with 2+ accounts
- [ ] Tested with Gmail, Outlook, IMAP
- [ ] Tested on Chrome, Firefox, Safari
- [ ] Tested on mobile viewport
- [ ] Security test passed (403 on wrong accountId)
- [ ] Performance: Folders load in < 300ms
- [ ] No memory leaks (test for 10+ minutes of use)
- [ ] Code review complete
- [ ] Documentation updated

---

## 🚀 Post-Deployment Verification

After deploying to production:

1. **Smoke Test (5 minutes):**
   - Log in
   - Switch accounts
   - Navigate folders
   - Verify no errors

2. **Monitor (24 hours):**
   - Check error logs
   - Check performance metrics
   - User feedback

3. **Rollback Plan:**
   ```bash
   git revert HEAD~1
   npm run build
   vercel --prod
   ```

---

**Happy Testing! 🎉**

