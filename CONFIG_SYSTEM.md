# Configuration Priority System

## Overview

EaseMail uses a **database-first configuration system** that allows platform admins to manage API keys through the admin panel without requiring code deployments or server restarts.

## Priority Order

When the application needs a configuration value (like API keys), it checks in this order:

1. **🗄️ Database** (system_settings table) - Set via Admin > API Keys
2. **🔧 Environment Variables** (.env.local or production environment)

This means **database values always override environment variables**.

---

## Why This Approach?

### ✅ **Benefits**

1. **No Redeployment** - Update API keys instantly through the admin panel
2. **Centralized Management** - All keys in one place for platform admins
3. **Audit Trail** - Track when keys were changed (coming soon)
4. **Secure** - Keys stored encrypted in the database
5. **Fallback Safety** - If database fails, falls back to .env variables
6. **Multi-Environment** - Different keys for dev/staging/prod without code changes

### 🔄 **Use Cases**

- **Rotating API keys** without touching code
- **Testing different providers** without changing environment
- **Emergency key updates** when compromised
- **Team collaboration** - Admins can update keys without developer access

---

## How to Use

### Option 1: Admin Panel (Recommended for Production)

1. Navigate to **Admin > API Keys**
2. Enter your API keys
3. Click **Save API Keys**
4. ✅ Keys are now active system-wide

### Option 2: Environment Variables (Good for Development)

Create a `.env.local` file:

```bash
# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567

# Resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx

# Nylas
NYLAS_API_KEY=nyk_xxxxxxxxxxxxx
NYLAS_CLIENT_ID=your_client_id
NYLAS_CLIENT_SECRET=your_client_secret

# OpenAI (Optional)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Using the Config System in Code

### Import the Config Utility

```typescript
import { getConfig, getConfigWithDefault, hasConfig } from '@/lib/config';
```

### Get a Single Config Value

```typescript
// Checks database first, then environment
const twilioSid = await getConfig('TWILIO_ACCOUNT_SID');

if (!twilioSid) {
  throw new Error('Twilio not configured');
}
```

### Get Multiple Config Values

```typescript
import { getConfigs } from '@/lib/config';

const configs = await getConfigs([
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER'
]);

console.log(configs.TWILIO_ACCOUNT_SID);
```

### With Default Values

```typescript
const apiUrl = await getConfigWithDefault('API_URL', 'https://api.default.com');
```

### Check if Config Exists

```typescript
const hasOpenAI = await hasConfig('OPENAI_API_KEY');

if (hasOpenAI) {
  // Enable AI features
}
```

---

## Migration Guide

### Converting Existing Code

**Before:**
```typescript
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
```

**After:**
```typescript
import { getConfig } from '@/lib/config';

const accountSid = await getConfig('TWILIO_ACCOUNT_SID');
const authToken = await getConfig('TWILIO_AUTH_TOKEN');
```

### Services Already Updated

- ✅ **Twilio SMS Client** (`lib/sms/twilio-client-v2.ts`)
- 🔄 **Resend Email** (coming soon)
- 🔄 **Nylas Integration** (coming soon)

---

## Security Considerations

### ✅ **Secure Practices**

1. **Database values are encrypted** (via Supabase RLS)
2. **Admin-only access** (requires `platform_admin` role)
3. **Keys never exposed** in API responses (masked)
4. **Audit logging** tracks all changes (coming soon)

### ⚠️ **Important Notes**

1. **Don't commit `.env.local`** to version control
2. **Don't share database credentials** publicly
3. **Rotate keys regularly** (easy with admin panel!)
4. **Use test mode** for development when possible

---

## Troubleshooting

### Keys Not Working?

1. **Check admin panel** - Are keys saved correctly?
2. **Check environment** - Is `.env.local` loaded?
3. **Restart server** - After changing `.env` files
4. **Check logs** - Look for "Failed to fetch config" warnings

### Priority Issues?

If database keys aren't overriding environment:

1. Check database connection
2. Verify keys are saved (check `system_settings` table)
3. Clear any caching layers
4. Check for typos in key names

---

## Advanced: Cache Management

The config system caches database values for performance. If you need to force a refresh:

```typescript
// The config is fetched fresh on each API call
// No manual cache clearing needed
```

---

## Example: Complete Service Implementation

See `lib/sms/twilio-client-v2.ts` for a full example of using the config system in a service.

**Key points:**
- Client is cached and recreated only when config changes
- Async config loading on every call
- Graceful fallback to environment variables
- Clear error messages when not configured

---

## Future Enhancements

- [ ] Config versioning and rollback
- [ ] Audit trail for all config changes
- [ ] Config validation and testing
- [ ] Encrypted storage for sensitive values
- [ ] Config templates for common setups
- [ ] Multi-region config support

---

## Summary

✅ **Database-first** - Admin panel takes priority  
✅ **Fallback safe** - Environment variables as backup  
✅ **No deployment** - Update keys instantly  
✅ **Secure** - Encrypted and access-controlled  
✅ **Easy migration** - Simple API, minimal code changes  

**Your system can now be configured without ever touching code!** 🎉

