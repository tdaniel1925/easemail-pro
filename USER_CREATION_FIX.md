# User Creation Duplicate Key Error - Fix Documentation

## Problem
When creating users through the admin panel, the system was encountering duplicate key errors:
```
duplicate key value violates unique constraint "users_pkey"
Key (id)=(33a6af69-140f-4121-a70c-621374186278) already exists.
```

This was happening because:
1. A Supabase Auth user was successfully created
2. The system then tried to insert a database record with the same UUID
3. But that UUID already existed in the `users` table (from a previous failed or retried request)
4. The insert failed with a duplicate key constraint violation

## Root Cause
The issue occurred when:
- Previous requests partially succeeded (created Supabase Auth user but failed during DB insert)
- Requests were retried after timeouts or errors
- Race conditions with multiple simultaneous requests
- Manual retries by the admin after seeing an error

## Solution Implemented

### 1. Check for Existing Supabase Auth Users
Before creating a new auth user, the system now checks if one already exists with the same email:

```typescript
const { data: existingAuthUsers } = await adminClient.auth.admin.listUsers();
const authUserExists = existingAuthUsers?.users?.some(
  u => u.email?.toLowerCase() === email.toLowerCase().trim()
);
```

### 2. Reuse Existing Auth Users
If a Supabase Auth user already exists, the system:
- Retrieves their existing UUID
- Generates a new temporary password
- Updates their auth record with the new password and metadata
- Logs this as a "reuse" operation

```typescript
if (authUserExists) {
  const existingAuthUser = existingAuthUsers?.users?.find(
    u => u.email?.toLowerCase() === email.toLowerCase().trim()
  );
  authUserId = existingAuthUser!.id;
  tempPassword = generateSecurePassword(16);
  
  console.log(`♻️ Reusing existing Supabase Auth user: ${authUserId}`);
  
  await adminClient.auth.admin.updateUserById(authUserId, {
    password: tempPassword,
    user_metadata: { full_name: fullName },
  });
}
```

### 3. Upsert Database Records
Changed from `insert()` to `insert().onConflictDoUpdate()` to handle race conditions gracefully:

```typescript
const [newUser] = await db.insert(users).values({
  id: authUserId,
  email: email.toLowerCase().trim(),
  fullName,
  organizationId: orgId,
  role: role === 'admin' ? 'org_admin' : 'org_user',
  accountStatus: 'pending',
  tempPassword: hashedTempPassword,
  requirePasswordChange: true,
  tempPasswordExpiresAt: tempPasswordExpiry,
  createdBy: currentUser.id,
})
.onConflictDoUpdate({
  target: users.id,
  set: {
    email: email.toLowerCase().trim(),
    fullName,
    organizationId: orgId,
    role: role === 'admin' ? 'org_admin' : 'org_user',
    accountStatus: 'pending',
    tempPassword: hashedTempPassword,
    requirePasswordChange: true,
    tempPasswordExpiresAt: tempPasswordExpiry,
    updatedAt: new Date(),
  },
})
.returning();
```

## Benefits

1. **Idempotency**: Multiple requests with the same email won't fail - they'll update the existing record
2. **Recovery**: Partially failed requests can be safely retried
3. **Race Condition Safety**: Simultaneous requests for the same user won't cause errors
4. **Better UX**: Admins can retry failed user creations without manual cleanup
5. **Audit Trail**: The system logs whether it created or reused an auth user

## Files Modified

1. `app/api/admin/users/route.ts` - Platform admin user creation endpoint
2. `app/api/admin/organizations/[orgId]/users/route.ts` - Organization user creation endpoint

## Testing Recommendations

1. Create a new user - should work normally
2. Try to create the same user again - should fail with "email already exists" message
3. Create a user, delete the DB record (but leave auth user), try again - should reuse auth user
4. Create a user with a network interruption - retry should work
5. Test with concurrent requests for the same email - should handle gracefully

## Related Error Codes
- PostgreSQL Error Code: `23505` (unique_violation)
- Constraint: `users_pkey` (primary key on users.id)

## Date
November 4, 2025

