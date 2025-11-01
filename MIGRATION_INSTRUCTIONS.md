# 🎯 How to Apply the SMS Migration

## Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the contents of `migrations/RUN_THIS_SMS_MIGRATION.sql`
5. Click "Run" button
6. ✅ Done! All tables created

## Option 2: Command Line

```bash
# Using psql
psql $DATABASE_URL -f migrations/RUN_THIS_SMS_MIGRATION.sql

# Or using Supabase CLI
supabase db execute -f migrations/RUN_THIS_SMS_MIGRATION.sql
```

## What Gets Created

✅ 5 new tables:
- `sms_messages` - SMS records with Twilio integration
- `sms_usage` - Monthly usage tracking
- `contact_communications` - Timeline of SMS, calls, meetings (NO emails)
- `contact_notes` - Timestamped notes
- `sms_audit_log` - Billing & compliance audit trail

✅ All indexes for performance
✅ Foreign key constraints
✅ Row Level Security (RLS) policies
✅ User data isolation

## Verify Migration

After running, verify with:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'sms_messages', 
    'sms_usage', 
    'contact_communications', 
    'contact_notes', 
    'sms_audit_log'
  );
```

Should return all 5 tables.

## Need to Rollback?

If you need to remove these tables:

```sql
DROP TABLE IF EXISTS sms_audit_log CASCADE;
DROP TABLE IF EXISTS contact_notes CASCADE;
DROP TABLE IF EXISTS contact_communications CASCADE;
DROP TABLE IF EXISTS sms_usage CASCADE;
DROP TABLE IF EXISTS sms_messages CASCADE;
```

---

*Note: If you get foreign key constraint errors, it means the `users` or `contacts` tables don't exist yet. Make sure your base schema is applied first.*

