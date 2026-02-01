# EaseMail - IT Manager's Quick Reference Manual
## Organization Account Management Guide

**Version:** 1.0
**Last Updated:** February 2026
**For:** IT Managers, System Administrators, Organization Administrators

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Organization Setup](#organization-setup)
3. [User Management](#user-management)
4. [Security Configuration](#security-configuration)
5. [Monitoring & Analytics](#monitoring--analytics)
6. [Billing & Subscriptions](#billing--subscriptions)
7. [Common Tasks](#common-tasks)
8. [Troubleshooting](#troubleshooting)
9. [Command Reference](#command-reference)
10. [API Integration](#api-integration)

---

## Quick Start

### First 5 Minutes

```
1. Login as admin → app.easemail.com/login
2. Navigate to Admin → Organizations
3. Create organization (enter company name, domain)
4. Invite first users (Admin → Users → Invite)
5. Configure 2FA (Admin → Settings → Security)
```

### Essential URLs

| Function | URL |
|----------|-----|
| **Admin Dashboard** | `/admin` |
| **User Management** | `/admin/users` |
| **Organization Settings** | `/admin/organizations` |
| **Usage Analytics** | `/admin/usage-analytics` |
| **Billing** | `/admin/billing-config` |
| **Activity Logs** | `/admin/activity-logs` |
| **System Health** | `/admin/system-health` |
| **API Keys** | `/admin/api-keys` |

---

## Organization Setup

### Creating Your Organization

**Step 1: Basic Information**
```
Admin → Organizations → Create Organization

Required Fields:
├── Name: Company legal name
├── Domain: Primary email domain (e.g., company.com)
├── Billing Email: Finance contact
├── Plan: Free | Pro | Enterprise
└── Timezone: Organization default
```

**Step 2: Domain Verification**
```
1. Add TXT record to DNS:
   Host: _easemail-verify
   Value: [provided verification code]

2. Verify domain:
   Admin → Organizations → Verify Domain

3. Enable domain-based auto-provisioning (optional):
   ✓ Users with @company.com auto-join organization
```

**Step 3: Configure Email Settings**
```
Admin → Organizations → Settings → Email

SPF Record:
v=spf1 include:_spf.easemail.com ~all

DKIM Record:
easemail._domainkey IN TXT "v=DKIM1; k=rsa; p=[public-key]"

DMARC Record:
_dmarc IN TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@company.com"
```

---

## User Management

### Adding Users

#### Method 1: Single User Invite
```
Admin → Users → Invite User

Email: user@company.com
Role: User | Manager | Admin | Super Admin
Team: [Optional] Select existing team
Send Welcome Email: ✓

→ User receives invitation with setup link
```

#### Method 2: Bulk Import (CSV)
```
Admin → Users → Import Users → Download Template

CSV Format:
email,first_name,last_name,role,team
john@company.com,John,Doe,user,Sales
jane@company.com,Jane,Smith,manager,Engineering

→ Upload CSV → Review → Confirm Import
→ Invitations sent automatically
```

#### Method 3: Auto-Provisioning (SSO)
```
Admin → Settings → SSO → Configure

Enable: ✓ Auto-create users on first SSO login
Default Role: user
Default Team: [None]

→ Users auto-created on first login via SSO
```

### User Roles & Capabilities

| Capability | User | Manager | Admin | Super Admin |
|------------|------|---------|-------|-------------|
| **Email Access** | ✓ | ✓ | ✓ | ✓ |
| **Calendar & Contacts** | ✓ | ✓ | ✓ | ✓ |
| **SMS Sending** | ✓ | ✓ | ✓ | ✓ |
| **AI Features** | ✓ | ✓ | ✓ | ✓ |
| **Email Rules** | ✓ | ✓ | ✓ | ✓ |
| **View Team Members** | Own | Team | All | All |
| **Invite Team Members** | - | Team | All | All |
| **Remove Users** | - | Team | All | All |
| **View Analytics** | Own | Team | All | All |
| **Configure Email Rules** | Own | Team | All | All |
| **Access Admin Panel** | - | Limited | ✓ | ✓ |
| **Manage Billing** | - | - | - | ✓ |
| **Org Settings** | - | - | - | ✓ |
| **API Keys** | - | - | ✓ | ✓ |
| **Security Policies** | - | - | ✓ | ✓ |
| **Export All Data** | - | - | ✓ | ✓ |

### Managing User Status

```bash
# Suspend User (temporarily disable)
Admin → Users → [Select User] → Suspend Account
Reason: [Optional note]
✓ Notify user via email

# Reactivate User
Admin → Users → [Select User] → Reactivate Account

# Delete User (permanent)
Admin → Users → [Select User] → Delete Account
⚠️ This will:
  • Delete all user data
  • Remove from all teams
  • Cancel any active sessions
  • Cannot be undone

Data Export: ✓ Export user data before deletion
```

---

## Security Configuration

### Two-Factor Authentication (2FA)

**Policy Options:**
```
Admin → Settings → Security → 2FA Policy

○ Optional (default)
  Users can enable 2FA voluntarily

○ Required for Admins
  All Admin/Super Admin roles must enable 2FA

● Required for All Users (recommended)
  All users must enable 2FA within 7 days

Grace Period: 7 days
Enforcement Date: [Auto-set to 7 days from now]
```

**Supported 2FA Methods:**
- ✓ TOTP (Google Authenticator, Authy, 1Password)
- ✓ SMS (requires phone verification)
- ✓ Email (backup method only)
- ✓ Hardware Keys (FIDO2/WebAuthn - Enterprise only)

**Recovery Codes:**
- 10 single-use codes generated on 2FA setup
- Users can regenerate at Settings → Security
- Admins can reset user 2FA: Admin → Users → Reset 2FA

### Password Policies

```
Admin → Settings → Security → Password Policy

Minimum Length: [12] characters (8-32)
Complexity Requirements:
  ✓ Require uppercase letter
  ✓ Require lowercase letter
  ✓ Require number
  ✓ Require special character (!@#$%^&*)

Password Expiration: [90] days (0 = never)
Password History: [5] (prevent reuse)
Max Login Attempts: [5] attempts
Account Lockout Duration: [30] minutes

Apply to:
  ✓ All users
  ✓ New users only
```

### Session Management

```
Admin → Settings → Security → Session Settings

Session Timeout: [60] minutes of inactivity
  Range: 1-480 minutes
  Recommended: 30-60 for high security, 120-240 for convenience

Remember Me:
  ✓ Allow "Remember Me" option on login
  Duration: [7] days (1-30)

Concurrent Sessions: [3] per user
  Recommended: 2-3 (desktop + mobile + tablet)
  ⚠️ Setting to 1 may inconvenience users

Force Re-auth for Sensitive Actions:
  ✓ Changing password
  ✓ Enabling 2FA
  ✓ Adding payment method
  ✓ Deleting account
  ✓ Exporting data
```

### IP Restrictions (Enterprise)

```
Admin → Settings → Security → IP Restrictions

Allow Login from:
  ○ Any IP address (default)
  ● Specific IP ranges only

Allowed IP Ranges:
  192.168.1.0/24    (Office network)
  10.0.0.0/8        (VPN)
  203.0.113.45      (Remote office)

Block suspicious IPs: ✓ (recommended)
Notify admins on blocked login: ✓
```

### Email Encryption

**At-Rest Encryption (Automatic):**
- All emails encrypted in database with AES-256-GCM
- Encryption keys rotated every 90 days
- Zero-knowledge architecture (Enterprise only)

**In-Transit Encryption (TLS):**
```
Admin → Settings → Email → TLS Settings

Require TLS 1.2+ for:
  ✓ Inbound email
  ✓ Outbound email
  ✓ SMTP connections

Certificate Pinning: ✓ (Enterprise)
```

**End-to-End Encryption (Enterprise):**
```
Admin → Settings → Email → E2E Encryption

S/MIME:
  ✓ Enable S/MIME support
  Upload Certificate: [Browse .p12 file]
  Password: ********

PGP/GPG:
  ✓ Enable PGP encryption
  Public Key: [Paste or upload]
  Auto-encrypt internal emails: ✓
```

---

## Monitoring & Analytics

### Usage Dashboard

**Access:** `Admin → Usage Analytics`

**Key Metrics at a Glance:**
```
┌─────────────────────────────────────────────────┐
│ Active Users (30 days)                    247   │
│ Emails Sent (30 days)                   12,543  │
│ Storage Used                         145GB/500GB│
│ API Calls (today)                       8,234   │
│ Current Plan                        Enterprise  │
└─────────────────────────────────────────────────┘
```

**Detailed Reports:**

#### User Activity Report
```
Filters:
  Date Range: [Last 30 days ▼]
  User: [All users ▼]
  Team: [All teams ▼]

Columns:
  • User Name
  • Last Login
  • Emails Sent
  • Emails Received
  • AI Features Used
  • Storage Used
  • Status (Active/Inactive)

Export: CSV | Excel | PDF
```

#### Email Volume Report
```
Breakdown by:
  • Day/Week/Month
  • User
  • Team
  • Email Account
  • Domain (internal vs. external)

Metrics:
  • Sent
  • Received
  • Failed
  • Bounced
  • Spam filtered
```

#### Feature Adoption Report
```
AI Features:
  • AI Compose: 1,234 uses (65% of users)
  • Voice Dictation: 456 uses (23% of users)
  • Email Summaries: 2,345 uses (89% of users)
  • Smart Reply: 567 uses (34% of users)

Collaboration:
  • Shared Mailboxes: 12 active
  • Team Calendars: 8 active
  • Contact Sharing: 156 shared contacts

Automation:
  • Email Rules: 234 active rules
  • Auto-Responses: 45 configured
  • Scheduled Emails: 89 scheduled
```

### Activity Logs

**Access:** `Admin → Activity Logs`

**Log Categories:**

```bash
# User Actions
Login, Logout, Email Sent, Email Deleted, Settings Changed,
Contact Created, Calendar Event Created, File Uploaded, etc.

# Admin Actions
User Invited, User Deleted, Role Changed, Team Created,
Settings Updated, Policy Changed, API Key Generated, etc.

# Security Events
Failed Login, 2FA Enabled, 2FA Failed, Password Changed,
Account Locked, Suspicious Activity, IP Blocked, etc.

# System Events
Sync Started, Sync Completed, Sync Failed, Webhook Received,
API Rate Limit Hit, Database Error, Integration Error, etc.
```

**Searching Logs:**
```
Filters:
  Date Range: [Last 7 days ▼]
  Category: [All ▼]
  User: [All users ▼]
  Action: [All actions ▼]
  IP Address: [Optional]
  Status: Success | Failure | All

Search: "user@company.com failed login"

Results:
┌──────────────────────────────────────────────────────┐
│ 2026-02-01 10:23:45 | USER_LOGIN_FAILED              │
│ User: john@company.com                               │
│ IP: 203.0.113.45                                     │
│ Reason: Invalid password                             │
│ Details: 3rd failed attempt                          │
└──────────────────────────────────────────────────────┘

Export Logs: CSV (for compliance/audit)
Retention: 90 days (Pro), 1 year (Enterprise)
```

### System Health Monitoring

**Access:** `Admin → System Health`

```
┌─────────────────────────────────────────────────┐
│ EMAIL SYNC STATUS                          ✓    │
│ Last sync: 2 minutes ago                        │
│ Pending emails: 0                               │
│ Failed syncs (24h): 0                           │
├─────────────────────────────────────────────────┤
│ API HEALTH                                 ✓    │
│ Nylas API: Operational                          │
│ Aurinko API: Operational                        │
│ OpenAI API: Operational                         │
│ Response time: 245ms (avg)                      │
├─────────────────────────────────────────────────┤
│ DATABASE PERFORMANCE                       ✓    │
│ Query time: 12ms (avg)                          │
│ Active connections: 23/100                      │
│ Slow queries (1h): 0                            │
├─────────────────────────────────────────────────┤
│ ERROR RATES                                ✓    │
│ 5xx errors (1h): 0                              │
│ Failed API calls (1h): 2 (0.03%)                │
│ Webhook failures (1h): 0                        │
├─────────────────────────────────────────────────┤
│ STORAGE                                    ⚠    │
│ Used: 145GB / 500GB (29%)                       │
│ Growth rate: ~3GB/week                          │
│ Projected full: 32 weeks                        │
└─────────────────────────────────────────────────┘

Configure Alerts: admin@company.com
  ✓ Email when error rate > 1%
  ✓ Email when storage > 80%
  ✓ Email when API down
  □ SMS alerts (Enterprise only)
```

### Alerts & Notifications

```
Admin → Settings → Notifications

Alert Recipients:
  • admin@company.com
  • it@company.com
  • Add recipient...

Alert Conditions:
  ✓ System down or degraded
  ✓ Error rate exceeds 1% (1 hour window)
  ✓ Storage exceeds 80%
  ✓ Failed login attempts > 10 (from same IP)
  ✓ User account locked
  ✓ API rate limit exceeded
  ✓ Unusual activity detected
  ✓ Billing issue (payment failed)

Notification Channels:
  ✓ Email (always enabled)
  □ SMS (Enterprise only)
  □ Slack webhook
  □ Microsoft Teams webhook
  □ PagerDuty integration
```

---

## Billing & Subscriptions

### Current Plan Overview

**Access:** `Admin → Billing`

```
┌─────────────────────────────────────────────────┐
│ CURRENT PLAN: Enterprise                        │
│ Billing Period: Monthly                         │
│ Next Billing Date: March 1, 2026                │
└─────────────────────────────────────────────────┘

Current Month Usage:
├── Users: 247 / Unlimited
├── Storage: 145GB / Unlimited
├── Emails Sent: 12,543 / Unlimited
├── API Calls: 1.2M / 5M included
└── AI Requests: 4,567 / 10K included

Estimated Cost This Month: $2,964.00
  Base plan: $2,470.00 (247 users × $10/user)
  Overages: $0.00
  Add-ons: $494.00
    ├── Additional storage: $0.00
    ├── SMS credits: $234.00 (2,340 SMS sent)
    └── Advanced AI features: $260.00

Billing Contact: billing@company.com
Payment Method: •••• 1234 (Visa) Exp: 03/2027
```

### Plan Comparison

| Feature | Free | Pro | Enterprise |
|---------|------|-----|-----------|
| **Users** | Up to 10 | Unlimited | Unlimited |
| **Email Accounts/User** | 3 | 10 | Unlimited |
| **Storage** | 10GB total | 100GB | Unlimited |
| **Emails/Month** | 1,000 | 50,000 | Unlimited |
| **API Calls/Month** | 1,000 | 100,000 | 5M included |
| **AI Features** | Basic (100/mo) | Advanced (1K/mo) | Premium (10K/mo) |
| **SMS** | - | 100 credits/mo | 500 credits/mo |
| **Support** | Community | Email (24h) | Phone 24/7 |
| **SLA** | - | 99.5% uptime | 99.9% uptime |
| **SSO** | - | - | ✓ SAML/OAuth |
| **Custom Branding** | - | - | ✓ |
| **Advanced Security** | - | - | ✓ |
| **Audit Logs** | 30 days | 90 days | 1 year |
| **Data Export** | Manual | Manual | Automated |
| **Priority Support** | - | - | ✓ |
| **Dedicated Account Manager** | - | - | ✓ |
| **Custom Integrations** | - | - | ✓ |
| **Training & Onboarding** | - | - | ✓ |
| **Price** | **Free** | **$12**/user/mo | **$10**/user/mo** |

\* Billed annually, add 20% for monthly billing

### Changing Plans

```
Admin → Billing → Change Plan

Upgrade: Immediate (prorated charge)
Downgrade: End of current billing period

Enterprise → Contact Sales:
  enterprise@easemail.com
  +1 (555) 123-4567

Volume Discounts:
  100-249 users: 10% off
  250-499 users: 15% off
  500+ users: 20% off + custom pricing
```

### Managing Payment

```
Admin → Billing → Payment Method

Update Credit Card:
  Card Number: [•••• •••• •••• 1234]
  Expiration: [MM/YY]
  CVV: [•••]
  ZIP: [12345]

Billing Address:
  Company Name: [Acme Corporation]
  Street: [123 Main St]
  City: [San Francisco]
  State: [CA]
  ZIP: [94102]
  Country: [United States]

Invoice Email: billing@company.com
  Additional Emails: cfo@company.com, ap@company.com

Payment Options:
  ● Credit Card (Visa, MC, Amex)
  ○ ACH (US only, Enterprise)
  ○ Wire Transfer (Enterprise, annual only)
  ○ Purchase Order (Enterprise, negotiated terms)
```

### Invoice History

```
Admin → Billing → Invoices

Invoices:
  2026-02-01 | $2,964.00 | Paid (Visa •••• 1234)   | [Download PDF]
  2026-01-01 | $2,847.00 | Paid (Visa •••• 1234)   | [Download PDF]
  2025-12-01 | $2,705.00 | Paid (Visa •••• 1234)   | [Download PDF]

Export All: CSV | Excel

Auto-email invoices to: billing@company.com
```

### Usage-Based Billing

**Overage Charges (when limits exceeded):**

```
Storage Overages:
  $0.10/GB/month over plan limit
  Example: 150GB used on 100GB plan = $5.00/month

SMS Overages:
  $0.10/SMS beyond included credits
  Pro: 100 included, $0.10 each after
  Enterprise: 500 included, $0.08 each after

AI Request Overages:
  $0.05/request beyond included
  Basic: 100 included
  Advanced: 1,000 included
  Premium: 10,000 included

API Call Overages:
  Free: $0.01 per 1,000 calls
  Pro: $0.005 per 1,000 calls
  Enterprise: $0.002 per 1,000 calls

View Current Usage:
  Admin → Billing → Usage Details
```

---

## Common Tasks

### Task 1: Onboard New Employee

```bash
# Step 1: Create User Account
Admin → Users → Invite User
  Email: newuser@company.com
  Role: User
  Team: [Select department]
  Send Welcome: ✓

# Step 2: Configure User Settings (Optional)
Admin → Users → newuser@company.com → Settings
  Email Signature: [Auto-populate from template]
  Default Calendar: [Team calendar]
  Email Rules: [Apply department rules]

# Step 3: Grant Access to Shared Resources
Admin → Teams → [Department] → Members → Add
  Select: newuser@company.com
  Permissions: Standard Member

# Step 4: Monitor First Login
Admin → Activity Logs
  Filter: newuser@company.com, Last 7 days
  ✓ Verify successful login
  ✓ Verify 2FA setup (if required)
```

### Task 2: Offboard Departing Employee

```bash
# Step 1: Suspend Account (Before Last Day)
Admin → Users → employee@company.com → Suspend
  Reason: Offboarding - last day [date]
  Notify: □ (don't notify user)
  Revoke sessions: ✓

# Step 2: Export User Data (For Compliance/Handover)
Admin → Data Export → Create Export
  User: employee@company.com
  Include:
    ✓ Emails (all folders)
    ✓ Contacts
    ✓ Calendar
    ✓ Drafts
  Format: MBOX + CSV
  → Download when ready (email notification)

# Step 3: Transfer Ownership
Admin → Users → employee@company.com
  Shared Mailboxes: Transfer to [manager]
  Team Ownership: Transfer to [manager]
  Calendar Events: Transfer to [manager]
  Email Forwarding:
    ✓ Forward to manager@company.com
    Duration: 30 days

# Step 4: Delete Account (After 30-90 days)
Admin → Users → employee@company.com → Delete
  ⚠️ Permanent deletion
  Confirm: employee@company.com
  → Account deleted, all data removed
```

### Task 3: Create Shared Mailbox

```bash
# Step 1: Create Shared Mailbox
Admin → Teams → Shared Mailboxes → Create
  Email: support@company.com
  Display Name: Customer Support
  Description: Customer support inquiries
  Team: Support Team

# Step 2: Add Members
Shared Mailboxes → support@company.com → Members → Add
  Members:
    • john@company.com (Full Access)
    • jane@company.com (Full Access)
    • bob@company.com (Send Only)

# Step 3: Configure Auto-Responses
Settings → Auto-Reply
  Enable: ✓
  Message: "Thank you for contacting support.
           We'll respond within 24 hours."
  Business Hours Only: ✓ (Mon-Fri, 9am-5pm)

# Step 4: Setup Email Rules
Settings → Rules → Create Rule
  Name: Tag Support Requests
  Condition: Subject contains "support", "help", "issue"
  Action: Add label "Support Request"
```

### Task 4: Setup Single Sign-On (SSO)

```bash
# Step 1: Configure SSO in EaseMail
Admin → Settings → SSO → Enable

Provider: [Okta / Azure AD / Google / Custom SAML]

# For SAML 2.0:
SSO URL: https://your-idp.com/sso/saml
Entity ID: https://your-idp.com/entity
X.509 Certificate: [Paste certificate]

# EaseMail provides:
ACS URL: https://app.easemail.com/auth/sso/callback
SP Entity ID: https://app.easemail.com
Metadata URL: https://app.easemail.com/auth/sso/metadata

# Step 2: Configure Attribute Mapping
Email: email (required)
First Name: firstName
Last Name: lastName
Role: groups (map to: user, admin)
Department: department → Team

# Step 3: Test SSO
Test User: testuser@company.com
→ Click "Test SSO Connection"
→ Login via SSO
→ Verify attribute mapping
→ Verify user created correctly

# Step 4: Enable for Organization
SSO Settings:
  ✓ Enable SSO for login
  ✓ Auto-create users on first login
  Default Role: User
  Require SSO: ○ Optional | ● Required
  → Save Settings

# Step 5: Migrate Existing Users
Admin → Users → Enable SSO for All Users
  ⚠️ Users will be required to login via SSO
  Send notification: ✓
```

### Task 5: Configure Email Routing Rules

```bash
# Scenario: Route all billing@ emails to Finance team

Admin → Settings → Email Rules → Create Organization Rule

Name: Route Billing Emails
Priority: High

Conditions:
  To: contains "billing@company.com"
  OR To: contains "invoices@company.com"

Actions:
  ✓ Forward to: finance-team@company.com
  ✓ Add label: "Finance - Billing"
  ✓ Mark as important
  □ Auto-reply

Apply to:
  ● All users
  ○ Specific teams: [Select]

Save & Activate
```

### Task 6: Generate API Key for Integration

```bash
# Step 1: Create API Key
Admin → API Keys → Generate New Key

Name: Salesforce Integration
Description: Sync contacts between Salesforce and EaseMail
Key Type: Service Account

Permissions:
  ✓ Read contacts
  ✓ Write contacts
  ✓ Read emails
  □ Send emails
  □ Manage users

Rate Limits:
  Requests per minute: 100
  Requests per day: 50,000

IP Whitelist (optional):
  203.0.113.0/24 (Office network)
  198.51.100.45 (Salesforce server)

Generate Key
→ API Key: sk_live_xxxxxxxxxxxxxxxx
⚠️ Copy now - won't be shown again

# Step 2: Configure in Salesforce
Salesforce → Setup → External Services
  URL: https://api.easemail.com/v1
  Auth: API Key (Bearer Token)
  Key: sk_live_xxxxxxxxxxxxxxxx

# Step 3: Monitor Usage
Admin → API Keys → [Key] → Usage Stats
  Last 24 hours: 12,345 requests
  Error rate: 0.2%
  Avg response time: 234ms
```

### Task 7: Setup Automated Data Backups

```bash
# Step 1: Configure Backup Schedule
Admin → Data Export → Automated Backups

Schedule:
  Frequency: ● Weekly | ○ Monthly
  Day: Sunday
  Time: 02:00 AM EST

Include:
  ✓ All emails (incremental)
  ✓ Contacts
  ✓ Calendar events
  ✓ User settings
  ✓ Email rules
  □ Activity logs

Format: MBOX + JSON

Storage:
  ● EaseMail Cloud (encrypted, 90-day retention)
  ○ AWS S3 Bucket (provide credentials)
  ○ Google Cloud Storage
  ○ Azure Blob Storage

Notifications:
  Email when complete: backup-admin@company.com
  Email on failure: ✓

# Step 2: Test Backup & Restore
Backups → [Latest] → Test Restore
  Test User: testbackup@company.com
  ✓ Verify email restoration
  ✓ Verify contact restoration
  ✓ Delete test user
```

---

## Troubleshooting

### Issue 1: Users Can't Login

**Symptoms:**
- "Invalid credentials" error
- Account locked message
- 2FA code not working

**Diagnostic Steps:**
```bash
1. Check account status:
   Admin → Users → Search user
   Status: Active? Suspended? Deleted?

2. Review activity logs:
   Admin → Activity Logs
   Filter: User + "login" + Last 24 hours
   Look for: Failed login attempts, account lockout

3. Verify 2FA status:
   If "2FA code invalid":
     Admin → Users → [User] → Reset 2FA
     → User must re-setup 2FA

4. Check password policy:
   If password recently changed:
     Admin → Settings → Security
     Verify policy requirements met

5. IP restrictions:
   Admin → Settings → Security → IP Restrictions
   Verify user's IP is allowed
```

**Solutions:**
```bash
# Unlock account:
Admin → Users → [User] → Unlock Account

# Reset password:
Admin → Users → [User] → Reset Password
→ Email reset link to user

# Reset 2FA:
Admin → Users → [User] → Reset 2FA
→ User must setup again on next login

# Temporarily disable IP restrictions:
Admin → Settings → Security → IP Restrictions
→ Temporarily disable for troubleshooting
```

### Issue 2: Emails Not Syncing

**Symptoms:**
- New emails not appearing
- Sent emails not showing in Sent folder
- "Sync failed" errors

**Diagnostic Steps:**
```bash
1. Check sync status:
   Admin → System Health
   Email Sync Status: Look for errors

2. Check user's email account:
   Admin → Users → [User] → Email Accounts
   Status: Connected? Expired? Error?

3. Review sync logs:
   Admin → Activity Logs
   Filter: "sync" + Last 1 hour
   Look for: sync_failed, auth_expired, api_error

4. Test email provider connection:
   Admin → System Health → API Health
   Nylas API: Operational?
   User-specific: Admin → Users → [User] → Test Connection
```

**Solutions:**
```bash
# Reconnect email account:
User: Settings → Accounts → [Account] → Reconnect
Or Admin: Admin → Users → [User] → Accounts → Reconnect

# Force manual sync:
Admin → Users → [User] → Force Sync
→ Syncs last 7 days of emails

# Clear sync cache:
Admin → System → Clear User Cache
User: user@company.com
→ Removes cached data, forces fresh sync

# Check OAuth token:
Admin → Users → [User] → Email Accounts → [Account]
OAuth Status: Expired?
→ Click "Refresh Token"

# Last resort - Remove and re-add account:
User: Settings → Accounts → [Account] → Remove
→ Settings → Accounts → Add Account → [Reconnect]
```

### Issue 3: High Storage Usage

**Symptoms:**
- Approaching or exceeded storage limit
- Slow performance
- "Storage full" warnings

**Diagnostic Steps:**
```bash
1. Check org-wide usage:
   Admin → Billing
   Storage: XXX GB / YYY GB (ZZ%)

2. Identify top users:
   Admin → Usage Analytics → Storage Report
   Sort by: Storage Used (descending)

3. Check for large attachments:
   Admin → Usage Analytics → Attachments
   Filter: Size > 10 MB

4. Review retention policies:
   Admin → Settings → Data Retention
   Are old emails being cleaned up?
```

**Solutions:**
```bash
# Implement retention policy:
Admin → Settings → Data Retention
  Trash: Delete after 30 days
  Deleted items: Permanent delete after 30 days
  Old emails: Archive after 1 year

# Ask top users to clean up:
Admin → Users → [Top Users] → Email
  Subject: "Storage Usage Notice"
  Message: "Please delete unnecessary emails/attachments"

# Upgrade plan:
Admin → Billing → Upgrade Plan
  Consider: Higher storage tier

# Enable attachment compression (Enterprise):
Admin → Settings → Storage → Optimize
  ✓ Compress attachments (lossless)
  ✓ Deduplicate identical attachments
  Estimated savings: XX GB
```

### Issue 4: API Rate Limit Exceeded

**Symptoms:**
- "429 Too Many Requests" errors
- Integration failing
- API calls being throttled

**Diagnostic Steps:**
```bash
1. Check API usage:
   Admin → API Keys
   View usage for each key

2. Review rate limits:
   Admin → API Keys → [Key] → Rate Limits
   Current: XXX requests/min
   Limit: YYY requests/min

3. Identify source:
   Admin → Activity Logs → API Calls
   Filter: Last 1 hour, Status: 429
   Look for: Which endpoint, which key

4. Check integration code:
   Review integration logs
   Are there unnecessary repeated calls?
   Is there proper error handling/backoff?
```

**Solutions:**
```bash
# Increase rate limit:
Admin → API Keys → [Key] → Edit
  Requests per minute: [Increase]
  Requests per day: [Increase]
  → Save

# Implement caching in integration:
Review integration code:
  - Cache frequently requested data
  - Use webhooks instead of polling
  - Implement exponential backoff on 429 errors

# Upgrade plan:
Admin → Billing → Upgrade
  Higher plans have higher rate limits

# Create separate API keys:
Admin → API Keys → Generate New Key
  Distribute load across multiple keys
  Different keys for different integrations
```

### Issue 5: SSO Not Working

**Symptoms:**
- "SSO authentication failed"
- Infinite redirect loop
- Users can't login via SSO

**Diagnostic Steps:**
```bash
1. Test SSO connection:
   Admin → Settings → SSO → Test Connection
   → Look for specific error message

2. Verify configuration:
   Admin → Settings → SSO → View Configuration
   Check:
     • SSO URL correct?
     • Entity ID correct?
     • Certificate valid (not expired)?

3. Check attribute mapping:
   Admin → Activity Logs → SSO Events
   Filter: Last 1 hour
   Look for: Attribute mapping errors

4. Verify in IdP (Okta/Azure AD):
   - Is EaseMail app assigned to user?
   - Are correct attributes being sent?
   - Check IdP logs for errors
```

**Solutions:**
```bash
# Update SSO certificate:
Admin → Settings → SSO → Update Certificate
  → Paste new X.509 certificate
  → Save

# Fix attribute mapping:
Admin → Settings → SSO → Attribute Mapping
  Verify:
    Email → email
    First Name → firstName
    Last Name → lastName
    Groups → role (mapped to user/admin)

# Allow password fallback (temporary):
Admin → Settings → SSO
  □ Require SSO (temporarily disable)
  ✓ Allow password login as fallback
  → Users can login with password while fixing SSO

# Clear SSO cache:
Admin → Settings → SSO → Clear Cache
  → Forces fresh authentication

# Contact support:
Enterprise customers: Call support
Email: enterprise@easemail.com
Include: SSO configuration, error messages, logs
```

---

## Command Reference

### Admin Dashboard Keyboard Shortcuts

```
Navigation:
  g + d     Go to Dashboard
  g + u     Go to Users
  g + a     Go to Analytics
  g + b     Go to Billing
  g + s     Go to Settings
  g + l     Go to Activity Logs

User Management:
  n         Invite new user
  /         Search users
  s         Toggle user suspend/active

Tables:
  j / k     Navigate rows up/down
  ↵         Open selected item
  Esc       Close modal/dialog

Global:
  ?         Show keyboard shortcuts
  Ctrl + K  Command palette (quick access)
```

### API Endpoints Quick Reference

**Base URL:** `https://api.easemail.com/v1`

```bash
# Authentication
POST   /auth/token          # Get API token
POST   /auth/refresh        # Refresh token

# Users
GET    /users               # List all users
POST   /users               # Create user
GET    /users/:id           # Get user details
PATCH  /users/:id           # Update user
DELETE /users/:id           # Delete user

# Organizations
GET    /organizations       # List organizations
POST   /organizations       # Create organization
GET    /organizations/:id   # Get organization
PATCH  /organizations/:id   # Update organization

# Email Accounts
GET    /email-accounts      # List email accounts
POST   /email-accounts      # Connect email account
DELETE /email-accounts/:id  # Disconnect account

# Emails
GET    /emails              # List emails
GET    /emails/:id          # Get email details
POST   /emails              # Send email
DELETE /emails/:id          # Delete email

# Contacts
GET    /contacts            # List contacts
POST   /contacts            # Create contact
PATCH  /contacts/:id        # Update contact
DELETE /contacts/:id        # Delete contact

# Analytics
GET    /analytics/usage     # Get usage stats
GET    /analytics/users     # Get user activity
GET    /analytics/storage   # Get storage stats

# Health
GET    /health              # API health status
GET    /health/database     # Database status
```

### CSV Import Format

**Users Import (`users.csv`):**
```csv
email,first_name,last_name,role,team,department
john@company.com,John,Doe,user,Sales,Sales West
jane@company.com,Jane,Smith,manager,Engineering,Backend
admin@company.com,Admin,User,admin,,IT
```

**Contacts Import (`contacts.csv`):**
```csv
email,first_name,last_name,company,phone,title,tags
client@example.com,John,Client,"Acme Corp",555-1234,CEO,"vip,client"
vendor@example.com,Jane,Vendor,"Vendor Co",555-5678,Sales,"vendor"
```

**Email Rules Import (`rules.csv`):**
```csv
name,condition_field,condition_operator,condition_value,action_type,action_value,priority
Route Support,to,contains,support@company.com,forward,support-team@company.com,high
Tag Urgent,subject,contains,URGENT,add_label,urgent,high
Auto Reply OOO,from,equals,boss@company.com,auto_reply,"Out of office",medium
```

---

## API Integration

### Authentication

```bash
# Get API Key
Admin → API Keys → Generate New Key
→ Copy: sk_live_xxxxxxxxxxxxxxxx

# Use in requests:
curl https://api.easemail.com/v1/users \
  -H "Authorization: Bearer sk_live_xxxxxxxxxxxxxxxx"
```

### Common Integration Examples

#### Example 1: Sync Users from Active Directory

```python
import requests

API_KEY = "sk_live_xxxxxxxxxxxxxxxx"
API_URL = "https://api.easemail.com/v1"

def sync_ad_users(ad_users):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    for ad_user in ad_users:
        data = {
            "email": ad_user['email'],
            "first_name": ad_user['first_name'],
            "last_name": ad_user['last_name'],
            "role": "user",
            "team": ad_user['department']
        }

        response = requests.post(
            f"{API_URL}/users",
            headers=headers,
            json=data
        )

        if response.status_code == 201:
            print(f"✓ Created user: {data['email']}")
        else:
            print(f"✗ Failed to create {data['email']}: {response.text}")

# Run daily via cron job
```

#### Example 2: Monitor Failed Logins

```python
import requests
from datetime import datetime, timedelta

API_KEY = "sk_live_xxxxxxxxxxxxxxxx"
API_URL = "https://api.easemail.com/v1"
ALERT_THRESHOLD = 5  # Alert if > 5 failed logins in 1 hour

def check_failed_logins():
    headers = {"Authorization": f"Bearer {API_KEY}"}

    # Get activity logs from last hour
    one_hour_ago = (datetime.now() - timedelta(hours=1)).isoformat()

    response = requests.get(
        f"{API_URL}/activity-logs",
        headers=headers,
        params={
            "category": "security",
            "action": "login_failed",
            "since": one_hour_ago
        }
    )

    logs = response.json()['logs']

    # Group by IP address
    failed_by_ip = {}
    for log in logs:
        ip = log['ip_address']
        failed_by_ip[ip] = failed_by_ip.get(ip, 0) + 1

    # Alert on suspicious IPs
    for ip, count in failed_by_ip.items():
        if count >= ALERT_THRESHOLD:
            send_alert(f"⚠️ {count} failed logins from {ip} in last hour")

            # Optionally block IP
            requests.post(
                f"{API_URL}/security/block-ip",
                headers=headers,
                json={"ip": ip, "reason": "Multiple failed logins"}
            )

def send_alert(message):
    # Send to Slack, email, etc.
    print(message)

# Run every 15 minutes via cron
```

#### Example 3: Automated Usage Reporting

```python
import requests
import pandas as pd
from datetime import datetime

API_KEY = "sk_live_xxxxxxxxxxxxxxxx"
API_URL = "https://api.easemail.com/v1"

def generate_monthly_report():
    headers = {"Authorization": f"Bearer {API_KEY}"}

    # Get usage stats
    response = requests.get(
        f"{API_URL}/analytics/usage",
        headers=headers,
        params={"period": "last_30_days"}
    )

    usage = response.json()

    # Get user activity
    response = requests.get(
        f"{API_URL}/analytics/users",
        headers=headers
    )

    users = response.json()['users']

    # Create DataFrame
    df = pd.DataFrame(users)

    # Calculate metrics
    total_users = len(df)
    active_users = len(df[df['last_login'] >= one_month_ago])
    total_emails_sent = df['emails_sent'].sum()
    total_storage = df['storage_used_gb'].sum()

    # Generate report
    report = f"""
    EaseMail Monthly Usage Report
    Generated: {datetime.now().strftime('%Y-%m-%d')}

    Overview:
    - Total Users: {total_users}
    - Active Users (30d): {active_users} ({active_users/total_users*100:.1f}%)
    - Emails Sent: {total_emails_sent:,}
    - Storage Used: {total_storage:.1f} GB

    Top 10 Users by Email Sent:
    {df.nlargest(10, 'emails_sent')[['email', 'emails_sent']].to_string()}

    Top 10 Users by Storage:
    {df.nlargest(10, 'storage_used_gb')[['email', 'storage_used_gb']].to_string()}
    """

    # Email report to stakeholders
    send_report_email(report)

# Run on 1st of each month via cron
```

### Webhooks

**Configure webhooks to receive real-time events:**

```bash
Admin → Settings → Webhooks → Add Endpoint

Webhook URL: https://your-app.com/webhooks/easemail
Secret: [Generated automatically]

Events:
  ✓ user.created
  ✓ user.deleted
  ✓ email.received
  ✓ email.sent
  ✓ email.failed
  □ calendar.event_created
```

**Webhook payload example:**

```json
{
  "event": "user.created",
  "timestamp": "2026-02-01T12:34:56Z",
  "data": {
    "user_id": "uuid-here",
    "email": "newuser@company.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "user",
    "team": "Sales"
  },
  "signature": "sha256-signature-here"
}
```

**Verify webhook signature (Python):**

```python
import hmac
import hashlib

def verify_webhook(payload, signature, secret):
    computed = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(computed, signature)

# In your webhook handler:
if verify_webhook(request.body, request.headers['X-Signature'], WEBHOOK_SECRET):
    # Process webhook
    pass
else:
    # Reject invalid signature
    return 403
```

---

## Support & Resources

### Contact Support

**Community Support (Free Plan):**
- Forum: community.easemail.com
- GitHub: github.com/easemail/issues

**Email Support (Pro Plan):**
- support@easemail.com
- Response time: Within 24 hours (business days)

**Priority Support (Enterprise Plan):**
- Phone: +1 (555) 123-4567 (24/7)
- Email: enterprise@easemail.com (2-hour response)
- Dedicated Slack channel
- Assigned account manager

### Documentation

- **Help Center:** app.easemail.com/help
- **API Documentation:** api.easemail.com/docs
- **Developer Portal:** developers.easemail.com
- **Status Page:** status.easemail.com
- **Security:** easemail.com/security

### Training & Onboarding

**Enterprise Customers:**
- Initial onboarding session (2 hours)
- Admin training (4 hours)
- Custom training available
- Quarterly business reviews

**Self-Service:**
- Video tutorials: youtube.com/easemail
- Webinars: easemail.com/webinars
- Knowledge base: help.easemail.com

---

## Appendix

### Glossary

| Term | Definition |
|------|------------|
| **2FA** | Two-Factor Authentication - additional login security |
| **API** | Application Programming Interface - for integrations |
| **AES-256-GCM** | Advanced encryption standard for email security |
| **DKIM** | DomainKeys Identified Mail - email authentication |
| **DMARC** | Domain-based Message Authentication - email policy |
| **E2E** | End-to-End Encryption |
| **IdP** | Identity Provider (for SSO) |
| **MBOX** | Email archive format |
| **OAuth** | Authorization protocol for email providers |
| **RLS** | Row Level Security - database security feature |
| **SAML** | Security Assertion Markup Language (for SSO) |
| **SPF** | Sender Policy Framework - email authentication |
| **SSO** | Single Sign-On - unified authentication |
| **TLS** | Transport Layer Security - encryption protocol |

### Compliance & Certifications

- **SOC 2 Type II** (in progress)
- **GDPR Compliant**
- **CCPA Compliant**
- **HIPAA Available** (Enterprise with BAA)
- **ISO 27001** (in progress)

### Data Centers & Regions

**Available Regions:**
- US East (Virginia) - Primary
- US West (California)
- EU (Ireland) - GDPR
- Asia Pacific (Singapore)

**Data Residency:**
Enterprise customers can choose data region for compliance

---

**Document Version:** 1.0
**Last Updated:** February 1, 2026
**Next Review:** May 1, 2026

For the latest version of this document, visit: https://docs.easemail.com/it-admin-guide

---

**© 2026 EaseMail. All rights reserved.**
