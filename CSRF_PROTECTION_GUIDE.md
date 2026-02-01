# CSRF Protection Implementation Guide

## Overview

CSRF (Cross-Site Request Forgery) protection has been implemented to prevent malicious sites from making unauthorized requests using a user's authenticated session.

**Status:** ✅ Infrastructure complete, ready for API route migration

---

## How It Works

1. **Token Generation**: On GET requests, middleware automatically generates and sets CSRF tokens in cookies
2. **Token Validation**: State-changing requests (POST, PUT, DELETE, PATCH) must include valid CSRF token in header
3. **Automatic Injection**: Middleware handles token generation, API routes validate tokens

---

## For Backend Developers: Protecting API Routes

### Option 1: Using withCsrfProtection Wrapper (Recommended)

```typescript
// app/api/your-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withCsrfProtection } from '@/lib/security/csrf';

export const POST = withCsrfProtection(async (request: NextRequest) => {
  // Your handler code - CSRF already validated
  const data = await request.json();

  // ... your logic ...

  return NextResponse.json({ success: true });
});
```

### Option 2: Manual Validation

```typescript
// app/api/your-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateCsrfToken } from '@/lib/security/csrf';

export async function POST(request: NextRequest) {
  // Validate CSRF token
  if (!validateCsrfToken(request)) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    );
  }

  // Your handler code
  const data = await request.json();
  // ... your logic ...

  return NextResponse.json({ success: true });
}
```

---

## For Frontend Developers: Sending Protected Requests

### Option 1: Using useFetchWithCsrf Hook (Recommended)

```typescript
'use client';

import { useFetchWithCsrf } from '@/hooks/useCsrfToken';

export function MyComponent() {
  const fetchWithCsrf = useFetchWithCsrf();

  const handleSubmit = async () => {
    const response = await fetchWithCsrf('/api/your-endpoint', {
      method: 'POST',
      body: JSON.stringify({ data: 'value' }),
    });

    const result = await response.json();
    // Handle result
  };

  return <button onClick={handleSubmit}>Submit</button>;
}
```

### Option 2: Using useCsrfToken Hook

```typescript
'use client';

import { useCsrfToken } from '@/hooks/useCsrfToken';

export function MyComponent() {
  const csrfToken = useCsrfToken();

  const handleSubmit = async () => {
    const response = await fetch('/api/your-endpoint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({ data: 'value' }),
    });

    const result = await response.json();
    // Handle result
  };

  return <button onClick={handleSubmit}>Submit</button>;
}
```

### Option 3: Manual Token Retrieval

```typescript
import { getCsrfTokenForFetch } from '@/lib/security/csrf';

const token = getCsrfTokenForFetch();

await fetch('/api/your-endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-csrf-token': token,
  },
  body: JSON.stringify({ data: 'value' }),
});
```

---

## Migration Checklist

### Phase 1: High-Priority Routes (Start Here)
Routes that modify sensitive data should be migrated first:

- [ ] `/api/user/*` - User profile updates
- [ ] `/api/billing/*` - Payment operations
- [ ] `/api/team/*` - Team management
- [ ] `/api/admin/*` - Admin operations
- [ ] `/api/emails/send` - Email sending
- [ ] `/api/sms/send` - SMS sending

### Phase 2: Medium-Priority Routes
Routes with user-generated content:

- [ ] `/api/contacts/*` - Contact management
- [ ] `/api/calendar/*` - Calendar operations
- [ ] `/api/emails/delete` - Email deletion
- [ ] `/api/ai/*` - AI operations

### Phase 3: Lower-Priority Routes
Remaining state-changing routes:

- [ ] Any other POST/PUT/DELETE/PATCH endpoints

---

## Testing CSRF Protection

### Test Valid Request

```bash
# 1. Get CSRF token (simulated browser GET)
curl -c cookies.txt http://localhost:3000/

# 2. Extract token from cookie
TOKEN=$(grep csrf-token cookies.txt | awk '{print $7}')

# 3. Make protected request with token
curl -b cookies.txt \
  -H "x-csrf-token: $TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"test": "data"}' \
  http://localhost:3000/api/your-endpoint
```

### Test Invalid Request (Should Fail)

```bash
# Try POST without token - should get 403
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' \
  http://localhost:3000/api/your-endpoint

# Expected response:
# {"success":false,"error":"Invalid CSRF token. Please refresh the page and try again.","code":"CSRF_VALIDATION_FAILED"}
```

---

## Exemptions

Some routes should NOT have CSRF protection:

### ✅ Exempt Routes (No CSRF Needed)
- Webhook endpoints (`/api/webhooks/*`) - Use signature verification instead
- Public API endpoints with API keys - Use API key auth instead
- OAuth callbacks (`/api/auth/callback/*`) - Use state parameter instead
- Health checks (`/api/health`) - Read-only
- GET requests - Already exempt by design

### Example: Webhook Without CSRF

```typescript
// app/api/webhooks/stripe/route.ts
export async function POST(request: NextRequest) {
  // Use webhook signature verification instead of CSRF
  const signature = request.headers.get('stripe-signature');
  // ... verify signature ...
}
```

---

## Troubleshooting

### Error: "Invalid CSRF token"

**Causes:**
1. Token cookie expired (24 hour lifetime)
2. User's browser blocks cookies
3. Frontend not sending token in header

**Solutions:**
1. Refresh the page to get new token
2. Check browser cookie settings
3. Verify `useCsrfToken` hook is used correctly

### Error: "No token provided in request"

**Cause:** Frontend not including `x-csrf-token` header

**Solution:**
```typescript
// Make sure to include header:
headers: {
  'x-csrf-token': csrfToken,
}
```

### Token Not Generated

**Cause:** Middleware not running on route

**Solution:** Check `middleware.ts` matcher config includes your route

---

## Security Considerations

1. **Token Lifetime**: 24 hours (configurable in `lib/security/csrf.ts`)
2. **Cookie Security**: httpOnly for secret, SameSite=Lax, Secure in production
3. **Token Rotation**: New token generated after expiry
4. **Constant-Time Comparison**: Protects against timing attacks

---

## Performance Impact

- **Token Generation**: ~1ms (only on first GET request)
- **Token Validation**: <1ms (hash comparison)
- **Cookie Size**: ~128 bytes (negligible)

---

## Example: Migrating Existing Route

### Before (No CSRF Protection)

```typescript
// app/api/contacts/create/route.ts
export async function POST(request: NextRequest) {
  const data = await request.json();
  // Create contact
  return NextResponse.json({ success: true });
}
```

### After (With CSRF Protection)

```typescript
// app/api/contacts/create/route.ts
import { withCsrfProtection } from '@/lib/security/csrf';

export const POST = withCsrfProtection(async (request: NextRequest) => {
  const data = await request.json();
  // Create contact
  return NextResponse.json({ success: true });
});
```

### Frontend Update

```typescript
// Before
await fetch('/api/contacts/create', {
  method: 'POST',
  body: JSON.stringify(data),
});

// After
const fetchWithCsrf = useFetchWithCsrf();
await fetchWithCsrf('/api/contacts/create', {
  method: 'POST',
  body: JSON.stringify(data),
});
```

---

## Next Steps

1. **Start with high-priority routes** - Migrate `/api/user/*`, `/api/billing/*`, `/api/admin/*`
2. **Test thoroughly** - Verify protected routes work with valid tokens, reject without
3. **Update frontend components** - Use `useFetchWithCsrf` or `useCsrfToken` hooks
4. **Monitor errors** - Check logs for CSRF validation failures
5. **Document exemptions** - Note any routes that intentionally skip CSRF (webhooks, etc.)

---

## Files Created

- `lib/security/csrf.ts` - Core CSRF logic
- `hooks/useCsrfToken.ts` - React hooks for frontend
- `middleware.ts` - Updated with CSRF token injection
- `CSRF_PROTECTION_GUIDE.md` - This guide

---

**Status:** Infrastructure complete, ready for gradual rollout to API routes ✅
