# Admin Quick Start Guide

Complete guide for platform admins and organization admins.

---

## Table of Contents

1. [Platform Admin Guide](#platform-admin-guide)
2. [Organization Admin Guide](#organization-admin-guide)
3. [User Roles Explained](#user-roles-explained)
4. [Common Tasks](#common-tasks)
5. [Security Features](#security-features)
6. [Troubleshooting](#troubleshooting)

---

## Platform Admin Guide

### Overview

Platform admins have full system access via the `/admin` dashboard.

**Capabilities:**
- Create and manage organizations
- View all users across organizations
- Impersonate users for troubleshooting
- Configure system-wide billing settings
- View activity logs and analytics

### Creating an Organization

**Step-by-Step:**

1. Navigate to `/admin/organizations`
2. Click "Create Organization"
3. Complete the 6-step wizard:
   - **Step 1**: Company Information (name, slug, website)
   - **Step 2**: Business Address
   - **Step 3**: Contact Information
   - **Step 4**: Billing Contact
   - **Step 5**: Subscription Details (plan type, seats)
   - **Step 6**: Owner Setup (email, name, phone, title)
4. Click "Create Organization"

**What Happens:**
- Organization is created
- Owner user account is automatically created
- Owner receives welcome email with temporary password
- Owner is assigned 'owner' role in organization
- Owner can immediately access organization admin dashboard

**Important Notes:**
- Owner email must not already exist in the system
- Temporary password expires in 7 days
- Owner must change password on first login

### Managing Users

**Add Individual User:**
1. Navigate to `/admin/users`
2. Click "Add User"
3. Fill in email, full name, role
4. Choose invitation or password method
5. User receives credentials email if invitation flow

**View All Users:**
- `/admin/users` shows all users across all organizations
- Search, filter, and sort by role, status, organization
- View email account counts per user

### Impersonating Users

**When to Use:**
- Troubleshooting user issues
- Testing permissions
- Reproducing bugs

**How to Impersonate:**
1. Navigate to `/admin/users`
2. Find the user
3. Click "Impersonate"
4. Confirm the action

**While Impersonating:**
- Orange warning banner appears at top
- Shows: "Impersonating: user@example.com"
- Click "Exit Impersonation" to return to admin account
- All actions are logged in audit trail

**Security:**
- Rate limited to 2 impersonations per minute
- Full audit trail logged
- Cannot impersonate suspended users
- Cannot impersonate yourself

### Billing Configuration

Access: `/admin/billing/config`

Configure:
- Automated billing runs (enabled/disabled)
- Billing frequency (monthly/weekly)
- Retry settings (max retries, delay)
- Notification settings
- Charge thresholds (SMS, AI)
- Grace period for failed payments

---

## Organization Admin Guide

### Overview

Organization admins manage their own organization via `/organization` dashboard.

**Capabilities:**
- View organization stats and activity
- Add, edit, and remove team members
- Manage organization settings
- View billing and invoices (if enabled)
- Cannot access other organizations

### Accessing the Dashboard

URL: `/organization`

**Requirements:**
- Must have `org_admin` or `owner` role
- Must be assigned to an organization

### Managing Team Members

**Add a Member:**
1. Navigate to `/organization/users`
2. Click "Add Member"
3. Fill in:
   - Email (required)
   - Full Name (required)
   - Role: Member, User Admin, Admin, or Owner
4. Click "Add User"

**What Happens:**
- User account created
- Temporary password generated (7-day expiry)
- Welcome email sent with credentials
- User added to organization
- Seat count updated

**Edit a Member:**
- Change role (member, user_admin, admin, owner)
- Suspend/unsuspend account
- Cannot edit yourself

**Remove a Member:**
- Soft delete: user removed from organization
- User account suspended
- Organization ID cleared
- Seat count decremented

**Seat Limits:**
- Organization has maximum seats (e.g., 10, 50, unlimited)
- Cannot add users if at seat limit
- Current usage shown in dashboard

### Organization Settings

Access: `/organization/settings`

Configure:
- Organization name
- Billing email
- Contact email

**Who Can Access:**
- org_admin
- platform_admin

**Who Cannot:**
- user_admin (read-only access to some features)
- members

---

## User Roles Explained

### System-Level Roles

**platform_admin** (Super Admin)
- Full system access
- Can create/manage organizations
- Can impersonate any user
- Access to `/admin` dashboard
- Configure system-wide billing

**org_admin** (Organization Admin)
- Manage their organization
- Add/edit/remove team members
- Update organization settings
- View billing and usage
- Access to `/organization` dashboard

**user_admin** (User Manager)
- Add and edit organization members
- Cannot manage admins or owners
- Cannot access billing or settings
- Limited to user management only

**org_user** (Standard Member)
- Regular organization member
- No admin privileges
- Access to main app features only

**individual** (Independent User)
- Not part of any organization
- Personal account only

### Organization-Level Roles

Stored in `organization_members` table, separate from system role:

**owner**
- Highest organization authority
- Usually the person who created/owns the org
- Full admin capabilities
- System role: `org_admin`

**admin**
- Full organization management
- System role: `org_admin`

**user_admin**
- Can only manage users
- System role: `user_admin`

**member**
- Standard team member
- System role: `org_user`

---

## Common Tasks

### Reset a User's Password

**Platform Admin:**
1. Navigate to `/admin/users`
2. Find user → Click "Edit"
3. Check "Require password change"
4. Click "Send password reset email"

**Organization Admin:**
1. Navigate to `/organization/users`
2. Remove and re-add the user (generates new temp password)

### Upgrade Organization Plan

**Platform Admin:**
1. Navigate to `/admin/organizations`
2. Find organization → Click "Edit"
3. Change `planType` and `maxSeats`
4. Save changes

**Organization Admin:**
- Access `/organization/billing` (when implemented)
- Click "Upgrade Plan"

### View Audit Logs

**Platform Admin Only:**
1. Navigate to `/admin/activity`
2. Filter by:
   - User
   - Action type
   - Date range
   - Organization

**Logged Actions:**
- User created/updated/deleted
- Organization created/updated
- Impersonation started/ended
- Password changes
- Role changes
- Settings updates

### Handle Suspended Users

**Why Users Get Suspended:**
- Manual suspension by admin
- Failed payment (billing system)
- Security concerns
- Terms of service violation

**To Unsuspend:**
1. Navigate to users list
2. Find user → Click "Edit"
3. Uncheck "Suspended"
4. Save changes

---

## Security Features

### Rate Limiting

**Admin Endpoints:**
- 5 requests per minute for admin operations
- 2 requests per minute for impersonation (extra strict)
- IP-based tracking
- Returns 429 (Too Many Requests) when exceeded

**Purpose:**
- Prevent brute force attacks
- Limit abuse
- Protect system resources

### CSRF Protection

All write operations (POST, PUT, PATCH, DELETE) require CSRF tokens.

**How it Works:**
- Token generated on page load
- Must be included in request headers
- Validated server-side
- Prevents cross-site request forgery

### Audit Logging

All admin actions are logged with:
- User ID and email
- Action performed
- Timestamp
- IP address
- User agent
- Details (JSON)

**Access Logs:**
- Platform admins can view all logs
- Organization admins can view their org's logs

### Password Security

**Temporary Passwords:**
- 24-character random string (uppercase, lowercase, digits, symbols)
- Bcrypt hashed before storage
- 7-day expiration
- Must be changed on first login

**Password Requirements:**
- Minimum 8 characters
- Mix of uppercase, lowercase, numbers, symbols recommended

---

## Troubleshooting

### User Can't Login

**Check:**
1. Is account suspended? (users table → suspended = true)
2. Has temporary password expired? (tempPasswordExpiresAt < now)
3. Is email confirmed? (Supabase auth)
4. Correct email/password?

**Fix:**
- Unsuspend account if needed
- Reset password (generates new temp password)
- Check Supabase auth users table

### Organization Member Can't Access Dashboard

**Check:**
1. User's role (must be org_admin, user_admin, or owner)
2. organizationId is set correctly
3. organizationMembers entry exists

**Fix:**
- Update user role to appropriate admin role
- Add organizationMembers entry if missing

### Impersonation Fails

**Common Causes:**
- Rate limit exceeded (wait 1 minute)
- Target user is suspended
- Target user doesn't exist
- Admin is not platform_admin

**Fix:**
- Wait for rate limit to reset
- Unsuspend target user
- Verify user exists
- Check admin role

### Email Not Sent

**Check:**
1. Resend API configured (env vars)
2. Email template exists
3. Email address valid
4. Check logs for send errors

**Common Issues:**
- RESEND_API_KEY missing or invalid
- Email address domain not verified (if using Resend)
- Rate limit exceeded on email service

### Seat Limit Reached

**Error:** "Organization has reached maximum seats limit"

**Fix:**
1. Upgrade organization plan (increase maxSeats)
2. Remove inactive users
3. Contact billing to increase limit

---

## Quick Reference

### URLs

**Platform Admin:**
- Dashboard: `/admin`
- Users: `/admin/users`
- Organizations: `/admin/organizations`
- Billing Config: `/admin/billing/config`
- Activity Logs: `/admin/activity`

**Organization Admin:**
- Dashboard: `/organization`
- Team Members: `/organization/users`
- Settings: `/organization/settings`
- Billing: `/organization/billing`

### API Endpoints

**Platform Admin:**
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create user
- `GET /api/admin/organizations` - List organizations
- `POST /api/admin/organizations` - Create organization
- `POST /api/admin/users/[userId]/impersonate` - Impersonate user
- `POST /api/admin/impersonate/exit` - Exit impersonation

**Organization Admin:**
- `GET /api/organization/stats` - Get org stats
- `GET /api/organization/users` - List org members
- `POST /api/organization/users` - Add member
- `PATCH /api/organization/users/[userId]` - Update member
- `DELETE /api/organization/users/[userId]` - Remove member
- `GET /api/organization/settings` - Get settings
- `PATCH /api/organization/settings` - Update settings

---

## Support

For issues not covered in this guide:

1. Check the main documentation: `HELP_IT_MANUAL.md`
2. Review implementation plan: `ADMIN_IMPLEMENTATION_PLAN.md`
3. Check audit logs for clues
4. Contact development team

---

*Last Updated: 2026-02-03*
*Version: 1.0*
