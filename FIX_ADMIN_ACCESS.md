# 🔧 Quick Fix: Enable Admin Dashboard Access

## Your Issue
You're logged in as `tdaniel@botmakers.ai` but don't see the admin dashboard option.

## The Problem
Your database user record needs to have `role = 'platform_admin'` to see the admin menu.

## Solution (2 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar

### Step 2: Run This Query
```sql
-- Set your account as platform admin
UPDATE users 
SET role = 'platform_admin' 
WHERE email = 'tdaniel@botmakers.ai';

-- Verify it worked
SELECT id, email, role, created_at 
FROM users 
WHERE email = 'tdaniel@botmakers.ai';
```

### Step 3: Refresh Your Browser
1. **Option A:** Hard refresh (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac)
2. **Option B:** Log out and log back in

### Step 4: Access Admin Dashboard
1. Click on your profile button (bottom left, shows "T")
2. You should now see **"Admin Dashboard"** with a shield icon at the top of the menu
3. Click it to access:
   - `/admin` - Main dashboard
   - `/admin/users` - User management
   - `/admin/expenses` - Expense analytics
   - `/admin/financial` - Financial reporting
   - And more!

## How It Works

The settings menu (`SettingsMenuNew.tsx`) shows admin options based on this check:

```typescript
{userRole === 'platform_admin' && (
  <button onClick={() => handleMenuClick('/admin')}>
    <Shield className="h-4 w-4" />
    <span>Admin Dashboard</span>
  </button>
)}
```

The flow:
1. Menu fetches your user data from `/api/user/{userId}`
2. API returns your `role` from the database
3. If `role === 'platform_admin'`, admin link appears
4. Admin pages verify your role before rendering

## Verification
After the SQL update, you should see:
- ✅ Admin Dashboard option in settings menu
- ✅ Access to `/admin` routes without redirect
- ✅ All billing and financial dashboards we just built

## Alternative: Using Table Editor
If you prefer a UI:
1. Supabase → **Table Editor** → **users**
2. Find your user (tdaniel@botmakers.ai)
3. Edit the **role** column
4. Change to: `platform_admin`
5. Save and refresh browser

---

**Note:** Make sure you're using the email `tdaniel@botmakers.ai` (or adjust the query to match your actual login email).

