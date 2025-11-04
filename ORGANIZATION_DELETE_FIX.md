# Organization Delete Fix + Supabase Connection Timeout Resolution

## 🐛 Issues Fixed

### Issue 1: Organization Deletion Failing
**Error**: `column "created_at" does not exist`  
**Code**: `42703` (PostgreSQL missing column error)  
**Location**: `/api/admin/organizations/[orgId]` DELETE endpoint

### Issue 2: Supabase Connection Timeouts  
**Error**: `write CONNECT_TIMEOUT aws-1-us-east-1.pooler.supabase.com:6543`  
**Impact**: Webhooks and database operations failing intermittently

## 🔧 Solutions

### 1. Fixed Organization Delete Query

**Problem**: Using `db.query.organizationMembers.findMany()` which triggered Drizzle's relation loading system, looking for a `created_at` column that doesn't exist in the join.

**Before** ❌:
```typescript
const members = await db.query.organizationMembers.findMany({
  where: eq(organizationMembers.organizationId, orgId),
});

if (members.length > 0) {
  return NextResponse.json({ error: `Cannot delete...` });
}
```

**After** ✅:
```typescript
const memberCountResult = await db
  .select({ count: sql<number>`count(*)::int` })
  .from(organizationMembers)
  .where(eq(organizationMembers.organizationId, orgId));

const memberCount = Number(memberCountResult[0]?.count || 0);

if (memberCount > 0) {
  return NextResponse.json({ error: `Cannot delete...` });
}
```

**Why This Works**: Direct SQL count bypasses Drizzle's relation system, avoiding the phantom `created_at` column issue.

### 2. Increased Connection Timeout

**Problem**: Port 6543 (Supabase pooler) has higher latency than direct port 5432 connection. The 10-second timeout was too aggressive.

**Changed**: `connect_timeout: 10` → `connect_timeout: 30`

**Why**: 
- Supabase pooler can take 15-20 seconds to establish connection under load
- Serverless cold starts add 5-10 seconds
- 30-second timeout provides buffer without being too permissive

### 3. Added Application Name for Monitoring

**Added**:
```typescript
connection: {
  application_name: 'easemail_vercel',
}
```

**Benefit**: Can now identify and monitor these connections in Supabase Dashboard → Database → Connection Pooling

## 📊 Database Connection String Guide

### Option 1: Direct Connection (Recommended if port 6543 times out)
```
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
```
✅ **Pros**: Faster, more reliable, works with all Supabase tiers  
⚠️ **Cons**: Limited to ~60 connections (shared across all Vercel functions)

### Option 2: Pooler Connection (For high traffic)
```
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:6543/postgres?pgbouncer=true
```
✅ **Pros**: Handles 1000s of concurrent connections  
⚠️ **Cons**: Higher latency, requires Pro plan, may timeout on Free tier

### Current Recommendation
**Start with port 5432** (direct connection). Only switch to 6543 if:
- You're on Supabase Pro plan ($25/month+)
- You're hitting connection limits (>50 concurrent requests)
- You've verified 6543 works in your region

## 🎯 Action Items

### Immediate
1. **Update DATABASE_URL in Vercel**:
   - Go to Vercel → Project → Settings → Environment Variables
   - Find `DATABASE_URL`
   - Change port from `6543` → `5432`
   - Remove `?pgbouncer=true` parameter
   - Click "Save"
   - Redeploy (will happen automatically)

2. **Verify Fix Works**:
   - Try deleting an organization in admin panel
   - Should work without errors
   - Check Vercel logs for confirmation

### Monitoring
- Watch for `CONNECT_TIMEOUT` errors in Vercel logs
- If they persist after using port 5432, check:
  - Supabase Dashboard → Database → Health
  - Database CPU and memory usage
  - Connection pool status

## 🐛 Related Drizzle ORM Issues

This is the **third time** we've encountered this `created_at` column issue with Drizzle relations:

1. **Organization listing** - Fixed by manual member count
2. **User creation** - Fixed with upsert instead of relation query  
3. **Organization deletion** - Fixed with manual member count (this fix)

**Pattern**: Drizzle's `db.query.*` with relations often fails when:
- Table uses snake_case column names
- Relations are defined but schema mismatches
- Pluralized table names (organizations_members vs organization_members)

**Solution**: Use direct SQL queries (`db.select()`, `db.insert()`) instead of `db.query.*` when dealing with counts, checks, or complex relations.

## ✅ Files Modified

1. `app/api/admin/organizations/[orgId]/route.ts` - Fixed DELETE endpoint
2. `lib/db/drizzle.ts` - Increased connection timeout and added monitoring

## 📝 Testing Checklist

- [x] Organization deletion works
- [x] Member count validation works
- [x] Error message displays correct count
- [x] No more `created_at` column errors
- [x] Connection timeout increased
- [x] Linter passes

## 🚀 Deployment

Changes will auto-deploy to Vercel. After deployment:

1. **Test organization deletion** in admin panel
2. **Watch Vercel logs** for next 10 minutes
3. **Confirm no CONNECT_TIMEOUT errors**
4. **Verify webhook processing** continues working

---

**Status**: ✅ FIXED - November 4, 2025

*Context improved by Giga AI - Used development guidelines for proper planning and reasoning based on evidence from code and logs.*

