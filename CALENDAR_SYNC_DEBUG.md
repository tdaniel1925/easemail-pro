# Calendar Sync Debug Report

## 🔍 Issues Identified

### 1. **Primary Issue: Scope Retrieval from Nylas API**

**Problem**: The code was uncertain about which field contains scopes in the Nylas v3 API response, trying 4 different paths.

**Location**: `lib/email/nylas-client.ts:82-86`

**Root Cause**: The Nylas v3 API returns grants in this structure:
```json
{
  "data": {
    "id": "grant-id",
    "provider": "google",
    "scope": ["https://www.googleapis.com/auth/calendar", ...],
    "email": "user@example.com"
  },
  "request_id": "..."
}
```

The scope field is at `data.scope` (singular), not `data.scopes` (plural).

**Impact**: If scopes aren't retrieved correctly, they're saved as an empty array `[]`, causing calendar sync to fail with:
> "Calendar access not granted. Please reconnect with calendar permissions."

**Fix Applied**: ✅
- Updated scope retrieval to correctly access `grantData.data.scope`
- Added validation to ensure scopes is an array
- Improved logging to show response structure and scope validation

---

### 2. **Scope Validation Issues**

**Problem**: Basic scope checking didn't differentiate between:
- Missing scopes (null/undefined)
- Empty scope array (user denied permissions)
- Invalid scope format (not an array)
- Valid scopes without calendar access

**Location**: `lib/calendar/nylas-calendar-sync.ts:41-56`

**Fix Applied**: ✅
- Added explicit validation for scope format
- Added separate error messages for each scenario
- Improved logging to show exactly which scopes are available

---

### 3. **Multiple Sync Implementations**

**Observation**: Three different calendar sync routes exist:
- `/api/calendar/sync/nylas` (✅ Currently used)
- `/api/calendar/sync/google` (❓ Unused)
- `/api/calendar/sync/microsoft` (❓ Unused)

**Recommendation**: Consider deprecating the unused Google/Microsoft direct sync routes to reduce code duplication.

---

## 🔧 Fixes Applied

### File: `lib/email/nylas-client.ts`

**Changes**:
1. Improved API response structure logging
2. Corrected scope retrieval to use `grantData.data.scope`
3. Added array validation
4. Enhanced logging with calendar scope detection

### File: `lib/calendar/nylas-calendar-sync.ts`

**Changes**:
1. Added scope format validation
2. Added empty scope detection
3. Improved error messages for different failure scenarios
4. Enhanced logging with provider and scope details

### File: `app/api/debug/account-scopes/route.ts` (NEW)

**Purpose**: Diagnostic endpoint to check account scope configuration

**Usage**:
```bash
# Check all accounts
GET /api/debug/account-scopes

# Check specific account
GET /api/debug/account-scopes?accountId=<uuid>
```

**Returns**:
- Account details
- Raw scope data and validation
- Calendar scope availability
- Sync status
- Identified issues
- Recommendations

---

## 🧪 Testing Instructions

### 1. Test Existing Accounts

Check if your existing accounts have scopes saved:

```bash
curl http://localhost:3000/api/debug/account-scopes
```

**Expected Output**:
```json
{
  "success": true,
  "totalAccounts": 2,
  "accounts": [
    {
      "id": "...",
      "email": "user@gmail.com",
      "provider": "google",
      "scopes": {
        "isArray": true,
        "count": 6,
        "hasCalendar": true,
        "calendarScopes": [
          "https://www.googleapis.com/auth/calendar",
          "https://www.googleapis.com/auth/calendar.events"
        ]
      }
    }
  ]
}
```

**If scopes are empty or null**: The account needs to be reconnected with the fix in place.

---

### 2. Test New Account Connection

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Connect a new account** (or reconnect existing):
   - Go to Settings → Accounts
   - Click "Add Account" or "Reconnect"
   - Authorize with Google/Microsoft
   - **Important**: Make sure to grant calendar permissions when prompted

3. **Check the server logs** for these messages:
   ```
   🔍 Grant API Response Structure: { hasData: true, dataKeys: [...], ... }
   ✅ Scopes retrieved: { count: 6, scopes: [...], hasCalendar: true }
   ```

4. **Verify scopes were saved**:
   ```bash
   curl http://localhost:3000/api/debug/account-scopes?accountId=<account-id>
   ```

---

### 3. Test Calendar Sync

1. **Navigate to Calendar page**: `/calendar`

2. **Select the account** you want to sync

3. **Click "Sync" button**

4. **Check server logs** for detailed diagnostics:
   ```
   🔍 Checking calendar scopes for account: { ... }
   ✅ Calendar scopes verified: { hasCalendarAccess: true, ... }
   📅 Nylas Calendar sync completed: X events
   ```

5. **If sync fails**, check the error message:
   - "Account scopes are not properly configured" = Scopes not saved correctly
   - "No permissions granted during account connection" = Empty scopes array
   - "Calendar access not granted" = Scopes saved but no calendar permission

---

## 🐛 Troubleshooting

### Issue: "Calendar access not granted" error

**Diagnosis**:
```bash
curl http://localhost:3000/api/debug/account-scopes?accountId=<account-id>
```

**Possible Causes**:

1. **Empty scopes array** (`count: 0`)
   - **Cause**: User denied permissions during OAuth
   - **Fix**: Reconnect account and grant all permissions

2. **No calendar scopes** (`hasCalendar: false`)
   - **Cause**: OAuth request didn't include calendar scopes
   - **Fix**: Check `lib/email/nylas-client.ts:30-39` to ensure calendar scopes are requested
   - For Google: Should include `https://www.googleapis.com/auth/calendar`
   - For Microsoft: Should include `Calendars.ReadWrite`

3. **Scopes not an array** (`isArray: false`)
   - **Cause**: Scope retrieval logic failed
   - **Fix**: Check server logs during OAuth callback for API response structure

4. **Null/undefined scopes** (`raw: null`)
   - **Cause**: Scopes weren't saved to database
   - **Fix**: Check `app/api/nylas/callback/route.ts:117,139` to ensure scopes are passed

---

### Issue: No events syncing

**Check**:
1. Verify scopes are correct (see above)
2. Check grant ID is valid:
   ```bash
   curl http://localhost:3000/api/debug/account-scopes?accountId=<account-id>
   ```
3. Check Nylas grant status directly:
   ```bash
   curl -H "Authorization: Bearer $NYLAS_API_KEY" \
        https://api.us.nylas.com/v3/grants/<grant-id>
   ```

4. Check account has events in the date range (default: 6 months past to 12 months future)

---

## 📋 Recommendations

### Immediate Actions

1. **Test the fixes** with a new account connection
2. **Check existing accounts** using the diagnostic endpoint
3. **Reconnect accounts** that have empty or invalid scopes

### Long-term Improvements

1. **Add scope re-authorization flow**
   - Allow users to re-grant permissions without full reconnection
   - Preserve existing sync state and cursors

2. **Add scope validation in UI**
   - Show which permissions are granted
   - Highlight missing calendar access
   - Provide one-click re-authorization

3. **Consolidate sync methods**
   - Remove unused Google/Microsoft direct sync routes if Nylas is primary
   - Or document when to use each method

4. **Add integration tests**
   - Test OAuth flow with mock Nylas responses
   - Test sync with >500 events (pagination)
   - Test scope validation edge cases

5. **Improve error messages**
   - Link to specific troubleshooting docs
   - Provide actionable next steps
   - Consider in-app troubleshooting wizard

---

## 🎯 Next Steps

1. ✅ Fixes have been applied to scope retrieval and validation
2. ✅ Diagnostic endpoint created for troubleshooting
3. 🔄 **Test with your development environment**:
   - Connect a new account
   - Verify scopes are saved correctly
   - Test calendar sync
4. 📝 Monitor server logs during OAuth and sync
5. 🐛 Report any issues found during testing

---

## 📞 Support

If you encounter issues after applying these fixes:

1. **Check the diagnostic endpoint** first
2. **Review server logs** for detailed error messages
3. **Verify Nylas API credentials** are correct
4. **Check Nylas dashboard** for grant status
5. **Ensure calendar scopes are enabled** in your Nylas app configuration

---

*Last Updated*: 2025-11-14
*Fixes Applied By*: Claude Code
