# Windows Task Scheduler Setup for Folder Monitoring

## Quick Setup (5 Minutes)

### Step 1: Create the Scheduled Task

1. **Open Task Scheduler**
   - Press `Win + R`
   - Type `taskschd.msc`
   - Press Enter

2. **Create New Task**
   - Click "Create Task" (not "Create Basic Task")
   - Name: `EaseMail Folder Monitor`
   - Description: `Monitors and auto-fixes folder assignment issues`
   - Check "Run whether user is logged on or not"
   - Check "Run with highest privileges"

### Step 2: Configure Trigger

Click "Triggers" tab → "New":
- **Begin the task:** On a schedule
- **Settings:** Daily
- **Recur every:** 1 days
- **Repeat task every:** 5 minutes
- **For a duration of:** Indefinitely
- **Stop task if it runs longer than:** 30 minutes
- **Enabled:** ✓ Checked

### Step 3: Configure Action

Click "Actions" tab → "New":
- **Action:** Start a program
- **Program/script:** `C:\dev\EaseMail - The Future\scripts\run-folder-monitor.bat`
- **Start in:** `C:\dev\EaseMail - The Future`

### Step 4: Configure Settings

Click "Settings" tab:
- ✓ Allow task to be run on demand
- ✓ Run task as soon as possible after a scheduled start is missed
- ✓ If the task fails, restart every: 1 minute (attempt up to 3 times)
- Stop the task if it runs longer than: 30 minutes
- If the running task does not end when requested, force it to stop

### Step 5: Save & Test

1. Click "OK"
2. Enter your Windows password if prompted
3. Right-click the task → "Run" to test
4. Check `logs\folder-monitor.log` for output

---

## Alternative: PowerShell Script

If you prefer PowerShell, use this:

### Create PowerShell Script

Save as `scripts/run-folder-monitor.ps1`:

```powershell
# Folder Monitor - PowerShell Version
Set-Location "C:\dev\EaseMail - The Future"

# Create logs directory
if (!(Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs"
}

# Run monitor
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Output "[$timestamp] Starting folder monitor..." | Out-File -Append logs\folder-monitor.log

npm run monitor-folders -- --once --auto-heal 2>&1 | Out-File -Append logs\folder-monitor.log

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Output "[$timestamp] Monitor check completed`n" | Out-File -Append logs\folder-monitor.log
```

Then in Task Scheduler:
- **Program/script:** `powershell.exe`
- **Add arguments:** `-ExecutionPolicy Bypass -File "C:\dev\EaseMail - The Future\scripts\run-folder-monitor.ps1"`

---

## View Logs

### Real-time Monitoring (PowerShell)

```powershell
Get-Content "logs\folder-monitor.log" -Wait -Tail 50
```

### Last 100 Lines

```powershell
Get-Content "logs\folder-monitor.log" -Tail 100
```

---

## Configuration Options

Edit the batch/PowerShell script to change options:

### Check Every 10 Minutes (Instead of 5)

In Task Scheduler trigger: Set "Repeat task every" to `10 minutes`

### Monitor Only (No Auto-Heal)

Change the script line to:
```batch
npm run monitor-folders -- --once
```

### Custom Alert Threshold

```batch
npm run monitor-folders -- --once --auto-heal --alert-threshold=10
```

---

## Verify It's Working

### Check Task Status

1. Open Task Scheduler
2. Find "EaseMail Folder Monitor"
3. View "Last Run Result" (should be 0x0 for success)
4. View "Last Run Time"
5. View "Next Run Time"

### Check Logs

```powershell
cd "C:\dev\EaseMail - The Future"
Get-Content logs\folder-monitor.log -Tail 50
```

Should show entries like:
```
[2025-11-02 17:35:00] Starting folder monitor...
🔍 Running folder sync check
   Checking 2,543 recent emails...
   📊 Check Results:
      Checked: 2,543 emails
      Issues found: 0
      Healed: 0
[2025-11-02 17:35:02] Monitor check completed
```

---

## Troubleshooting

### Task Not Running

1. Check Task Scheduler History (View → Show All Running Tasks)
2. Verify the path in the script is correct
3. Ensure npm is in system PATH
4. Try running the batch file manually first

### No Logs Generated

1. Create `logs` folder manually: `mkdir logs`
2. Check file permissions
3. Run as Administrator once

### Script Errors

Run manually to see errors:
```batch
cd "C:\dev\EaseMail - The Future"
scripts\run-folder-monitor.bat
```

---

## Slack Alerts (Optional)

To get notified of issues:

1. Create Slack webhook: https://api.slack.com/messaging/webhooks
2. Add to `.env.local`:
   ```
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   ```
3. Restart the task

You'll receive alerts like:
```
🚨 WARNING: Folder Sync Alert
Message: Folder sync issues detected: 52 mismatches found
Issues Detected: 52
Auto-Healed: 52
```

---

## Status: Ready to Deploy

✅ Runs every 5 minutes  
✅ Auto-heals issues  
✅ Logs all activity  
✅ Restarts on failure  
✅ Windows native solution  

**Your folder sync is now monitored 24/7!** 🛡️

