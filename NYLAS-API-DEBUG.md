# Nylas API 500 Errors - Debug Guide

**Date:** January 31, 2026
**Status:** 🔍 Investigation Required

## 🚨 Errors Observed

From production console logs:

```
POST /api/nylas-v3/calendars 500
GET /api/nylas-v3/folders 500
GET /api/nylas-v3/messages 500
```

These are **server-side** errors that require investigation.

---

## 🔍 Investigation Steps

### Step 1: Check Nylas API Credentials

1. **Verify API Key is Valid**
   ```bash
   # Test Nylas API connection
   curl -X GET "https://api.us.nylas.com/v3/grants" \
     -H "Authorization: Bearer YOUR_NYLAS_API_KEY" \
     -H "Accept: application/json"
   ```

   Expected: 200 OK with list of grants
   Error: 401 Unauthorized = Invalid API key

2. **Check Client ID and Secret**
   - Go to [Nylas Dashboard](https://dashboard.nylas.com/)
   - Navigate to **App Settings** → **Credentials**
   - Verify `NYLAS_CLIENT_ID` matches
   - Verify `NYLAS_CLIENT_SECRET` is not expired

3. **Verify API Region**
   - Ensure `NYLAS_API_URI=https://api.us.nylas.com`
   - If your account is in EU, use: `https://api.eu.nylas.com`

---

### Step 2: Check Nylas API Rate Limits

1. **Monitor API Usage**
   - Go to [Nylas Dashboard](https://dashboard.nylas.com/)
   - Check **Usage** tab
   - Look for rate limit warnings

2. **Check Rate Limit Headers in Logs**
   Look for these headers in server logs:
   ```
   X-RateLimit-Limit: 100
   X-RateLimit-Remaining: 0
   X-RateLimit-Reset: 1234567890
   ```

   If `Remaining: 0`, you've hit rate limits

3. **Review Rate Limit Errors**
   Look for 429 status codes in Vercel Function logs

---

### Step 3: Check Nylas Grant Status

Grants (connected accounts) might be invalid or expired:

1. **List All Grants**
   ```bash
   curl -X GET "https://api.us.nylas.com/v3/grants" \
     -H "Authorization: Bearer YOUR_NYLAS_API_KEY"
   ```

2. **Check Grant Status**
   Look for `status` field in response:
   - `valid` = Working correctly
   - `invalid` = Needs re-authentication
   - `expired` = Token expired

3. **Re-authenticate Invalid Grants**
   Users with invalid grants need to reconnect their email accounts

---

### Step 4: Check Database Connection

500 errors could be from database connection issues:

1. **Verify Database URL**
   ```bash
   # Check if DATABASE_URL is accessible
   psql "$DATABASE_URL" -c "SELECT 1;"
   ```

2. **Check Supabase Dashboard**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Check **Database** → **Logs**
   - Look for connection errors or timeouts

3. **Monitor Connection Pool**
   - Check for connection pool exhaustion
   - Look for "too many clients" errors

---

### Step 5: Review Vercel Function Logs

1. **Access Function Logs**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Navigate to your project
   - Click **Functions** tab
   - Select a failing function (e.g., `/api/nylas-v3/messages`)

2. **Look for Error Details**
   - Full stack traces
   - Database query errors
   - API timeout errors
   - Network errors

3. **Check Function Timeout**
   - Default: 10 seconds
   - If queries are slow, may need to increase timeout

---

### Step 6: Test API Endpoints Directly

Test each failing endpoint:

#### Test Calendar API
```bash
# Via your app's API
curl -X GET "https://your-app.vercel.app/api/nylas-v3/calendars" \
  -H "Cookie: your-auth-cookie"

# Check response status and body
```

#### Test Folders API
```bash
curl -X GET "https://your-app.vercel.app/api/nylas-v3/folders" \
  -H "Cookie: your-auth-cookie"
```

#### Test Messages API
```bash
curl -X GET "https://your-app.vercel.app/api/nylas-v3/messages" \
  -H "Cookie: your-auth-cookie"
```

---

## 🔧 Common Fixes

### Fix 1: Refresh Nylas API Token
```typescript
// If using Nylas v3, tokens may need refresh
// Check app/api/nylas/token-refresh/route.ts
```

### Fix 2: Add Missing `export const dynamic = 'force-dynamic'`
Some API routes need this to prevent static generation:

```typescript
// app/api/nylas-v3/calendars/route.ts
export const dynamic = 'force-dynamic';
```

### Fix 3: Add Proper Error Handling
```typescript
try {
  const response = await nylasClient.calendars.list({ grantId });
  return NextResponse.json(response);
} catch (error) {
  console.error('Nylas API Error:', error);

  // Log detailed error info
  if (error.response) {
    console.error('Status:', error.response.status);
    console.error('Body:', error.response.data);
  }

  return NextResponse.json(
    { error: 'Failed to fetch calendars', details: error.message },
    { status: 500 }
  );
}
```

### Fix 4: Check for Missing User Authentication
```typescript
// Ensure user is authenticated before making Nylas calls
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

---

## 📊 Monitoring Setup

### Add Logging to Nylas API Calls

```typescript
// lib/nylas-v3/client.ts
export async function makeNylasRequest(endpoint: string, options: any) {
  console.log('[Nylas API] Request:', { endpoint, options });

  const startTime = Date.now();

  try {
    const response = await fetch(`${NYLAS_API_URI}${endpoint}`, options);
    const duration = Date.now() - startTime;

    console.log('[Nylas API] Response:', {
      endpoint,
      status: response.status,
      duration: `${duration}ms`,
    });

    return response;
  } catch (error) {
    console.error('[Nylas API] Error:', {
      endpoint,
      error: error.message,
    });
    throw error;
  }
}
```

---

## 🚨 Emergency Actions

If Nylas API is completely down:

1. **Check Nylas Status Page**
   - Visit: https://status.nylas.com/
   - Look for active incidents

2. **Enable Fallback Mode**
   - If you have Aurinko configured as fallback
   - Temporarily route users to Aurinko

3. **Notify Users**
   - Show maintenance banner
   - Update status page

---

## 📝 Action Items

- [ ] Verify Nylas API credentials in Vercel
- [ ] Check Nylas dashboard for grant statuses
- [ ] Review Vercel Function logs for detailed errors
- [ ] Test API endpoints manually
- [ ] Add enhanced error logging
- [ ] Set up Nylas API monitoring

---

**Next Steps:**
1. Follow investigation steps above
2. Document findings in this file
3. Implement fixes based on root cause
4. Test in production
5. Monitor for 24 hours

---

**Related Files:**
- `app/api/nylas-v3/calendars/route.ts`
- `app/api/nylas-v3/folders/route.ts`
- `app/api/nylas-v3/messages/route.ts`
- `lib/nylas-v3/client.ts`

**Last Updated:** January 31, 2026
