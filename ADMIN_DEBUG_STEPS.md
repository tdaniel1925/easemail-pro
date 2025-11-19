# 🔍 Admin Access Diagnosis - Step by Step

## Why This Used to Work But Doesn't Now

There are a few possible reasons:

### 1. **Browser Cache Issue** (Most Common)
The settings menu is caching your old role. 

**Fix:**
1. Open your browser DevTools (F12)
2. Go to **Application** tab → **Storage** → **Clear site data**
3. OR just open an **Incognito/Private window** and test
4. Log in fresh

### 2. **SQL Update Didn't Apply**
Let me verify your role is actually set.

**Run this in Supabase SQL Editor:**
```sql
-- Check your current role
SELECT id, email, role, created_at, updated_at
FROM users 
WHERE email = 'tdaniel@botmakers.ai';
```

**Expected output:**
- `role` should show: `platform_admin`

**If it shows something else (like `individual` or `org_user`):**
```sql
-- Force update
UPDATE users 
SET role = 'platform_admin', updated_at = NOW()
WHERE email = 'tdaniel@botmakers.ai';

-- Verify again
SELECT email, role FROM users WHERE email = 'tdaniel@botmakers.ai';
```

### 3. **API Endpoint Not Returning Role**
Let's test if the API is working.

**In your browser console (F12 → Console), run:**
```javascript
// Get your current user ID
const user = await (await fetch('/api/user/me')).json();
console.log('User ID:', user?.id);

// Fetch your user data
const userData = await (await fetch(`/api/user/${user?.id}`)).json();
console.log('User Data:', userData);
console.log('Role:', userData?.role);
```

**Expected:**
```json
{
  "id": "...",
  "email": "tdaniel@botmakers.ai",
  "fullName": "...",
  "role": "platform_admin"  ← Should be this
}
```

**If role is NOT `platform_admin`:**
- The SQL update didn't work
- You might have multiple user records

### 4. **Multiple User Records**
Check if you have duplicate accounts:

```sql
-- Find all users with your email
SELECT id, email, role, created_at 
FROM users 
WHERE email ILIKE '%tdaniel%' OR email ILIKE '%botmakers%'
ORDER BY created_at DESC;
```

**If you see multiple records:**
- Make sure you're updating the MOST RECENT one
- Or the one matching your current session's user ID

### 5. **Session/Token Issue**
Your auth token might not be refreshed.

**Fix:**
1. **Logout completely** (Settings → Logout)
2. Close all browser tabs with the app
3. **Log back in**
4. Check settings menu again

## Quick Debug Steps

### Step A: Check Database
```sql
SELECT email, role, updated_at FROM users WHERE email = 'tdaniel@botmakers.ai';
```
Should show: `role = 'platform_admin'`

### Step B: Check API Response
In browser console:
```javascript
fetch('/api/user/' + (await supabase.auth.getUser()).data.user.id)
  .then(r => r.json())
  .then(data => console.log('Role from API:', data.role));
```

### Step C: Clear Cache & Test
1. Open **Incognito/Private Window**
2. Go to your app
3. Log in as tdaniel@botmakers.ai
4. Click settings menu
5. Look for "Admin Dashboard"

## Still Not Working?

### Check Console Logs
Open DevTools → Console tab, look for:
```
[SettingsMenuNew] User role: platform_admin
```

If it shows:
- `[SettingsMenuNew] User role: undefined` → API isn't returning role
- `[SettingsMenuNew] User role: individual` → SQL update didn't work
- `[SettingsMenuNew] User role: org_user` → Wrong role value

### Manual Menu Force
If everything looks right but menu still doesn't show, try this in console:
```javascript
// Force check what the component thinks your role is
const menu = document.querySelector('[data-role]');
console.log('Menu thinks role is:', localStorage.getItem('userRole'));
```

## Nuclear Option: Database Direct Fix

If nothing works, let's be 100% sure:

```sql
-- First, find YOUR user ID
SELECT id, email, role FROM users WHERE email = 'tdaniel@botmakers.ai';

-- Copy the ID, then update SPECIFICALLY by ID (replace the UUID below)
UPDATE users 
SET 
  role = 'platform_admin',
  updated_at = NOW()
WHERE id = 'YOUR-USER-ID-HERE';

-- Verify
SELECT id, email, role, updated_at FROM users WHERE id = 'YOUR-USER-ID-HERE';
```

## What Used to Work

If this worked before, something changed:
1. Did you recently re-deploy? (Migration might have reset roles)
2. Did you delete and recreate your user?
3. Is this a different environment (dev vs prod)?

Check which database you're connected to in Supabase dashboard!

---

**After trying these, let me know:**
1. What does the SQL query show for your role?
2. What does the browser console show when you click settings?
3. Are you in the same Supabase project as before?

