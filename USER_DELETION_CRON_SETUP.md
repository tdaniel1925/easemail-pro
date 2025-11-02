# 60-Day User Deletion Cron Job Setup

## Overview

Users that are deactivated for more than 60 days are automatically deleted to maintain data hygiene and comply with data retention policies.

## How It Works

1. Admin deactivates a user → `accountStatus` set to `'deactivated'`, `deactivatedAt` timestamp recorded
2. User stays in database for 60 days (grace period)
3. After 60 days, cron job runs and deletes the user permanently
4. All related data is cascade deleted (emails, contacts, etc.)

## Setup Instructions

### 1. Environment Variable

Add to `.env.local`:

```bash
CRON_SECRET=your-super-secret-key-here
```

**Generate a secure secret:**
```bash
openssl rand -base64 32
```

### 2. Vercel Cron Configuration

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-deactivated-users",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Schedule Explanation:**
- `0 2 * * *` = Runs daily at 2:00 AM UTC
- Change to `0 2 * * 0` for weekly (Sunday at 2 AM)
- Change to `0 2 1 * *` for monthly (1st of month at 2 AM)

### 3. Manual Testing

**Preview users that would be deleted:**
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-domain.com/api/cron/cleanup-deactivated-users
```

**Actually delete users:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-domain.com/api/cron/cleanup-deactivated-users
```

### 4. Local Development Testing

```bash
# Set environment variable
export CRON_SECRET="your-secret-key"

# Preview (GET request)
curl -H "Authorization: Bearer your-secret-key" \
  http://localhost:3000/api/cron/cleanup-deactivated-users

# Execute deletion (POST request)
curl -X POST \
  -H "Authorization: Bearer your-secret-key" \
  http://localhost:3000/api/cron/cleanup-deactivated-users
```

## Response Format

**Success Response:**
```json
{
  "success": true,
  "message": "Successfully deleted 5 user(s)",
  "deletedCount": 5,
  "deletedUsers": [
    {
      "id": "uuid-here",
      "email": "user@example.com",
      "deactivatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Preview Response (GET):**
```json
{
  "success": true,
  "message": "Found 5 user(s) that would be deleted",
  "count": 5,
  "users": [
    {
      "id": "uuid-here",
      "email": "user@example.com",
      "fullName": "John Doe",
      "deactivatedAt": "2024-01-01T00:00:00.000Z",
      "daysDeactivated": 75
    }
  ]
}
```

## Monitoring

### Check Logs in Vercel

1. Go to Vercel Dashboard
2. Select your project
3. Click "Functions" tab
4. Find `/api/cron/cleanup-deactivated-users`
5. View execution logs

### Set Up Alerts

Consider adding monitoring:
- Email notification if deletion count > expected
- Slack webhook for daily summary
- Log to external service (Sentry, LogRocket, etc.)

## Security Considerations

✅ **Authorization Required**: Endpoint requires `CRON_SECRET` in Authorization header
✅ **Cascade Delete**: Database handles deletion of related records
✅ **Audit Trail**: Deletion event should be logged before deletion
✅ **60-Day Grace Period**: Gives time to recover if deactivation was accidental

## FAQ

**Q: What if I want to change the deletion period?**
A: Modify the calculation in `/app/api/cron/cleanup-deactivated-users/route.ts`:
```typescript
const sixtyDaysAgo = new Date();
sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 90); // Change to 90 days
```

**Q: Can I recover a deleted user?**
A: No, deletion is permanent. Users are kept for 60 days to prevent accidental loss.

**Q: What happens to the user's email accounts?**
A: They are cascade deleted along with all emails, contacts, and other data.

**Q: How do I temporarily disable the cron job?**
A: Remove the cron config from `vercel.json` or change the `CRON_SECRET` env variable.

## Alternative: Manual Cleanup

If you don't want automatic deletion, you can manually run cleanup via admin panel:

```typescript
// Add this to your admin dashboard
const handleManualCleanup = async () => {
  const response = await fetch('/api/cron/cleanup-deactivated-users', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CRON_SECRET}`,
    },
  });
  
  const data = await response.json();
  console.log(`Deleted ${data.deletedCount} users`);
};
```

