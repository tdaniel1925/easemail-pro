# AI-Powered Threading - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Run Database Migration

```bash
# Connect to your database and run the migration
psql -d your_database < drizzle/migrations/0010_add_email_threads.sql
```

Or if using Drizzle Push:
```bash
npm run db:push
```

### Step 2: Link Existing Emails (Optional)

If you have existing emails, run the migration script:

```bash
# Basic migration (fast)
npx tsx scripts/migrate-email-threads.ts

# With AI summaries (slower, uses OpenAI credits)
npx tsx scripts/migrate-email-threads.ts --generate-summaries
```

**Note:** If you skip this step, threading will only work for new incoming emails.

### Step 3: Start Your App

```bash
npm run dev
```

That's it! 🎉

---

## 📧 How to Use

### 1. View Threads

Look for emails with the **thread badge** (🔗 with a number):

```
┌─────────────────────────────────────────┐
│ CP  Charles Potter       🔗 3   ⭐  2h  │
│     Re: Website Redesign                │
│     Latest update: Budget approved...   │
└─────────────────────────────────────────┘
         ↑ Click this badge!
```

### 2. Click the Badge

The thread summary panel will expand inline showing:

- **AI Summary** - Quick overview of the entire thread
- **Thread Stats** - Participants, emails, attachments
- **Decisions Made** - Key decisions extracted by AI
- **Action Items** - Tasks identified (with checkboxes!)
- **Key Topics** - Tags for quick understanding
- **Email List** - All emails in the thread (clickable)
- **Timeline** - Visual chronology of events

### 3. Interact with the Thread

**Quick Actions:**
- ⭐ **Star** - Mark thread as important
- 🔇 **Mute** - Stop notifications for this thread
- 📁 **Archive** - Archive all emails in thread

**Action Items:**
- ✓ **Complete** - Check off action items as you complete them

**Navigate:**
- 📧 **Click any email** - Jump to that email in the thread

### 4. Regenerate Summary

If the thread gets new emails, click **"Regenerate"** to update the AI summary with the latest context.

---

## 🎯 What You Get

### Automatic Threading

All new incoming emails are automatically:
1. Analyzed for thread relationships
2. Linked to existing threads (or new thread created)
3. Added to thread timeline
4. Participants tracked

### AI-Powered Insights

For each thread, AI extracts:
- **Summary** - What's this thread about?
- **Decisions** - What has been decided?
- **Action Items** - What needs to be done?
- **Topics** - What's being discussed?
- **Sentiment** - Is it positive, negative, neutral?
- **Priority** - Is it urgent?
- **Reply Needed** - Should you respond?

### Cross-Account Support

Threads work across multiple email accounts! If you reply from a different account, the thread persists.

---

## 🔧 Configuration

### Environment Variables

Make sure you have:

```bash
# .env.local
OPENAI_API_KEY=sk-...  # For AI summaries
```

### Disable AI Summaries

If you want threading without AI (to save costs), simply don't click "Regenerate" or run migration with `--generate-summaries`.

Threading will work, you just won't get AI insights.

---

## 🐛 Troubleshooting

### "Thread badge not showing"

**Cause:** Email doesn't have a threadId

**Fix:** Run the migration script:
```bash
npx tsx scripts/migrate-email-threads.ts
```

### "Thread panel is empty"

**Cause:** Thread was created but has no emails linked

**Fix:** This shouldn't happen. Check your database:
```sql
SELECT * FROM email_threads WHERE id = 'your-thread-id';
SELECT * FROM emails WHERE thread_id = 'your-thread-id';
```

### "AI summary not generating"

**Cause:** OpenAI API key missing or invalid

**Fix:** 
1. Check `.env.local` has `OPENAI_API_KEY`
2. Verify the key works: `curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"`

---

## 💡 Pro Tips

### 1. Mute Noisy Threads
Got a thread that's blowing up your inbox? Click the thread badge → **Mute** → No more notifications!

### 2. Track Action Items
Use the action item checkboxes to track progress on projects discussed via email.

### 3. Quick Context
Before replying to an email, click the thread badge to see the full context and avoid repeating what was already said.

### 4. Search by Thread
(Coming soon) Search for threads by summary, decisions, or action items.

---

## 🎨 Visual Examples

### Before (Without Threading)
```
📧 Website Redesign
📧 Re: Website Redesign
📧 Re: Website Redesign - Budget
📧 Re: Re: Website Redesign - Budget
📧 Fwd: Website Redesign Discussion
📧 Re: Fwd: Website Redesign Discussion
```
*Messy! Hard to follow!*

### After (With Threading)
```
📧 Website Redesign  🔗 6
   ↓ Click badge
   ┌─────────────────────────────────────┐
   │ 🤖 AI Summary:                      │
   │ Team discussing website redesign.   │
   │ Budget approved for $50k, 8-week    │
   │ timeline confirmed. Sarah to        │
   │ submit mockups by Jan 15.           │
   │                                     │
   │ ✅ Decisions Made:                  │
   │ • Budget: $50k (approved)           │
   │ • Timeline: 8 weeks                 │
   │                                     │
   │ 📋 Action Items:                    │
   │ ☐ Sarah: Submit mockups by Jan 15  │
   │ ☐ You: Review mockups by Jan 17    │
   └─────────────────────────────────────┘
```
*Clean! Organized! Actionable!*

---

## 🚀 What's Next?

The threading system is fully built and ready to use! It will:

- ✅ Automatically thread new incoming emails
- ✅ Show thread badges on email cards
- ✅ Expand thread summaries on click
- ✅ Track participants and timeline
- ✅ Extract AI insights
- ✅ Support cross-account threading

**Just start using it!** Every new email will be automatically threaded. 🎉

---

## 📚 Need More Info?

See the complete documentation: `THREADING_SYSTEM_COMPLETE.md`

---

**Happy Threading!** 🚀✨

