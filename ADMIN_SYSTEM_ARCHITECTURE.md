# Admin System Architecture
**EaseMail Admin Role Hierarchy**

---

## Current Role Structure

You have a **2-tier admin system** with 3 distinct role types:

```
┌─────────────────────────────────────────────────────────────┐
│                    PLATFORM ADMIN                           │
│                   (Super Admin / God Mode)                  │
│                                                             │
│  • Full system access across ALL organizations              │
│  • Can manage any organization, user, or resource           │
│  • Access to system-level settings and monitoring           │
│  • Can create/delete organizations                          │
│  • Can make other users platform admins                     │
│  • Access to financial reports, usage analytics             │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   ORGANIZATION LEVEL                        │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ORGANIZATION ADMIN (Owner/Admin)                      │ │
│  │                                                       │ │
│  │ • Manage users within their organization              │ │
│  │ • Invite/remove organization members                  │ │
│  │ • Assign roles (owner, admin, member)                 │ │
│  │ • View organization usage and billing                 │ │
│  │ • Configure organization settings                     │ │
│  │ • Cannot access other organizations                   │ │
│  └───────────────────────────────────────────────────────┘ │
│                              ▼                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ORGANIZATION MEMBER                                   │ │
│  │                                                       │ │
│  │ • Standard user within organization                   │ │
│  │ • Can use all email features                          │ │
│  │ • Cannot manage other users                           │ │
│  │ • Cannot access admin functions                       │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   INDIVIDUAL USERS                          │
│                                                             │
│  • Users not part of any organization                       │
│  • Self-service account management                          │
│  • No admin capabilities                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Users Table (`users.role`)
```typescript
role: 'platform_admin' | 'org_admin' | 'org_user' | 'individual'
```

### Organization Members Table (`organization_members.role`)
```typescript
role: 'owner' | 'admin' | 'member'
```

**Note:** A user can have:
1. **User-level role** (`users.role`) - Their system-wide role
2. **Org-level role** (`organization_members.role`) - Their role within their organization

---

## What You Have vs. What You Want

### What You Currently Have ✅

| Role | Location | What They Can Do |
|------|----------|------------------|
| **platform_admin** | `users.role` | God mode - can do everything |
| **org_admin** | `users.role` | Can manage their organization (deprecated usage) |
| **owner** | `organization_members.role` | Can manage organization members |
| **admin** | `organization_members.role` | Can manage organization members |
| **member** | `organization_members.role` | Standard org user |
| **org_user** | `users.role` | Standard user within organization |
| **individual** | `users.role` | Standalone user (no organization) |

### What You Want 🎯

| Role Level | Current Name | Should Be | Notes |
|------------|--------------|-----------|-------|
| **Level 1: Super Admin** | `platform_admin` | ✅ Already correct | Full system access |
| **Level 2: Org Admin** | `owner` or `admin` in `organization_members` | ✅ Already works | Organization management |
| **Level 3: User Admin** | ❌ **MISSING** | Need to add | Can manage users but not org settings |

---

## The Gap: "User Admin" Role

You're missing a **middle-tier organization role** that can:
- Invite/remove users within the organization
- Reset user passwords
- View user activity logs
- **Cannot:** Change billing, modify org settings, delete organization

### Current Workaround
Right now, you only have:
- `owner` / `admin` - Can do everything in the org
- `member` - Can do nothing administrative

**There's no role for someone who should manage users but NOT billing/settings.**

---

## Permission Matrix

| Action | Platform Admin | Org Owner/Admin | Org Member | Individual |
|--------|----------------|-----------------|------------|------------|
| **System-Wide** |
| Create organizations | ✅ | ❌ | ❌ | ❌ |
| View all organizations | ✅ | ❌ | ❌ | ❌ |
| System settings | ✅ | ❌ | ❌ | ❌ |
| Financial reports | ✅ | ❌ | ❌ | ❌ |
| Make platform admins | ✅ | ❌ | ❌ | ❌ |
| **Organization** |
| Manage org settings | ✅ | ✅ | ❌ | ❌ |
| Invite users to org | ✅ | ✅ | ❌ | ❌ |
| Remove users from org | ✅ | ✅ | ❌ | ❌ |
| View org billing | ✅ | ✅ | ❌ | ❌ |
| Change org plan | ✅ | ✅ | ❌ | ❌ |
| View org usage | ✅ | ✅ | ❌ | ❌ |
| **User Management** |
| View user details | ✅ | ✅ (own org) | ❌ | ❌ |
| Reset user password | ✅ | ✅ (own org) | ❌ | ❌ |
| Suspend user | ✅ | ✅ (own org) | ❌ | ❌ |
| Delete user | ✅ | ✅ (own org) | ❌ | ❌ |
| **Email & Features** |
| Connect email accounts | ✅ | ✅ | ✅ | ✅ |
| Send/receive emails | ✅ | ✅ | ✅ | ✅ |
| Manage contacts | ✅ | ✅ | ✅ | ✅ |
| Calendar access | ✅ | ✅ | ✅ | ✅ |

---

## How to Create Each Role Type

### 1. Platform Admin (Super Admin)
```bash
# Run this script with the user's email
npx tsx scripts/make-platform-admin.ts user@example.com
```

**Database:**
```sql
UPDATE users SET role = 'platform_admin' WHERE email = 'user@example.com';
```

### 2. Organization Admin
**Method 1:** When creating organization, the creator becomes owner automatically

**Method 2:** Promote existing member
```sql
UPDATE organization_members
SET role = 'admin'
WHERE user_id = '...' AND organization_id = '...';
```

**Method 3:** Via Admin UI
- Go to Admin → Organizations → [Org] → Members
- Find user, change role to "Admin" or "Owner"

### 3. Organization Member
- Invite user to organization (they become 'member' by default)
- Or via Admin UI, set role to "Member"

### 4. Individual User
```sql
UPDATE users SET role = 'individual', organization_id = NULL WHERE id = '...';
```

---

## Files to Review

### Role Definitions
- `lib/db/schema.ts:42` - User-level roles
- `lib/db/schema.ts:1052` - Organization-level roles
- `lib/auth/permissions.ts` - Permission checking functions
- `lib/auth/admin-check.ts` - Admin authorization helpers

### Admin Routes
- `app/(dashboard)/admin/**` - All admin pages
- `app/api/admin/**` - All admin API endpoints

### Permission Checks
- `lib/auth/permissions.ts:71` - `isPlatformAdmin()`
- `lib/auth/permissions.ts:79` - `canManageOrganization()`
- `lib/auth/permissions.ts:156` - `requirePlatformAdmin()`
- `lib/auth/permissions.ts:169` - `requireOrgAdmin()`

---

## Recommendations

### Option 1: Add "User Admin" Role to Organization Members ✅ Recommended
**Add a new organization-level role:**
```typescript
// In organization_members table
role: 'owner' | 'admin' | 'user_admin' | 'member'
```

**Permissions for `user_admin`:**
- ✅ Invite users
- ✅ Remove users
- ✅ Reset passwords
- ✅ View user activity
- ❌ Change billing
- ❌ Modify org settings
- ❌ Delete organization

### Option 2: Use Granular Permissions (More Complex)
Instead of fixed roles, use the existing `permissions` JSON field:
```json
{
  "can_invite_users": true,
  "can_remove_users": true,
  "can_manage_billing": false,
  "can_change_settings": false
}
```

### Option 3: Keep Current System (Simplest)
If your use case is simple:
- `owner`/`admin` = Full org control
- `member` = No control

Most small-medium orgs don't need the middle tier.

---

## Summary

**You currently have:**
1. ✅ **Platform Admin** (super admin) - Full system access
2. ✅ **Organization Admin** (owner/admin) - Org management
3. ❌ **User Admin** - MISSING (can manage users but not org)

**Next Steps:**
1. Decide if you need the "User Admin" role
2. If yes, I can implement it (add to schema, update permissions, add UI)
3. If no, your current 2-tier system is sufficient

**Most common setup:**
- 1 Platform Admin (you)
- 1-2 Org Owners per organization
- Rest are Members
