# 🔧 Admin Access Troubleshooting Guide

## Issue: Admin Link Not Showing in Settings

**User:** tdaniel@botmakers.ai  
**Expected:** Should see "Admin Dashboard" link in settings menu  
**Actual:** Admin link is missing

## Root Cause

The admin link only shows when your database user record has `role = 'platform_admin'`.

## Solution

### Option 1: Using Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to **SQL Editor**

2. **Run This SQL Query**
   ```sql
   -- Make tdaniel@botmakers.ai a Platform Admin
   UPDATE users 
   SET role = 'platform_admin' 
   WHERE email = 'tdaniel@botmakers.ai';
   
   -- Verify the change
   SELECT email, role FROM users WHERE email = 'tdaniel@botmakers.ai';
   ```

3. **Refresh Your Browser**
   - Log out and log back in (OR just hard refresh with Ctrl+Shift+R)
   - Click on your profile/settings button
   - You should now see **"Admin Dashboard"** in the menu

### Option 2: Using Supabase Table Editor

1. Go to Supabase → **Table Editor** → **users** table
2. Find your user (tdaniel@botmakers.ai)
3. Click on the **role** field
4. Change it to: `platform_admin`
5. Save changes
6. Refresh your browser

## How the Admin Link Works

The settings menu (`components/layout/SettingsMenu.tsx`) shows the admin link based on this logic:

```typescript
{userRole === 'platform_admin' && (
  <button onClick={() => onNavigate?.('/admin-v2')}>
    <Shield className="h-4 w-4" />
    <span>Admin Dashboard</span>
  </button>
)}
```

**Flow:**
1. Settings menu fetches your user data from `/api/user/[userId]`
2. API returns your `role` from the database
3. If `role === 'platform_admin'`, admin link appears
4. Admin link navigates to `/admin-v2`

## Verification Checklist

After running the SQL update:

- [ ] SQL query executed successfully
- [ ] Verification query shows `role = 'platform_admin'`
- [ ] Logged out and logged back in
- [ ] Settings menu now shows "Admin Dashboard" option
- [ ] Can access `/admin-v2` page without errors

## User Roles Explained

| Role | Description | Access |
|------|-------------|--------|
| `platform_admin` | Site administrator | Full system access, admin dashboard |
| `org_admin` | Organization owner | Team management, billing |
| `org_user` | Team member | Organization features |
| `individual` | Regular user | Personal email management |

## Quick Test Script

I've created `scripts/make-tdaniel-admin.sql` for you. Just run it in Supabase SQL Editor!

## Still Not Working?

If the admin link still doesn't show after these steps:

1. **Check browser console** for errors
2. **Clear cache** completely (Ctrl+Shift+Delete)
3. **Verify database connection** in `/api/user/[userId]/route.ts`
4. **Check that migrations ran** (all migration files applied)

## Next Steps After Admin Access

Once you have admin access:

1. **Admin Dashboard** → `/admin-v2`
2. **Manage Users** → Create, suspend, or delete users
3. **Manage Organizations** → Create and configure teams
4. **Pricing & Billing** → Configure subscription plans
5. **API Keys** → Manage system API keys
6. **System Settings** → Configure global settings

---

**Created:** For troubleshooting admin access for tdaniel@botmakers.ai  
**File:** `scripts/make-tdaniel-admin.sql` ready to run!

