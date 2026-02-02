# Admin Roles - Clear Breakdown
**What Admin Types Exist in EaseMail**

---

## ❌ Common Misconception

**You said:** "Individual admin, org admin, and super admin"

**Actually:** There's **NO such thing as "individual admin"**

---

## ✅ What We Actually Have

There are only **2 types of admins:**

### 1. 🌟 Super Admin (Platform Admin)
- **Database field:** `users.role = 'platform_admin'`
- **Who has this:** You (tdaniel@botmakers.ai)
- **Can do:** EVERYTHING across the entire platform
- **Access:** `/admin` dashboard
- **Scope:** All organizations, all users, all settings

### 2. 🏢 Organization Admin
- **Database field:** `users.role = 'org_admin'`
- **Who has this:** Users who manage an organization
- **Can do:** Manage their own organization only
- **Access:** Their organization settings (NOT `/admin` dashboard)
- **Scope:** Only their organization

---

## The Full Role Hierarchy

```
┌─────────────────────────────────────────────────┐
│  SUPER ADMIN (platform_admin)                   │
│  • tdaniel@botmakers.ai ← YOU                   │
│  • Full system access                           │
│  • Can access /admin dashboard                  │
│  • Can manage ALL organizations                 │
│  • Can create organizations                     │
└─────────────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────┐
│  ORGANIZATIONS (teams/companies)                │
│                                                 │
│  Organization Admins (org_admin):               │
│  ├─ Owner (full org control)                    │
│  ├─ Admin (full org control)                    │
│  └─ User Admin (manages users only) ⭐          │
│                                                 │
│  Regular Members (org_user):                    │
│  └─ Member (standard user, no admin)            │
└─────────────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────┐
│  INDIVIDUAL USERS (not admins!)                 │
│  • Users NOT part of any organization           │
│  • Solo accounts                                │
│  • role = 'individual'                          │
│  • They are NOT admins of anything              │
│  • They just manage their own account           │
└─────────────────────────────────────────────────┘
```

---

## Breaking It Down

### Super Admin (Platform Admin)
```typescript
// In database
{
  email: 'tdaniel@botmakers.ai',
  role: 'platform_admin',  // ← This makes you super admin
  organizationId: null      // Not part of any org
}
```

**What you can do:**
- ✅ Access `/admin` dashboard
- ✅ Create/delete organizations
- ✅ Create/delete any user
- ✅ Manage all organizations
- ✅ Configure system settings
- ✅ View all financial data
- ✅ Access everything

**What you see:**
- The full admin back office at `/admin`
- All 10 admin sections
- God mode basically

---

### Organization Admin
```typescript
// In users table
{
  email: 'jane@acme.com',
  role: 'org_admin',        // ← Makes them an org admin
  organizationId: 'acme-id' // ← Member of Acme Corp
}

// In organization_members table
{
  userId: 'jane-id',
  organizationId: 'acme-id',
  role: 'owner'             // ← Their role within the org
  // Could also be: 'admin', 'user_admin', or 'member'
}
```

**What they can do:**
- ✅ Manage users in their organization
- ✅ Configure organization settings
- ✅ View organization billing
- ✅ Manage organization subscriptions
- ❌ CANNOT access `/admin` dashboard
- ❌ CANNOT see other organizations
- ❌ CANNOT configure system settings

**What they see:**
- Organization management section
- Team settings page
- Their organization's users
- Their organization's billing

**Three sub-types within organizations:**

#### Owner / Admin
- Can manage everything in the org (users, billing, settings)

#### User Admin ⭐ (NEW role we just added)
- Can manage users ONLY
- Cannot touch billing or settings

#### Member
- Not an admin at all
- Just a regular user in the org

---

### Individual User (NOT AN ADMIN!)
```typescript
// In database
{
  email: 'solo@example.com',
  role: 'individual',       // ← Just a regular user
  organizationId: null      // Not part of any org
}
```

**What they can do:**
- ✅ Use email features
- ✅ Manage their own contacts
- ✅ Connect email accounts
- ✅ Manage their own subscription
- ❌ CANNOT manage other users
- ❌ CANNOT access any admin features
- ❌ They're not admins of anything

**What they see:**
- Regular inbox
- Their own settings
- Their own billing page
- No admin features at all

---

## So The Answer Is...

### ❌ NO "Individual Admin"
There's no such thing. Individual users are just regular users, not admins.

### ✅ YES "Organization Admin"
Users who manage an organization (owner, admin, user_admin roles)

### ✅ YES "Super Admin"
You - full platform control

---

## The 2 Admin Types

```
1. SUPER ADMIN (platform_admin)
   └─ You (tdaniel@botmakers.ai)
   └─ Full system access
   └─ Can access /admin dashboard

2. ORGANIZATION ADMIN (org_admin)
   └─ Users who manage an organization
   └─ Can only manage their own org
   └─ CANNOT access /admin dashboard

   Three levels within orgs:
   ├─ Owner/Admin (full org control)
   ├─ User Admin (user management only)
   └─ Member (not an admin)
```

---

## User Types (For Clarity)

**4 user role types exist:**

1. **platform_admin** - Super admin (you)
2. **org_admin** - Organization admins (owner/admin/user_admin in an org)
3. **org_user** - Regular members in organizations
4. **individual** - Solo users (not in any org, not admins)

---

## Real-World Examples

### Example 1: Super Admin (You)
```
tdaniel@botmakers.ai
├─ Role: platform_admin
├─ Organization: None
├─ Can access: /admin dashboard
└─ Can do: EVERYTHING
```

### Example 2: Company Owner
```
jane@acme.com
├─ Role: org_admin (in users table)
├─ Organization: Acme Corp
├─ Org Role: owner (in organization_members table)
├─ Can access: Organization settings
├─ Can do: Manage Acme Corp (users, billing, settings)
└─ CANNOT: Access /admin or see other orgs
```

### Example 3: HR Manager
```
hr@acme.com
├─ Role: org_admin (in users table)
├─ Organization: Acme Corp
├─ Org Role: user_admin (in organization_members table)
├─ Can access: User management for Acme Corp
├─ Can do: Invite/remove users in Acme Corp
└─ CANNOT: Change billing, settings, or access /admin
```

### Example 4: Regular Employee
```
employee@acme.com
├─ Role: org_user (in users table)
├─ Organization: Acme Corp
├─ Org Role: member (in organization_members table)
├─ Can access: Email inbox
├─ Can do: Use email features
└─ CANNOT: Any admin functions
```

### Example 5: Solo Freelancer
```
freelancer@example.com
├─ Role: individual (in users table)
├─ Organization: None
├─ Can access: Email inbox
├─ Can do: Use email features, manage own account
└─ CANNOT: Any admin functions (they're not an admin!)
```

---

## Summary

**You asked:** "We have individual admin, org admin, and super admin, correct?"

**Answer:** ❌ **NO**

**Correct statement:** "We have **organization admins** and **super admins**. Individual users are NOT admins."

**The 2 admin types:**
1. **Super Admin** (platform_admin) - Full system control (you)
2. **Organization Admin** (org_admin) - Can manage their own organization only

**Individual users** are just regular users, not admins of anything.

---

**Last Updated:** February 2, 2026
