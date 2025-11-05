# 🎯 Sentry Error Tracking - Setup Complete!

## ✅ What Was Installed

Sentry is now fully configured in your EaseMail application for comprehensive error tracking and performance monitoring.

### Files Created:
- `sentry.client.config.ts` - Browser error tracking
- `sentry.server.config.ts` - Server-side error tracking
- `sentry.edge.config.ts` - Edge runtime error tracking
- `next.config.js` - Updated with Sentry webpack plugin

### Package Installed:
- `@sentry/nextjs` v10.23.0

---

## 🔑 Environment Variables Needed

You need to add these to your **local** `.env.local` file and your **Vercel** project settings:

### 1. Get Your Sentry DSN

Go to your Sentry dashboard:
```
https://sentry.io/organizations/bioquest/projects/javascript-nextjs/
```

Click on **Settings** → **Client Keys (DSN)** and copy your DSN.

### 2. Add to `.env.local` (Local Development)

```env
# Sentry Error Tracking
NEXT_PUBLIC_SENTRY_DSN=https://YOUR_DSN_HERE@sentry.io/YOUR_PROJECT_ID
SENTRY_DSN=https://YOUR_DSN_HERE@sentry.io/YOUR_PROJECT_ID
```

### 3. Add to Vercel (Production)

Go to your Vercel project:
```
https://vercel.com/bot-makers/your-project/settings/environment-variables
```

Add these environment variables:

| Variable | Value | Environments |
|----------|-------|--------------|
| `NEXT_PUBLIC_SENTRY_DSN` | Your DSN from Sentry | Production, Preview, Development |
| `SENTRY_DSN` | Your DSN from Sentry | Production, Preview, Development |
| `SENTRY_AUTH_TOKEN` | Your auth token (see below) | Production |

### 4. Get Sentry Auth Token (for Source Maps)

This allows Sentry to upload source maps so you can see readable stack traces.

1. Go to: https://sentry.io/settings/account/api/auth-tokens/
2. Click **"Create New Token"**
3. Name it: `EaseMail Source Maps`
4. Scopes needed:
   - `project:read`
   - `project:releases`
   - `org:read`
5. Copy the token and add it to Vercel as `SENTRY_AUTH_TOKEN`

---

## 📊 What You'll See in Sentry

Once deployed, Sentry will automatically track:

### 1. **All JavaScript Errors**
- Unhandled exceptions
- Promise rejections
- React component errors
- API errors

### 2. **Performance Metrics**
- Page load times
- API response times
- Database query performance
- Slow transactions

### 3. **Session Replays** (on errors)
- Watch what the user did before the error
- See their clicks, scrolls, and interactions
- Replay the exact error scenario

### 4. **User Context**
- Which user experienced the error
- What page they were on
- Browser and device info
- Network conditions

---

## 🎬 Testing Sentry (After Setup)

### Test Client-Side Error Tracking

Add this to any client component temporarily:

```tsx
// Test button in any page
<button onClick={() => {
  throw new Error("Test Sentry Error!");
}}>
  Test Sentry
</button>
```

### Test Server-Side Error Tracking

Add this to any API route:

```typescript
// app/api/test-sentry/route.ts
export async function GET() {
  throw new Error("Test Server Error!");
}
```

Then visit: `http://localhost:3000/api/test-sentry`

### Check Sentry Dashboard

1. Go to: https://sentry.io/organizations/bioquest/projects/javascript-nextjs/
2. Click **"Issues"** in the left sidebar
3. You should see your test errors appear within seconds!

---

## 🚀 Production Deployment

### Step 1: Add Environment Variables to Vercel

```bash
# In Vercel Dashboard, add:
NEXT_PUBLIC_SENTRY_DSN=https://...
SENTRY_DSN=https://...
SENTRY_AUTH_TOKEN=sntrys_...
```

### Step 2: Deploy

```bash
git push
```

Vercel will automatically:
1. Build your app
2. Upload source maps to Sentry
3. Enable error tracking
4. Start monitoring performance

---

## 📈 Key Features Enabled

### 1. **Error Tracking** ✅
- Captures all unhandled errors
- Automatic stack traces
- User context included

### 2. **Performance Monitoring** ✅
- 100% of transactions tracked
- Slow API endpoint detection
- Database query timing

### 3. **Session Replay** ✅
- 10% of all sessions recorded
- 100% of error sessions recorded
- Privacy-safe (text masked, media blocked)

### 4. **Source Maps** ✅
- Readable error locations
- Shows original TypeScript code
- Line numbers preserved

### 5. **Vercel Cron Monitoring** ✅
- Tracks scheduled job success/failure
- Monitors calendar reminders
- Webhook processing health

---

## 🔍 Using Sentry Effectively

### Monitor These Critical Areas:

#### 1. **Email Sync Errors**
Look for:
- `Failed to sync emails`
- `CONNECT_TIMEOUT` errors
- Nylas API failures

#### 2. **Database Issues**
Look for:
- Connection pool timeouts
- Slow queries
- Transaction failures

#### 3. **API Endpoint Performance**
Monitor:
- `/api/nylas/messages` - Should be < 500ms
- `/api/webhooks/nylas` - Should be < 1000ms
- `/api/folders` - Should be < 200ms

#### 4. **User Experience Issues**
Track:
- Failed login attempts
- Attachment upload failures
- AI generation errors

---

## 🎯 Sentry Dashboard Overview

### Issues Tab
- See all errors grouped by type
- Click any issue for full details
- Assign to team members
- Mark as resolved

### Performance Tab
- View slowest transactions
- Find bottlenecks
- Optimize database queries
- Identify slow APIs

### Releases Tab
- Track errors by deployment
- Compare error rates between versions
- Roll back if needed

### Alerts Tab
- Set up notifications
- Get Slack alerts on critical errors
- Email reports daily/weekly

---

## 🛡️ Privacy & Security

### What's Captured:
✅ Error messages and stack traces
✅ API endpoint paths
✅ Performance metrics
✅ Browser/device info

### What's Protected:
🔒 User passwords (automatically scrubbed)
🔒 Email content (masked in replays)
🔒 Personal data (text masked)
🔒 Images/videos (blocked in replays)

---

## 📞 Troubleshooting

### Error: "Invalid DSN"
- Check that you copied the full DSN from Sentry
- Make sure it starts with `https://`
- Verify it ends with your project ID

### Error: "Source maps not uploading"
- Ensure `SENTRY_AUTH_TOKEN` is set in Vercel
- Check that the token has `project:releases` scope
- Verify org and project names in `next.config.js`

### Errors not appearing in Sentry
- Check that environment variables are set
- Verify DSN is correct
- Make sure you've deployed to Vercel
- Test with a manual error (see testing section)

---

## 🎉 You're All Set!

Sentry is now watching your application 24/7. You'll be notified immediately when:
- Errors occur in production
- Users experience crashes
- Performance degrades
- API endpoints slow down

### Next Steps:
1. ✅ Add environment variables to Vercel
2. ✅ Deploy to production
3. ✅ Test with a sample error
4. ✅ Check Sentry dashboard
5. ✅ Set up Slack alerts (optional)

---

## 🔗 Useful Links

- **Your Sentry Dashboard**: https://sentry.io/organizations/bioquest/projects/javascript-nextjs/
- **Sentry Docs**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Create Auth Token**: https://sentry.io/settings/account/api/auth-tokens/
- **Performance Guide**: https://docs.sentry.io/product/performance/
- **Session Replay**: https://docs.sentry.io/product/session-replay/

---

**Your app is now production-ready with enterprise-grade error tracking!** 🚀

Questions? Check your Sentry dashboard or review the troubleshooting section above.

