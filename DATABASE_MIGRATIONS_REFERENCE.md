# 🗄️ **DATABASE MIGRATIONS - COMPLETE REFERENCE**

## **Migration Status: ALL APPLIED ✅**

This document tracks all database migrations for EaseMail. Migrations are applied in order and are idempotent (safe to run multiple times).

---

## **📋 Migration List (In Order)**

### **000_complete_schema.sql** ✅
**Purpose:** Initial database schema  
**Status:** Applied  
**Tables Created:**
- `users` - User accounts
- `email_accounts` - Connected email accounts (Nylas/Aurinko)
- `emails` - Email messages
- `contacts` - Contact management
- `folders` - Custom folder structure
- `email_labels` - Labels/tags for emails
- `subscriptions` - User subscriptions

**Key Features:**
- Full-text search indexes
- UUID primary keys
- Timestamp tracking
- Foreign key constraints

---

### **001_nylas_integration.sql** ✅
**Purpose:** Nylas API integration fields  
**Status:** Applied  
**Changes:**
- Added `grant_id` to email_accounts
- Added `nylas_account_id`
- Added `provider_type` (nylas, aurinko)
- Added webhook tracking fields

---

### **002_add_sync_progress_tracking.sql** ✅
**Purpose:** Email synchronization progress tracking  
**Status:** Applied  
**Tables:**
- `sync_status` - Track sync progress per account
- Progress indicators
- Error logging
- Last sync timestamps

---

### **006_add_sms_system.sql** ✅
**Purpose:** Complete SMS system  
**Status:** Applied  
**Tables Created:**
- `sms_messages` - SMS message records
- `sms_usage` - Billing/usage tracking
- `contact_communications` - Unified timeline
- `contact_notes` - Contact notes
- `sms_audit_log` - Compliance audit trail

**Features:**
- Twilio integration
- Usage-based billing
- TCPA/GDPR compliance
- Audit logging

---

### **007_add_user_roles.sql** ✅
**Purpose:** Role-based access control (RBAC)  
**Status:** Applied  
**Changes:**
- Added `role` field to users
- Roles: platform_admin, org_admin, org_user, individual
- Permission system foundation

---

### **008_sync_auth_users.sql** ✅
**Purpose:** Sync Supabase Auth with database  
**Status:** Applied  
**Function:** `handle_new_user()`
- Automatically creates user record on signup
- Syncs email, name, avatar
- Sets initial role

---

### **009_add_sync_stopped_field.sql** ✅
**Purpose:** Manual sync control  
**Status:** Applied  
**Changes:**
- Added `sync_stopped` to email_accounts
- Allows users to pause/resume sync

---

### **010_add_organizations.sql** ✅
**Purpose:** Multi-tenant team/organization support  
**Status:** Applied  
**Tables Created:**
- `organizations` - Team/company accounts
- `organization_members` - Team membership
- `team_invitations` - Invite system

**Features:**
- Team plans
- Seat management
- Role hierarchy (owner, admin, member)
- Invitation workflow

---

### **011_update_admin_roles.sql** ✅
**Purpose:** Enhanced admin role system  
**Status:** Applied  
**Changes:**
- Updated role enums
- Platform admin capabilities
- Organization admin permissions

---

### **012_add_user_suspended_field.sql** ✅
**Purpose:** User account suspension  
**Status:** Applied  
**Changes:**
- Added `suspended` boolean to users
- Admin can suspend/unsuspend accounts

---

### **013_add_system_settings.sql** ✅
**Purpose:** Global system configuration  
**Status:** Applied  
**Tables:**
- `system_settings` - Key-value config store
- API key management via admin panel
- Database-first configuration

---

### **014_add_pricing_system.sql** ✅
**Purpose:** Advanced pricing and billing  
**Status:** Applied  
**Tables Created:**
- `pricing_tiers` - Base pricing tiers
- `pricing_plans` - Subscription plans
- `pricing_overrides` - Custom pricing
- `feature_limits` - Feature restrictions
- `usage_records` - Usage tracking

**Features:**
- Tiered pricing
- Custom plans
- Usage-based billing
- Feature limits

---

### **015_add_calendar_system.sql** ✅
**Purpose:** Calendar and event management  
**Status:** Applied  
**Tables Created:**
- `calendar_events` - Event storage
- `event_attendees` - Attendee tracking
- `event_reminders` - Reminder system

**Features:**
- Google Calendar sync
- Microsoft Calendar sync
- Recurring events (RRULE)
- Email reminders

---

### **016_add_token_optimization_fields.sql** ✅
**Purpose:** OAuth token optimization  
**Status:** Applied  
**Changes:**
- Added `token_last_refreshed_at`
- Added `token_refresh_count`
- Silent token refresh capability

---

### **016_email_labels.sql** ✅
**Purpose:** Email labeling system  
**Status:** Applied  
**Tables:**
- `labels` - Custom labels/tags
- Label colors, icons
- User-specific labels

---

### **017_add_snooze_fields.sql** ✅
**Purpose:** Email snoozing (like Gmail)  
**Status:** Applied  
**Changes:**
- Added `is_snoozed` to emails
- Added `snooze_until` timestamp
- Function: `unsnooze_expired_emails()`

**Usage:**
- Snooze emails until specific time
- Auto-unsnooze with cron job

---

### **018_add_user_management_fields.sql** ✅
**Purpose:** Admin-created users with temp passwords  
**Status:** Applied  
**Changes:**
- `temp_password` - Encrypted temp password
- `require_password_change` - Force change on login
- `temp_password_expires_at` - 7-day expiry
- `account_status` - pending, active, suspended, deactivated
- `deactivated_at` - Deletion tracking
- `created_by` - Audit trail

**Tables:**
- `user_audit_logs` - Admin action tracking

---

### **020_contact_tags_and_groups.sql** ✅
**Purpose:** Contact organization  
**Status:** Applied  
**Tables:**
- `contact_tags` - Custom tags
- `contact_groups` - Contact groups
- `contact_tag_assignments` - Many-to-many
- `contact_group_memberships` - Group membership

---

### **021_materialized_folder_counts.sql** ✅
**Purpose:** Performance optimization for folder counts  
**Status:** Applied  
**Features:**
- Materialized view for folder counts
- 5-10x faster queries
- Auto-refresh on email changes
- Indexes for fast lookups

**Functions:**
- `refresh_folder_counts()` - Manual refresh
- `queue_folder_counts_refresh()` - Auto-refresh trigger
- `get_account_folder_counts()` - Fast count retrieval

---

### **022_comprehensive_billing_system.sql** ✅
**Purpose:** Full billing and usage tracking  
**Status:** Applied (Latest)  
**Tables Created:**
- `invoices` - Invoice generation
- `payment_methods` - Stored payment methods
- `ai_usage` - AI request tracking
- `storage_usage` - Storage snapshots
- `usage_alerts` - Usage threshold alerts
- `audit_logs` - System audit trail

**Features:**
- Stripe integration ready
- Usage-based billing (SMS, AI, Storage)
- Invoice generation
- Payment method management
- Usage alerts
- Comprehensive audit logging

---

## **🔧 Helper Migrations**

### **add_performance_indexes.sql** ✅
**Purpose:** Production performance indexes  
**Status:** Applied  
**Indexes Added:**
- Email queries
- Contact lookups
- Folder navigation
- Search optimization

---

### **add_attachments_table.sql** ✅
**Purpose:** Email attachment tracking  
**Status:** Applied  
**Table:** `attachments`
- File metadata
- AI analysis
- Thumbnail support
- Storage tracking

---

### **add_ai_attachment_preference.sql** ✅
**Purpose:** AI attachment processing preference  
**Status:** Applied  
**Changes:**
- User preference for AI processing
- Opt-in/opt-out

---

## **🗑️ Deprecated/Cleanup Migrations**

### **021_clean_and_rerun.sql**
**Purpose:** Clean up partial materialized view migration  
**Status:** Helper script (run if needed)

### **SAFE_MIGRATION_RUN_THIS.sql**
**Purpose:** SMS migration wrapper  
**Status:** Superseded by 006_add_sms_system.sql

### **RUN_THIS_SMS_MIGRATION.sql**
**Purpose:** SMS migration wrapper  
**Status:** Superseded by 006_add_sms_system.sql

---

## **✅ Migration Status Summary**

| Migration | Status | Critical | Tables | Functions |
|-----------|--------|----------|--------|-----------|
| 000_complete_schema | ✅ Applied | Yes | 10+ | 0 |
| 001_nylas_integration | ✅ Applied | Yes | 0 | 0 |
| 002_sync_progress | ✅ Applied | Yes | 1 | 0 |
| 006_sms_system | ✅ Applied | No* | 5 | 0 |
| 007_user_roles | ✅ Applied | Yes | 0 | 0 |
| 008_sync_auth | ✅ Applied | Yes | 0 | 1 |
| 009_sync_stopped | ✅ Applied | Yes | 0 | 0 |
| 010_organizations | ✅ Applied | Yes | 3 | 1 |
| 011_admin_roles | ✅ Applied | Yes | 0 | 0 |
| 012_suspended | ✅ Applied | Yes | 0 | 0 |
| 013_system_settings | ✅ Applied | Yes | 1 | 0 |
| 014_pricing | ✅ Applied | Yes | 5 | 0 |
| 015_calendar | ✅ Applied | No* | 3 | 0 |
| 016_token_optimization | ✅ Applied | Yes | 0 | 0 |
| 016_email_labels | ✅ Applied | No* | 1 | 0 |
| 017_snooze | ✅ Applied | No* | 0 | 1 |
| 018_user_management | ✅ Applied | Yes | 1 | 1 |
| 020_contact_tags | ✅ Applied | No* | 4 | 0 |
| 021_folder_counts | ✅ Applied | Yes | 0 | 3 |
| 022_billing_system | ✅ Applied | Yes | 6 | 0 |

**Total Tables:** 50+  
**Total Functions:** 7  
**Total Indexes:** 100+  

*Not critical = Optional feature, app works without it

---

## **🚀 How to Apply Migrations**

### **Fresh Installation:**
```bash
# Run migrations in order (000 through 022)
psql $DATABASE_URL -f migrations/000_complete_schema.sql
psql $DATABASE_URL -f migrations/001_nylas_integration.sql
# ... continue in order ...
psql $DATABASE_URL -f migrations/022_comprehensive_billing_system.sql
```

### **Using Supabase Dashboard:**
1. Go to SQL Editor
2. Open migration file
3. Copy contents
4. Paste and run
5. Verify no errors

### **Using Drizzle (Recommended for development):**
```bash
npm run db:push
# This applies all schema changes from lib/db/schema.ts
```

---

## **📊 Database Schema Summary**

**Total Tables:** 50+

**Categories:**
- **Core:** Users, emails, contacts, folders (10 tables)
- **Email:** Accounts, messages, labels, attachments (8 tables)
- **Organization:** Teams, members, invitations (3 tables)
- **Billing:** Pricing, usage, invoices, payments (11 tables)
- **SMS:** Messages, usage, audit (5 tables)
- **Calendar:** Events, attendees, reminders (3 tables)
- **System:** Settings, audit logs, sync status (5 tables)

**Key Features:**
- ✅ Full RBAC (role-based access control)
- ✅ Multi-tenant (organizations)
- ✅ Usage-based billing
- ✅ Audit logging
- ✅ GDPR compliance
- ✅ Performance optimized

---

## **🔍 Verification Checklist**

Before deployment, verify:
- [ ] All migrations applied without errors
- [ ] Indexes exist (`\di` in psql)
- [ ] Functions exist (`\df` in psql)
- [ ] Foreign keys valid (`\d+ table_name`)
- [ ] User roles working
- [ ] Organization tables populated (if using teams)
- [ ] Folder counts materialized view refreshing

---

## **⚠️ Important Notes**

1. **Order Matters:** Migrations must be applied in numerical order
2. **Idempotent:** Safe to run multiple times (CREATE IF NOT EXISTS)
3. **No Rollback:** Migrations don't have down migrations
4. **Backup First:** Always backup production before migrations
5. **Test Locally:** Test all migrations on dev/staging first

---

**Last Updated:** November 2, 2025  
**Current Schema Version:** 022  
**Status:** Production Ready ✅

