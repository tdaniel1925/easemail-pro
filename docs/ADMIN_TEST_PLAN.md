# Admin System Test Plan

**Test Date:** 2026-02-03
**Tester:** ___________
**Environment:** Development (localhost:3001)

---

## Pre-Test Setup

### Required Test Accounts

Create these test accounts before testing:

1. **Platform Admin**
   - Email: `admin@test.com`
   - Role: `platform_admin`
   - Purpose: Super admin tests

2. **Organization Owner**
   - Email: `owner@testorg.com`
   - Role: `org_admin` (org role: owner)
   - Organization: Test Organization
   - Purpose: Org admin tests

3. **User Admin**
   - Email: `useradmin@testorg.com`
   - Role: `user_admin` (org role: user_admin)
   - Organization: Test Organization
   - Purpose: Limited permission tests

4. **Regular Member**
   - Email: `member@testorg.com`
   - Role: `org_user` (org role: member)
   - Organization: Test Organization
   - Purpose: No admin access tests

---

## Test Suite 1: Platform Admin Features

### 1.1 Authentication & Access
- [ ] Login as platform admin
- [ ] Access `/admin` dashboard (should succeed)
- [ ] Verify sidebar shows: Users, Organizations, Billing Config, Activity
- [ ] Logout and login as regular user
- [ ] Try to access `/admin` (should redirect/block)

### 1.2 Organization Creation with Owner
- [ ] Navigate to `/admin/organizations`
- [ ] Click "Create Organization"
- [ ] Complete Step 1 (Company Info):
  - Name: "Test Corp"
  - Slug: auto-generated (verify it's lowercase-dash format)
  - Website: optional
- [ ] Complete Step 2 (Address): optional fields
- [ ] Complete Step 3 (Contacts): optional fields
- [ ] Complete Step 4 (Billing): optional fields
- [ ] Complete Step 5 (Subscription):
  - Plan: Team
  - Max Seats: 10
- [ ] Complete Step 6 (Owner Setup):
  - Email: `testowner@example.com`
  - Full Name: "Test Owner"
  - Phone: optional
  - Title: optional
  - Send welcome email: checked
- [ ] Click "Create Organization"
- [ ] **Verify:**
  - Success message appears
  - Redirected to `/admin/organizations?success=created`
  - Organization appears in list
  - Current seats shows 1 (for owner)

### 1.3 Email Verification
- [ ] Check email inbox for `testowner@example.com`
- [ ] **Verify email contains:**
  - Welcome message
  - Organization name ("Test Corp")
  - Temporary password
  - Login URL
  - Expiry notice (7 days)
- [ ] Copy temporary password for later test

### 1.4 User Management (Platform Admin)
- [ ] Navigate to `/admin/users`
- [ ] **Verify** list shows all users across all organizations
- [ ] Search for "testowner@example.com"
- [ ] **Verify** shows:
  - Full name
  - Email
  - Role: org_admin
  - Organization: Test Corp
  - Account status: pending

### 1.5 Rate Limiting - Admin Endpoints
- [ ] Open browser console (F12)
- [ ] Run this JavaScript 10 times rapidly:
```javascript
for(let i=0; i<10; i++) {
  fetch('/api/admin/users').then(r => console.log(i, r.status));
}
```
- [ ] **Verify:**
  - First 5 requests: 200 OK
  - Requests 6-10: 429 Too Many Requests
  - Console shows rate limit error message
- [ ] Wait 60 seconds
- [ ] Try again - should work (rate limit reset)

### 1.6 Impersonation
- [ ] Navigate to `/admin/users`
- [ ] Find "testowner@example.com"
- [ ] Click "Impersonate" button
- [ ] **Verify:**
  - Orange warning banner appears at top
  - Banner shows: "Impersonating: testowner@example.com"
  - Banner shows admin email
  - "Exit Impersonation" button visible
- [ ] Navigate around app (check dashboard, settings, etc.)
- [ ] **Verify** banner stays visible on all pages
- [ ] Click "Exit Impersonation"
- [ ] **Verify:**
  - Confirmation prompt appears
  - After confirming, redirected to `/admin`
  - Banner disappears
  - Back to admin account

### 1.7 Impersonation Rate Limiting
- [ ] Try to impersonate 3 users rapidly (within 1 minute)
- [ ] **Verify:**
  - First 2 succeed
  - 3rd attempt: 429 Too Many Requests
  - Error message displayed
- [ ] Wait 60 seconds, try again (should work)

---

## Test Suite 2: Organization Admin Features

### 2.1 Owner First Login
- [ ] Logout from admin account
- [ ] Go to `/login`
- [ ] Login as `testowner@example.com` with temporary password
- [ ] **Verify:**
  - Login succeeds
  - Redirected to password change page
  - Must set new password
- [ ] Set new password (min 8 characters)
- [ ] **Verify:**
  - Account status changes to "active"
  - Redirected to dashboard

### 2.2 Organization Dashboard Access
- [ ] Navigate to `/organization`
- [ ] **Verify page shows:**
  - Organization name in sidebar
  - Role badge (Owner or Admin)
  - Navigation: Dashboard, Team Members, Billing, Settings
  - Stats cards:
    - Team Members: 1
    - Seats Used: 10% (1 of 10)
    - Plan: Team
    - Activity: 0 emails this month
  - Quick actions buttons

### 2.3 Add Team Member
- [ ] Navigate to `/organization/users`
- [ ] Click "Add Member"
- [ ] Fill form:
  - Email: `newmember@testorg.com`
  - Full Name: "New Member"
  - Role: Member
- [ ] Click "Add User"
- [ ] **Verify:**
  - Success message
  - User appears in list
  - Dashboard shows "Team Members: 2"
  - Dashboard shows "Seats Used: 20% (2 of 10)"
- [ ] Check email for `newmember@testorg.com`
- [ ] **Verify email sent** with credentials

### 2.4 Add User Admin
- [ ] Click "Add Member" again
- [ ] Fill form:
  - Email: `testuseradmin@testorg.com`
  - Full Name: "Test User Admin"
  - Role: User Admin
- [ ] Click "Add User"
- [ ] **Verify:**
  - User created successfully
  - Role shown as "user_admin"

### 2.5 Seat Limit Enforcement
- [ ] Add users until reaching max seats (10 total)
- [ ] Try to add one more user
- [ ] **Verify:**
  - Error message: "Organization has reached maximum seats limit (10)"
  - User not created
  - Seat count still at 10

### 2.6 Edit Team Member
- [ ] Find "New Member" in users list
- [ ] Click edit/options
- [ ] Change role to "Admin"
- [ ] Save
- [ ] **Verify:**
  - Role updated successfully
  - Member now has org_admin system role

### 2.7 Remove Team Member
- [ ] Find "New Member" in users list
- [ ] Click delete/remove
- [ ] **Verify:**
  - Confirmation prompt appears
- [ ] Confirm deletion
- [ ] **Verify:**
  - User removed from list
  - Seat count decremented
  - User's organizationId cleared (check DB)
  - User suspended in database

### 2.8 Organization Settings
- [ ] Navigate to `/organization/settings`
- [ ] **Verify** shows:
  - Organization name (editable)
  - Billing email (editable)
  - Contact email (editable)
- [ ] Update organization name to "Test Corp Updated"
- [ ] Click "Save Changes"
- [ ] **Verify:**
  - Success message
  - Name updated in sidebar
  - Name updated in dashboard

### 2.9 Cannot Access Other Organizations
- [ ] Open browser console
- [ ] Try to access another org's API:
```javascript
fetch('/api/organization/users?orgId=different-org-id')
  .then(r => r.json())
  .then(data => console.log(data));
```
- [ ] **Verify:**
  - API returns only current organization's users
  - Cannot see other organizations' data

---

## Test Suite 3: User Admin Features

### 3.1 User Admin Login
- [ ] Logout from owner account
- [ ] Login as `testuseradmin@testorg.com`
- [ ] Navigate to `/organization`
- [ ] **Verify:**
  - Can access organization dashboard
  - Can access `/organization/users`
  - Sidebar shows limited options

### 3.2 User Admin Can Add Members
- [ ] Navigate to `/organization/users`
- [ ] Click "Add Member"
- [ ] Add a regular member
- [ ] **Verify:**
  - User created successfully
  - Email sent

### 3.3 User Admin Cannot Create Admins
- [ ] Try to add user with role "Admin"
- [ ] **Verify:**
  - Error message
  - User not created
  - OR role dropdown doesn't show Admin/Owner options

### 3.4 User Admin Cannot Access Settings
- [ ] Try to navigate to `/organization/settings`
- [ ] **Verify:**
  - 403 Forbidden
  - Or redirected
  - Or settings link not visible in sidebar

### 3.5 User Admin Cannot Access Billing
- [ ] Try to navigate to `/organization/billing`
- [ ] **Verify:**
  - 403 Forbidden
  - Or redirected
  - Or billing link not visible in sidebar

### 3.6 User Admin Cannot Edit Admins
- [ ] Find an admin or owner in users list
- [ ] Try to edit their role
- [ ] **Verify:**
  - Edit button disabled or hidden
  - Or attempt returns 403 error

### 3.7 User Admin Cannot Delete Users
- [ ] Try to delete a member
- [ ] **Verify:**
  - Delete button hidden or disabled
  - Or attempt returns 403 error

---

## Test Suite 4: Regular Member (No Admin Access)

### 4.1 Member Cannot Access Org Dashboard
- [ ] Logout, login as regular member
- [ ] Try to access `/organization`
- [ ] **Verify:**
  - 403 Forbidden
  - Or redirected to main app
  - Cannot see organization admin features

### 4.2 Member Cannot Access Admin Panel
- [ ] Try to access `/admin`
- [ ] **Verify:**
  - 403 Forbidden
  - Or redirected

---

## Test Suite 5: Security Tests

### 5.1 CSRF Protection
- [ ] Open browser console
- [ ] Try to make POST request without CSRF token:
```javascript
fetch('/api/organization/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    fullName: 'Test User',
    orgRole: 'member'
  })
}).then(r => console.log(r.status, r.statusText));
```
- [ ] **Verify:**
  - 403 Forbidden or CSRF error
  - User not created

### 5.2 Rate Limit Recovery
- [ ] Trigger rate limit (make 6+ admin requests rapidly)
- [ ] Wait exactly 60 seconds
- [ ] Make another request
- [ ] **Verify:**
  - Request succeeds (200 OK)
  - Rate limit window reset correctly

### 5.3 Role-Based API Access
Login as org_admin and test:
- [ ] GET `/api/organization/users` → **Should succeed**
- [ ] POST `/api/organization/users` → **Should succeed**
- [ ] GET `/api/admin/users` → **Should fail (403)**
- [ ] GET `/api/organization/stats` → **Should succeed**

Login as user_admin and test:
- [ ] GET `/api/organization/users` → **Should succeed**
- [ ] POST `/api/organization/users` → **Should succeed**
- [ ] PATCH `/api/organization/settings` → **Should fail (403)**
- [ ] GET `/api/organization/billing` → **Should fail (403)**

### 5.4 Cross-Organization Access Prevention
- [ ] Create two organizations
- [ ] Login as owner of Org A
- [ ] Try to access Org B's users via API
- [ ] **Verify:**
  - Request returns only Org A's data
  - Cannot see or modify Org B's data

---

## Test Suite 6: Email & Notifications

### 6.1 Owner Welcome Email
- [ ] Create new organization with owner
- [ ] Check owner's email inbox
- [ ] **Verify email contains:**
  - ✅ Subject: "Welcome to [Org Name] - Your Account is Ready"
  - ✅ Organization name
  - ✅ Owner name
  - ✅ Temporary password (24 characters)
  - ✅ Login URL
  - ✅ Expiry notice (7 days)
  - ✅ "From: noreply@easemail.app"

### 6.2 New Member Credentials Email
- [ ] Add new member to organization
- [ ] Check member's email inbox
- [ ] **Verify same format** as owner email

### 6.3 Email Not Sent (Optional Checkbox)
- [ ] Create organization with "Send welcome email" unchecked
- [ ] **Verify:**
  - Organization and owner created
  - No email sent
  - Can still login with temp password (admin must communicate it)

---

## Test Suite 7: Data Integrity

### 7.1 Database Consistency
After creating organization with owner, check database:

**Organizations table:**
- [ ] `currentSeats` = 1
- [ ] `maxSeats` = 10 (or configured amount)
- [ ] `isActive` = true
- [ ] `planType` set correctly

**Users table:**
- [ ] Owner user exists
- [ ] `organizationId` matches created org
- [ ] `role` = 'org_admin'
- [ ] `accountStatus` = 'pending' (before first login)
- [ ] `tempPassword` is bcrypt hashed
- [ ] `tempPasswordExpiresAt` is 7 days from now
- [ ] `requirePasswordChange` = true

**Organization_members table:**
- [ ] Entry exists for owner
- [ ] `role` = 'owner'
- [ ] `userId` matches owner's user ID
- [ ] `organizationId` matches created org
- [ ] `invitedBy` is platform admin's ID

### 7.2 Audit Logs
Check `user_audit_logs` table for:
- [ ] Organization creation logged
- [ ] User creation logged
- [ ] Impersonation started logged
- [ ] Impersonation exited logged
- [ ] All logs contain:
  - userId, action, performedBy
  - ipAddress, userAgent
  - timestamp
  - details (JSON)

---

## Test Suite 8: UI/UX Tests

### 8.1 Organization Dashboard UI
- [ ] Dashboard loads in < 2 seconds
- [ ] Stats cards display correctly
- [ ] Quick actions are clickable
- [ ] Sidebar navigation works
- [ ] Mobile responsive (test on narrow viewport)

### 8.2 User Management UI
- [ ] User list displays all members
- [ ] Add member modal opens smoothly
- [ ] Form validation works (required fields)
- [ ] Success/error messages display clearly
- [ ] Loading states show during operations

### 8.3 Impersonation Banner
- [ ] Banner appears immediately after impersonation
- [ ] Banner stays fixed at top while scrolling
- [ ] Banner visible on all pages
- [ ] Exit button clearly visible
- [ ] Orange warning color stands out
- [ ] Body content pushed down (no overlap)

---

## Test Suite 9: Error Handling

### 9.1 Duplicate Email Prevention
- [ ] Try to create user with existing email
- [ ] **Verify:**
  - Error message: "Email already in use"
  - User not created
  - Form stays open to correct

### 9.2 Invalid Data Handling
- [ ] Try to create user with invalid email format
- [ ] **Verify:** Frontend validation catches it
- [ ] Try to submit without required fields
- [ ] **Verify:** Form validation works

### 9.3 Network Error Handling
- [ ] Disconnect internet
- [ ] Try to add user
- [ ] **Verify:**
  - User-friendly error message
  - No silent failures
  - Can retry after reconnecting

---

## Pass/Fail Criteria

### Critical (Must Pass)
- [ ] Platform admin can create organizations with owners
- [ ] Owners receive welcome email with credentials
- [ ] Org admins can add/edit/remove members
- [ ] User admins have limited permissions (no billing/settings)
- [ ] Rate limiting prevents abuse (admin: 5/min, impersonate: 2/min)
- [ ] Impersonation works with exit banner
- [ ] Cross-organization access is prevented
- [ ] Seat limits are enforced

### High Priority (Should Pass)
- [ ] All emails sent successfully
- [ ] Audit logs created for all actions
- [ ] CSRF protection works
- [ ] Role checks consistent across all endpoints
- [ ] Database integrity maintained

### Medium Priority (Nice to Have)
- [ ] UI is responsive on mobile
- [ ] Loading states show properly
- [ ] Error messages are user-friendly
- [ ] Performance is acceptable (< 2s page loads)

---

## Test Results Summary

**Test Date:** ___________
**Tester Name:** ___________
**Environment:** ___________

| Test Suite | Tests Passed | Tests Failed | Notes |
|------------|--------------|--------------|-------|
| 1. Platform Admin | __ / 7 | __ | |
| 2. Org Admin | __ / 9 | __ | |
| 3. User Admin | __ / 7 | __ | |
| 4. Regular Member | __ / 2 | __ | |
| 5. Security | __ / 4 | __ | |
| 6. Email | __ / 3 | __ | |
| 7. Data Integrity | __ / 2 | __ | |
| 8. UI/UX | __ / 3 | __ | |
| 9. Error Handling | __ / 3 | __ | |
| **TOTAL** | **__ / 40** | **__** | |

**Overall Status:** ⬜ PASS / ⬜ FAIL

**Critical Issues Found:** ___________

**Recommendations:** ___________

---

## Notes

- Test in a clean database to avoid conflicts
- Use incognito/private browsing to test different user sessions
- Clear browser cache if experiencing issues
- Check browser console for JavaScript errors
- Monitor server logs during testing
- Take screenshots of failures for debugging

---

*Generated: 2026-02-03*
*Version: 1.0*
