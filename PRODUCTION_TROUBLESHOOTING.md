# Production Errors Troubleshooting Guide

## 🚨 Current Issues (as of deployment)

### 1. Service Worker Registration Failed ✅ (Fixed in code, needs cache clear)

**Error**: `ServiceWorker script evaluation failed`

**Root Cause**: Browser cached old service worker with TypeScript syntax errors

**Fix Applied**: Removed all TypeScript syntax from `public/sw.js`

**User Action Required**:
1. Open DevTools (F12)
2. Go to Application tab → Service Workers
3. Click "Unregister" next to https://www.easemail.app
4. Go to Application tab → Storage → Clear site data
5. Hard refresh (Ctrl+Shift+R)
6. Service worker should now register successfully

**Verification**:
```javascript
// Run in console - should show 'activated'
navigator.serviceWorker.getRegistration().then(reg => console.log(reg?.active?.state))
```

---

### 2. User Preferences API 500 Error ⚠️ (Needs investigation)

**Error**: `GET /api/user/preferences 500 (Internal Server Error)`

**Enhanced Logging**: Added detailed error logging in code

**Check Vercel Logs For**:
- "Error fetching preferences:"
- "Error details:"
- "User not found in database:"
- "No preferences found for user"

**Possible Causes**:
1. **Database connection issue** → Check Supabase status
2. **Missing user in database** → User exists in Auth but not in users table
3. **Schema mismatch** → userPreferences table missing columns

**Diagnostic Steps**:

```sql
-- Run in Supabase SQL Editor

-- 1. Check if user exists
SELECT id, email FROM auth.users WHERE email = 'trenttdaniel@gmail.com';

-- 2. Check if user exists in users table
SELECT id, email FROM users WHERE email = 'trenttdaniel@gmail.com';

-- 3. Check if preferences exist
SELECT * FROM user_preferences WHERE user_id = 'USER_ID_FROM_ABOVE';

-- 4. Check table structure
\d user_preferences
```

**Quick Fix** (if user missing preferences):
```sql
-- Create default preferences for user
INSERT INTO user_preferences (user_id)
VALUES ('USER_ID_HERE')
ON CONFLICT (user_id) DO NOTHING;
```

---

### 3. Sentry DSN Warning ℹ️ (Cosmetic, fixed)

**Error**: `Invalid Sentry Dsn: NEXT_PUBLIC_SENTRY_DSN=https://c6945a7…`

**Status**: Fixed - now only initializes if DSN is configured

**Verification**: Warning should be gone in next deployment

---

### 4. Email Sync Stalled at 600 Emails 🔴 (Active issue)

**Symptoms**:
- Sync shows "Active" for 5+ hours
- Email count stuck at 600
- No error messages

**Root Cause**: Continuation mechanism failing

**Immediate Fix**: Use diagnostic API

```javascript
// 1. Get your account ID from page or run:
fetch('/api/nylas/accounts').then(r=>r.json()).then(d=>console.log(d.accounts[0]?.id))

// 2. Run diagnostic (replace ACCOUNT_ID)
fetch('/api/nylas/sync/diagnostic?accountId=ACCOUNT_ID').then(r=>r.json()).then(console.log)

// 3. Force restart sync
fetch('/api/nylas/sync/diagnostic', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({accountId: 'ACCOUNT_ID', action: 'force_restart'})
}).then(r=>r.json()).then(console.log)
```

**Monitor**: Check Vercel logs for:
- "⏰ Approaching Vercel timeout"
- "🔄 Triggering continuation"
- "❌ Failed to trigger continuation"
- "✅ Continuation X successfully triggered"

---

## 🔧 General Troubleshooting Steps

### Clear All Caches
```javascript
// Run in console
caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))))
  .then(() => console.log('All caches cleared'))
  .then(() => location.reload(true));
```

### Unregister Service Worker
```javascript
// Run in console
navigator.serviceWorker.getRegistrations()
  .then(registrations => {
    for(let registration of registrations) {
      registration.unregister();
    }
  })
  .then(() => console.log('All service workers unregistered'))
  .then(() => location.reload(true));
```

### Check Database Connection
```javascript
// Run in console
fetch('/api/health')  // If you have a health check endpoint
  .then(r => r.json())
  .then(console.log);
```

### Force Migration Run
```bash
# Run missing migrations
curl -X POST https://www.easemail.app/api/migrations/031  # AI preferences
curl -X POST https://www.easemail.app/api/migrations/032  # SMS is_read
curl -X POST https://www.easemail.app/api/migrations/034  # Webhook optimization
```

---

## 📋 Environment Variables Checklist

Verify in Vercel dashboard:

**Required**:
- ✅ `DATABASE_URL` - Supabase connection string
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `NYLAS_API_KEY`
- ✅ `NYLAS_API_URI`
- ✅ `NEXT_PUBLIC_APP_URL` - https://www.easemail.app

**Optional** (but recommended):
- ✅ `NEXT_PUBLIC_SENTRY_DSN`
- ✅ `SENTRY_AUTH_TOKEN`
- ✅ `CRON_SECRET`

---

## 🐛 Known Issues & Workarounds

### Issue: React Hydration Errors (#418, #422)
**Cause**: Server HTML doesn't match client HTML
**Common Causes**:
- Date/time rendering differences
- Conditional rendering based on client-side state
- Third-party scripts modifying DOM

**Workaround**: Usually resolves after service worker cache clear

### Issue: Signatures Not Loading
**Symptom**: `[EmailCompose] Signatures loaded: 0`
**Cause**: User has no signatures in database
**Fix**: Create a signature in Settings → Signatures

### Issue: No Accounts Found
**Symptom**: `[Navigation] Navigated to inbox without accounts`
**Cause**: Email account not connected
**Fix**: Click "Add Account" to connect email

---

## 📞 Escalation Path

If issues persist after trying these steps:

1. **Check Vercel Logs**: Look for actual error messages
2. **Check Supabase Logs**: Database connection/query issues
3. **Check Sentry**: Captured errors with full stack traces
4. **Create GitHub Issue**: Include:
   - Error messages from console
   - Vercel function logs
   - Steps to reproduce
   - Expected vs actual behavior

---

## ✅ Success Indicators

After fixes deploy and caches clear:

- [ ] No service worker errors in console
- [ ] No 500 errors on /api/user/preferences
- [ ] No Sentry DSN warnings
- [ ] Email sync progressing beyond 600 emails
- [ ] Signatures loading if they exist
- [ ] Theme applying correctly
- [ ] No React hydration errors

---

**Last Updated**: After fixing service worker TypeScript syntax and enhancing preferences API error handling.

