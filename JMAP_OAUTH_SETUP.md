# Fastmail JMAP OAuth Setup Guide

## Current Implementation ✅

The app currently uses **API Token authentication** for JMAP:
- Users generate API tokens in Fastmail Settings → Privacy & Security → Integrations
- Tokens are stored encrypted in the database
- Works immediately without OAuth registration

## OAuth Implementation (Future) 🚧

### Why OAuth?
- Better user experience (no manual token copying)
- More secure (tokens can be revoked from Fastmail)
- Standard OAuth 2.0 flow
- Automatic token refresh

### Steps to Implement OAuth

#### 1. Register App with Fastmail
Contact Fastmail to register your application. Provide:
- **Client Name**: EaseMail
- **Client Description**: Modern email client with JMAP support
- **Logo URL**: Your app logo
- **Support Contact**: Your support email
- **Redirect URIs**:
  - Production: `https://yourdomain.com/api/jmap/oauth/callback`
  - Development: `http://localhost:3001/api/jmap/oauth/callback`
- **CORS Origins**: Your app domains for web-based access
- **Scopes Required**:
  - `urn:ietf:params:jmap:core` (mandatory)
  - `urn:ietf:params:jmap:mail` (read/manage mail)
  - `urn:ietf:params:jmap:submission` (send mail)
  - `urn:ietf:params:jmap:vacationresponse` (optional)

#### 2. Get Credentials
Fastmail will provide:
- `client_id`
- `client_secret`

Store these in environment variables:
```env
FASTMAIL_OAUTH_CLIENT_ID=your_client_id
FASTMAIL_OAUTH_CLIENT_SECRET=your_client_secret
FASTMAIL_OAUTH_REDIRECT_URI=https://yourdomain.com/api/jmap/oauth/callback
```

#### 3. Implement OAuth Flow

**A. Authorization Request** (`/api/jmap/oauth/authorize/route.ts`)
```typescript
const authUrl = new URL('https://api.fastmail.com/oauth/authorize');
authUrl.searchParams.set('client_id', process.env.FASTMAIL_OAUTH_CLIENT_ID!);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('redirect_uri', process.env.FASTMAIL_OAUTH_REDIRECT_URI!);
authUrl.searchParams.set('scope', 'urn:ietf:params:jmap:core urn:ietf:params:jmap:mail urn:ietf:params:jmap:submission');
authUrl.searchParams.set('state', generateRandomState()); // CSRF protection

// Redirect user to authUrl
```

**B. Handle Callback** (`/api/jmap/oauth/callback/route.ts`)
```typescript
// 1. Extract authorization code from query params
const code = searchParams.get('code');
const state = searchParams.get('state');

// 2. Validate state (CSRF protection)

// 3. Exchange code for access token
const tokenResponse = await fetch('https://api.fastmail.com/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: process.env.FASTMAIL_OAUTH_CLIENT_ID!,
    client_secret: process.env.FASTMAIL_OAUTH_CLIENT_SECRET!,
    redirect_uri: process.env.FASTMAIL_OAUTH_REDIRECT_URI!,
  }),
});

const { access_token, refresh_token } = await tokenResponse.json();

// 4. Create JMAP client with access token
const jmapClient = createFastmailJMAPClient(access_token);

// 5. Store encrypted tokens in database
// 6. Redirect to success page
```

#### 4. Update Database Schema
Add fields for OAuth tokens:
```sql
ALTER TABLE email_accounts ADD COLUMN oauth_access_token TEXT;
ALTER TABLE email_accounts ADD COLUMN oauth_refresh_token TEXT;
ALTER TABLE email_accounts ADD COLUMN oauth_token_expires_at TIMESTAMP;
```

#### 5. Implement Token Refresh
```typescript
async function refreshAccessToken(refreshToken: string) {
  const response = await fetch('https://api.fastmail.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.FASTMAIL_OAUTH_CLIENT_ID!,
      client_secret: process.env.FASTMAIL_OAUTH_CLIENT_SECRET!,
    }),
  });

  return await response.json();
}
```

#### 6. Update UI
Add OAuth button to `AddIMAPAccount.tsx`:
```tsx
<Button onClick={() => window.location.href = '/api/jmap/oauth/authorize'}>
  Connect with OAuth
</Button>
```

### References
- [Fastmail OAuth Docs](https://www.fastmail.com/dev/)
- [RFC 6749 - OAuth 2.0 Authorization Framework](https://tools.ietf.org/html/rfc6749)
- [JMAP Spec](https://jmap.io/)

### Testing
1. Development: Use ngrok or similar to test OAuth callbacks locally
2. Production: Ensure HTTPS is configured
3. Test token refresh before expiry

### Security Notes
- Always use HTTPS for OAuth callbacks
- Implement CSRF protection with state parameter
- Store tokens encrypted in database
- Never expose client_secret in client-side code
- Implement token refresh before expiry
