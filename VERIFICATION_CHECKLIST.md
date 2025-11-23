# ✅ Billing System - Verification Checklist

## Migration Status: ✅ COMPLETE

You've successfully run the database migration! The `billing_address` column has been added to the `users` table.

---

## Quick Verification Steps

### Step 1: Start Dev Server
```bash
npm run dev
```

Wait for: `✓ Ready in X.XXs`

---

### Step 2: Test Health Monitoring (GET - No Auth Required)

**PowerShell:**
```powershell
curl http://localhost:3001/api/cron/monitor-billing | ConvertFrom-Json | ConvertTo-Json -Depth 5
```

**Expected Response:**
```json
{
  "success": true,
  "health": {
    "status": "healthy",
    "lastBillingRun": null,
    "failedTransactions24h": 0,
    "failedTransactions7d": 0,
    "revenueToday": 0,
    "revenueThisMonth": 0,
    "alerts": []
  }
}
```

---

### Step 3: Test Usage Tracking (POST - Requires CRON_SECRET)

**PowerShell:**
```powershell
$headers = @{"Authorization" = "Bearer aAGHwZ2C8LE7zsBiOftTgVSUJ4r9v6PK"}
Invoke-RestMethod -Uri http://localhost:3001/api/cron/track-usage -Method Post -Headers $headers | ConvertTo-Json -Depth 5
```

**Expected Response:**
```json
{
  "success": true,
  "usersProcessed": 0,
  "errors": 0,
  "errorDetails": []
}
```

---

### Step 4: Test Usage API (Requires User Auth)

First, log in to your app and get your auth token, then:

**PowerShell:**
```powershell
$headers = @{"Authorization" = "Bearer YOUR_USER_TOKEN"}
Invoke-RestMethod -Uri http://localhost:3001/api/billing/usage -Method Get -Headers $headers | ConvertTo-Json -Depth 5
```

**Expected Response:**
```json
{
  "success": true,
  "sms": {"count": 0, "cost": 0},
  "ai": {"count": 0, "cost": 0},
  "storage": {"usedGB": 0, "cost": 0},
  "total": 0
}
```

---

### Step 5: Test Payment Methods API (Requires User Auth)

**PowerShell:**
```powershell
$headers = @{"Authorization" = "Bearer YOUR_USER_TOKEN"}
Invoke-RestMethod -Uri http://localhost:3001/api/billing/payment-methods -Method Get -Headers $headers | ConvertTo-Json -Depth 5
```

**Expected Response:**
```json
{
  "paymentMethods": []
}
```

---

### Step 6: Test Invoices API (Requires User Auth)

**PowerShell:**
```powershell
$headers = @{"Authorization" = "Bearer YOUR_USER_TOKEN"}
Invoke-RestMethod -Uri http://localhost:3001/api/billing/invoices -Method Get -Headers $headers | ConvertTo-Json -Depth 5
```

**Expected Response:**
```json
{
  "success": true,
  "invoices": []
}
```

---

### Step 7: View Billing Portal UI

1. Navigate to: `http://localhost:3001/settings/billing`
2. You should see:
   - ✅ Current Usage section (shows $0.00 for new users)
   - ✅ Payment Methods section (empty, with "Add Payment Method" button)
   - ✅ Invoices section (empty for now)

---

### Step 8: Test Email Notification (Optional)

The email system is ready but won't send emails until you trigger a billing event. To test:

1. **Option A**: Run automated billing (requires users with charges)
2. **Option B**: Trigger a Stripe webhook event (requires Stripe setup)
3. **Option C**: Manually call the notification functions from admin panel

---

## Verification Results

Check off each item as you test:

- [ ] Health monitoring endpoint responds
- [ ] Usage tracking cron works
- [ ] Usage API returns user data
- [ ] Payment methods API accessible
- [ ] Invoices API accessible
- [ ] Billing portal UI displays correctly
- [ ] No console errors in browser
- [ ] No server errors in terminal

---

## Common Issues & Solutions

### Issue: "Cannot connect to localhost:3001"
**Solution**: Start dev server with `npm run dev`

### Issue: "401 Unauthorized" on billing APIs
**Solution**: These endpoints require user authentication. Log in first and use your session token.

### Issue: "paymentMethods is undefined"
**Solution**: This is expected if you haven't added Stripe keys yet. The UI should show empty state.

### Issue: Email notifications not sending
**Solution**: Check `RESEND_API_KEY` in `.env.local`. Emails only send when billing events are triggered.

### Issue: TypeScript errors during build
**Solution**: Run `npm run build` to check. Existing errors in other files won't affect billing system.

---

## Production Deployment Checklist

When you're ready to deploy:

- [ ] Database migration run in production
- [ ] Environment variables added to Vercel
- [ ] Stripe webhook configured (if using Stripe)
- [ ] Cron jobs verified in Vercel dashboard
- [ ] Test with real Stripe test cards
- [ ] Monitor first billing run carefully
- [ ] Set up billing alerts email

---

## System Status

✅ **Database**: Migration complete
✅ **Environment**: CRON_SECRET and RESEND_API_KEY configured
✅ **Cron Jobs**: Configured in vercel.json
✅ **Code**: All billing features implemented
✅ **Documentation**: Complete guides available
⏳ **Testing**: Ready to test (follow steps above)
⏳ **Stripe**: Optional - add keys when ready
⏳ **Deployment**: Ready when you are!

---

## Next Actions

**Today:**
1. ✅ Database migration - DONE!
2. ⏰ Start dev server (`npm run dev`)
3. ⏰ Test endpoints (Steps 2-6 above)
4. ⏰ View billing portal UI

**This Week:**
- Add Stripe test keys (if you want to test payments)
- Test full billing flow with test users
- Configure Stripe webhook for local testing

**When Ready:**
- Deploy to Vercel
- Add production Stripe keys
- Test with beta users
- Monitor billing runs

---

## Support

If anything doesn't work:

1. Check dev server is running (`npm run dev`)
2. Check logs in terminal for errors
3. Verify environment variables in `.env.local`
4. Review documentation in `SETUP_SUMMARY.md`
5. Test individual endpoints one by one

**All systems are go! 🚀**
