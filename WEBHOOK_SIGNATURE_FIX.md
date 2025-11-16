# Webhook Signature Verification Fix

## Problem
Webhook requests from Nylas were failing with "Invalid webhook signature" errors (401 status).

## Changes Made

### 1. Enhanced Signature Header Handling
- Added case-insensitive header lookup for `x-nylas-signature`
- Improved error logging when signature header is missing

### 2. Improved Signature Verification (`lib/nylas-v3/webhooks.ts`)
- Added signature trimming to remove whitespace
- Explicit UTF-8 encoding specification for payload
- Enhanced error logging with signature prefixes and payload hash
- Better error messages for debugging

### 3. Enhanced Error Logging
Both webhook endpoints now log:
- Signature length
- Payload length
- Whether webhook secret is configured
- Signature prefixes (first 12-16 chars) for comparison
- Payload hash for verification

## Troubleshooting Steps

### 1. Verify Webhook Secret Configuration

**Check in Nylas Dashboard:**
1. Go to your Nylas Dashboard
2. Navigate to Webhooks section
3. Find your webhook endpoint
4. Copy the **Webhook Secret** shown there

**Check in Production Environment:**
```bash
# Verify the secret is set
echo $NYLAS_WEBHOOK_SECRET

# Check if it matches what Nylas shows
```

**Common Issues:**
- Secret has extra spaces or newlines
- Secret was copied incorrectly
- Secret was regenerated in Nylas but not updated in environment variables

### 2. Check Logs for Signature Details

After deploying the fix, check your logs for entries like:
```
[Webhook] Signature verification: {
  receivedLength: 64,
  expectedLength: 64,
  receivedPrefix: "abc123...",
  expectedPrefix: "def456...",
  payloadLength: 1234,
  payloadHash: "789abc..."
}
```

**What to look for:**
- If `receivedLength` ≠ `expectedLength`: Signature format mismatch
- If prefixes don't match: Webhook secret mismatch
- If `payloadHash` changes between requests: Payload is being modified

### 3. Verify Payload Integrity

**Potential Issues:**
- **Cloudflare/Proxy**: May modify request body
- **Next.js Middleware**: May parse/transform body before webhook handler
- **Body Parsing**: Ensure `request.text()` is called before any JSON parsing

**Solution:**
- Ensure webhook endpoint reads raw body with `request.text()`
- Check if any middleware processes webhook routes
- Verify Cloudflare/proxy settings allow raw POST bodies

### 4. Test Webhook Secret

Create a test script to verify your secret:

```typescript
import crypto from 'crypto';

const webhookSecret = process.env.NYLAS_WEBHOOK_SECRET;
const testPayload = JSON.stringify({ test: 'data' });

const hmac = crypto.createHmac('sha256', webhookSecret);
hmac.update(testPayload, 'utf8');
const signature = hmac.digest('hex');

console.log('Test signature:', signature);
console.log('Secret length:', webhookSecret?.length);
```

### 5. Verify Webhook URL Configuration

**In Nylas Dashboard:**
- Ensure webhook URL is correct: `https://www.easemail.app/api/webhooks/nylas`
- Check if webhook is verified (should show green checkmark)
- Verify webhook secret matches environment variable

## Common Causes

1. **Webhook Secret Mismatch** (Most Common)
   - Secret in Nylas doesn't match `NYLAS_WEBHOOK_SECRET` env var
   - Solution: Update environment variable to match Nylas dashboard

2. **Payload Modification**
   - Middleware or proxy modifying request body
   - Solution: Ensure webhook routes bypass body parsing middleware

3. **Signature Header Missing**
   - Proxy stripping headers
   - Solution: Configure proxy to pass through `X-Nylas-Signature` header

4. **Encoding Issues**
   - Payload encoding mismatch
   - Solution: Explicitly use UTF-8 encoding (now implemented)

## Next Steps

1. **Deploy the fix** to production
2. **Monitor logs** for enhanced error messages
3. **Compare** received vs expected signature prefixes
4. **Verify** webhook secret matches Nylas dashboard
5. **Check** if payload is being modified by middleware/proxy

## Verification

After deploying, you should see in logs:
- Detailed signature comparison
- Payload hash for verification
- Clear error messages indicating the specific issue

If errors persist, the logs will now show exactly what's different between received and expected signatures, making it easier to diagnose the root cause.

