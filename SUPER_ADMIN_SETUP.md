# Super Admin (Platform Admin) Setup
**Current Configuration**
**Updated:** February 2, 2026

---

## Current Super Admin

**Email:** tdaniel@botmakers.ai
**Name:** Trent Daniel
**Role:** `platform_admin` (Super Admin)
**Status:** ✅ Active
**User ID:** 2e49f3c4-f6d7-4764-a405-5836deff67b4
**Created:** November 1, 2025
**Organization:** None (individual account with god mode access)

---

## Super Admin Capabilities

As a platform admin, you have **full system access** across ALL organizations:

### ✅ Organization Management
- Create new organizations
- Edit any organization settings
- Delete organizations
- View all organizations
- Manage organization billing and plans
- Access any organization's data

### ✅ User Management
- Create users in any organization
- Create individual users (not part of any org)
- Assign any role to any user (including other platform admins)
- Reset passwords for any user
- Suspend/unsuspend users
- Delete users
- View user activity logs across all organizations
- Impersonate users (if feature is enabled)

### ✅ System Administration
- Access admin dashboard at `/admin`
- Configure system settings
- Manage API keys and integrations
- View financial reports and billing data
- Access usage analytics for entire platform
- Run system maintenance tasks
- Execute database migrations
- Monitor system health

### ✅ Special Permissions
- Bypass all organization-level restrictions
- Access all features without subscription limits
- Override any permission check
- Full read/write access to all data

---

## Admin Dashboard Access

**URL:** http://localhost:3001/admin (production: https://your-domain.com/admin)

### Dashboard Sections Available:

1. **Overview** - System stats and metrics
2. **Users** - Manage all users across all organizations
3. **Organizations** - Create and manage organizations
4. **Usage Analytics** - View platform-wide usage
5. **Billing & Financial** - Financial reports and billing management
6. **System Settings** - Configure system-wide settings
7. **API Keys** - Manage integration credentials
8. **Activity Logs** - View audit logs
9. **Pricing Management** - Configure plans and pricing
10. **Email Templates** - Manage system email templates
11. **System Health** - Monitor application health

---

## Creating Organizations

As super admin, you can create organizations for:

### 1. Company/Team Accounts
Organizations with multiple users (e.g., a company with 50 employees)

**Via Admin UI:**
1. Go to `/admin/organizations`
2. Click "Create Organization"
3. Enter:
   - Organization name
   - Slug (URL-friendly identifier)
   - Billing email
   - Plan type (free, team, enterprise)
   - Max seats
4. Click "Create"

**Via API:**
```bash
POST /api/admin/organizations
{
  "name": "Acme Corporation",
  "slug": "acme-corp",
  "billingEmail": "billing@acme.com",
  "planType": "enterprise",
  "maxSeats": 100
}
```

### 2. Individual Users
Users not part of any organization (solo accounts)

**Via Admin UI:**
1. Go to `/admin/users`
2. Click "Add User"
3. Select "Individual Account" (no organization)
4. Enter user details
5. Click "Create User"

**Via API:**
```bash
POST /api/admin/users
{
  "email": "solo@example.com",
  "fullName": "John Solo",
  "role": "individual",
  "organizationId": null
}
```

---

## Managing Users

### Creating Users in Organizations

**Step 1: Create or select organization**
- Go to `/admin/organizations`
- Select organization or create new one

**Step 2: Add user to organization**
- Click "Add User" in organization view
- Enter user details:
  - Email address
  - Full name
  - Role: owner | admin | user_admin | member
- Click "Create User"

**What happens:**
- User account created in Supabase Auth
- Temporary password generated
- User added to organization with selected role
- Credentials email sent to user
- User must change password on first login

### Creating Individual Users

**Via Admin UI:**
1. Go to `/admin/users`
2. Click "Add User"
3. Enter:
   - Email
   - Full name
   - Leave organization blank
4. Role will be set to "individual"
5. Click "Create User"

**User Role Assignment:**
- Users IN organizations: `org_admin` or `org_user`
- Users NOT in organizations: `individual`
- Super admins: `platform_admin`

---

## User Role Hierarchy

```
┌────────────────────────────────────────────┐
│  PLATFORM ADMIN (Super Admin)             │ ← You are here
│  • tdaniel@botmakers.ai                   │
│  • Full system access                     │
│  • Can manage everything                  │
└────────────────────────────────────────────┘
                    ▼
┌────────────────────────────────────────────┐
│  ORGANIZATIONS                             │
│                                            │
│  Acme Corp     Tech Startup    etc...      │
│  ├─ Owner                                  │
│  ├─ Admin                                  │
│  ├─ User Admin (manages users only)       │
│  └─ Members                                │
└────────────────────────────────────────────┘
                    ▼
┌────────────────────────────────────────────┐
│  INDIVIDUAL USERS                          │
│  • Not part of any organization            │
│  • Solo accounts                           │
│  • Self-service management                 │
└────────────────────────────────────────────┘
```

---

## Common Workflows

### Workflow 1: Onboard a New Company

**Scenario:** Acme Corp signs up for EaseMail (50 employees)

1. **Create Organization:**
   ```
   Name: Acme Corporation
   Slug: acme-corp
   Plan: Enterprise
   Max Seats: 50
   Billing Email: billing@acme.com
   ```

2. **Create First User (Owner):**
   ```
   Email: admin@acme.com
   Name: Jane Admin
   Role: owner
   Organization: Acme Corporation
   ```

3. **Jane receives credentials email** and logs in

4. **Jane can then:**
   - Invite other users (she's now owner)
   - Configure organization settings
   - Manage billing
   - Assign roles to team members

### Workflow 2: Create Individual User

**Scenario:** Solo freelancer wants to use EaseMail

1. **Create User:**
   ```
   Email: freelancer@example.com
   Name: John Freelancer
   Role: individual
   Organization: (none)
   ```

2. **User receives credentials** and logs in

3. **User can:**
   - Connect their email accounts
   - Use all features
   - Manage their own account
   - No organization features (teams, shared resources)

### Workflow 3: Add User Admin to Organization

**Scenario:** HR manager needs to manage users but not billing

1. Go to organization in admin panel
2. Add user with **User Admin** role:
   ```
   Email: hr@acme.com
   Name: HR Manager
   Role: user_admin
   Organization: Acme Corporation
   ```

3. **HR Manager can:**
   - ✅ Invite new employees
   - ✅ Remove users who leave
   - ✅ Reset passwords
   - ✅ View user activity
   - ❌ Change billing
   - ❌ Modify org settings
   - ❌ Delete organization

---

## Checking Admin Status

**Check any user's role:**
```bash
npx tsx scripts/check-admin-status.ts
```

**Make someone a platform admin:**
```bash
npx tsx scripts/make-platform-admin.ts email@example.com
```

**Warning:** Only give platform admin access to trusted administrators. This role has full system access.

---

## Security Best Practices

### Platform Admin Account Security

1. **Use strong password**
   - Minimum 16 characters
   - Mix of letters, numbers, symbols
   - Never reuse passwords

2. **Enable 2FA** (if implemented)
   - Protects against password theft
   - Required for production super admins

3. **Monitor admin actions**
   - All admin actions are logged in `user_audit_logs` table
   - Review logs regularly for suspicious activity

4. **Limit platform admins**
   - Only create additional platform admins when absolutely necessary
   - Each admin should be a trusted team member
   - Document who has platform admin access

5. **Separate accounts**
   - Use platform admin account only for admin tasks
   - Have a separate individual account for daily use

---

## Admin Permissions in Code

### Checking if User is Platform Admin

```typescript
import { isPlatformAdmin } from '@/lib/auth/permissions';

const isAdmin = await isPlatformAdmin();
if (!isAdmin) {
  return forbidden('Platform admin access required');
}
```

### Requiring Platform Admin

```typescript
import { requirePlatformAdmin } from '@/lib/auth/permissions';

// Throws error if not platform admin
const context = await requirePlatformAdmin();
```

### Getting Full User Context

```typescript
import { getUserContext } from '@/lib/auth/permissions';

const context = await getUserContext();

if (context.isPlatformAdmin) {
  // User is super admin - full access
}

if (context.isOrgAdmin) {
  // User can manage their organization
}

if (context.canManageUsers) {
  // User can manage users in their org
}
```

---

## Database Access

### Check Current Platform Admins

```sql
SELECT id, email, full_name, role, created_at
FROM users
WHERE role = 'platform_admin'
ORDER BY created_at;
```

### Check All Organizations

```sql
SELECT id, name, slug, plan_type, max_seats, current_seats, is_active
FROM organizations
ORDER BY created_at DESC;
```

### Check Organization Members

```sql
SELECT
  om.role,
  u.email,
  u.full_name,
  o.name as organization_name
FROM organization_members om
JOIN users u ON u.id = om.user_id
JOIN organizations o ON o.id = om.organization_id
WHERE om.is_active = true
ORDER BY o.name, om.role;
```

---

## Troubleshooting

### Can't Access Admin Dashboard

**Check 1: Verify role**
```bash
npx tsx scripts/check-admin-status.ts
```

**Check 2: Clear browser cache/cookies**

**Check 3: Check if route is protected**
- Admin routes are protected by middleware
- Must have `role = 'platform_admin'` in database

### User Can't Login

**Check 1: Verify user exists**
```sql
SELECT * FROM users WHERE email = 'user@example.com';
```

**Check 2: Check account status**
```sql
SELECT account_status, suspended FROM users WHERE email = 'user@example.com';
```

**Check 3: Reset password**
```bash
# Via admin UI: /admin/users → Find user → Reset Password
# Or via API: POST /api/admin/users/{userId}/reset-password
```

### Organization at Max Capacity

**Check current seats:**
```sql
SELECT max_seats, current_seats
FROM organizations
WHERE id = 'org-id';
```

**Increase max seats:**
```sql
UPDATE organizations
SET max_seats = 100
WHERE id = 'org-id';
```

---

## Quick Reference Commands

```bash
# Check your admin status
npx tsx scripts/check-admin-status.ts

# Make someone a platform admin
npx tsx scripts/make-platform-admin.ts email@example.com

# Run database migration
npx tsx scripts/migrations/add-user-admin-role.ts

# Start development server
pnpm dev

# Access admin dashboard
http://localhost:3001/admin
```

---

## Your Current Setup Summary

✅ **Super Admin:** tdaniel@botmakers.ai (you)
✅ **Role:** platform_admin
✅ **Access:** Full system access
✅ **Can Create:** Organizations & Individual Users
✅ **Dashboard:** http://localhost:3001/admin

**You're all set!** You can now:
1. Create organizations for companies/teams
2. Create individual users for solo accounts
3. Manage all users across the platform
4. Configure system settings
5. Access all admin features

---

**Last Updated:** February 2, 2026
**Super Admin:** tdaniel@botmakers.ai
