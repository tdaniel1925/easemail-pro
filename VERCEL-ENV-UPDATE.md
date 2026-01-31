# Vercel Environment Variables Update Guide

**Date:** January 31, 2026

## 🔧 Required Updates

### 1. Fix Sentry DSN Configuration

**Current Issue:** `NEXT_PUBLIC_SENTRY_DSN` has a duplicate prefix in production

**Steps to Fix:**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to your project: **easemail-pro**
3. Go to **Settings** → **Environment Variables**
4. Find: `NEXT_PUBLIC_SENTRY_DSN`
5. Update the value to:
   ```
   https://c6945a7fc01abf167c788d65ba655993@o4510313806757888.ingest.us.sentry.io/4510313808199680
   ```
   (Remove the duplicate `NEXT_PUBLIC_SENTRY_DSN=` prefix if present)

6. **Apply to:** All environments (Production, Preview, Development)
7. Click **Save**
8. **Redeploy** your application to apply changes

---

## 📋 Full Environment Variables Checklist

Verify these critical environment variables are set correctly in Vercel:

### Authentication & Database
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `DATABASE_URL`

### Email Integration (Nylas)
- ⚠️ `NYLAS_API_KEY` - Verify valid
- ⚠️ `NYLAS_API_URI` - Should be: `https://api.us.nylas.com`
- ⚠️ `NYLAS_CLIENT_ID` - Verify valid
- ⚠️ `NYLAS_CLIENT_SECRET` - Verify valid
- ⚠️ `NYLAS_WEBHOOK_SECRET` - Verify valid

### Payments (PayPal)
- ✅ `PAYPAL_CLIENT_ID`
- ✅ `PAYPAL_CLIENT_SECRET`
- ✅ `PAYPAL_MODE` - Should be: `sandbox` or `live`
- ✅ `NEXT_PUBLIC_PAYPAL_CLIENT_ID`

### Error Tracking (Sentry)
- 🔧 `SENTRY_DSN` - Should be valid Sentry DSN
- 🔧 `NEXT_PUBLIC_SENTRY_DSN` - **FIX THIS** (see above)
- ✅ `SENTRY_AUTH_TOKEN`

### Other Services
- ✅ `OPENAI_API_KEY`
- ✅ `ANTHROPIC_API_KEY`
- ✅ `RESEND_API_KEY`
- ✅ `TWILIO_ACCOUNT_SID`
- ✅ `TWILIO_AUTH_TOKEN`
- ✅ `UPSTASH_REDIS_REST_URL`
- ✅ `UPSTASH_REDIS_REST_TOKEN`

---

## 🚀 Deployment Steps

After updating environment variables:

1. **Redeploy Latest Commit**
   ```bash
   # Trigger new deployment
   git commit --allow-empty -m "chore: Trigger redeployment for env var updates"
   git push origin main
   ```

2. **Or Redeploy via Vercel Dashboard**
   - Go to **Deployments** tab
   - Click on latest deployment
   - Click **Redeploy** button

3. **Monitor Deployment**
   - Watch build logs for errors
   - Check Function logs for runtime errors
   - Test Sentry integration after deployment

---

## 🔍 Testing After Deployment

### Test Sentry Integration
1. Visit your production site
2. Open browser console
3. Check for: **No Sentry DSN errors**
4. Trigger a test error to verify Sentry is capturing

### Test Billing Page
1. Navigate to `/billing` or user billing page
2. Verify page loads without console errors
3. Check that `billedToOrganization` displays correctly

### Test Favicon
1. Check browser tab icon
2. Verify no 404 errors in Network tab for `favicon.ico`

---

## 📊 Monitoring After Deployment

**Vercel Dashboard:**
- Monitor **Function Logs** for errors
- Check **Analytics** for user impact
- Review **Error Rate** in Real-time tab

**Sentry Dashboard:**
- Verify errors are being captured
- Check for new error patterns
- Monitor error frequency

---

## ⚠️ Rollback Plan

If deployment causes issues:

1. **Quick Rollback via Vercel:**
   - Go to **Deployments** tab
   - Find previous stable deployment
   - Click **Promote to Production**

2. **Or Revert Git Commit:**
   ```bash
   git revert HEAD
   git push origin main
   ```

---

## 📝 Notes

- Environment variable changes require redeployment to take effect
- Changes apply to new deployments only (not existing ones)
- Test in Preview environment first if possible
- Keep `.env.local` in sync with production variables (excluding secrets)

---

**Last Updated:** January 31, 2026
**Related:** See `PRODUCTION-FIXES.md` for fix details
