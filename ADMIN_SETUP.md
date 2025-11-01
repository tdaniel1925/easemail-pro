# Admin Setup Guide

## Creating Your First Platform Admin

After deploying EaseMail, you need to manually set up your first platform admin user.

### Step 1: Sign Up Normally

1. Go to `/signup` and create a new account
2. Verify your email if required
3. Log in to the application

### Step 2: Make Yourself a Platform Admin

Open your Supabase SQL Editor and run:

```sql
-- Replace 'your-email@example.com' with your actual email
UPDATE users 
SET role = 'platform_admin' 
WHERE email = 'your-email@example.com';
```

### Step 3: Access Admin Panel

1. Log out and log back in (or refresh the page)
2. Click on your user profile in the bottom-left corner
3. You should now see an "Admin Dashboard" option
4. Navigate to `/admin` to access the admin panel

## User Role Types

EaseMail supports 4 types of users:

1. **`platform_admin`** - Full system access
   - Can manage all users
   - Can impersonate users (future feature)
   - Can access admin dashboard
   - Can view system-wide statistics

2. **`individual`** - Individual account users
   - Personal email management
   - Not part of any organization
   - Full access to their own data

3. **`org_admin`** - Organization administrators
   - Can manage their organization
   - Can invite and remove team members
   - Can manage organization settings
   - Can view team analytics

4. **`org_user`** - Organization members
   - Part of an organization
   - Access based on organization permissions
   - Can collaborate with team members

## Troubleshooting

### "Unauthorized" Error When Accessing `/admin`

This means your user role is not set to `platform_admin`. Run the SQL query above to fix this.

### Styling Issues After Deployment

If the styling looks broken:

1. **Clear Next.js cache:** Delete the `.next` folder
2. **Rebuild:** Run `npm run build`
3. **Clear browser cache:** Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
4. **Check environment variables:** Make sure all required env vars are set in production

### Admin Link Not Showing

The "Admin Dashboard" link in the settings menu only appears for users with the `platform_admin` role. Check your role in the database:

```sql
SELECT id, email, role FROM users WHERE email = 'your-email@example.com';
```

## Security Best Practices

1. **Limit Platform Admins:** Only give `platform_admin` role to trusted users
2. **Use Strong Passwords:** Platform admins have access to all system data
3. **Enable 2FA:** Configure Supabase Auth to require 2FA for admin accounts (future feature)
4. **Audit Logs:** Monitor admin actions (future feature)

## Next Steps

Once you have platform admin access:

1. Create your first organization (if using team features)
2. Invite team members
3. Configure system settings
4. Set up billing (if applicable)

---

**Note:** The role system is designed to be flexible. You can extend it with custom roles or permissions as needed by modifying `lib/auth/permissions.ts`.

