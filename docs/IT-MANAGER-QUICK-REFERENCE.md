# EaseMail Platform
## IT Manager's Quick Reference Manual

**Enterprise Edition**
**Version 2.0** | February 2026

---

**For:** IT Managers • System Administrators • Platform Admins
**Covers:** Setup • Security • Billing • Operations • Troubleshooting

---

## 📋 Document Information

| Property | Value |
|----------|-------|
| **Version** | 2.0 (Complete Rewrite) |
| **Release Date** | February 3, 2026 |
| **Platform Version** | EaseMail v3.5+ |
| **Next Review** | May 2026 |
| **Status** | ✅ Production Ready |

**What's New in Version 2.0:**
- ✅ Global crash prevention system
- ✅ PayPal billing integration
- ✅ Usage-based billing tracking
- ✅ Email templates system
- ✅ Enhanced security features
- ✅ Improved monitoring & alerts
- ✅ New admin capabilities

---

## 🎯 Quick Navigation

### For Urgent Issues
- [Emergency Contacts](#emergency-contacts) - Get help fast
- [System Status](#system-health-monitoring) - Check if system is operational
- [Common Issues](#troubleshooting-guide) - Fix problems quickly

### For Daily Operations
- [User Management](#user-management) - Add/remove users
- [Monitoring Dashboard](#monitoring--analytics) - Track usage
- [Security Settings](#security-configuration) - Configure policies

### For Setup & Configuration
- [Organization Setup](#organization-setup) - Initial configuration
- [SSO Integration](#sso-setup) - Connect your identity provider
- [Billing Configuration](#billing--subscriptions) - Manage payments

---

## 📖 Table of Contents

1. [Getting Started](#getting-started)
2. [Organization Setup](#organization-setup)
3. [User Management](#user-management)
4. [Security Configuration](#security-configuration)
5. [Billing & Subscriptions](#billing--subscriptions)
6. [Monitoring & Analytics](#monitoring--analytics)
7. [Email System](#email-system)
8. [Admin Capabilities](#admin-capabilities)
9. [Common Tasks](#common-administrative-tasks)
10. [Troubleshooting Guide](#troubleshooting-guide)
11. [API Integration](#api-integration-guide)
12. [Best Practices](#best-practices)
13. [Emergency Procedures](#emergency-procedures)

---

# Getting Started

## 🚀 First 10 Minutes

### Step 1: Access Admin Dashboard
```
URL: https://app.easemail.com/admin
Login: Your platform admin credentials
```

### Step 2: Verify System Health
```
Dashboard → System Health
✓ All services operational
✓ Database responding
✓ Email sync active
✓ No critical alerts
```

### Step 3: Review Organization
```
Dashboard → Organizations
• Organization name
• Active users count
• Storage usage
• Current plan
```

### Step 4: Check Security
```
Dashboard → Security → Overview
• 2FA enforcement status
• Active sessions
• Recent failed logins
• IP restrictions
```

### Step 5: Configure Alerts
```
Settings → Notifications
• Add your email
• Enable critical alerts
• Test notification system
```

---

## 🏢 Essential Admin URLs

| Function | URL | Description |
|----------|-----|-------------|
| **Admin Dashboard** | `/admin` | Main control panel |
| **Users** | `/admin/users` | User management |
| **Organizations** | `/admin/organizations` | Org settings |
| **Security** | `/admin/security` | Security policies |
| **Billing** | `/admin/billing-config` | Payment & plans |
| **Analytics** | `/admin/usage-analytics` | Usage reports |
| **Activity Logs** | `/admin/activity-logs` | Audit trail |
| **System Health** | `/admin/system-health` | Monitoring |
| **Email Templates** | `/admin/email-templates` | Template editor |
| **API Keys** | `/admin/api-keys` | Integration keys |
| **Migrations** | `/admin/migrations` | Database updates |

---

## 👥 User Roles Overview

| Role | Access Level | Use Case |
|------|-------------|----------|
| **Platform Admin** | Full system access | IT managers, system admins |
| **User Admin** | User management only | HR, team leads |
| **Organization Admin** | Organization settings | Company admins |
| **Organization User** | Team member | Standard users |
| **Individual** | Personal account | Single users |

---

# Organization Setup

## Creating Your Organization

### Basic Information

**Navigation:** `Admin → Organizations → Create`

```yaml
Required Fields:
  Name: "Acme Corporation"
  Slug: "acme-corp" (URL-friendly)
  Plan Type: Free | Starter | Pro | Enterprise
  Billing Email: "billing@company.com"
  Max Seats: 50 (adjustable)

Optional Fields:
  Domain: "company.com" (for auto-provisioning)
  Phone: "+1-555-123-4567"
  Address: "123 Main St, City, ST 12345"
  Timezone: "America/New_York"
```

**Best Practices:**
- Use company legal name for "Name"
- Keep slug short and memorable
- Start with appropriate plan tier
- Use finance team email for billing

---

### Domain Verification

**Why verify?** Enables:
- Auto-provisioning for @company.com emails
- Enhanced security
- Email authentication (SPF/DKIM)
- Professional branding

**Step 1: Add DNS Records**
```dns
# Verification Record
Type: TXT
Host: _easemail-verify
Value: [Provided by system]
TTL: 3600

# SPF Record (for email sending)
Type: TXT
Host: @
Value: v=spf1 include:_spf.easemail.com ~all
TTL: 3600

# DKIM Record (for email authentication)
Type: TXT
Host: easemail._domainkey
Value: v=DKIM1; k=rsa; p=[public-key-provided]
TTL: 3600

# DMARC Record (for email policy)
Type: TXT
Host: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@company.com
TTL: 3600
```

**Step 2: Verify in Admin Panel**
```
Admin → Organizations → [Your Org] → Verify Domain
→ Click "Verify Now"
→ Status changes to "Verified" ✓
```

**Step 3: Enable Auto-Provisioning (Optional)**
```
Settings → Auto-Provisioning
☑ Auto-add users with @company.com email
Default Role: Organization User
Default Team: [None / Select team]
Notify Admin: ☑ Yes
```

---

## Organization Settings

### General Settings

```yaml
Organization Profile:
  Name: Acme Corporation
  Display Name: Acme Corp
  Legal Name: Acme Corporation LLC
  Website: https://acme.com
  Logo: [Upload 512x512 PNG]
  Primary Color: #667eea
  Timezone: America/New_York

Contact Information:
  Support Email: support@company.com
  Billing Email: billing@company.com
  Technical Contact: it@company.com
  Phone: +1-555-123-4567

Business Details:
  Industry: Technology
  Company Size: 100-500 employees
  Tax ID: XX-XXXXXXX (for invoicing)
```

### Usage Limits

```yaml
Current Plan: Pro
Active Users: 47 / 100
Storage: 145 GB / 500 GB
Monthly Emails: 12,543 / 50,000
API Calls: 1.2M / 5M

Alerts:
  ☑ Email when 80% of any limit reached
  ☑ Email when 95% of any limit reached
  ☐ SMS alerts (Enterprise only)
```

---

# User Management

## Creating Users

### Method 1: Individual User Creation

**Navigation:** `Admin → Users → Create User`

```yaml
Basic Info:
  Email: john.doe@company.com (required)
  Full Name: John Doe (required)
  Role: individual | org_user | org_admin | user_admin | platform_admin

Organization:
  Organization: Acme Corporation
  Team: Engineering (optional)

Account Setup:
  ○ Send invitation email (recommended)
    User sets own password via email link
    Expires in 7 days

  ● Set password now
    Password: ••••••••••••
    Require password change on first login: ☑

Subscription:
  Tier: free | starter | pro | enterprise | beta
  Is Promo User: ☐ (grants special privileges)

Notification:
  ☑ Send welcome email
  ☑ Include setup instructions
  ☑ Notify organization admin
```

**What Happens:**
1. User account created in Supabase Auth
2. Database record created
3. Invitation/welcome email sent
4. Audit log entry created
5. Admin receives confirmation

---

### Method 2: Bulk User Import

**Navigation:** `Admin → Users → Import Users`

**Step 1: Download Template**
```csv
email,fullName,role,organizationId,subscriptionTier
john@company.com,John Doe,org_user,org-uuid-here,pro
jane@company.com,Jane Smith,org_admin,org-uuid-here,pro
```

**Step 2: Prepare CSV**
```csv
# Required columns:
email, fullName

# Optional columns:
role, organizationId, subscriptionTier, team, department

# Valid roles:
individual, org_user, org_admin, user_admin, platform_admin

# Valid tiers:
free, starter, pro, enterprise, beta
```

**Step 3: Upload & Review**
```
→ Upload CSV file
→ System validates all entries
→ Review summary:
  • Valid: 48 users
  • Errors: 2 users (duplicate emails)
→ Fix errors or proceed
→ Confirm import
```

**Step 4: Monitor Progress**
```
Import Progress:
  ████████████████░░░░ 80% (40/50)

Created: 40 users
Failed: 0
Remaining: 10

→ Email notifications sent after completion
```

---

## User Roles & Permissions

### Platform Admin
**Full system access** - Unrestricted

```yaml
Capabilities:
  ✓ Manage all organizations
  ✓ Manage all users (create/edit/delete)
  ✓ Access all admin panels
  ✓ Configure system settings
  ✓ Manage billing for all orgs
  ✓ View all activity logs
  ✓ Generate API keys
  ✓ Run database migrations
  ✓ Access system health dashboard
  ✓ Impersonate users (for support)
  ✓ Manage email templates
  ✓ Configure security policies
```

### User Admin
**User management only** - Limited scope

```yaml
Capabilities:
  ✓ Create/invite users
  ✓ Edit user profiles
  ✓ Suspend/reactivate users
  ✓ Delete users
  ✓ View user activity
  ✓ Assign roles (except platform_admin)
  ✗ Access billing
  ✗ System settings
  ✗ Security configuration
  ✗ Run migrations
```

### Organization Admin
**Organization management** - Org-scoped

```yaml
Capabilities:
  ✓ Manage organization settings
  ✓ Invite/manage org members
  ✓ Create teams
  ✓ View org analytics
  ✓ Configure org email templates
  ✓ Manage org API keys
  ✗ Access other organizations
  ✗ Platform-wide settings
  ✗ System administration
```

### Organization User
**Standard member** - Limited access

```yaml
Capabilities:
  ✓ Access email, calendar, contacts
  ✓ Use AI features
  ✓ Send SMS (if enabled)
  ✓ Create email rules
  ✓ Join teams
  ✓ View own analytics
  ✗ User management
  ✗ Organization settings
  ✗ Billing access
```

### Individual
**Personal account** - Self-contained

```yaml
Capabilities:
  ✓ Manage own email accounts
  ✓ Personal calendar & contacts
  ✓ AI features (based on tier)
  ✓ Email rules & automation
  ✓ Own billing management
  ✗ No organization access
  ✗ No team features
  ✗ No admin capabilities
```

---

## Managing User Status

### Suspend User

**When to suspend:**
- Employee on leave
- Security investigation
- Payment issues
- Temporary access removal

**How to suspend:**
```
Admin → Users → [Select User] → Actions → Suspend

Reason: [Optional note for records]
☑ Revoke all active sessions immediately
☑ Notify user via email
☐ Notify organization admin

→ Confirm Suspension
```

**What happens:**
- All active sessions terminated
- Cannot login until reactivated
- Emails continue to sync (not deleted)
- License seat freed up
- Audit log entry created

### Reactivate User

```
Admin → Users → [Select User] → Actions → Reactivate

☑ Send reactivation email
☑ Require password reset
☐ Require 2FA setup

→ Confirm Reactivation
```

### Delete User (Permanent)

**⚠️ WARNING: This action cannot be undone**

**GDPR Compliance:** Before deletion:
```
1. Export user data (required for compliance)
   Admin → Users → [User] → Export Data

2. Wait for export to complete (email notification)

3. Download exported data:
   • All emails (MBOX format)
   • Contacts (CSV)
   • Calendar events (iCal)
   • Drafts & settings (JSON)

4. Store exported data for retention period
   (Check your data retention policy)
```

**Deletion process:**
```
Admin → Users → [User] → Actions → Delete

⚠️ This will PERMANENTLY:
  • Delete all user data (emails, contacts, calendar)
  • Remove from all teams
  • Cancel active sessions
  • Anonymize audit logs (for compliance)
  • Free up license seat

Have you exported user data? ○ Yes ● No

If yes, confirm user email to proceed:
Type email address: _________________

Data Export Reference: [export-id-here]

☐ I have downloaded and stored the exported data
☐ I confirm this user should be permanently deleted

→ [Cancel] [Delete User]
```

**What happens (in a transaction):**
1. All email accounts deleted (CASCADE)
2. Contacts & calendar deleted
3. SMS messages deleted
4. Email rules deleted
5. Drafts deleted
6. Audit logs anonymized (user_id → 'DELETED_USER')
7. User record soft-deleted (email changed to deleted_UUID@easemail.deleted)
8. Supabase auth user deleted
9. All changes committed or rolled back together

---

# Security Configuration

## Two-Factor Authentication (2FA)

### Global 2FA Policy

**Navigation:** `Admin → Security → 2FA Policy`

```yaml
Policy Options:

○ Optional (Default)
  • Users can enable voluntarily
  • Not enforced
  • Recommended for personal accounts

● Required for Admins
  • All admin roles must enable 2FA
  • 7-day grace period
  • Highly recommended

○ Required for All Users
  • Every user must enable 2FA
  • 7-day grace period
  • Strictest security

Grace Period: 7 days (1-30 days)
Enforcement starts: [Auto-set to today + 7 days]
Notify users: ☑ Email 3 days before enforcement

Exemptions:
  • API keys (uses key authentication)
  • Service accounts (no interactive login)
```

### Supported 2FA Methods

**TOTP (Recommended)**
```yaml
Compatible Apps:
  • Google Authenticator
  • Microsoft Authenticator
  • Authy
  • 1Password
  • Bitwarden

Setup:
  1. User scans QR code
  2. Enters 6-digit code
  3. Downloads recovery codes
  4. 2FA enabled ✓
```

**SMS Backup**
```yaml
Requirements:
  • Verified phone number
  • US/Canada numbers supported
  • International via Twilio

Costs:
  • $0.01 per SMS
  • Charged to organization
  • Included in Pro/Enterprise
```

**Recovery Codes**
```yaml
Features:
  • 10 single-use codes
  • Generated on 2FA setup
  • Downloadable as text file
  • User can regenerate anytime

Admin capabilities:
  • View if user has recovery codes
  • Force regeneration
  • Reset user 2FA completely
```

---

### Admin 2FA Management

**View 2FA Status**
```
Admin → Users → Filter: "2FA Enabled"
→ Shows all users with 2FA
→ Export list for compliance reporting
```

**Reset User 2FA**
```
Admin → Users → [User] → Security → Reset 2FA

Reason: User lost device / Code not working
☑ Send email notification
☑ Require re-setup on next login
☐ Notify security team

→ Confirm Reset

What happens:
  • 2FA disabled for user
  • Recovery codes invalidated
  • User must setup 2FA again on next login
  • Audit log entry created
```

**Enforce 2FA for Specific Users**
```
Admin → Users → [Select Users] → Bulk Actions → Enforce 2FA

Selected: 15 users
Grace Period: 3 days
☑ Send email notification
☑ Block login after grace period

→ Apply
```

---

## Password Policies

**Navigation:** `Admin → Security → Password Policy`

```yaml
Password Requirements:

Minimum Length: 12 characters (8-32)
  • Recommended: 12+ for security
  • Enforced on password creation/change

Complexity:
  ☑ Require uppercase letter (A-Z)
  ☑ Require lowercase letter (a-z)
  ☑ Require number (0-9)
  ☑ Require special character (!@#$%^&*)
  ☐ Prohibit common passwords (dictionary check)

Password Expiration:
  Expire after: 90 days (0 = never)
  • 0: Never expire (not recommended)
  • 90: Recommended for enterprise
  • 180: Relaxed policy

  Warn user: 7 days before expiration
  Grace period: 3 days after expiration

Password History:
  Remember last: 5 passwords
  • Prevents password reuse
  • Stored as hashed values
  • Recommended: 5-10

Account Lockout:
  Failed attempts: 5 attempts
  Lockout duration: 30 minutes
  ☑ Notify user via email
  ☑ Notify admin after 3 lockouts/day

Apply Policy To:
  ● All users (recommended)
  ○ New users only
  ○ Specific roles: [Select roles]

→ Save Policy
→ Users notified of changes via email
```

---

## Session Management

**Navigation:** `Admin → Security → Sessions`

```yaml
Session Settings:

Inactivity Timeout:
  Timeout after: 60 minutes of inactivity
  • Range: 15-480 minutes
  • Recommended: 30-60 for security
  • 120-240 for user convenience

  ☑ Show warning 2 minutes before timeout
  ☐ Allow user to extend session

Remember Me:
  ☑ Allow "Remember Me" on login
  Duration: 7 days (1-30 days)
  • Device-specific token
  • Secure cookie (HttpOnly, SameSite)

Concurrent Sessions:
  Maximum: 3 sessions per user
  • Recommended: 2-3 (desktop + mobile + tablet)
  • Setting to 1 may inconvenience users

  When limit exceeded:
    ● Terminate oldest session
    ○ Block new login
    ○ Ask user to choose

Active Session Monitoring:
  ☑ Log all session activity
  ☑ Alert on unusual location
  ☑ Alert on new device
  ☑ Alert on concurrent sessions from different countries

Force Re-authentication For:
  ☑ Changing password
  ☑ Enabling 2FA
  ☑ Adding payment method
  ☑ Deleting account
  ☑ Exporting data
  ☑ Accessing sensitive settings

  Re-auth method: Password + 2FA (if enabled)
```

---

## IP Access Control

**Navigation:** `Admin → Security → IP Restrictions`

**Enterprise Feature**

```yaml
Access Control Policy:

Allow Access From:
  ○ Any IP address (default)
  ● Specific IP ranges only
  ○ Block specific IP ranges

Allowed IP Ranges:
  192.168.1.0/24        Office Network
  10.0.0.0/8            VPN
  203.0.113.45          Remote Office
  198.51.100.0/24       Backup Site

  [Add Range]  [Remove]  [Import from file]

Blocked IP Ranges:
  (Empty - using whitelist mode)

Security Features:
  ☑ Automatically block IPs after 10 failed logins
  ☑ Block IPs on suspicious activity
  ☑ Use GeoIP to block high-risk countries
  ☑ Whitelist common VPN providers

Notifications:
  ☑ Email admin on blocked access attempt
  ☑ Log all access denials
  ☑ Daily summary of blocked IPs

Exceptions:
  ☐ Allow emergency access code (one-time use)
  ☐ Allow SMS-based temporary access

→ Save IP Rules
```

**Testing IP Rules:**
```
Test IP Access:
  Enter IP: 203.0.113.45
  → Check Access

Result: ✓ Allowed (matches range: Office Network)
```

---

## Encryption & Data Security

### At-Rest Encryption (Automatic)

**Always Active - No Configuration Needed**

```yaml
Email Storage:
  Algorithm: AES-256-GCM
  Key Management: AWS KMS
  Key Rotation: Every 90 days (automatic)

Database:
  Algorithm: AES-256-GCM
  Encryption: Column-level for sensitive data
  Keys: Separate from application keys

Attachments:
  Storage: Encrypted S3 buckets
  Access: Signed URLs with expiration
  Lifecycle: Auto-delete after retention period

Backups:
  Encryption: AES-256
  Storage: Encrypted backup buckets
  Access: Admin-only
```

### In-Transit Encryption (TLS)

**Navigation:** `Admin → Security → TLS Settings`

```yaml
TLS Configuration:

Minimum TLS Version:
  ● TLS 1.3 (recommended)
  ○ TLS 1.2 (for compatibility)
  ○ TLS 1.1 (not recommended)

Enforce TLS For:
  ☑ All web traffic (HTTPS)
  ☑ API requests
  ☑ Email (SMTP/IMAP)
  ☑ Database connections
  ☑ WebSocket connections

HSTS (HTTP Strict Transport Security):
  ☑ Enable HSTS
  Max Age: 31536000 seconds (1 year)
  ☑ Include subdomains
  ☑ Preload (submit to browser preload list)

Certificate Pinning (Enterprise):
  ☑ Enable certificate pinning
  ☑ Alert on certificate mismatch
  Pinned Certificates: [Manage]
```

---

### End-to-End Encryption (Enterprise)

**Navigation:** `Admin → Security → E2E Encryption`

**S/MIME Configuration:**
```yaml
S/MIME:
  ☑ Enable S/MIME support

  Certificate Management:
    Upload Certificate: [Browse .p12/.pfx file]
    Password: ••••••••
    Valid Until: 2027-12-31

    ☑ Auto-sign outgoing emails
    ☑ Auto-encrypt to recipients with S/MIME
    ☐ Require encryption for all emails

  Certificate Store:
    • Personal certificate (uploaded)
    • Recipient certificates (discovered)
    • Trusted CA certificates (system)
```

**PGP/GPG Configuration:**
```yaml
PGP:
  ☑ Enable PGP encryption

  Key Management:
    Upload Public Key: [Browse .asc file]
    OR
    Generate New Key Pair:
      Name: Acme Corporation
      Email: secure@company.com
      Key Size: 4096 bits
      Expires: 2 years

    [Generate Key Pair]

  Encryption Settings:
    ☑ Auto-encrypt internal emails
    ☑ Sign all outgoing emails
    ☐ Require encryption for external emails

  Key Server:
    ☑ Publish public key to keyserver
    Keyserver: keys.openpgp.org
```

---

# Billing & Subscriptions

## Current Subscription Overview

**Navigation:** `Admin → Billing`

```
┌─────────────────────────────────────────────────────┐
│ SUBSCRIPTION OVERVIEW                               │
├─────────────────────────────────────────────────────┤
│ Plan: Enterprise                                    │
│ Billing Cycle: Monthly                              │
│ Next Billing: March 1, 2026                         │
│ Status: Active ✓                                    │
└─────────────────────────────────────────────────────┘

Current Month Usage (as of Feb 3, 2026):
┌─────────────────────────────────────────────────────┐
│ Users:        247 / Unlimited          ✓            │
│ Storage:      145 GB / Unlimited       ✓            │
│ Emails:       12,543 / Unlimited       ✓            │
│ API Calls:    1.2M / 5M included       ✓            │
│ AI Requests:  4,567 / 10K included     ✓            │
│ SMS Messages: 2,340 / 500 included     ⚠ Overage    │
└─────────────────────────────────────────────────────┘

Estimated Cost This Month: $2,964.00
  Base Plan:     $2,470.00 (247 users × $10/user)
  SMS Overage:   $184.00 (1,840 × $0.10)
  AI Add-on:     $260.00 (Advanced AI features)
  Storage:       $0.00 (within limit)
  API Calls:     $50.00 (200K overage × $0.0002)

Payment Method: Visa •••• 1234 Exp: 03/2027
Billing Contact: billing@company.com
```

---

## Usage-Based Billing

**New in v2.0:** Automatic usage tracking

### Tracked Usage

**SMS Messages**
```yaml
Tracking:
  • Every SMS sent via Twilio
  • Includes segments (long messages)
  • Country-specific pricing
  • Real-time usage updates

Pricing:
  Included (Enterprise): 500 messages/month
  Overage: $0.10/message (US/Canada)
  Overage: $0.15/message (International)

Dashboard:
  Admin → Billing → Usage → SMS
  • Daily usage chart
  • By user breakdown
  • By country breakdown
  • Export CSV report
```

**AI Features**
```yaml
Tracking:
  • AI Compose requests
  • AI Remix requests
  • Voice dictation (transcription)
  • Email summarization
  • Smart reply suggestions
  • Token usage (GPT models)

Pricing:
  Basic: 100 requests/month (Free/Starter)
  Advanced: 1,000 requests/month (Pro)
  Premium: 10,000 requests/month (Enterprise)
  Overage: $0.05/request

Dashboard:
  Admin → Billing → Usage → AI
  • By feature breakdown
  • By user usage
  • Token consumption
  • Cost projection
```

**Storage**
```yaml
Tracking:
  • Email storage (including attachments)
  • Calculated daily via cron job
  • Per-user storage usage
  • Organization total

Pricing:
  Free: 10 GB total
  Starter: 50 GB total
  Pro: 500 GB total
  Enterprise: Unlimited (fair use)
  Overage: $0.02/GB/month

Dashboard:
  Admin → Billing → Usage → Storage
  • Top users by storage
  • Growth trend
  • Projected usage
  • Cleanup recommendations
```

**Email Sending**
```yaml
Tracking:
  • Emails sent via Nylas
  • Per recipient count
  • Includes CC/BCC
  • Real-time tracking

Pricing:
  Free: 1,000 emails/month
  Starter: 10,000 emails/month
  Pro: 50,000 emails/month
  Enterprise: Unlimited
  Overage: $0.001/email ($1 per 1,000)

Dashboard:
  Admin → Billing → Usage → Email
  • Sending volume by day
  • By user breakdown
  • By email account
  • Bounce/failure rate
```

---

## Plan Comparison & Pricing

| Feature | Free | Starter | Pro | Enterprise |
|---------|------|---------|-----|------------|
| **Monthly Price** | $0 | $9.99/user | $29.99/user | $10/user* |
| **Annual Price** | $0 | $99.99/user | $299.99/user | Custom |
| **Users** | Up to 5 | Up to 25 | Unlimited | Unlimited |
| **Email Accounts/User** | 3 | 5 | 10 | Unlimited |
| **Storage** | 10 GB | 50 GB | 500 GB | Unlimited |
| **Emails/Month** | 1,000 | 10,000 | 50,000 | Unlimited |
| **API Calls/Month** | 1,000 | 100,000 | 1M | 5M included |
| **AI Requests/Month** | 100 | 1,000 | 5,000 | 10,000 |
| **SMS Credits/Month** | 0 | 50 | 200 | 500 |
| **2FA** | Optional | Optional | Required | Required |
| **SSO (SAML/OAuth)** | - | - | - | ✓ |
| **Custom Branding** | - | - | - | ✓ |
| **IP Restrictions** | - | - | - | ✓ |
| **Advanced Security** | - | - | ✓ | ✓ |
| **Audit Logs** | 30 days | 90 days | 6 months | 1 year |
| **Support** | Community | Email | Priority Email | 24/7 Phone |
| **SLA** | - | 99% | 99.5% | 99.9% |
| **Training** | - | - | - | ✓ Included |
| **Account Manager** | - | - | - | ✓ Dedicated |
| **Custom Integrations** | - | - | - | ✓ Available |

\\* Enterprise pricing: $10/user for 100+ users, volume discounts available

---

## PayPal Integration

**New in v2.0:** Full PayPal billing support

### Setting Up PayPal

**Navigation:** `Admin → Billing → Payment Methods → Configure PayPal`

```yaml
PayPal Configuration:

Mode:
  ○ Sandbox (Testing)
  ● Live (Production)

Credentials:
  Client ID: [Your PayPal Client ID]
  Client Secret: [Your PayPal Secret]
  Webhook ID: [Auto-generated after setup]

Webhook URL:
  https://app.easemail.com/api/webhooks/paypal
  (Configure in PayPal Dashboard)

Webhook Events to Subscribe:
  ☑ BILLING.SUBSCRIPTION.ACTIVATED
  ☑ BILLING.SUBSCRIPTION.UPDATED
  ☑ BILLING.SUBSCRIPTION.CANCELLED
  ☑ BILLING.SUBSCRIPTION.SUSPENDED
  ☑ BILLING.SUBSCRIPTION.EXPIRED
  ☑ PAYMENT.SALE.COMPLETED
  ☑ PAYMENT.SALE.REFUNDED

→ Save & Test Connection
```

### Creating Subscription Plans

```yaml
Subscription Plans:

Plan: Starter
  Name: Starter Plan
  PayPal Plan ID: [From PayPal]
  Monthly Price: $9.99
  Annual Price: $99.99 (17% discount)
  Currency: USD

  Features:
    • Up to 25 users
    • 50 GB storage
    • 10,000 emails/month
    • Priority support

  Limits (JSON):
    {
      "maxSeats": 25,
      "maxEmails": 10000,
      "maxStorage": 50,
      "aiRequests": 1000,
      "smsMessages": 50
    }

  Active: ☑
  Display Order: 2

  [Save Plan]
```

---

### Subscription Management

**View Active Subscriptions**
```
Admin → Billing → Subscriptions

┌─────────────────────────────────────────────────────┐
│ Organization: Acme Corp                             │
│ Plan: Enterprise                                    │
│ PayPal Subscription ID: I-XXXXXXXXXXXX              │
│ Status: active                                      │
│ Current Period: Feb 1 - Mar 1, 2026                │
│ Next Billing: Mar 1, 2026                           │
│ Cancel at Period End: No                            │
└─────────────────────────────────────────────────────┘

Actions:
  [Change Plan]  [Cancel Subscription]  [View Invoices]
```

**Cancel Subscription**
```
Cancel Subscription:

When:
  ● End of current period (recommended)
    • Service continues until Mar 1, 2026
    • No refund

  ○ Immediately
    • Service stops now
    • Prorated refund issued

Cancellation Reason: [Select reason]
Additional Notes: [Optional feedback]

☑ Export all data before cancellation
☑ Notify organization admin

→ [Cancel] [Confirm Cancellation]
```

---

## Invoices & Billing History

**Navigation:** `Admin → Billing → Invoices`

```
Invoice History:
┌──────────────────────────────────────────────────────┐
│ Date       │ Amount    │ Status │ Method      │ PDF  │
├──────────────────────────────────────────────────────┤
│ 2026-02-01 │ $2,964.00 │ Paid ✓ │ PayPal     │ [↓]  │
│ 2026-01-01 │ $2,847.00 │ Paid ✓ │ PayPal     │ [↓]  │
│ 2025-12-01 │ $2,705.00 │ Paid ✓ │ Visa •1234 │ [↓]  │
│ 2025-11-01 │ $2,620.00 │ Paid ✓ │ Visa •1234 │ [↓]  │
└──────────────────────────────────────────────────────┘

Filters: [Last 12 months ▼] [All statuses ▼]
Export: [CSV] [Excel] [PDF]

Invoice Settings:
  Email invoices to: billing@company.com
  CC: cfo@company.com, ap@company.com
  ☑ Auto-email on invoice generation
  ☑ Include usage breakdown
  ☑ Include payment receipt
```

**Invoice Details (Click any invoice):**
```
Invoice #INV-2026-0047
Date: February 1, 2026
Due Date: February 15, 2026
Status: Paid ✓
Payment Method: PayPal
PayPal Transaction ID: PAYID-XXXXXXXXXXXX

Bill To:
  Acme Corporation
  123 Main Street
  San Francisco, CA 94102
  United States
  Tax ID: XX-XXXXXXX

Line Items:
┌──────────────────────────────────────────────────────┐
│ Description            │ Quantity │ Rate    │ Amount │
├──────────────────────────────────────────────────────┤
│ Enterprise Plan Users  │ 247      │ $10.00  │ $2,470 │
│ SMS Overage           │ 1,840    │ $0.10   │ $184   │
│ API Call Overage      │ 200,000  │ $0.0002 │ $50    │
│ AI Add-on Features    │ 1        │ $260.00 │ $260   │
├──────────────────────────────────────────────────────┤
│                           Subtotal:        │ $2,964 │
│                           Tax (0%):        │ $0     │
│                           Total:           │ $2,964 │
│                           Amount Paid:     │ $2,964 │
└──────────────────────────────────────────────────────┘

[Download PDF] [Email Invoice] [Request Refund]
```

---

# Monitoring & Analytics

## System Health Dashboard

**Navigation:** `Admin → System Health`

**Real-time status of all services**

```
┌─────────────────────────────────────────────────────┐
│ SYSTEM STATUS                              ✓ Healthy│
└─────────────────────────────────────────────────────┘

Email Sync Service                                  ✓
  Status: Operational
  Last sync: 2 minutes ago
  Pending emails: 0
  Failed syncs (24h): 0
  Avg sync time: 1.2s

API Services                                        ✓
  Nylas API: Operational (Response: 245ms)
  OpenAI API: Operational (Response: 1.2s)
  Twilio API: Operational (Response: 180ms)
  PayPal API: Operational (Response: 320ms)

Database                                            ✓
  Status: Healthy
  Connections: 23 / 100 (23% utilization)
  Avg query time: 12ms
  Slow queries (1h): 0
  Replication lag: 0ms

Application                                         ✓
  Uptime: 45 days, 12 hours
  Error rate (1h): 0.02% (3 errors / 15,234 requests)
  Response time (avg): 156ms
  CPU usage: 34%
  Memory usage: 56%

Background Jobs                                     ✓
  Queue depth: 12 jobs
  Processing rate: 145 jobs/min
  Failed jobs (24h): 0

Storage                                             ⚠
  Used: 145 GB / 500 GB (29%)
  Growth rate: ~3 GB/week
  Projected full: 32 weeks
  ⚠ Alert threshold: 80% (400 GB)

Scheduled Tasks                                     ✓
  Last storage tracking: 12 hours ago ✓
  Last backup: 6 hours ago ✓
  Next sync job: in 3 minutes

Alert Configuration:
  Email: admin@company.com, it@company.com
  ☑ System down
  ☑ Error rate > 1%
  ☑ Storage > 80%
  ☑ Database issues

[View Detailed Logs] [Configure Alerts] [Refresh]
```

---

## Usage Analytics

**Navigation:** `Admin → Usage Analytics`

### Organization Overview

```
Organization Usage - Last 30 Days
┌─────────────────────────────────────────────────────┐
│ Active Users:          247 / 247 total (100%)      │
│ Emails Sent:           12,543                       │
│ Emails Received:       45,678                       │
│ Storage Used:          145 GB (29% of plan)         │
│ API Calls:             1,234,567                    │
│ AI Requests:           4,567                        │
│ SMS Messages:          2,340                        │
└─────────────────────────────────────────────────────┘

Trends:
  Emails:    ↑ 12% vs last month
  Storage:   ↑ 8% vs last month
  Active Users: → No change
  AI Usage:  ↑ 45% vs last month
```

### User Activity Report

```
Top Users by Activity:

Name               │ Emails │ Storage │ AI Uses │ Last Active
───────────────────┼────────┼─────────┼─────────┼─────────────
john@company.com   │ 1,234  │ 5.2 GB  │ 456     │ 2 mins ago
jane@company.com   │ 987    │ 8.1 GB  │ 234     │ 15 mins ago
bob@company.com    │ 856    │ 12.3 GB │ 189     │ 1 hour ago

Inactive Users (30+ days):
  • olduser@company.com (Last login: 45 days ago)
  • former@company.com (Last login: 62 days ago)

[Export Report] [Email to Stakeholders] [Schedule Auto-Report]
```

---

### Feature Adoption

```
Feature Usage - Last 30 Days:

AI Features:
  ████████████████████░░░░ 65%  AI Compose (1,234 uses)
  ████████░░░░░░░░░░░░░░░░ 23%  Voice Dictation (456 uses)
  ██████████████████████░░ 89%  Email Summaries (2,345 uses)
  ███████████░░░░░░░░░░░░░ 34%  Smart Reply (567 uses)

Collaboration:
  • Shared Mailboxes: 12 active
  • Team Calendars: 8 active
  • Contact Sharing: 156 shared contacts

Automation:
  • Email Rules: 234 active rules
  • Auto-Responses: 45 configured
  • Scheduled Emails: 89 scheduled

Mobile:
  • iOS app users: 123 (50%)
  • Android app users: 89 (36%)
  • Web-only users: 35 (14%)
```

---

## Activity Logs (Audit Trail)

**Navigation:** `Admin → Activity Logs`

```
Activity Logs - Real-time Audit Trail

Filters:
  Date Range: [Last 7 days ▼]
  Category: [All ▼] Security | User Actions | Admin | System
  User: [All users ▼]
  Action: [All actions ▼]
  Status: [All ▼] Success | Failure
  IP Address: [Optional filter]

Search: __________________ [Search]

Recent Activity:
┌─────────────────────────────────────────────────────┐
│ 2026-02-03 15:32:45 │ USER_LOGIN                   │
│ User: john@company.com                              │
│ IP: 203.0.113.45 (San Francisco, US)               │
│ Device: Chrome 120 on macOS                         │
│ Status: ✓ Success                                   │
├─────────────────────────────────────────────────────┤
│ 2026-02-03 15:30:12 │ EMAIL_SENT                   │
│ User: jane@company.com                              │
│ To: client@example.com                              │
│ Subject: "Q1 Report"                                │
│ Status: ✓ Delivered                                 │
├─────────────────────────────────────────────────────┤
│ 2026-02-03 15:28:03 │ USER_CREATED                 │
│ Admin: admin@company.com                            │
│ Created: newuser@company.com                        │
│ Role: org_user                                      │
│ Status: ✓ Success                                   │
├─────────────────────────────────────────────────────┤
│ 2026-02-03 15:25:47 │ LOGIN_FAILED                 │
│ User: unknown@example.com                           │
│ IP: 198.51.100.23 (Unknown location)               │
│ Reason: Invalid credentials                         │
│ Status: ✗ Failed (Attempt 3/5)                     │
└─────────────────────────────────────────────────────┘

Actions:
  [Export Logs (CSV)] [Create Alert Rule] [Block IP]

Retention: 90 days (Pro), 1 year (Enterprise)
```

---

### Security Event Monitoring

```
Security Events - Last 24 Hours:

Failed Login Attempts:
  203.0.113.45: 3 attempts (john@company.com)
  198.51.100.23: 5 attempts (various users) ⚠ Suspicious

Account Lockouts:
  • bob@company.com: Locked at 14:23 (exceeded attempts)
    Action: Auto-unlocked after 30 minutes ✓

2FA Events:
  • jane@company.com: 2FA enabled ✓
  • mike@company.com: 2FA reset by admin

Suspicious Activity:
  • Multiple logins from different countries:
    john@company.com (US → India → UK in 1 hour) ⚠
    → Auto-blocked, user notified

Password Changes:
  • 5 users changed passwords
  • All passed policy requirements ✓

IP Blocks:
  • 198.51.100.23: Blocked (excessive failed logins)
  • Duration: 24 hours
  • Can be manually unblocked

[Configure Alerts] [Unblock IP] [Export Security Report]
```

---

# Email System

## Email Templates Management

**New in v2.0:** Visual email template editor

**Navigation:** `Admin → Email Templates`

### System Templates

```
Available Templates:

┌─────────────────────────────────────────────────────┐
│ new-user-credentials                                │
│ Name: New User Credentials                          │
│ Category: Authentication                            │
│ Status: ✓ Active | Version 1                       │
│ Trigger: Admin creates new user                     │
│ Last Updated: Jan 15, 2026                          │
│                                                     │
│ [Edit Template] [Preview] [Test Send] [History]    │
├─────────────────────────────────────────────────────┤
│ team-invite                                         │
│ Name: Team Invitation                               │
│ Category: Team Management                           │
│ Status: ✓ Active | Version 2                       │
│ Trigger: Admin invites team member                  │
│ Last Updated: Jan 20, 2026                          │
│                                                     │
│ [Edit Template] [Preview] [Test Send] [History]    │
├─────────────────────────────────────────────────────┤
│ password-reset                                      │
│ Name: Password Reset                                │
│ Category: Authentication                            │
│ Status: ✓ Active | Version 1                       │
│ Trigger: User requests password reset              │
│ Last Updated: Jan 10, 2026                          │
│                                                     │
│ [Edit Template] [Preview] [Test Send] [History]    │
└─────────────────────────────────────────────────────┘

[Create New Template]
```

---

### Template Editor

```
Edit Template: new-user-credentials

Template Key: new-user-credentials
Name: New User Credentials
Category: [Authentication ▼]
Description: Sent when an admin creates a new user account

Subject Line:
  Welcome to {{organizationName}} - Your Account is Ready

Template Variables:
  • {{recipientName}} - User's full name
  • {{recipientEmail}} - User's email
  • {{organizationName}} - Organization name
  • {{tempPassword}} - Temporary password
  • {{loginUrl}} - Login page URL
  • {{expiryDays}} - Password expiry days
  • {{adminName}} - Admin who created account

HTML Editor:
┌─────────────────────────────────────────────────────┐
│ [B] [I] [U] [Link] [Image] [Variable] [Preview]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Hello {{recipientName}},                            │
│                                                     │
│ Welcome to {{organizationName}}! Your account has   │
│ been created by {{adminName}}.                      │
│                                                     │
│ Your Login Credentials:                             │
│ Email: {{recipientEmail}}                           │
│ Temporary Password: {{tempPassword}}                │
│                                                     │
│ Important: Please change your password within       │
│ {{expiryDays}} days.                                │
│                                                     │
│ [Login Now]({{loginUrl}})                           │
│                                                     │
│ If you have questions, reply to this email.         │
│                                                     │
│ Best regards,                                       │
│ The {{organizationName}} Team                       │
│                                                     │
└─────────────────────────────────────────────────────┘

Settings:
  ☑ Active (send to users)
  ☑ Track opens
  ☑ Track clicks
  ☐ Plain text fallback

Version: 1 (create new version on save)
Change Notes: _______________________________

[Save as Draft] [Save & Activate] [Cancel]
```

---

### Testing Templates

```
Test Email Template: new-user-credentials

Send To: admin@company.com

Test Data (JSON):
{
  "recipientName": "John Doe",
  "recipientEmail": "john@company.com",
  "organizationName": "Acme Corporation",
  "tempPassword": "TempPass123!",
  "loginUrl": "https://app.easemail.com/login",
  "expiryDays": "7",
  "adminName": "Admin User"
}

Preview:
┌─────────────────────────────────────────────────────┐
│ Subject: Welcome to Acme Corporation - Your Account│
│          is Ready                                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Hello John Doe,                                     │
│                                                     │
│ Welcome to Acme Corporation! Your account has been  │
│ created by Admin User.                              │
│                                                     │
│ Your Login Credentials:                             │
│ Email: john@company.com                             │
│ Temporary Password: TempPass123!                    │
│                                                     │
│ ...                                                 │
└─────────────────────────────────────────────────────┘

[Send Test Email] [Cancel]
```

---

## Email Deliverability

**Navigation:** `Admin → Email → Deliverability`

```
Email Deliverability Status:

Domain Authentication:
  SPF Record:          ✓ Configured
  DKIM Signing:        ✓ Active
  DMARC Policy:        ✓ Enforced (p=quarantine)
  Domain Verification: ✓ Verified

Sender Reputation:
  Domain Reputation:   ✓ Excellent (Score: 92/100)
  IP Reputation:       ✓ Good (Score: 87/100)
  Spam Rate:           0.02% (Excellent)
  Bounce Rate:         1.2% (Good)
  Complaint Rate:      0.01% (Excellent)

Recent Issues:
  • No issues detected ✓

Sending Statistics (30 days):
  Sent:        12,543 emails
  Delivered:   12,394 (98.8%)
  Bounced:     149 (1.2%)
    - Hard:    23 (0.2%)
    - Soft:    126 (1.0%)
  Spam:        3 (0.02%)
  Opened:      8,456 (68.2%)
  Clicked:     3,421 (27.3%)

[View Bounce Details] [Check Blacklists] [Request Delisting]
```

---

# Admin Capabilities

## Database Migrations

**Navigation:** `Admin → Migrations`

**Critical system updates**

```
Database Migration Manager

Available Migrations:
┌─────────────────────────────────────────────────────┐
│ Migration 025: Email Templates System               │
│ Status: ✓ Applied on Feb 1, 2026                   │
│ Creates: email_templates, email_template_versions  │
│ [View Details] [Rollback] [View SQL]               │
├─────────────────────────────────────────────────────┤
│ Migration 026: Billing Tables                       │
│ Status: ✓ Applied on Feb 3, 2026                   │
│ Creates: subscriptions, invoices, usage_records    │
│ [View Details] [Rollback] [View SQL]               │
├─────────────────────────────────────────────────────┤
│ Migration 027: Enhanced Security                    │
│ Status: ○ Pending                                   │
│ Adds: session_tokens, security_events table        │
│ [Run Migration] [View SQL] [Skip]                  │
└─────────────────────────────────────────────────────┘

⚠️ Before Running Migrations:
  1. Backup database (automatic on migration)
  2. Run during low-traffic period
  3. Monitor for errors during execution
  4. Test rollback procedure

Migration Logs:
  [View All Logs] [Download Backup] [Schedule Migration]
```

---

## User Impersonation

**For support purposes only**

**Navigation:** `Admin → Users → [User] → Impersonate`

```
Impersonate User: john@company.com

⚠️ Warning: Impersonation is logged and audited

Reason (required):
  ○ Technical support
  ● Troubleshooting reported issue
  ○ Training/demonstration
  ○ Security investigation

Details: User reported email sync issue, need to debug

Duration: [30 minutes ▼]

Restrictions:
  ☑ Cannot change password
  ☑ Cannot modify security settings
  ☑ Cannot delete account
  ☑ Banner shows "Impersonating user" at all times
  ☑ Session automatically ends after duration

Audit Trail:
  • Start time logged
  • All actions logged
  • User notified via email
  • Admin notified when session ends

[Start Impersonation] [Cancel]
```

**During impersonation:**
```
┌─────────────────────────────────────────────────────┐
│ ⚠️ IMPERSONATING: john@company.com                  │
│ Started by: admin@company.com at 15:45              │
│ Session ends in: 28 minutes                         │
│ [End Session Now]                                   │
└─────────────────────────────────────────────────────┘
```

---

## API Key Management

**Navigation:** `Admin → API Keys`

```
API Keys:

┌─────────────────────────────────────────────────────┐
│ Salesforce Integration                              │
│ Key: sk_live_xxxxx...xxxxx                         │
│ Created: Jan 15, 2026                               │
│ Last Used: 2 minutes ago                            │
│ Rate Limit: 100 req/min                             │
│ Usage Today: 12,345 requests                        │
│ Status: ✓ Active                                    │
│ [View Details] [Rotate Key] [Revoke]               │
├─────────────────────────────────────────────────────┤
│ Zapier Integration                                  │
│ Key: sk_live_yyyyy...yyyyy                         │
│ Created: Dec 1, 2025                                │
│ Last Used: 15 minutes ago                           │
│ Rate Limit: 50 req/min                              │
│ Usage Today: 3,456 requests                         │
│ Status: ✓ Active                                    │
│ [View Details] [Rotate Key] [Revoke]               │
└─────────────────────────────────────────────────────┘

[Generate New API Key]
```

**Generate New Key:**
```
Create API Key:

Name: ______________________ (e.g., "HubSpot Integration")
Description: ________________ (optional)

Permissions:
  ☑ Read users
  ☑ Read emails
  ☑ Send emails
  ☐ Manage users
  ☐ Manage organizations
  ☐ Access billing

Rate Limits:
  Requests per minute: [100]
  Requests per day: [50000]
  Requests per month: [1000000]

IP Whitelist (optional):
  203.0.113.0/24
  [Add IP Range]

Expiration:
  ○ Never expires
  ● Expires after: [90 days ▼]

[Generate Key]

⚠️ API Key will be shown only once. Store it securely.
```

---

## Crash Prevention System

**New in v2.0:** Automatic crash prevention

**Navigation:** `Admin → System → Crash Prevention`

```
Crash Prevention Status:

Global Error Handling:         ✓ Active
  • Unhandled promise rejections: Caught & logged
  • Uncaught errors: Caught & logged
  • React component errors: Caught by error boundaries
  • All errors sent to Sentry

Error Boundaries:              ✓ Deployed
  • Global error boundary: Active
  • Section error boundaries: 12 active
  • Last error caught: 2 days ago (recovered successfully)

Safe Operations Available:
  • safeAsync() - Async function wrapper
  • safeArrayAccess() - Array indexing
  • safeDateParse() - Date parsing
  • safeJsonParse() - JSON parsing
  • retryAsync() - Retry with backoff
  • createAbortSignal() - Request timeouts

Recent Errors Prevented:
  • Null sender email in inbox (caught & handled)
  • Invalid calendar date (validated before use)
  • Blob URL memory leak (prevented with cleanup)

System Grade: A- (Excellent)
  • No crashes in last 30 days
  • 98.8% error-free operation
  • All critical paths protected

[View Error Logs] [Configure Sentry] [Download Report]
```

---

# Common Administrative Tasks

## Task 1: Onboard New Employee

**Time:** ~5 minutes

```bash
Step 1: Create User Account
Admin → Users → Create User
  Email: newuser@company.com
  Full Name: New User
  Role: Organization User
  Send invitation: ☑

Step 2: Add to Teams (Optional)
Admin → Teams → [Department] → Members → Add
  Select: newuser@company.com

Step 3: Configure Email Signature (Optional)
Admin → Email Templates → User Templates
  Auto-apply: Company signature template

Step 4: Grant Access to Shared Resources
Admin → Shared Mailboxes → [Mailbox] → Add Member
  Select: newuser@company.com

Step 5: Monitor First Login
Admin → Activity Logs
  Filter: newuser@company.com
  ✓ Verify successful login
  ✓ Verify 2FA setup (if required)

✓ Complete! User ready to work.
```

---

## Task 2: Offboard Departing Employee

**Time:** ~10 minutes

```bash
Step 1: Suspend Account (Before Last Day)
Admin → Users → employee@company.com → Suspend
  Reason: Offboarding - Last day [date]
  Revoke sessions: ☑
  Notify: ☐ (don't alert user)

Step 2: Export User Data
Admin → Users → employee@company.com → Export Data
  Include:
    ☑ All emails (MBOX)
    ☑ Contacts (CSV)
    ☑ Calendar (iCal)
    ☑ Drafts (JSON)

  → Email notification when ready
  → Download and store securely

Step 3: Transfer Ownership
Admin → Users → employee@company.com

  Shared Mailboxes:
    • support@company.com → Transfer to: manager@company.com

  Teams:
    • Engineering Team → Transfer ownership to: lead@company.com

  Calendar:
    • Recurring meetings → Transfer to: manager@company.com
    • One-time events → Cancel or transfer individually

Step 4: Setup Email Forwarding (Temporary)
Email Settings:
  Forward to: manager@company.com
  Duration: 30 days
  ☑ Keep copy in original mailbox
  ☑ Notify sender of forwarding

Step 5: Delete Account (After 30-90 Days)
Admin → Users → employee@company.com → Delete

  Confirm data exported: ☑
  Confirm email: employee@company.com

  → Permanent deletion
  → All data removed
  → Audit logs anonymized

✓ Offboarding complete.
```

---

## Task 3: Setup SSO (SAML)

**Time:** ~30 minutes

```bash
Step 1: Configure SSO in EaseMail
Admin → Settings → SSO → Enable SSO

Provider: [Okta / Azure AD / Google / Custom SAML]

For SAML 2.0:
  SSO URL: https://your-idp.com/sso/saml
  Entity ID: https://your-idp.com/entity
  X.509 Certificate: [Paste certificate]

EaseMail provides (copy these to your IdP):
  ACS URL: https://app.easemail.com/auth/sso/callback
  SP Entity ID: https://app.easemail.com
  Metadata URL: https://app.easemail.com/auth/sso/metadata

Step 2: Configure Attribute Mapping
  Email: email (required)
  First Name: firstName
  Last Name: lastName
  Role: groups
    • Map "admin" → org_admin
    • Map "user" → org_user
  Department: department → Team

Step 3: Test SSO
  Test User: testuser@company.com
  → Click "Test SSO Connection"
  → Login via IdP
  → Verify user created correctly
  → Verify attributes mapped

Step 4: Enable for Organization
  ☑ Enable SSO login
  ☑ Auto-create users on first SSO login
  Default Role: org_user

  Require SSO:
    ○ Optional (users can use password too)
    ● Required (SSO only)

Step 5: Migrate Existing Users
  Admin → Users → Bulk Actions → Enable SSO

  ☑ Send notification email
  ☑ Grace period: 7 days

  → Users transitioned to SSO login

✓ SSO configured successfully.
```

---

## Task 4: Configure Billing Alerts

**Time:** ~5 minutes

```bash
Step 1: Set Usage Thresholds
Admin → Billing → Alerts

Storage Alert:
  Alert at: 80% (400 GB of 500 GB)
  Recipients: admin@company.com, finance@company.com
  ☑ Email
  ☐ SMS (Enterprise only)

User Limit Alert:
  Alert at: 90% (90 of 100 users)
  Recipients: admin@company.com, hr@company.com
  ☑ Email

Email Volume Alert:
  Alert at: 80% (40,000 of 50,000 emails)
  Recipients: admin@company.com
  ☑ Email

Overage Alert:
  Alert on: Any usage-based overage
  ☑ SMS overage
  ☑ AI overage
  ☑ API overage
  Recipients: admin@company.com, billing@company.com

Step 2: Configure Weekly Reports
  ☑ Send weekly usage summary
  Day: Friday
  Time: 5:00 PM
  Recipients: All admins + billing@company.com

Step 3: Test Alerts
  → Send Test Alert
  ✓ Email received successfully

✓ Billing alerts configured.
```

---

## Task 5: Bulk User Role Change

**Time:** ~3 minutes

```bash
Step 1: Select Users
Admin → Users → Filters
  Team: [Engineering]
  Current Role: [org_user]

  → Select All (23 users)

Step 2: Bulk Action
Bulk Actions → Change Role

New Role: org_admin
Reason: Team restructure - promoting all eng team to admins

☑ Notify users via email
☑ Require password re-entry on next login
☑ Audit log entry

→ Apply to 23 Users

Step 3: Verify
Admin → Users → Filter by Role: org_admin
  ✓ 23 users now have org_admin role
  ✓ Email notifications sent
  ✓ Audit trail created

✓ Bulk role change complete.
```

---

# Troubleshooting Guide

## Issue 1: Users Can't Login

**Symptoms:**
- "Invalid credentials" error
- "Account locked" message
- "2FA code not working"
- Infinite redirect loop

**Diagnostic Steps:**

```bash
1. Check Account Status
   Admin → Users → Search: user@company.com

   Status: Active / Suspended / Deleted?
   2FA: Enabled?
   Sessions: Any active?
   Last Login: When?

2. Review Activity Logs
   Admin → Activity Logs
   Filter: user@company.com + "login" + Last 24 hours

   Look for:
     • Failed login attempts
     • Account lockout events
     • IP blocks
     • 2FA failures

3. Check 2FA Status
   If "2FA code invalid":
     Admin → Users → [User] → Security
     2FA Status: Enabled with method X
     Recovery codes: X remaining

4. Verify Password Policy
   Admin → Security → Password Policy
   Did password expire?
   Does password meet requirements?

5. Check IP Restrictions
   Admin → Security → IP Restrictions
   Is user's IP in allowed ranges?
   Check user's current IP in activity logs

6. Check SSO Configuration
   If SSO enabled:
     Admin → Settings → SSO → Test Connection
     Check IdP status
     Verify certificate not expired
```

**Solutions:**

```bash
# Unlock Account
Admin → Users → [User] → Unlock Account
Reason: [Locked due to failed attempts]
→ Unlocked ✓

# Reset Password
Admin → Users → [User] → Reset Password
→ Email reset link sent to user

# Reset 2FA
Admin → Users → [User] → Security → Reset 2FA
☑ Send notification
→ User must re-setup 2FA on next login

# Temporarily Disable IP Restrictions
Admin → Security → IP Restrictions
☐ Temporarily disable for troubleshooting
→ Save (re-enable after testing)

# Check SSO Certificate
Admin → Settings → SSO → Update Certificate
→ Upload new certificate if expired

# Clear User Cache
Admin → Users → [User] → Advanced → Clear Cache
→ Forces fresh authentication
```

---

## Issue 2: Emails Not Syncing

**Symptoms:**
- New emails not appearing
- Sent emails missing
- "Sync failed" errors
- Outdated inbox

**Diagnostic Steps:**

```bash
1. Check System Health
   Admin → System Health → Email Sync Service
   Status: Operational?
   Last sync: When?
   Failed syncs: Any?

2. Check User's Email Account
   Admin → Users → [User] → Email Accounts

   For each account:
     Status: Connected / Expired / Error?
     Last Sync: When?
     OAuth Token: Valid?
     Provider: Gmail / Outlook / etc.

3. Review Sync Logs
   Admin → Activity Logs
   Filter: "sync" + User + Last 1 hour

   Errors:
     • sync_failed
     • auth_expired
     • api_error
     • rate_limit_exceeded

4. Test Provider API
   Admin → System Health → API Services
   Nylas API: Operational?
   Response time: Normal?

5. Check Account Quotas
   Has user exceeded:
     • API rate limits?
     • Storage limits?
     • Provider-specific limits?
```

**Solutions:**

```bash
# Reconnect Email Account
Admin → Users → [User] → Email Accounts → [Account]
→ Click "Reconnect"
→ User completes OAuth flow
→ Sync resumes

# Force Manual Sync
Admin → Users → [User] → Email Accounts → [Account]
→ Force Sync Now
→ Syncs last 7 days of emails

# Refresh OAuth Token
Admin → Users → [User] → Email Accounts → [Account]
OAuth Status: Expired
→ Click "Refresh Token"
→ Token renewed automatically

# Clear Sync Cache
Admin → Users → [User] → Advanced → Clear Sync Cache
→ Removes cached data
→ Forces fresh sync from provider

# Check Provider Status
Visit: status.nylas.com
If provider having issues:
  → Wait for resolution
  → Sync will auto-resume

# Remove & Re-add Account (Last Resort)
User: Settings → Accounts → [Account] → Remove
→ Settings → Accounts → Add Account
→ Complete OAuth flow
→ Full re-sync initiated
```

---

## Issue 3: High Storage Usage

**Symptoms:**
- Approaching storage limit
- Slow performance
- "Storage full" warnings
- Billing concerns

**Diagnostic Steps:**

```bash
1. Check Organization Usage
   Admin → Billing
   Storage: XXX GB / YYY GB (ZZ%)
   Growth rate: +X GB/week

2. Identify Top Users
   Admin → Usage Analytics → Storage Report
   Sort by: Storage Used (descending)

   Top 10 users consuming:
     user1: 25 GB (17%)
     user2: 18 GB (12%)
     user3: 15 GB (10%)

3. Analyze Storage Breakdown
   Admin → Storage → Breakdown

   By Type:
     Emails: 80 GB (55%)
     Attachments: 50 GB (34%)
     Calendar: 5 GB (3%)
     Other: 10 GB (7%)

4. Check for Large Attachments
   Admin → Storage → Large Files
   Filter: Size > 10 MB

   Results:
     video.mp4 (user1): 500 MB
     presentation.pptx (user2): 200 MB
     dataset.csv (user3): 150 MB

5. Review Retention Policies
   Admin → Settings → Data Retention
   Current policy:
     Trash: Delete after 30 days
     Deleted: Permanent after 30 days
     Old emails: No auto-archive
```

**Solutions:**

```bash
# Implement Retention Policy
Admin → Settings → Data Retention

Trash Folder:
  Auto-delete after: 30 days

Deleted Items:
  Permanent delete after: 30 days

Old Emails:
  Archive after: 1 year
  ☑ Move to cold storage (cheaper)

→ Save Policy
→ Runs nightly, frees up space gradually

# Contact Top Users
Admin → Users → [Top Users] → Email

Subject: "Storage Usage Notice"
Message:
  "Your account is using X GB of storage.
   Please delete unnecessary emails/attachments.
   Consider archiving old emails."

→ Send to 10 users

# Enable Storage Optimization (Enterprise)
Admin → Storage → Optimize

☑ Compress attachments (lossless)
  Estimated savings: 15 GB (10%)

☑ Deduplicate identical attachments
  Estimated savings: 8 GB (5%)

☑ Convert images to WebP
  Estimated savings: 5 GB (3%)

→ Run Optimization
→ Process time: ~2 hours

# Upgrade Storage Plan
Admin → Billing → Upgrade

Current: Pro (500 GB)
Upgrade to: Enterprise (Unlimited)

Additional cost: $15/month
Effective: Immediately

→ Upgrade Now

# Export & Delete Old Data
Admin → Users → [Heavy Users]

For each user:
  1. Export emails older than 2 years
  2. Download archive
  3. Delete from system
  4. Store archive locally/S3

→ Frees up storage immediately
```

---

## Issue 4: PayPal Billing Failures

**Symptoms:**
- Payment declined
- Subscription suspended
- Webhook failures
- Invoice generation errors

**Diagnostic Steps:**

```bash
1. Check Subscription Status
   Admin → Billing → Subscriptions

   Status: active / suspended / cancelled?
   PayPal Subscription ID: I-XXXXX
   Last Payment: When?
   Next Billing: When?

2. Review PayPal Webhooks
   Admin → System → Webhooks → PayPal

   Recent Events:
     • BILLING.SUBSCRIPTION.SUSPENDED
     • PAYMENT.SALE.FAILED

   Status: processed / failed?
   Error message: [View details]

3. Check PayPal Account
   Login to PayPal Business Account
   → Subscriptions
   → Find EaseMail subscription

   Status in PayPal:
     Active / Suspended?
   Payment method:
     Valid / Expired?

4. Review Billing Events
   Admin → Activity Logs
   Filter: "billing" + Last 7 days

   Look for:
     • payment_failed
     • subscription_suspended
     • webhook_error

5. Verify PayPal Configuration
   Admin → Billing → PayPal Settings

   Client ID: Configured?
   Webhook URL: Receiving events?
   Last successful payment: When?
```

**Solutions:**

```bash
# Update Payment Method in PayPal
1. Login to PayPal
2. Profile → Payment Methods
3. Update credit card / bank account
4. Set as default payment method
5. Wait for next billing cycle

# Manually Reactivate Subscription
Admin → Billing → Subscriptions → [Subscription]
→ Reactivate Subscription

Reason: Payment method updated
→ Charges card immediately
→ Status: active ✓

# Process Manual Payment
Admin → Billing → Invoices → [Unpaid Invoice]
→ Send Payment Link to Customer

Customer:
  → Clicks link
  → Pays via PayPal
  → Subscription reactivated

# Fix Webhook Configuration
Admin → Billing → PayPal Settings → Webhooks

Webhook URL: https://app.easemail.com/api/webhooks/paypal
Events subscribed: [List all required events]

If broken:
  → Delete webhook in PayPal
  → Recreate in EaseMail admin
  → Copy new webhook URL to PayPal
  → Test webhook

# Contact PayPal Support
If payment repeatedly fails:
  → PayPal Business Support
  → Reference subscription ID
  → Check for account restrictions

# Temporary Manual Billing
While fixing PayPal:
  Admin → Billing → Manual Invoice
  → Send invoice via email
  → Accept payment via wire transfer
  → Manually mark as paid
  → Fix PayPal for next cycle
```

---

## Issue 5: 2FA Lockout

**Symptoms:**
- User lost device
- 2FA app reset
- Recovery codes lost
- Cannot login

**Diagnostic Steps:**

```bash
1. Verify User Identity
   Confirm via:
     • Email verification
     • Phone call
     • Video verification (Enterprise)
     • Manager confirmation

2. Check 2FA Status
   Admin → Users → [User] → Security

   2FA Method: TOTP / SMS?
   Enabled Since: When?
   Recovery Codes: How many remaining?
   Backup Methods: Any configured?

3. Review Login Attempts
   Admin → Activity Logs
   Filter: User + "2fa" + Last 24 hours

   Failed attempts: How many?
   IP addresses: Same device?
   Timestamps: Recent?
```

**Solutions:**

```bash
# Use Recovery Codes (User Self-Service)
If user has recovery codes saved:
  1. User enters recovery code instead of 2FA
  2. Code consumed (one-time use)
  3. User logged in
  4. User re-configures 2FA

# Admin Reset 2FA
Admin → Users → [User] → Security → Reset 2FA

Identity Verified: ☑
Reason: Lost device / App reset
☑ Send email notification to user
☑ Require re-setup on next login
☑ Generate temporary access code (valid 30 min)

→ Reset 2FA

Temporary Code: TEMP-XXXX-YYYY
→ Send to user via verified phone/email

User Process:
  1. Login with email + password
  2. Enter temporary code
  3. Setup new 2FA (scan QR code)
  4. Download new recovery codes
  5. Login with new 2FA

# SMS Backup (If Configured)
If user has SMS backup:
  1. User selects "Use SMS instead"
  2. Code sent to registered phone
  3. User enters SMS code
  4. Logged in
  5. User can reconfigure TOTP

# Emergency Access (Enterprise Only)
Admin → Users → [User] → Emergency Access

⚠️ Temporarily disable 2FA for:
  ○ 1 hour
  ○ 4 hours
  ● 24 hours

Approval Required:
  ☑ Two admins must approve

Admin 1 (you): admin1@company.com ✓
Admin 2: admin2@company.com [Pending]

→ Request Emergency Access

Once approved:
  • User can login without 2FA
  • Time-limited access
  • User MUST setup 2FA before expiry
  • Heavily logged & audited
```

---

# API Integration Guide

## Authentication

**Obtaining API Keys:**

```bash
Admin → API Keys → Generate New Key

Name: "Production API"
Permissions:
  ☑ Read users
  ☑ Read emails
  ☑ Send emails
  ☐ Manage users (don't grant unless needed)

Rate Limit: 100 req/min

→ Generate Key

API Key: sk_live_xxxxxxxxxxxxxxxxxxxxx

⚠️ Save this key securely - shown only once!
```

**Using API Keys:**

```bash
# HTTP Header Authentication
curl https://api.easemail.com/v1/users \
  -H "Authorization: Bearer sk_live_xxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json"
```

---

## Common API Operations

### List All Users

```bash
GET /api/v1/users

curl https://api.easemail.com/v1/users \
  -H "Authorization: Bearer YOUR_API_KEY"

Response:
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "email": "john@company.com",
      "fullName": "John Doe",
      "role": "org_user",
      "subscriptionTier": "pro",
      "createdAt": "2026-01-15T10:30:00Z"
    }
  ],
  "total": 247,
  "page": 1,
  "per_page": 50
}
```

---

### Create User

```bash
POST /api/v1/users

curl https://api.easemail.com/v1/users \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@company.com",
    "fullName": "New User",
    "role": "org_user",
    "organizationId": "org-uuid",
    "sendInvitation": true
  }'

Response:
{
  "success": true,
  "user": {
    "id": "new-uuid",
    "email": "newuser@company.com",
    "fullName": "New User",
    "role": "org_user",
    "accountStatus": "pending"
  },
  "invitationSent": true
}
```

---

### Get Usage Analytics

```bash
GET /api/v1/analytics/usage?period=last_30_days

curl "https://api.easemail.com/v1/analytics/usage?period=last_30_days" \
  -H "Authorization: Bearer YOUR_API_KEY"

Response:
{
  "success": true,
  "period": "last_30_days",
  "analytics": {
    "activeUsers": 247,
    "emailsSent": 12543,
    "emailsReceived": 45678,
    "storageUsed": "145GB",
    "apiCalls": 1234567,
    "aiRequests": 4567
  }
}
```

---

## Webhooks

**Configure webhook endpoint:**

```bash
Admin → Settings → Webhooks → Add Endpoint

Webhook URL: https://your-app.com/webhooks/easemail
Secret: [Auto-generated]

Events:
  ☑ user.created
  ☑ user.deleted
  ☑ user.updated
  ☑ email.sent
  ☑ email.received
  ☐ calendar.event_created

→ Save Webhook
```

**Webhook payload:**

```json
{
  "event": "user.created",
  "timestamp": "2026-02-03T15:45:00Z",
  "data": {
    "user_id": "uuid",
    "email": "newuser@company.com",
    "fullName": "New User",
    "role": "org_user",
    "organizationId": "org-uuid"
  },
  "signature": "sha256_signature_here"
}
```

**Verify webhook signature (Node.js):**

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const computed = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(signature)
  );
}

// In your webhook handler:
app.post('/webhooks/easemail', (req, res) => {
  const signature = req.headers['x-easemail-signature'];
  const payload = req.body;

  if (verifyWebhook(payload, signature, WEBHOOK_SECRET)) {
    // Process webhook
    console.log('Valid webhook:', payload.event);
    res.status(200).send('OK');
  } else {
    // Reject invalid signature
    res.status(403).send('Invalid signature');
  }
});
```

---

# Best Practices

## Security Best Practices

### ✅ DO

1. **Enable 2FA for all admin accounts**
   - Required for platform_admin
   - Recommended for user_admin
   - Use TOTP (not SMS) for admins

2. **Use strong password policies**
   - Minimum 12 characters
   - Require all complexity types
   - 90-day expiration for sensitive roles
   - Prevent password reuse (history: 10)

3. **Monitor activity logs regularly**
   - Review failed login attempts daily
   - Investigate suspicious patterns
   - Set up automated alerts

4. **Implement IP restrictions (Enterprise)**
   - Whitelist office/VPN IPs
   - Block high-risk countries
   - Auto-block on failed attempts

5. **Rotate API keys every 90 days**
   - Set expiration on creation
   - Monitor key usage
   - Revoke unused keys

6. **Backup data regularly**
   - Weekly automated backups
   - Store backups off-site
   - Test restore procedures quarterly

7. **Keep software updated**
   - Apply security patches promptly
   - Review migration logs
   - Test in staging first

### ❌ DON'T

1. **Share admin credentials**
   - Create separate accounts
   - Use role-based access
   - No shared passwords

2. **Ignore security alerts**
   - Act on failed login spikes
   - Investigate unusual activity
   - Don't disable security features

3. **Grant excessive permissions**
   - Principle of least privilege
   - Review permissions quarterly
   - Remove when no longer needed

4. **Skip offboarding procedures**
   - Suspend accounts immediately
   - Export data before deletion
   - Transfer ownership properly

5. **Neglect audit logs**
   - Review regularly
   - Export for compliance
   - Retain per policy (90 days minimum)

---

## Performance Best Practices

### Email Management

1. **Implement retention policies**
   ```yaml
   Trash: Delete after 30 days
   Deleted: Permanent after 30 days
   Old emails: Archive after 1 year
   ```

2. **Monitor storage growth**
   - Set alerts at 80%
   - Identify heavy users
   - Clean up large attachments

3. **Optimize email rules**
   - Limit to 20 rules per user
   - Avoid complex nested conditions
   - Test performance impact

### API Usage

1. **Implement caching**
   - Cache frequently accessed data
   - Use ETags for conditional requests
   - Respect cache headers

2. **Use pagination**
   - Request small pages (50-100 items)
   - Don't fetch all data at once
   - Implement cursor-based pagination

3. **Handle rate limits**
   - Implement exponential backoff
   - Monitor rate limit headers
   - Distribute load across keys

4. **Use webhooks over polling**
   - Subscribe to relevant events
   - Verify webhook signatures
   - Handle retries properly

### Database Maintenance

1. **Schedule maintenance windows**
   - Run migrations during low traffic
   - Backup before major changes
   - Monitor query performance

2. **Clean up old data**
   - Archive old audit logs
   - Remove soft-deleted users (90 days)
   - Vacuum database monthly

---

## Compliance Best Practices

### GDPR Compliance

1. **Data Export**
   - Respond to requests within 30 days
   - Export in machine-readable format
   - Include all personal data

2. **Data Deletion**
   - Process within 30 days
   - Use transaction-safe deletion
   - Anonymize audit logs
   - Document deletion

3. **Data Processing Agreement**
   - Review DPA with EaseMail
   - Document data flows
   - Update privacy policy

### SOC 2 Compliance

1. **Access Controls**
   - Role-based access
   - Regular permission reviews
   - Mandatory 2FA for admins

2. **Audit Logging**
   - Enable comprehensive logging
   - Retain logs for 1 year
   - Regular log reviews

3. **Incident Response**
   - Document security incidents
   - Notify affected users
   - Remediate vulnerabilities

---

# Emergency Procedures

## Emergency Contacts

```
24/7 Emergency Support (Enterprise):
  Phone: +1 (555) 123-4567
  Email: emergency@easemail.com

Priority Support (Pro):
  Email: support@easemail.com
  Response Time: 2 hours

Status Page:
  https://status.easemail.com

Security Issues:
  Email: security@easemail.com
  PGP Key: https://easemail.com/pgp-key.asc
```

---

## Critical System Down

**Symptoms:** Users cannot access system

**Steps:**

```bash
1. Check Status Page
   Visit: https://status.easemail.com
   Current Status: [Check]

2. Verify Internet Connection
   Can you access other sites?
   Check DNS resolution

3. Check System Health
   If you can access:
     Admin → System Health
     Look for critical alerts

4. Review Activity Logs
   Admin → Activity Logs
   Filter: Last 15 minutes
   Look for: system errors, database issues

5. Contact Support
   Enterprise: Call +1 (555) 123-4567
   Pro: Email support@easemail.com
   Include:
     • Organization name
     • Error messages
     • Screenshots
     • Affected users count

6. Communicate with Users
   Send status update:
     • We're aware of the issue
     • Working on resolution
     • ETA if known
     • Updates every 30 minutes
```

---

## Security Breach

**Symptoms:** Unauthorized access detected

**Steps:**

```bash
⚠️ IMMEDIATE ACTIONS (Within 5 minutes):

1. Suspend Compromised Accounts
   Admin → Users → [Affected Users]
   → Bulk Suspend
   → Revoke all sessions

2. Rotate API Keys
   Admin → API Keys
   → Revoke all keys
   → Generate new keys
   → Update integrations

3. Enable IP Restrictions
   Admin → Security → IP Restrictions
   → Enable whitelist mode
   → Block suspicious IPs

4. Force Password Reset
   Admin → Users → All Users
   → Bulk Action → Force Password Reset
   → Require 2FA setup

5. Contact Security Team
   Email: security@easemail.com
   Subject: "SECURITY BREACH - [Org Name]"
   Include:
     • What happened
     • When detected
     • Affected accounts
     • Actions taken

6. Preserve Evidence
   Admin → Activity Logs → Export
   → Export last 48 hours
   → Save locally
   → Don't delete logs

7. Notify Affected Users
   Draft message:
     "Security Notice: We detected unauthorized
      access to some accounts. Your account has
      been secured. Please reset your password
      immediately."

8. Document Incident
   Create incident report:
     • Timeline of events
     • Affected systems/users
     • Actions taken
     • Lessons learned

9. Review & Remediate
   After containment:
     • Patch vulnerabilities
     • Update security policies
     • Conduct security training
     • Implement additional controls
```

---

## Data Loss

**Symptoms:** User data missing or corrupted

**Steps:**

```bash
1. Identify Scope
   What's missing:
     • Emails? Contacts? Calendar?
     • Single user? Multiple users?
     • When did it disappear?

2. Check Trash/Deleted Items
   User: Settings → Trash
   Look for: Recently deleted items
   Restore if found

3. Check Sync Status
   Admin → Users → [User] → Email Accounts
   Status: Connected?
   Last sync: Recent?
   Force sync if needed

4. Review Activity Logs
   Admin → Activity Logs
   Filter: User + "delete" + Date range
   Look for: Bulk deletion, account removal

5. Restore from Backup
   Admin → Data Export → Backups
   → Find relevant backup date
   → Download backup
   → Selective restore

6. Contact Support
   If backup restoration needed:
     Email: support@easemail.com
     Include:
       • User email
       • Data type missing
       • Date range
       • Backup reference

7. Prevent Future Loss
   Admin → Settings → Data Retention
   → Enable trash retention
   → Enable automated backups
   → Configure alerts
```

---

## Payment Failure

**Symptoms:** Service suspended due to payment

**Steps:**

```bash
1. Check Subscription Status
   Admin → Billing → Subscriptions
   Status: suspended?
   Last payment: failed?

2. Identify Payment Issue
   • Credit card expired?
   • Insufficient funds?
   • PayPal account issue?
   • Billing address mismatch?

3. Update Payment Method
   Admin → Billing → Payment Method
   → Update credit card
   OR
   → Update PayPal account

4. Retry Payment
   Admin → Billing → Invoices → [Unpaid]
   → Retry Payment
   OR
   → Pay Now (manual)

5. Contact Billing Support
   If payment fails repeatedly:
     Email: billing@easemail.com
     Include:
       • Organization name
       • Invoice numbers
       • Payment method used
       • Error messages

6. Temporary Extension (Enterprise)
   Call: +1 (555) 123-4567
   Request: 7-day payment grace period
   While: Resolving payment issues

7. Reactivate Service
   Once payment succeeds:
     → Service auto-reactivates within 5 minutes
     → Users can login again
     → No data lost during suspension
```

---

# Appendix

## Glossary

| Term | Definition |
|------|------------|
| **2FA** | Two-Factor Authentication - additional security layer |
| **API** | Application Programming Interface - for integrations |
| **ACS** | Assertion Consumer Service - SSO callback URL |
| **CSRF** | Cross-Site Request Forgery - security vulnerability |
| **DKIM** | DomainKeys Identified Mail - email authentication |
| **DMARC** | Domain-based Message Authentication - email policy |
| **E2E** | End-to-End Encryption |
| **GDPR** | General Data Protection Regulation (EU privacy law) |
| **IdP** | Identity Provider (for SSO) |
| **JWT** | JSON Web Token - authentication token |
| **MBOX** | Email archive format |
| **OAuth** | Authorization protocol (for email providers) |
| **RLS** | Row Level Security - database security |
| **SAML** | Security Assertion Markup Language (for SSO) |
| **SPF** | Sender Policy Framework - email authentication |
| **SSO** | Single Sign-On - unified authentication |
| **TLS** | Transport Layer Security - encryption protocol |
| **TOTP** | Time-based One-Time Password (2FA method) |

---

## System Requirements

### Browser Support

| Browser | Minimum Version | Recommended |
|---------|----------------|-------------|
| **Chrome** | 90+ | Latest |
| **Firefox** | 88+ | Latest |
| **Safari** | 14+ | Latest |
| **Edge** | 90+ | Latest |

### Mobile Apps

| Platform | Minimum Version |
|----------|----------------|
| **iOS** | 14.0+ |
| **Android** | 8.0+ (API 26) |

### Network Requirements

```yaml
Outbound Access Required:
  • app.easemail.com (443)
  • api.easemail.com (443)
  • api.nylas.com (443)
  • api.openai.com (443)
  • api.twilio.com (443)
  • api.paypal.com (443)

Firewall Rules:
  • Allow HTTPS (443) outbound
  • Allow WebSocket (wss://)
  • No inbound ports required

Bandwidth:
  • Minimum: 1 Mbps per user
  • Recommended: 5 Mbps per user
```

---

## Compliance & Certifications

**Current Status:**

- ✅ **GDPR Compliant** (EU Data Protection)
- ✅ **CCPA Compliant** (California Privacy)
- ✅ **SOC 2 Type II** (In progress - Q2 2026)
- ✅ **ISO 27001** (In progress - Q3 2026)
- ✅ **HIPAA Available** (Enterprise with BAA)

**Data Centers:**

```yaml
Available Regions:
  • US East (Virginia) - Primary
  • US West (California)
  • EU (Ireland) - GDPR
  • Asia Pacific (Singapore)

Data Residency:
  • Enterprise: Choose region
  • Pro: Auto-assigned
  • Free/Starter: US East only

Backups:
  • Encrypted at rest (AES-256)
  • Cross-region replication
  • 30-day retention (Pro)
  • 90-day retention (Enterprise)
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| **2.0** | Feb 3, 2026 | Complete rewrite with crash prevention, PayPal billing, usage tracking, email templates |
| **1.5** | Jan 15, 2026 | Added SSO documentation, API examples |
| **1.0** | Dec 1, 2025 | Initial release |

---

## Support Resources

**Documentation:**
- Main Docs: https://docs.easemail.com
- API Docs: https://api.easemail.com/docs
- Developer Portal: https://developers.easemail.com
- Status Page: https://status.easemail.com

**Community:**
- Forum: https://community.easemail.com
- GitHub: https://github.com/easemail
- Twitter: @easemail
- LinkedIn: /company/easemail

**Training:**
- Video Tutorials: https://youtube.com/easemail
- Webinars: https://easemail.com/webinars
- Certification: https://academy.easemail.com

---

## Feedback & Updates

**Submit Feedback:**
- Feature Requests: https://easemail.com/feedback
- Bug Reports: support@easemail.com
- Security Issues: security@easemail.com

**Document Updates:**
- Latest Version: https://docs.easemail.com/it-admin-guide
- Change Log: https://docs.easemail.com/changelog
- Next Review: May 2026

---

<div style="text-align: center; margin-top: 50px; padding-top: 20px; border-top: 2px solid #667eea;">

**EaseMail Platform**
Enterprise Edition v3.5

**IT Manager's Quick Reference Manual**
Version 2.0 | February 2026

---

© 2026 EaseMail Corporation. All rights reserved.

For support: support@easemail.com | +1 (555) 123-4567
Status: https://status.easemail.com

</div>
