# 🚨 IMPORTANT: Migration Required After Deployment

## ⚠️ Action Required

After the Vercel deployment completes, you need to run the database migration to add the `continuation_count` column.

---

## 🎯 Quick Fix (30 seconds)

**Option 1: Use the API Endpoint (Easiest)**

Once Vercel deployment is complete (~2 minutes), run this command in your browser console or terminal:

```bash
curl -X POST https://www.easemail.app/api/migrations/027
```

Or visit this URL in your browser:
```
https://www.easemail.app/api/migrations/027
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Migration completed successfully"
}
```

---

**Option 2: Use the Migration Script (Local)**

```bash
# Set your DATABASE_URL in .env.local first
node scripts/run-migration-027.js
```

---

**Option 3: Manual SQL (Supabase Dashboard)**

Go to your Supabase SQL Editor and run:

```sql
ALTER TABLE email_accounts 
ADD COLUMN IF NOT EXISTS continuation_count INTEGER DEFAULT 0;
```

---

## ✅ Verify Migration

Check that the column was added:

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'email_accounts' 
  AND column_name = 'continuation_count';
```

Should return:
| column_name | data_type | column_default |
|-------------|-----------|----------------|
| continuation_count | integer | 0 |

---

## 🔄 Build Status

Your Vercel build failed because the TypeScript compiler expected the `continuation_count` column in the schema, but it doesn't exist in the database yet.

**Timeline:**
1. ✅ Push code to GitHub (done)
2. ⏳ Vercel deploys code (~2 minutes)
3. 👉 **YOU ARE HERE** - Run migration
4. ✅ App works perfectly

---

## 🎯 Why This Happened

The security fixes added code that uses `account.continuationCount`, but we forgot to add the column to the database schema first. This is a **safe fix** - just need to add one column.

---

## 💡 Pro Tip

After running the migration, Vercel will automatically detect the change and the app will work. No need to redeploy!

---

## ❓ Need Help?

If you get an error, it's probably one of these:

**Error: "column already exists"**
✅ That's fine! The column is there, you're good to go.

**Error: "connection refused"**
❌ Check that your `DATABASE_URL` is correct.

**Error: "permission denied"**
❌ Make sure you're using the connection string with admin privileges.

---

## 🎉 Once Complete

After running the migration, your Phase 1 security fixes will be fully deployed and working! 🚀

- ✅ XSS Protection
- ✅ Continuation Limit (NEW!)
- ✅ Search Escaping
- ✅ Security Headers
- ✅ API Key Protection
- ✅ UTC Timestamps

