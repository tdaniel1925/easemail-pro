# 🕐 CRON JOB SETUP GUIDE

## 📋 **YOUR CRON SECRET**

Add this to your `.env.local` file:

```env
CRON_SECRET=aAGHwZ2C8LE7zsBiOftTgVSUJ4r9v6PK
```

**⚠️ IMPORTANT:** Also add this to your hosting platform's environment variables!

---

## 🚀 **SETUP BY PLATFORM**

### **✅ Option 1: Vercel (Easiest)**

1. **File already created:** `vercel.json` ✅
   - Runs every 5 minutes
   - Auto-configured with proper path

2. **Add secret to Vercel:**
   ```bash
   # Using Vercel CLI
   vercel env add CRON_SECRET
   # Paste: aAGHwZ2C8LE7zsBiOftTgVSUJ4r9v6PK
   ```

   **OR via Vercel Dashboard:**
   - Go to: Project Settings → Environment Variables
   - Add: `CRON_SECRET` = `aAGHwZ2C8LE7zsBiOftTgVSUJ4r9v6PK`
   - Select: Production, Preview, Development

3. **Deploy:**
   ```bash
   vercel --prod
   ```

4. **Done!** ✅ Vercel automatically runs the cron job.

---

### **Option 2: Windows (Local Development)**

**Using Windows Task Scheduler:**

1. Open Task Scheduler
2. Create Basic Task
3. Name: "EaseMail Reminders"
4. Trigger: Daily
5. Repeat: Every 5 minutes for 1 day
6. Action: Start a program
7. Program: `powershell.exe`
8. Arguments:
   ```powershell
   -Command "Invoke-WebRequest -Uri 'http://localhost:3001/api/calendar/reminders/cron' -Method POST -Headers @{'Authorization'='Bearer aAGHwZ2C8LE7zsBiOftTgVSUJ4r9v6PK'}"
   ```

**OR using PowerShell script:**

Create `run-cron.ps1`:
```powershell
$secret = "aAGHwZ2C8LE7zsBiOftTgVSUJ4r9v6PK"
$url = "http://localhost:3001/api/calendar/reminders/cron"

while ($true) {
    try {
        $response = Invoke-WebRequest -Uri $url -Method POST -Headers @{
            "Authorization" = "Bearer $secret"
        }
        Write-Host "✅ Cron executed: $($response.Content)"
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)"
    }
    
    Start-Sleep -Seconds 300  # Wait 5 minutes
}
```

Run: `powershell -File run-cron.ps1`

---

### **Option 3: Railway**

1. **Add environment variable:**
   - Dashboard → Your Project → Variables
   - Add: `CRON_SECRET` = `aAGHwZ2C8LE7zsBiOftTgVSUJ4r9v6PK`

2. **Add cron service** (create `railway.json`):
   ```json
   {
     "crons": [
       {
         "name": "calendar-reminders",
         "schedule": "*/5 * * * *",
         "command": "curl -X POST -H \"Authorization: Bearer $CRON_SECRET\" https://$RAILWAY_PUBLIC_DOMAIN/api/calendar/reminders/cron"
       }
     ]
   }
   ```

---

### **Option 4: Render**

1. **Add environment variable:**
   - Dashboard → Your Service → Environment
   - Add: `CRON_SECRET` = `aAGHwZ2C8LE7zsBiOftTgVSUJ4r9v6PK`

2. **Add Cron Job:**
   - Dashboard → Create → Cron Job
   - Name: `calendar-reminders`
   - Schedule: `*/5 * * * *`
   - Command:
     ```bash
     curl -X POST \
       -H "Authorization: Bearer $CRON_SECRET" \
       https://your-app.onrender.com/api/calendar/reminders/cron
     ```

---

### **Option 5: External Cron Service**

Use a free cron service like **cron-job.org** or **EasyCron**:

1. **Sign up:** https://cron-job.org
2. **Create job:**
   - URL: `https://your-domain.com/api/calendar/reminders/cron`
   - Interval: Every 5 minutes
   - Method: POST
   - Headers:
     ```
     Authorization: Bearer aAGHwZ2C8LE7zsBiOftTgVSUJ4r9v6PK
     ```

---

## ✅ **VERIFY IT'S WORKING**

### **Test manually:**
```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3001/api/calendar/reminders/cron" `
  -Method POST `
  -Headers @{"Authorization"="Bearer aAGHwZ2C8LE7zsBiOftTgVSUJ4r9v6PK"}
```

**Expected response:**
```json
{
  "success": true,
  "processed": 0,
  "sent": 0,
  "failed": 0,
  "timestamp": "2025-11-01T..."
}
```

### **Check logs:**
- Look for: `🔔 Starting reminder processing...`
- Should run every 5 minutes
- Will show how many reminders were sent

---

## 📊 **SCHEDULE EXPLAINED**

`*/5 * * * *` means:
- `*/5` - Every 5 minutes
- `*` - Every hour
- `*` - Every day
- `*` - Every month
- `*` - Every day of week

**Result:** Runs 24/7, every 5 minutes

---

## 🔧 **TROUBLESHOOTING**

### **Cron not running:**
- Check `CRON_SECRET` is set correctly
- Verify URL is correct (localhost vs production)
- Check platform-specific cron logs
- Ensure app is deployed and running

### **401 Unauthorized:**
- Secret mismatch
- Check header format: `Bearer YOUR_SECRET`
- Verify secret has no extra spaces

### **500 Error:**
- Check database connection
- Verify migration was run
- Check application logs

### **No reminders sending:**
- Create test event with reminder in next 10 minutes
- Wait for cron to run
- Check if reminder was marked as sent in event metadata

---

## 🎯 **RECOMMENDED SETUP**

**For Production:**
- ✅ Use Vercel Cron (easiest)
- ✅ Or use external service (cron-job.org)

**For Development:**
- ✅ Manual testing is fine
- ✅ Or use PowerShell script in background

---

## 📝 **ENVIRONMENT VARIABLES CHECKLIST**

Make sure these are set:

**`.env.local` (Local):**
```env
CRON_SECRET=aAGHwZ2C8LE7zsBiOftTgVSUJ4r9v6PK
DATABASE_URL=your-database-url
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

**Production (Vercel/Railway/Render):**
```env
CRON_SECRET=aAGHwZ2C8LE7zsBiOftTgVSUJ4r9v6PK
DATABASE_URL=your-production-database-url
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## 🎉 **YOU'RE DONE!**

Once set up:
1. ✅ Cron runs every 5 minutes
2. ✅ Checks for events with reminders
3. ✅ Sends email/SMS automatically
4. ✅ Marks reminders as sent
5. ✅ Returns stats in response

**No further action needed!** 🚀

---

## 📞 **QUICK REFERENCE**

**Your Cron Secret:**
```
aAGHwZ2C8LE7zsBiOftTgVSUJ4r9v6PK
```

**API Endpoint:**
```
POST /api/calendar/reminders/cron
Header: Authorization: Bearer aAGHwZ2C8LE7zsBiOftTgVSUJ4r9v6PK
```

**Schedule:**
```
*/5 * * * * (every 5 minutes)
```

**Test Command (PowerShell):**
```powershell
Invoke-WebRequest -Uri "http://localhost:3001/api/calendar/reminders/cron" `
  -Method POST `
  -Headers @{"Authorization"="Bearer aAGHwZ2C8LE7zsBiOftTgVSUJ4r9v6PK"}
```

---

**Setup complete!** Choose your platform above and follow the steps. ✅

