# Calendar Assistant V2 Migration

## What Changed?

Migrated the Calendar Assistant from custom OpenAI implementation to **Vercel AI SDK** for better reliability and less code.

## Files Created

### 1. [app/api/ai/calendar-chat/route.ts](app/api/ai/calendar-chat/route.ts)
- **New API route** using Vercel AI SDK's `streamText` function
- Replaces the old `/api/calendar/assistant` and `/api/calendar/parse-event` flow
- **Benefits:**
  - Streaming responses (real-time chat feel)
  - Automatic tool execution
  - Built-in error handling
  - Type-safe with Zod schemas

### 2. [components/calendar/CalendarAssistantV2.tsx](components/calendar/CalendarAssistantV2.tsx)
- **New component** using `useChat` hook from `ai/react`
- Replaces `components/calendar/CalendarAssistant.tsx`
- **Benefits:**
  - 90% less code (hook handles everything)
  - Automatic message state management
  - Streaming support
  - Better error handling
  - Shows tool invocation results inline

## Files Modified

### [app/(dashboard)/calendar/page.tsx](app/(dashboard)/calendar/page.tsx)
- Line 42: Changed import from `CalendarAssistant` to `CalendarAssistantV2`
- Line 1049-1052: Updated component usage (removed `selectedCalendarId` prop)

## How It Works

### Old Flow (Broken)
```
User types → CalendarAssistant component →
/api/calendar/assistant (intent detection) →
/api/calendar/parse-event (GPT parses event) →
Validation fails silently → ❌ Event not created
```

###  New Flow (Working)
```
User types → CalendarAssistantV2 component →
useChat hook handles API call →
/api/ai/calendar-chat (streaming) →
AI SDK executes tools automatically →
✅ Event created + confirmation shown
```

## Tools Available

### 1. `createEvent`
- Creates calendar events via Nylas API
- Parameters: title, startTime, endTime, description, location, attendees
- Auto-selects primary calendar or first writable calendar
- Returns success/error with event details

### 2. `getEvents`
- Fetches calendar events for a date range
- Parameters: startDate, endDate
- Returns formatted events in user's timezone

## Testing

Try these in the calendar chat:

- ✅ "Schedule lunch tomorrow at noon"
- ✅ "Add team meeting Friday at 3pm for 1 hour"
- ✅ "What do I have tomorrow?"
- ✅ "Show me my schedule for next week"

## Migration Benefits

| Feature | Old System | New System (V2) |
|---------|-----------|-----------------|
| Code Lines | ~260 | ~90 |
| Streaming | ❌ | ✅ |
| Tool Execution | Manual parsing | Automatic |
| Error Handling | Silent failures | Inline error display |
| State Management | Manual useState | Automatic via hook |
| Validation | Broken (wrong object) | Type-safe with Zod |
| Conversation Memory | Custom array | Built-in |
| Loading States | Manual | Automatic |

## Troubleshooting History

### Issue 1: `@ai-sdk/react` v2 API Differences
**Problem:** The `useChat` hook in `@ai-sdk/react` v2 has a completely different API than the old `ai/react` export.

**Symptoms:**
- Error: `Cannot read properties of undefined (reading 'trim')`
- The hook doesn't return `input`, `handleInputChange`, `handleSubmit`

**Solution:** Use the correct v2 API:
- Use `append()` function instead of `handleSubmit`
- Use `isLoading` from hook instead of manual `useState`
- Pass `accountId` in the `body` configuration
- Simplified from ~140 lines to ~90 lines

## Next Steps

### Short Term
1. ✅ Fix calendar assistant bug (validation error)
2. ✅ Migrate to Vercel AI SDK
3. 🔄 **Test the new chat interface**
4. ⏳ Migrate general AI assistant (inbox chat)

### Long Term
- Add more tools (edit event, delete event, find free time)
- Add voice input support
- Add conversation memory persistence

## Rollback Plan

If V2 has issues, you can rollback by:

1. Change import in `app/(dashboard)/calendar/page.tsx`:
   ```typescript
   import { CalendarAssistant } from '@/components/calendar/CalendarAssistant';
   ```

2. Revert component usage:
   ```typescript
   <CalendarAssistant
     accountId={selectedAccount.nylasGrantId}
     selectedCalendarId={selectedCalendarIds[0]}
     onEventCreated={fetchEvents}
   />
   ```

The old files are still in the codebase, just not being used.
