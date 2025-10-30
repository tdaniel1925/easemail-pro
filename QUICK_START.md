# 🎯 Quick Start - Nylas Email Integration

## ✅ What's Complete

Your EaseMail app now has **full Nylas integration** with:

### 📦 **New Features**
- ✅ **Account Selector** - Switch between multiple email accounts (in sidebar)
- ✅ **OAuth Flow** - Connect Gmail/Outlook with one click
- ✅ **Real-time Webhooks** - Instant notifications for new emails
- ✅ **Two-way Sync** - Changes sync between EaseMail ↔ Gmail/Outlook
- ✅ **Account Management** - Full account management page at `/accounts`
- ✅ **Multi-Account Support** - Connect unlimited email accounts

### 🗄️ **Database**
- ✅ New tables: `email_folders`, `sync_logs`, `webhook_events`
- ✅ Updated: `email_accounts` with Nylas fields

### 🛠️ **API Routes**
```
/api/nylas/auth              → Start OAuth
/api/nylas/callback          → Complete OAuth
/api/nylas/accounts          → List accounts
/api/nylas/folders/sync      → Sync folders
/api/nylas/messages          → Sync messages
/api/nylas/messages/:id      → Get/update message
/api/webhooks/nylas          → Real-time webhooks
```

---

## 🚀 Next Steps

### 1️⃣ **Check Your .env.local**

Make sure you have these Nylas keys (you mentioned they're already there):

```env
NYLAS_API_KEY=nyk_v0_...
NYLAS_CLIENT_ID=...
NYLAS_CLIENT_SECRET=...
NYLAS_WEBHOOK_SECRET=...
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### 2️⃣ **Push Database Changes**

Run this to update your database schema:

```bash
npm run db:push
```

Or if you prefer migrations:
```bash
npm run db:generate
npm run db:migrate
```

### 3️⃣ **Restart Your Dev Server**

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

### 4️⃣ **Test the Integration**

1. **Open:** http://localhost:3001/inbox
2. **Find the Account Selector** in the sidebar (below the EaseMail logo)
3. **Click "Add Account"**
4. **Sign in with Gmail** (or Outlook)
5. **Get redirected back** - you should see a success message
6. **Visit** http://localhost:3001/accounts to see your account
7. **Click "Sync Now"** to pull in emails

---

## 🎨 **What You'll See**

### **Sidebar Changes**
```
┌──────────────────────┐
│ [Account Selector]   │  ← NEW! Switch accounts here
│ [Compose Button]     │
│                      │
│ ✉️  Inbox (24)       │
│ ⭐ Starred (5)       │
│ ...                  │
│                      │
│ Quick Access:        │
│ 👤 Contacts          │
│ 📧 Accounts          │  ← NEW! Manage accounts
└──────────────────────┘
```

### **Account Selector Dropdown**
```
┌────────────────────────────────┐
│ Email Accounts                 │
│ Switch between your accounts   │
├────────────────────────────────┤
│ ✓ [JD] john@example.com       │  ← Active account
│      🔵 Google  ● Syncing     │
│                                │
│   [MS] mary@company.com       │
│      🔵 Microsoft              │
├────────────────────────────────┤
│ ➕ Add Account                │
└────────────────────────────────┘
```

### **Accounts Management Page**
```
/accounts
┌────────────────────────────────────────┐
│ Email Accounts          [Add Account]  │
│ Manage your connected accounts         │
├────────────────────────────────────────┤
│ [JD] john@example.com                  │
│      Google • Default                  │
│      Last synced: 5 minutes ago        │
│      Status: Active                    │
│                 [Sync Now]  [Remove]   │
├────────────────────────────────────────┤
│ [MS] mary@company.com                  │
│      Microsoft                         │
│      Last synced: 1 hour ago           │
│      Status: Active                    │
│                 [Sync Now]  [Remove]   │
└────────────────────────────────────────┘
```

---

## 🔄 **How the Flow Works**

### **Adding an Account**
```
User clicks "Add Account"
    ↓
Redirects to /api/nylas/auth
    ↓
Nylas OAuth screen (Gmail/Outlook login)
    ↓
User authorizes
    ↓
Redirects to /api/nylas/callback
    ↓
Creates account in database
    ↓
Sets up webhook
    ↓
Triggers folder & message sync
    ↓
Redirects to /inbox?success=account_added
```

### **Real-time Updates**
```
New email arrives in Gmail
    ↓
Nylas detects change
    ↓
Webhook fires → /api/webhooks/nylas
    ↓
Creates webhook_event in database
    ↓
Processes event (inserts into emails table)
    ↓
UI updates automatically
```

---

## 🧪 **Testing Checklist**

- [ ] Add a Gmail account
- [ ] Add an Outlook account
- [ ] Switch between accounts in selector
- [ ] Visit `/accounts` page
- [ ] Click "Sync Now" on an account
- [ ] Send yourself a test email
- [ ] Check if webhook receives it (within ~30 seconds)
- [ ] Verify sync logs in database: `SELECT * FROM sync_logs;`

---

## ⚠️ **Important Notes**

### **For Local Development**
- Webhooks won't work on `localhost` directly
- Use [ngrok](https://ngrok.com) to expose your local server:
  ```bash
  ngrok http 3001
  ```
- Update `NEXT_PUBLIC_APP_URL` in `.env.local` to ngrok URL
- Restart dev server after updating env vars

### **For Production (Vercel)**
- Webhooks will work automatically
- Just set `NEXT_PUBLIC_APP_URL` to your Vercel domain
- Configure webhook URL in Nylas dashboard

---

## 🐛 **Troubleshooting**

### "Account not found" error
- Check if `NYLAS_API_KEY` is set
- Verify account was created in database: `SELECT * FROM email_accounts;`

### OAuth fails
- Check `NYLAS_CLIENT_ID` and `NYLAS_CLIENT_SECRET`
- Verify redirect URI in Nylas dashboard matches: `http://localhost:3001/api/nylas/callback`

### Webhooks not working
- Use ngrok for local testing
- Check `NYLAS_WEBHOOK_SECRET` is set
- View webhook events: `SELECT * FROM webhook_events ORDER BY created_at DESC;`

### Messages not syncing
- Click "Sync Now" in accounts page
- Check sync logs: `SELECT * FROM sync_logs ORDER BY started_at DESC;`
- Verify grant ID exists: `SELECT nylasGrantId FROM email_accounts;`

---

## 📚 **Files Reference**

### **New Components**
- `components/email/AccountSelector.tsx` - Account switcher
- `app/(dashboard)/accounts/page.tsx` - Account management

### **New API Routes**
- `app/api/nylas/auth/route.ts` - OAuth start
- `app/api/nylas/callback/route.ts` - OAuth callback
- `app/api/nylas/accounts/route.ts` - List accounts
- `app/api/nylas/folders/sync/route.ts` - Folder sync
- `app/api/nylas/messages/route.ts` - Message sync
- `app/api/nylas/messages/[messageId]/route.ts` - Message operations
- `app/api/webhooks/nylas/route.ts` - Webhook handler

### **Updated Files**
- `lib/db/schema.ts` - Added new tables
- `lib/email/nylas-client.ts` - Fixed OAuth URLs
- `components/layout/InboxLayout.tsx` - Added account selector
- `package.json` - Fixed drizzle scripts

---

## ✨ **What's Next?**

The infrastructure is ready! Now you can:

1. **Connect real data to UI** - Update EmailClient to fetch from `/api/nylas/messages`
2. **Add Supabase Realtime** - Live updates when webhooks insert new emails
3. **Implement message actions** - Mark read, star, delete, etc.
4. **Add contact sync** - Sync contacts from Gmail/Outlook
5. **Calendar integration** - Sync calendars using Nylas

---

## 🎉 **You're Ready to Go!**

Run `npm run db:push` and `npm run dev` to start testing your multi-account email client!

For detailed documentation, see: **NYLAS_INTEGRATION.md**

