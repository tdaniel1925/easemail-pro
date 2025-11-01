# 🚧 REMAINING EMAIL FEATURES TO BUILD

## ✅ **COMPLETED (Just Built)**

- ✅ Email Sending (compose, reply, reply-all, forward)
- ✅ Save to Sent Folder
- ✅ Draft Saving
- ✅ Attachment Downloads
- ✅ Thread Support
- ✅ Account Selection

---

## 🔴 **HIGH PRIORITY - NOT YET IMPLEMENTED**

### 1. **Attachment Uploads** 📎
**Status:** ❌ Not Implemented  
**Current:** Can download but NOT upload attachments  
**Needs:**
- File upload handler in EmailCompose
- Multipart form data upload to API
- Store attachments during send
- Upload to Nylas/Aurinko storage
- Display uploaded files in compose window
- Remove attachment functionality

**Complexity:** Medium  
**Estimated Time:** 2-4 hours

---

### 2. **Load and Edit Drafts** 📝
**Status:** ❌ Not Implemented  
**Current:** Can save drafts but can't load them back  
**Needs:**
- Drafts folder in sidebar
- List all drafts
- Click to edit draft
- Populate compose window with draft data
- Update draft when editing
- Delete draft after sending

**Complexity:** Medium  
**Estimated Time:** 2-3 hours

---

### 3. **Folder Navigation** 📁
**Status:** ⚠️ Partially Implemented  
**Current:** Can see folders but clicking doesn't filter  
**Needs:**
- Click folder to filter emails by folder
- Update EmailClient to accept folder parameter
- Fetch emails for specific folder
- Show folder name in email list header
- Highlight active folder

**Complexity:** Low  
**Estimated Time:** 1-2 hours

---

## 🟡 **MEDIUM PRIORITY**

### 4. **Contact Auto-complete** 👥
**Status:** ❌ Not Implemented  
**Current:** Must type full email address  
**Needs:**
- Search contacts as user types
- Dropdown with suggestions
- Select contact to auto-fill
- Support multiple recipients
- Chip-style recipient display

**Complexity:** Medium  
**Estimated Time:** 2-3 hours

---

### 5. **Rich Text Editor** ✏️
**Status:** ❌ Not Implemented  
**Current:** Plain text only  
**Needs:**
- HTML WYSIWYG editor
- Bold, italic, underline (buttons exist but don't work)
- Lists, links, images
- Convert to HTML for sending
- Preview mode

**Complexity:** High (or use library like TipTap/Quill)  
**Estimated Time:** 4-6 hours (or 2 hours with library)

---

### 6. **Email Search** 🔍
**Status:** ⚠️ Partially Implemented  
**Current:** UI exists but search doesn't work properly  
**Needs:**
- Full-text search on subject, body, from
- Search endpoint optimization
- Highlight search terms in results
- Filter by date range
- Filter by folder + search

**Complexity:** Medium  
**Estimated Time:** 2-3 hours

---

### 7. **Scheduled Sending** ⏰
**Status:** ❌ Not Implemented  
**Current:** Emails send immediately  
**Needs:**
- Date/time picker in compose
- Queue system (cron job or background worker)
- Store scheduled emails
- Send at specified time
- Cancel scheduled send
- Show scheduled emails in UI

**Complexity:** High  
**Estimated Time:** 6-8 hours

---

## 🟢 **LOW PRIORITY / NICE TO HAVE**

### 8. **Email Templates** 📋
**Status:** ❌ Not Implemented  
**Needs:**
- Create email templates
- Save templates with placeholders
- Load template when composing
- Fill placeholders with data

**Complexity:** Medium  
**Estimated Time:** 3-4 hours

---

### 9. **Undo Send** ↩️
**Status:** ❌ Not Implemented  
**Needs:**
- 5-10 second delay before actual send
- Show "Undo" toast notification
- Cancel send if undo clicked
- Move to drafts instead of sending

**Complexity:** Medium  
**Estimated Time:** 2-3 hours

---

### 10. **Read Receipts** 📨
**Status:** ❌ Not Implemented  
**Needs:**
- Request read receipts on send
- Webhook to receive read notifications
- Show "Read" status on sent emails
- Display read timestamp

**Complexity:** Medium  
**Estimated Time:** 2-3 hours

---

### 11. **Email Tracking** 📊
**Status:** ❌ Not Implemented  
**Needs:**
- Track opens
- Track link clicks
- Show analytics for sent emails
- Dashboard with metrics

**Complexity:** High  
**Estimated Time:** 8-10 hours

---

### 12. **Snooze Emails** ⏱️
**Status:** ❌ Not Implemented  
**Needs:**
- Snooze button on emails
- Select date/time to reappear
- Hide from inbox until time
- Move back to inbox automatically
- Show snoozed folder

**Complexity:** Medium  
**Estimated Time:** 3-4 hours

---

### 13. **Email Labels/Tags** 🏷️
**Status:** ⚠️ Schema exists but no UI  
**Current:** Database has labels field  
**Needs:**
- Create custom labels
- Apply labels to emails
- Filter by labels
- Label management UI
- Color coding

**Complexity:** Medium  
**Estimated Time:** 3-4 hours

---

### 14. **Bulk Email Operations** 📦
**Status:** ✅ Partially Implemented  
**Current:** Delete, archive, mark read work  
**Still Needs:**
- Apply labels in bulk
- Move to folder in bulk
- Forward multiple emails
- Export multiple emails

**Complexity:** Low  
**Estimated Time:** 1-2 hours

---

### 15. **Email Print/Export** 🖨️
**Status:** ❌ Not Implemented  
**Needs:**
- Print email with proper formatting
- Export as PDF
- Export as EML file
- Export multiple emails

**Complexity:** Medium  
**Estimated Time:** 2-3 hours

---

### 16. **Vacation Responder** 🏖️
**Status:** ❌ Not Implemented  
**Needs:**
- Set auto-reply message
- Set start/end dates
- Toggle on/off
- Configure via provider API

**Complexity:** Medium  
**Estimated Time:** 3-4 hours

---

### 17. **Email Filters (Auto-Rules)** 🤖
**Status:** ✅ IMPLEMENTED (Rules System exists!)  
**Current:** Already built in RULES_SYSTEM_COMPLETE.md  
**Action:** ✅ No additional work needed

---

### 18. **Spam Reporting** 🚫
**Status:** ❌ Not Implemented  
**Needs:**
- "Report Spam" button
- Move to spam folder
- Train spam filter
- Unspam functionality

**Complexity:** Low  
**Estimated Time:** 1-2 hours

---

## 📊 **IMPLEMENTATION PRIORITY**

### Must Have (Week 1):
1. **Attachment Uploads** - Can't send files currently
2. **Load/Edit Drafts** - Can save but not load
3. **Folder Navigation** - Can't browse folders

### Should Have (Week 2):
4. **Contact Auto-complete** - Better UX
5. **Rich Text Editor** - Professional emails
6. **Email Search** - Find emails easily

### Nice to Have (Week 3+):
7. Scheduled Sending
8. Email Templates
9. Undo Send
10. Read Receipts
11. Snooze Emails
12. Labels/Tags

### Future Enhancements:
13. Email Tracking
14. Print/Export
15. Vacation Responder
16. Spam Reporting

---

## 🎯 **RECOMMENDED NEXT STEPS**

### Immediate (Today):
```bash
1. Test email sending thoroughly
2. Test draft saving
3. Test attachment downloads
4. Fix any bugs found
```

### This Week:
```bash
1. Build attachment uploads
2. Build draft loading/editing
3. Build folder navigation
```

### Next Week:
```bash
1. Add contact auto-complete
2. Integrate rich text editor
3. Fix email search
```

---

## 💡 **QUICK WINS**

These features are easy to implement and add value:

1. **Spam Button** - 1 hour
2. **Folder Navigation** - 2 hours
3. **Bulk Label Application** - 1 hour
4. **Email Print** - 2 hours

---

## 📚 **EXTERNAL LIBRARIES TO CONSIDER**

- **Rich Text:** TipTap, Quill, Slate
- **File Upload:** React Dropzone, Uppy
- **Date Picker:** React DatePicker, DayJS
- **Contact Auto-complete:** React Select, Downshift

---

**Total Estimated Remaining Work:** 40-60 hours

**Priority Features:** 3 items, ~8 hours

**Status:** 🟢 Core functionality complete, enhancements remain

---

*Last Updated: November 1, 2025*

