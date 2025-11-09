# Production Setup Guide

This guide covers the critical infrastructure setup required for production deployment.

## Table of Contents

1. [Redis Setup](#redis-setup)
2. [Job Queue Setup](#job-queue-setup)
3. [Scheduled Jobs (Cron)](#scheduled-jobs-cron)
4. [Email Encryption](#email-encryption)
5. [Full-Text Search](#full-text-search)
6. [GDPR Compliance](#gdpr-compliance)
7. [Two-Factor Authentication](#two-factor-authentication)
8. [Security](#security)

---

## Redis Setup

Redis is required for caching, sessions, rate limiting, and job queues.

### Option 1: Upstash (Recommended for Production)

**Why Upstash?**
- Serverless-friendly (no connection pooling issues)
- Free tier: 10,000 commands/day
- Global edge caching
- No infrastructure management

**Setup Steps:**

1. Sign up at [console.upstash.com](https://console.upstash.com/)
2. Create a new Redis database
3. Copy the credentials:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

4. Add to `.env.local`:
```env
# Redis - Upstash (Production)
REDIS_PROVIDER=upstash
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

### Option 2: Local Redis (Development)

**Setup Steps:**

1. Install Redis:
   - **macOS**: `brew install redis && brew services start redis`
   - **Ubuntu**: `sudo apt-get install redis-server`
   - **Windows**: Use Docker or WSL

2. Add to `.env.local`:
```env
# Redis - Local Development
REDIS_URL=redis://localhost:6379
```

---

## Job Queue Setup

BullMQ job queue handles background jobs with Redis backing.

### Features Enabled

- Email sending (scheduled, immediate)
- Email sync operations
- SMS sending with retry
- Webhook processing
- AI processing (summaries, sentiment)
- Search indexing
- Billing automation

### Environment Variables

```env
# Cron Secret (for securing cron endpoints)
CRON_SECRET=your-random-secret-here
```

### Vercel Cron Configuration

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/scheduled-emails",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/billing/run",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/webhook-cleanup",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Worker Setup

For production, run workers as separate processes:

```bash
# Start all workers
npm run workers

# Or start individual workers
node dist/workers/scheduled-email.js
node dist/workers/email-sync.js
```

---

## Scheduled Jobs (Cron)

### Currently Implemented

1. **Scheduled Emails** (`/api/cron/scheduled-emails`)
   - Frequency: Every minute
   - Purpose: Send emails scheduled for future delivery

2. **Billing** (`/api/cron/billing/run`)
   - Frequency: Daily at midnight
   - Purpose: Process usage-based billing

3. **Webhook Cleanup** (`/api/cron/webhook-cleanup`)
   - Frequency: Daily at midnight
   - Purpose: Clean old webhook events

4. **Stalled Sync Restart** (`/api/cron/restart-stalled-syncs`)
   - Frequency: Every 15 minutes
   - Purpose: Restart stuck email sync jobs

### Testing Cron Jobs Locally

```bash
# Use cron secret from .env.local
curl -H "Authorization: Bearer your-cron-secret" \
  http://localhost:3000/api/cron/scheduled-emails
```

---

## Email Encryption

### Status: ⚠️ NOT YET IMPLEMENTED (CRITICAL)

Email content is currently stored in plain text - this is a security risk.

### Implementation Plan

1. **Install encryption library:**
```bash
npm install @aws-crypto/client-node
```

2. **Set up KMS (Key Management Service):**
   - AWS KMS (recommended)
   - Or environment-based encryption key

3. **Encrypt fields:**
   - `bodyText`
   - `bodyHtml`
   - OAuth tokens
   - Sensitive contact data

4. **Environment variables:**
```env
# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key-here
# Or use AWS KMS
AWS_KMS_KEY_ID=arn:aws:kms:region:account:key/id
```

---

## Full-Text Search

### Status: ⚠️ NOT YET IMPLEMENTED (CRITICAL)

Currently using basic SQL `LIKE` queries - not scalable.

### Option 1: Meilisearch (Recommended)

**Why Meilisearch?**
- Fast (Rust-based)
- Typo-tolerant
- Easy to deploy
- Affordable cloud hosting

**Setup:**

1. Sign up at [meilisearch.com](https://www.meilisearch.com/)
2. Create an index for emails
3. Add credentials:

```env
# Meilisearch
MEILISEARCH_HOST=https://your-instance.meilisearch.io
MEILISEARCH_API_KEY=your-api-key
```

4. Install client:
```bash
npm install meilisearch
```

### Option 2: Elasticsearch

More powerful but more complex and expensive.

---

## GDPR Compliance

### Status: ⚠️ NOT YET IMPLEMENTED (CRITICAL FOR EU)

### Required Features

1. **Data Export** (`/api/gdpr/export`)
   - Export all user data in JSON format
   - Include emails, contacts, settings, billing

2. **Data Deletion** (`/api/gdpr/delete`)
   - Complete account deletion
   - Anonymize billing records (keep for compliance)
   - Delete all emails, contacts, logs

3. **Cookie Consent**
   - Implement cookie banner
   - Track consent preferences

4. **Data Retention Policies**
   - Auto-delete old emails (user-configurable)
   - Delete inactive accounts after 2 years

### Environment Variables

```env
# GDPR
GDPR_EXPORT_BUCKET=s3://your-bucket/gdpr-exports
```

---

## Two-Factor Authentication

### Status: ⚠️ NOT YET IMPLEMENTED (HIGH PRIORITY)

### Implementation Plan

1. **Install TOTP library:**
```bash
npm install otpauth qrcode
```

2. **Add to database schema:**
   - `twoFactorEnabled: boolean`
   - `twoFactorSecret: text`
   - `backupCodes: text[]`

3. **Create endpoints:**
   - `/api/2fa/enable`
   - `/api/2fa/verify`
   - `/api/2fa/disable`
   - `/api/2fa/backup-codes`

---

## Security Checklist

### Before Production

- [ ] Set up Redis (Upstash or AWS ElastiCache)
- [ ] Configure job queue workers
- [ ] Set up Vercel cron jobs
- [ ] Implement email encryption at rest
- [ ] Set up Meilisearch for email search
- [ ] Implement GDPR data export
- [ ] Implement GDPR data deletion
- [ ] Add 2FA support
- [ ] Set up CDN for attachments (Cloudflare/CloudFront)
- [ ] Configure rate limiting with Redis
- [ ] Set up Sentry error tracking
- [ ] Configure uptime monitoring (Pingdom/UptimeRobot)
- [ ] Run security audit (`npm audit`)
- [ ] Set up WAF (Web Application Firewall)
- [ ] Configure CSP (Content Security Policy)
- [ ] Enable HSTS headers
- [ ] Set up database backups (daily)
- [ ] Configure log retention policies
- [ ] Set up alerts for critical errors
- [ ] Load testing (1000+ concurrent users)
- [ ] Penetration testing

---

## Environment Variables Summary

```env
# Database
DATABASE_URL=postgresql://...

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Redis
REDIS_PROVIDER=upstash
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Cron
CRON_SECRET=...

# Nylas Email
NYLAS_API_KEY=...
NYLAS_CLIENT_ID=...
NYLAS_API_URI=...

# Twilio SMS
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...

# Stripe Payments
STRIPE_SECRET_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...

# OpenAI
OPENAI_API_KEY=...

# Sentry Error Tracking
SENTRY_DSN=...
SENTRY_ORG=...
SENTRY_PROJECT=...

# Meilisearch (when implemented)
MEILISEARCH_HOST=...
MEILISEARCH_API_KEY=...

# Encryption (when implemented)
ENCRYPTION_KEY=...

# GDPR (when implemented)
GDPR_EXPORT_BUCKET=...
```

---

## Next Steps

1. Set up Upstash Redis account
2. Deploy to Vercel with cron configuration
3. Start Redis/Queue workers
4. Implement email encryption (Week 1-2)
5. Integrate Meilisearch (Week 3-4)
6. Add GDPR compliance (Week 5-6)
7. Implement 2FA (Week 7-8)

## Support

For issues or questions:
- Open GitHub issue
- Contact: support@easemail.com
