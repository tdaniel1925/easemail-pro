# RBAC Migration Guide

## Overview

Centralized Role-Based Access Control (RBAC) system to replace scattered authorization checks in admin routes.

**Status:** ✅ Infrastructure complete, ready for admin route migration

---

## Problem Solved

### Before (Repeated in every admin route)
```typescript
export async function GET() {
  // 1. Get Supabase user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Get database user
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  });

  // 3. Check role
  if (!dbUser || dbUser.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 4. Finally, your actual logic
  // ... handler code ...
}
```

**Issues:**
- 15+ lines of boilerplate in EVERY admin route
- Inconsistent error messages
- Easy to forget authorization checks
- Hard to add new roles or permissions
- No centralized audit trail

### After (With RBAC Middleware)
```typescript
import { requirePlatformAdmin } from '@/lib/security/rbac';

export const GET = requirePlatformAdmin(async (request, { user }) => {
  // Your actual logic - authorization already done!
  // user is guaranteed to be a platform admin
  // ... handler code ...
});
```

**Benefits:**
- 1 line instead of 15
- Consistent authorization logic
- Type-safe user context
- Permission-based access control
- Easy to audit and maintain

---

## System Components

### 1. Roles

```typescript
export const ROLES = {
  PLATFORM_ADMIN: 'platform_admin',  // Full platform access
  ORG_ADMIN: 'org_admin',            // Organization admin
  ORG_MEMBER: 'org_member',          // Organization member
  USER: 'user',                      // Regular user
} as const;
```

### 2. Permissions

```typescript
export const PERMISSIONS = {
  // Platform admin permissions
  MANAGE_ALL_USERS: 'manage:all_users',
  MANAGE_ALL_ORGS: 'manage:all_organizations',
  VIEW_PLATFORM_STATS: 'view:platform_stats',
  MANAGE_BILLING: 'manage:billing',
  MANAGE_PRICING: 'manage:pricing',
  RUN_MIGRATIONS: 'run:migrations',
  IMPERSONATE_USERS: 'impersonate:users',
  MANAGE_TEMPLATES: 'manage:templates',

  // Organization admin permissions
  MANAGE_ORG: 'manage:organization',
  MANAGE_ORG_MEMBERS: 'manage:organization_members',
  VIEW_ORG_USAGE: 'view:organization_usage',
  MANAGE_ORG_SETTINGS: 'manage:organization_settings',

  // User permissions
  MANAGE_PROFILE: 'manage:profile',
  VIEW_OWN_DATA: 'view:own_data',
} as const;
```

### 3. User Context

```typescript
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  organizationId: string | null;
  isOrgAdmin: boolean;
  permissions: Permission[];
}
```

---

## Migration Options

### Option 1: requirePlatformAdmin() - Simplest

For routes that require platform admin access:

```typescript
// Before
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await db.query.users.findFirst({ where: eq(users.id, user.id) });
  if (!dbUser || dbUser.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Your logic
  const data = await fetchData();
  return NextResponse.json({ data });
}

// After
import { requirePlatformAdmin } from '@/lib/security/rbac';

export const GET = requirePlatformAdmin(async (request, { user }) => {
  // Your logic - user is guaranteed to be platform admin
  const data = await fetchData();
  return NextResponse.json({ data });
});
```

### Option 2: requireOrgAdmin() - Organization Admins

For routes accessible by org admins or platform admins:

```typescript
import { requireOrgAdmin } from '@/lib/security/rbac';

export const GET = requireOrgAdmin(async (request, { user }) => {
  // user.role is either 'platform_admin' or 'org_admin'
  // user.organizationId contains their org (if org admin)

  const data = await fetchOrgData(user.organizationId!);
  return NextResponse.json({ data });
});
```

### Option 3: requireAuth() - Any Authenticated User

For routes accessible by any logged-in user:

```typescript
import { requireAuth } from '@/lib/security/rbac';

export const GET = requireAuth(async (request, { user }) => {
  // Any logged-in user can access
  // user contains full user context

  const data = await fetchUserData(user.id);
  return NextResponse.json({ data });
});
```

### Option 4: withRole() - Specific Role(s)

For custom role requirements:

```typescript
import { withRole, ROLES } from '@/lib/security/rbac';

// Single role
export const GET = withRole(ROLES.ORG_ADMIN, async (request, { user }) => {
  // Only org admins (NOT platform admins)
  return NextResponse.json({ data });
});

// Multiple roles
export const GET = withRole(
  [ROLES.PLATFORM_ADMIN, ROLES.ORG_ADMIN],
  async (request, { user }) => {
    // Either platform admin or org admin
    return NextResponse.json({ data });
  }
);
```

### Option 5: withPermission() - Permission-Based

For permission-based access control:

```typescript
import { withPermission, PERMISSIONS } from '@/lib/security/rbac';

// Single permission
export const GET = withPermission(
  PERMISSIONS.MANAGE_BILLING,
  async (request, { user }) => {
    // User has billing management permission
    return NextResponse.json({ data });
  }
);

// Multiple permissions (user needs ANY of them)
export const GET = withPermission(
  [PERMISSIONS.MANAGE_BILLING, PERMISSIONS.VIEW_PLATFORM_STATS],
  async (request, { user }) => {
    // User has either permission
    return NextResponse.json({ data });
  }
);
```

---

## Migration Priority

### Phase 1: Critical Admin Routes (Start Here)
Routes that modify sensitive data:

- [ ] `/api/admin/users/**` - User management
- [ ] `/api/admin/billing/**` - Billing operations
- [ ] `/api/admin/pricing/**` - Pricing configuration
- [ ] `/api/admin/run-migration` - Database migrations
- [ ] `/api/admin/impersonate/**` - User impersonation

### Phase 2: Stats & Monitoring
Read-only admin routes:

- [ ] `/api/admin/stats` - Platform statistics
- [ ] `/api/admin/usage/**` - Usage tracking
- [ ] `/api/admin/organizations/**` - Organization management

### Phase 3: Utility Routes
Administrative utilities:

- [ ] `/api/admin/cleanup/**` - Cleanup operations
- [ ] `/api/admin/fix-*` - Fix utilities
- [ ] `/api/admin/check-*` - Check utilities

---

## Route Parameter Access

Routes with parameters (like `[userId]`) work the same:

```typescript
// app/api/admin/users/[userId]/route.ts
import { requirePlatformAdmin } from '@/lib/security/rbac';

export const GET = requirePlatformAdmin(async (request, { user, params }) => {
  const userId = params?.userId; // Access route parameters

  const userData = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  return NextResponse.json({ user: userData });
});
```

---

## Organization Access Control

For routes that need to verify organization membership:

```typescript
import { requireAuth, canAccessOrganization } from '@/lib/security/rbac';

export const GET = requireAuth(async (request, { user, params }) => {
  const orgId = params?.orgId;

  // Check if user can access this organization
  if (!canAccessOrganization(user, orgId)) {
    return NextResponse.json(
      { error: 'You do not have access to this organization' },
      { status: 403 }
    );
  }

  // User has access to this org
  const orgData = await fetchOrgData(orgId);
  return NextResponse.json({ data: orgData });
});
```

---

## Permission Checks in Handler

Sometimes you need conditional logic based on permissions:

```typescript
import { requireAuth, hasPermission, PERMISSIONS } from '@/lib/security/rbac';

export const GET = requireAuth(async (request, { user }) => {
  // Everyone can see basic data
  const data = await fetchBasicData();

  // Only users with specific permission can see sensitive data
  if (hasPermission(user, PERMISSIONS.MANAGE_BILLING)) {
    data.billingDetails = await fetchBillingData();
  }

  return NextResponse.json({ data });
});
```

---

## Error Responses

RBAC middleware returns consistent error responses:

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized. Please log in.",
  "code": "UNAUTHORIZED"
}
```

### 403 Forbidden (Role-based)
```json
{
  "success": false,
  "error": "Forbidden. Platform admin access required.",
  "code": "FORBIDDEN",
  "requiredRole": ["platform_admin"],
  "userRole": "user"
}
```

### 403 Forbidden (Permission-based)
```json
{
  "success": false,
  "error": "Forbidden. You do not have permission to access this resource.",
  "code": "FORBIDDEN",
  "requiredPermissions": ["manage:billing"],
  "userPermissions": ["manage:profile", "view:own_data"]
}
```

---

## Example: Complete Migration

### Before
```typescript
// app/api/admin/stats/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch stats
    const stats = await fetchPlatformStats();

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### After
```typescript
// app/api/admin/stats/route.ts
import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/security/rbac';

export const dynamic = 'force-dynamic';

export const GET = requirePlatformAdmin(async (request, { user }) => {
  try {
    // Fetch stats - user is guaranteed to be platform admin
    const stats = await fetchPlatformStats();

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
```

**Lines removed:** 15
**Lines added:** 3
**Net reduction:** 12 lines per route × 50+ admin routes = 600+ lines of boilerplate eliminated

---

## Testing RBAC

### Test Unauthorized Access
```bash
# Try accessing admin route without login - should get 401
curl http://localhost:3000/api/admin/stats

# Expected:
# {"success":false,"error":"Unauthorized. Please log in.","code":"UNAUTHORIZED"}
```

### Test Forbidden Access
```bash
# Login as regular user, try admin route - should get 403
curl -H "Cookie: session=..." http://localhost:3000/api/admin/stats

# Expected:
# {"success":false,"error":"Forbidden. Platform admin access required.","code":"FORBIDDEN",...}
```

### Test Authorized Access
```bash
# Login as platform admin - should work
curl -H "Cookie: session=..." http://localhost:3000/api/admin/stats

# Expected:
# {"stats":{...}}
```

---

## Next Steps

1. **Start with high-priority routes** - Migrate admin user management, billing routes
2. **Test each migration** - Verify auth still works after migration
3. **Update frontend error handling** - Handle new error response format
4. **Add audit logging** - Log admin actions with user context
5. **Document exemptions** - Note any routes that intentionally skip RBAC

---

## Files Created

- `lib/security/rbac.ts` - Core RBAC logic and middleware
- `RBAC_MIGRATION_GUIDE.md` - This guide

---

**Status:** Infrastructure complete, ready for gradual rollout to admin routes ✅
