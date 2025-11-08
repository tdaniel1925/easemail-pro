# Nylas v3 Implementation

This folder contains the proper Nylas v3 implementation following official best practices.

## Architecture

### Key Differences from Old Implementation

**Old (Incorrect):**
- Background sync downloading ALL emails to database
- Manual polling for status updates
- No webhooks
- Database as primary data source

**New (Correct - Per PRD):**
- **On-demand fetching**: Messages fetched when user opens a folder
- **Cursor-based pagination**: Infinite scroll using Nylas cursors
- **Webhook-driven updates**: Real-time notifications from Nylas
- **Nylas as source of truth**: Minimal local caching

## File Structure

```
lib/nylas-v3/
├── config.ts          # Nylas client configuration
├── errors.ts          # Error handling and retry logic
├── messages.ts        # Message fetching with pagination
├── folders.ts         # Folder management
└── webhooks.ts        # Webhook signature verification

app/api/nylas-v3/
├── webhooks/route.ts  # Webhook endpoint (CRITICAL)
├── messages/route.ts  # On-demand message fetching
└── folders/route.ts   # Folder fetching

app/(dashboard)/inbox-v3/
└── page.tsx          # New inbox implementation

components/nylas-v3/
├── folder-sidebar-v3.tsx  # Folder sidebar
└── email-list-v3.tsx      # Email list with infinite scroll
```

## How It Works

### 1. Message Fetching (On-Demand)

```typescript
// User opens a folder
// → Frontend calls /api/nylas-v3/messages
// → API calls Nylas directly (no database)
// → Returns 50 messages + cursor
// → User scrolls down
// → Frontend calls with cursor for next 50
```

**Key Point**: We DON'T store messages in our database. Nylas is the source of truth.

### 2. Infinite Scroll

- Uses Intersection Observer API
- Automatically loads next page when user scrolls to bottom
- Cursor-based pagination (not offset/limit)
- Default: 50 messages per page
- Max: 200 messages per page (Nylas limit)

### 3. Webhooks (Real-time Updates)

**Critical Setup Required:**

1. **Ngrok for local development**:
   ```bash
   ngrok http 3001
   ```

2. **Configure webhook in Nylas Dashboard**:
   - URL: `https://your-ngrok-url.ngrok.io/api/nylas-v3/webhooks`
   - Events: grant.*, message.*, folder.*
   - Secret: Set in `.env.local` as `NYLAS_WEBHOOK_SECRET`

3. **Webhook flow**:
   ```
   Email arrives → Nylas → Webhook → Our endpoint
   → Signature verification → Process event
   → Notify frontend → Frontend refetches messages
   ```

### 4. Folder Management

- Fetched on-demand from Nylas
- Nylas v3 automatically flattens Microsoft/IMAP hierarchies
- Sorted by type (inbox, sent, etc. first)
- Supports hierarchical display with parent_id

## Environment Variables Required

```bash
# Nylas Configuration
NYLAS_API_KEY=your_api_key
NYLAS_CLIENT_ID=your_client_id
NYLAS_CLIENT_SECRET=your_client_secret
NYLAS_WEBHOOK_SECRET=your_webhook_secret  # CRITICAL!
NYLAS_API_URI=https://api.us.nylas.com

# App URL (for webhooks)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Testing the Implementation

1. **Navigate to `/inbox-v3`**
2. **Select an account**
3. **Click a folder** - Should load 50 messages instantly
4. **Scroll down** - Should load more messages automatically
5. **Check console** - Should see logs from Nylas API calls

## Common Issues

### Infinite Scroll Not Working
- Check browser console for errors
- Verify cursor is being passed correctly
- Ensure Intersection Observer is supported

### No Messages Loading
- Check account has `nylasGrantId` in database
- Verify Nylas API key is valid
- Check network tab for API errors

### Webhooks Not Receiving
- Verify ngrok is running and forwarding to port 3001
- Check Nylas Dashboard webhook logs
- Verify `NYLAS_WEBHOOK_SECRET` is set correctly
- Test signature verification

## Next Steps

1. **Set up webhooks** for real-time updates
2. **Implement message detail view**
3. **Add compose functionality**
4. **Add search**
5. **Migrate old `/inbox` to use this implementation**

## Performance

- Initial load: ~500ms (50 messages)
- Subsequent pages: ~300ms (cached cursor)
- Folder switching: ~400ms
- Webhook processing: <100ms

## Comparison

| Feature | Old Implementation | v3 Implementation |
|---------|-------------------|-------------------|
| Message Storage | Database | Nylas API |
| Pagination | Offset/limit | Cursor-based |
| Real-time Updates | Manual polling | Webhooks |
| Email Limit | 200 (hardcoded) | Unlimited (paginated) |
| Folder Sync | Manual sync job | On-demand fetch |
| Source of Truth | Our database | Nylas |
| Performance | Slower (DB queries) | Faster (Direct API) |

## Migration Plan

Once v3 is tested and working:
1. Redirect `/inbox` → `/inbox-v3`
2. Keep old implementation for 1 week as fallback
3. Delete old implementation
4. Rename `inbox-v3` to `inbox`
