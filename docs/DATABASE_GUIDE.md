# Database Management Guide

## Overview
Production-ready database configuration, backups, and performance optimization for EaseMail's PostgreSQL database.

---

## Current Setup

**Database**: PostgreSQL via Supabase
**ORM**: Drizzle
**Connection**: Via `DATABASE_URL` environment variable

---

## 1. Database Backups

### Supabase Automated Backups

#### Free Plan
- **Daily backups** (last 7 days retained)
- Access: Dashboard → Database → Backups

#### Pro Plan ($25/month)
- **Point-in-time recovery** (PITR) - restore to any second within last 7 days
- Daily backups retained for 30 days
- **Recommended for production**

### Manual Backup

```bash
# Export full database
pg_dump postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres > backup_$(date +%Y%m%d).sql

# Compress backup
gzip backup_$(date +%Y%m%d).sql

# Upload to S3/Cloud Storage (recommended)
aws s3 cp backup_20250109.sql.gz s3://easemail-backups/
```

### Automated Backup Script

Create `scripts/backup-database.sh`:
```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/easemail_$DATE.sql"
DATABASE_URL="your_connection_string_here"

# Create backup directory
mkdir -p $BACKUP_DIR

# Dump database
pg_dump $DATABASE_URL > $BACKUP_FILE

# Compress
gzip $BACKUP_FILE

# Keep only last 30 days of backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "✅ Backup completed: $BACKUP_FILE.gz"
```

### Schedule with Cron (Linux/Mac)
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/scripts/backup-database.sh
```

### Schedule with GitHub Actions
```yaml
# .github/workflows/backup-database.yml
name: Database Backup

on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM UTC
  workflow_dispatch: # Manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install PostgreSQL client
        run: sudo apt-get install -y postgresql-client

      - name: Backup database
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d).sql.gz

      - name: Upload to S3
        uses: jakejarvis/s3-sync-action@master
        with:
          args: --acl private
        env:
          AWS_S3_BUCKET: easemail-backups
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          SOURCE_DIR: '.'
```

---

## 2. Database Indexes (Performance)

### Why Indexes Matter
Without indexes, queries scan entire tables (slow for 10,000+ rows).
With indexes, lookups are near-instant.

### Current Indexes Needed

#### 1. Users Table
```sql
-- Email lookup (used in login, password reset)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Subscription queries
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);

-- Organization queries
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
```

#### 2. Emails Table
```sql
-- User's emails (most common query)
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);

-- Thread view
CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON emails(thread_id);

-- Folder filtering
CREATE INDEX IF NOT EXISTS idx_emails_folder_id ON emails(folder_id);

-- Search by date (inbox sorted by received_at)
CREATE INDEX IF NOT EXISTS idx_emails_received_at_desc ON emails(received_at DESC);

-- Unread filter
CREATE INDEX IF NOT EXISTS idx_emails_is_read ON emails(is_read) WHERE is_read = false;

-- Composite index for common query (user + folder + unread)
CREATE INDEX IF NOT EXISTS idx_emails_user_folder_unread
ON emails(user_id, folder_id, is_read, received_at DESC);
```

#### 3. AI Usage Table
```sql
-- Monthly usage aggregation
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_period
ON ai_usage(user_id, period_start, period_end);

-- Feature breakdown
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature ON ai_usage(feature);
```

#### 4. Email Accounts Table
```sql
-- User's connected accounts
CREATE INDEX IF NOT EXISTS idx_email_accounts_user_id ON email_accounts(user_id);

-- Nylas provider queries
CREATE INDEX IF NOT EXISTS idx_email_accounts_provider ON email_accounts(provider);
```

### Apply Indexes via Drizzle Migration

Create `migrations/add_performance_indexes.sql`:
```sql
-- Users indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_organization_id ON users(organization_id);

-- Emails indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_user_id ON emails(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_thread_id ON emails(thread_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_received_at_desc ON emails(received_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_user_folder_unread
ON emails(user_id, folder_id, is_read, received_at DESC);

-- AI usage indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_usage_user_period
ON ai_usage(user_id, period_start);

-- Email accounts indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_accounts_user_id ON email_accounts(user_id);
```

Run migration:
```bash
npx drizzle-kit push
```

**Note**: `CONCURRENTLY` allows creating indexes without locking the table (production-safe).

---

## 3. Connection Pooling

### Why Connection Pooling?
- Default: Each API request opens a new database connection (slow, resource-intensive)
- With pooling: Reuse connections (10x faster)

### Supabase Connection Pooler (Recommended)

Update `DATABASE_URL`:
```bash
# Before (direct connection)
DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres

# After (pooled connection)
DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:6543/postgres?pgbouncer=true
```

**Port change**: `5432` → `6543`

### External Connection Pooler (PgBouncer)

For non-Supabase PostgreSQL:
```bash
# Install PgBouncer
sudo apt-get install pgbouncer

# Configure /etc/pgbouncer/pgbouncer.ini
[databases]
easemail = host=localhost port=5432 dbname=easemail

[pgbouncer]
listen_port = 6543
listen_addr = *
auth_type = md5
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20

# Update DATABASE_URL
DATABASE_URL=postgresql://user:pass@localhost:6543/easemail
```

---

## 4. Monitoring & Alerts

### Supabase Dashboard Monitoring

1. Dashboard → **Database** → **Observability**
2. Monitor:
   - Connection count
   - Query performance
   - Slow queries (> 1s)
   - Disk usage

### Set Up Alerts

#### Disk Space Alert
```bash
# Supabase CLI
supabase db inspect --db-url=$DATABASE_URL

# If > 80% full, upgrade plan or clean old data
```

#### Slow Query Logging
```sql
-- Enable slow query log (Supabase auto-enabled)
-- View in Dashboard → Logs → Postgres Logs

-- Find slowest queries
SELECT
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## 5. Data Retention Policy

### Clean Old Data

```sql
-- Delete emails older than 2 years (if not needed)
DELETE FROM emails
WHERE received_at < NOW() - INTERVAL '2 years';

-- Archive instead of delete (recommended)
-- 1. Create archive table
CREATE TABLE emails_archive (LIKE emails INCLUDING ALL);

-- 2. Move old emails
INSERT INTO emails_archive
SELECT * FROM emails
WHERE received_at < NOW() - INTERVAL '2 years';

-- 3. Delete from main table
DELETE FROM emails
WHERE received_at < NOW() - INTERVAL '2 years';
```

### Scheduled Cleanup (Monthly)

Create `scripts/cleanup-old-data.sql`:
```sql
-- Delete old password reset tokens (older than 7 days)
DELETE FROM password_reset_tokens
WHERE created_at < NOW() - INTERVAL '7 days';

-- Delete expired invitation tokens
DELETE FROM users
WHERE account_status = 'pending'
AND invitation_expires_at < NOW();

-- Vacuum to reclaim space
VACUUM ANALYZE;
```

Run via cron:
```bash
0 3 1 * * psql $DATABASE_URL -f scripts/cleanup-old-data.sql
```

---

## 6. Database Optimization Checklist

- [ ] **Backups**: Daily automated backups configured
- [ ] **Indexes**: Performance indexes created (see section 2)
- [ ] **Connection Pooling**: Using port 6543 (pgbouncer)
- [ ] **Monitoring**: Alerts set up for disk space and slow queries
- [ ] **VACUUM**: Weekly `VACUUM ANALYZE` scheduled
- [ ] **Data Retention**: Old data archived/deleted
- [ ] **Replication**: Read replicas for heavy read workloads (optional)

---

## 7. Disaster Recovery

### Restore from Backup

```bash
# Download backup from S3
aws s3 cp s3://easemail-backups/backup_20250109.sql.gz .

# Uncompress
gunzip backup_20250109.sql.gz

# Restore to new database
psql $DATABASE_URL < backup_20250109.sql
```

### Point-in-Time Recovery (Supabase Pro)

1. Dashboard → **Database** → **Backups**
2. Click **Point-in-Time Recovery**
3. Select date/time to restore to
4. Creates new project with restored data

---

## 8. Production Checklist

- [ ] Connection pooling enabled (port 6543)
- [ ] All indexes created
- [ ] Daily automated backups configured
- [ ] Backup tested (restore to dev database)
- [ ] Monitoring dashboard set up
- [ ] Slow query alerts enabled
- [ ] Data retention policy implemented
- [ ] VACUUM scheduled weekly
- [ ] SSL/TLS enabled (Supabase default)
- [ ] Firewall rules configured (allow only app servers)

---

## Estimated Impact

**Performance**: 10-50x faster queries with proper indexes
**Reliability**: 99.9% uptime with backups and monitoring
**Cost**: Supabase Pro ($25/mo) vs data loss (priceless)

**Time to Implement**: 2-3 hours for full setup
