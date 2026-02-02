# Admin Back Office - Complete Guide
**How the Entire Admin System Works**
**For:** tdaniel@botmakers.ai (Platform Admin)

---

## Quick Overview

The admin back office is your **mission control** for the entire EaseMail platform. It's a separate section of the app where you can:

- Manage all users and organizations
- Configure system settings
- View analytics and reports
- Manage billing and pricing
- Monitor system health

---

## How to Access

### URL
```
http://localhost:3001/admin
(Production: https://your-domain.com/admin)
```

### Access Control
- **Protected:** Only users with `role = 'platform_admin'` can access
- **Automatic redirect:** Non-admins are redirected to `/inbox?error=unauthorized`
- **Layout wrapper:** `app/(dashboard)/admin/layout.tsx` checks authentication

```typescript
// Security check on every admin page load
if (dbUser.role !== 'platform_admin') {
  redirect('/inbox?error=unauthorized');
}
```

---

## Admin Interface Layout

```
┌────────────────────────────────────────────────────┐
│  Sidebar (Desktop) or Menu (Mobile)               │
├────────────────────────────────────────────────────┤
│                                                    │
│  📊 Dashboard              Main Content Area      │
│  👥 User Management        ─────────────────      │
│  🏢 Organizations          Your page content      │
│  💰 Pricing & Billing      displays here with     │
│  📈 Usage Analytics        real-time data         │
│  💳 Billing Config                                │
│  📧 Email Templates                               │
│  📋 Activity Logs                                 │
│  🔑 API Keys                                      │
│  ⚙️  System Settings                              │
│                                                    │
│  ← Back to Inbox                                  │
│  ─────────────────                                │
│  [Your Email] 🚪                                  │
└────────────────────────────────────────────────────┘
```

### Navigation Items

The sidebar shows 10 main sections:

1. **Dashboard** - Overview & stats
2. **User Management** - All users
3. **Organizations** - Team accounts
4. **Pricing & Billing** - Plans & pricing
5. **Usage Analytics** - Platform analytics
6. **Billing Config** - Billing automation
7. **Email Templates** - System emails
8. **Activity Logs** - Audit trail
9. **API Keys** - Integration credentials
10. **System Settings** - System config

---

## Section-by-Section Breakdown

### 1. 📊 Dashboard (`/admin`)

**What it shows:**
- **Real-time stats** (auto-refreshes every 60 seconds):
  - Total Users
  - Email Accounts Connected
  - Total Emails Synced
  - Total Contacts
- **Quick action cards** linking to major sections

**API Endpoint:** `GET /api/admin/stats`

**What you can do:**
- View system health at a glance
- Click cards to navigate to detailed sections
- Refresh stats manually with "Refresh Now" button

**Use case:**
- Daily check-in: "How's the platform doing?"
- Monitor growth metrics
- Quickly access most common admin tasks

---

### 2. 👥 User Management (`/admin/users`)

**What it shows:**
- **List of ALL users** across all organizations
- Search/filter users
- User status (active, suspended, deactivated)
- Organization membership
- Last login time
- Account creation date

**What you can do:**

#### Create Users
- **Individual users** (no organization)
- **Organization users** (part of a team)
- System generates credentials
- Sends email with temp password
- Forces password change on first login

#### Manage Existing Users
- **View details** - Click user to see full profile
- **Reset password** - Generate new temp password
- **Suspend/unsuspend** - Block/unblock access
- **Delete user** - Permanent removal
- **Resend invitation** - If they didn't get email
- **View activity logs** - See what they've been doing
- **View usage** - See their API/feature usage
- **Impersonate** - Login as that user (for support)

#### User Detail Page (`/admin/users/[userId]`)
Shows:
- Basic info (name, email, role)
- Organization membership
- Connected email accounts
- Recent activity
- Usage statistics
- Admin actions (reset, suspend, delete)

**API Endpoints:**
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create user
- `GET /api/admin/users/[userId]` - Get user details
- `PATCH /api/admin/users/[userId]` - Update user
- `DELETE /api/admin/users/[userId]` - Delete user
- `POST /api/admin/users/[userId]/reset-password` - Reset password
- `POST /api/admin/users/[userId]/resend-invitation` - Resend email
- `GET /api/admin/users/[userId]/activity` - Activity logs
- `GET /api/admin/users/[userId]/usage` - Usage stats
- `POST /api/admin/users/[userId]/impersonate` - Impersonate user

**Use cases:**
- "Create an account for this new customer"
- "Their password isn't working - reset it"
- "This user is causing problems - suspend them"
- "Show me what this user has been doing"

---

### 3. 🏢 Organizations (`/admin/organizations`)

**What it shows:**
- **List of all organizations** (companies/teams)
- Organization name, slug, plan type
- Current seats / max seats
- Active status
- Member count
- Creation date

**What you can do:**

#### Create Organizations
- Click "Create Organization"
- Enter:
  - Name (e.g., "Acme Corporation")
  - Slug (URL-friendly, e.g., "acme-corp")
  - Billing email
  - Plan type (free, team, enterprise)
  - Max seats (user limit)

#### Manage Organizations
- **View details** - See org settings
- **Edit settings** - Change name, plan, seats
- **View members** - See all users in org
- **Add users** - Create users for this org
- **Delete organization** - Remove org (careful!)

#### Add Users to Organizations
When viewing an organization:
1. Click "Add User"
2. Enter email, name
3. **Select role:**
   - **Owner** - Full control (billing, settings, users)
   - **Admin** - Full control
   - **User Admin** ⭐ - Can manage users only
   - **Member** - Standard user
4. User receives credentials email

**Organization Member View:**
Shows each user with:
- Name and email
- Role badge (color-coded)
- Join date
- Active status

**API Endpoints:**
- `GET /api/admin/organizations` - List all orgs
- `POST /api/admin/organizations` - Create org
- `GET /api/admin/organizations/[orgId]` - Get org details
- `PATCH /api/admin/organizations/[orgId]` - Update org
- `DELETE /api/admin/organizations/[orgId]` - Delete org
- `GET /api/admin/organizations/[orgId]/members` - List members
- `POST /api/admin/organizations/[orgId]/users` - Add user to org
- `GET /api/admin/organizations/[orgId]/ai-usage` - AI usage stats

**Use cases:**
- "Onboard a new company with 50 employees"
- "Increase their seat limit - they're growing"
- "Show me all members of this organization"
- "Remove this company from the system"

---

### 4. 💰 Pricing & Billing (`/admin/pricing`)

**What it manages:**
- **Pricing plans** (Free, Starter, Pro, Enterprise)
- **Pricing tiers** (usage-based pricing levels)
- **Feature limits** (what each plan includes)
- **Usage pricing** (cost per email, AI request, etc.)
- **Overrides** (custom pricing for specific users/orgs)

**What you can do:**

#### Manage Plans
- Create/edit pricing plans
- Set monthly/annual prices
- Define included features
- Set usage limits
- Enable/disable plans

#### Configure Usage Pricing
- Cost per email sent
- Cost per AI request
- Cost per SMS
- Cost per storage GB
- Tiered pricing (volume discounts)

#### Apply Overrides
- Give specific users custom pricing
- Waive fees for beta users
- Set promotional pricing
- Override feature limits

**API Endpoints:**
- `GET /api/admin/pricing/plans` - List all plans
- `POST /api/admin/pricing/plans` - Create plan
- `GET /api/admin/pricing/plans/[planId]` - Get plan
- `PATCH /api/admin/pricing/plans/[planId]` - Update plan
- `DELETE /api/admin/pricing/plans/[planId]` - Delete plan
- `GET /api/admin/pricing/tiers` - Pricing tiers
- `GET /api/admin/pricing/usage` - Usage pricing config
- `GET /api/admin/pricing/overrides` - Custom overrides
- `POST /api/admin/pricing/overrides` - Create override
- `GET /api/admin/pricing/feature-limits` - Feature limits

**Use cases:**
- "Set up a new Enterprise plan at $99/month"
- "Give this beta user free access for 6 months"
- "Configure volume discounts for emails"
- "See what features each plan includes"

---

### 5. 📈 Usage Analytics (`/admin/usage-analytics`)

**What it shows:**
- **Platform-wide usage metrics:**
  - Total emails sent/received
  - AI requests (summaries, replies, etc.)
  - SMS messages sent
  - Storage usage
  - API calls
- **Trends over time** (daily, weekly, monthly)
- **Per-user breakdown**
- **Per-organization breakdown**
- **Cost tracking**

**What you can do:**
- View usage trends
- Identify heavy users
- Monitor costs
- Export reports
- Spot anomalies (sudden spikes)

**API Endpoints:**
- `GET /api/admin/usage` - Overall usage stats
- `GET /api/admin/usage/trends` - Trends over time
- `GET /api/admin/usage/users` - Per-user usage

**Use cases:**
- "Which users are sending the most emails?"
- "Are we seeing growth in AI feature usage?"
- "What's our monthly cost projection?"
- "Is anyone abusing the system?"

---

### 6. 💳 Billing Config (`/admin/billing-config`)

**What it manages:**
- **Automated billing settings**
- **Payment processing config**
- **Invoice generation**
- **Billing cycles**
- **Dunning (failed payment handling)**

**What you can do:**

#### Configure Billing Automation
- Set billing frequency (monthly/annual)
- Configure invoice generation
- Set up payment retry logic
- Define grace periods
- Configure suspension rules

#### Process Billing
- Run manual billing for all users
- Retry failed payments
- View pending charges
- Generate financial reports
- Export billing data

#### View Billing History
- All processed invoices
- Payment successes/failures
- Refunds and credits
- Revenue reports

**API Endpoints:**
- `GET /api/admin/billing/config` - Get billing config
- `POST /api/admin/billing/config` - Update config
- `POST /api/admin/billing/process` - Run billing
- `POST /api/admin/billing/retry` - Retry failed payments
- `GET /api/admin/billing/pending` - Pending charges
- `GET /api/admin/billing/history` - Billing history
- `GET /api/admin/billing/expenses` - Expense tracking
- `GET /api/admin/billing/financial-report` - Financial reports

**Use cases:**
- "Run end-of-month billing for all customers"
- "Retry this failed payment"
- "Show me this month's revenue"
- "Configure 7-day grace period for failed payments"

---

### 7. 📧 Email Templates (`/admin/email-templates`)

**What it manages:**
- **System email templates** that get sent to users:
  - Welcome emails
  - Password reset
  - Invitation emails
  - New user credentials
  - Billing notifications
  - Usage alerts
  - Team invitations

**What you can do:**

#### Edit Templates
- Customize email subject lines
- Edit email body (HTML + text)
- Use variables ({{userName}}, {{loginUrl}}, etc.)
- Preview before saving
- Test send to yourself

#### Template Variables
Common variables available:
- `{{recipientName}}` - User's name
- `{{recipientEmail}}` - User's email
- `{{organizationName}}` - Org name
- `{{loginUrl}}` - Login link
- `{{tempPassword}}` - Temporary password
- `{{resetLink}}` - Password reset link
- `{{expiryDays}}` - Days until expiry

**API Endpoints:**
- `GET /api/admin/email-templates` - List templates
- `GET /api/admin/email-templates/[templateId]` - Get template
- `PATCH /api/admin/email-templates/[templateId]` - Update template
- `POST /api/admin/email-templates/[templateId]/test` - Send test

**Use cases:**
- "Customize the welcome email with our branding"
- "Add a new variable to password reset emails"
- "Test the invitation email before sending"
- "Update the billing notification template"

---

### 8. 📋 Activity Logs (`/admin/activity-logs`)

**What it shows:**
- **Audit trail of all admin actions:**
  - User created
  - User deleted
  - Password reset
  - Suspension
  - Role changes
  - Organization created/deleted
  - Settings changed
  - Billing processed
- **Who did what, when**
- **IP address and user agent**

**What you can do:**
- Filter by action type
- Filter by user
- Filter by date range
- Search logs
- Export logs (CSV)
- View detailed log entries

**Log Entry Details:**
- Action performed
- Performed by (admin)
- Target user/org
- Timestamp
- IP address
- User agent (browser)
- Additional details (JSON)

**API Endpoints:**
- `GET /api/admin/activity-logs` - List logs
- `GET /api/admin/activity-logs/export` - Export CSV

**Use cases:**
- "Who deleted this user?"
- "Show me all password resets this month"
- "What did I do yesterday?"
- "Audit trail for compliance"

---

### 9. 🔑 API Keys (`/admin/api-keys`)

**What it manages:**
- **Integration credentials** for external services:
  - Nylas (email sync)
  - Twilio (SMS)
  - Resend (email sending)
  - OpenAI (AI features)
  - Stripe (payments)
  - And more...

**What you can do:**

#### Configure API Keys
- Add new service credentials
- Update existing keys
- Remove old keys
- Test connections
- View usage per service

#### Supported Services
- **Email sync:** Nylas, Microsoft Graph, Google
- **Email sending:** Resend, SendGrid, Mailgun
- **SMS:** Twilio
- **AI:** OpenAI, Anthropic Claude
- **Payments:** Stripe, PayPal
- **Analytics:** Mixpanel, Segment
- **Monitoring:** Sentry

**API Endpoints:**
- `GET /api/admin/api-keys` - List configured services
- `POST /api/admin/api-keys` - Add/update API key
- `DELETE /api/admin/api-keys/[keyId]` - Remove key

**Use cases:**
- "Add our Twilio credentials for SMS"
- "Update the Stripe API key"
- "Test if Nylas connection works"
- "Remove old SendGrid key"

---

### 10. ⚙️ System Settings (`/admin/settings`)

**What it manages:**
- **Global system configuration:**
  - Application name
  - Default settings
  - Feature flags
  - Maintenance mode
  - System limits
  - Security settings

**What you can do:**

#### Configure System Defaults
- Default user settings
- Default organization settings
- Email sync intervals
- Rate limits
- Storage quotas

#### Feature Flags
- Enable/disable features globally
- Beta feature access
- Experimental features
- A/B test configurations

#### System Maintenance
- Enable maintenance mode
- Display system messages
- Configure downtime notifications

**API Endpoints:**
- `GET /api/admin/settings` - Get all settings
- `PATCH /api/admin/settings` - Update settings

**Use cases:**
- "Enable the new AI feature for everyone"
- "Put the system in maintenance mode"
- "Change the default sync interval"
- "Increase rate limits"

---

## Special Admin Features

### 🎭 User Impersonation

**What it is:**
Login as any user to see what they see (for support/debugging)

**How to use:**
1. Go to user's detail page
2. Click "Impersonate User"
3. You're now logged in as them
4. Banner appears: "You are impersonating [user]"
5. Click "Exit Impersonation" to go back

**Use cases:**
- "Show me what this user sees"
- "Debug an issue they're experiencing"
- "Verify their permissions"

**API:**
- `POST /api/admin/users/[userId]/impersonate` - Start
- `POST /api/admin/impersonate/exit` - Stop

---

### 🔧 System Health (`/admin/system-health`)

**What it shows:**
- Database connection status
- API service status
- Email sync status
- Queue processing status
- Error rates
- Response times

**What you can do:**
- Monitor system health
- Check if services are down
- View recent errors
- Trigger health checks
- View diagnostic info

**API:**
- `GET /api/admin/system-health` - Health check

---

### 🧹 Cleanup Tools

**Available maintenance tasks:**

1. **Cleanup Emails:** Remove old/orphaned emails
   - `POST /api/admin/cleanup/emails`

2. **Cleanup Tags:** Remove unused tags
   - `POST /api/admin/cleanup/tags`

3. **Fix Folders:** Repair broken folder structures
   - `POST /api/admin/fix-folders`

4. **Fix Gmail Accounts:** Repair Gmail sync issues
   - `POST /api/admin/fix-gmail-accounts`

5. **Check All Accounts:** Verify all email accounts
   - `POST /api/admin/check-all-accounts`

---

## Permission System Review

### Who Can Access What?

```typescript
// All admin endpoints check this:
if (dbUser.role !== 'platform_admin') {
  return forbidden();
}
```

**Only platform admins can:**
- Access `/admin` section
- Manage all users
- Manage all organizations
- Configure system settings
- View financial reports
- Process billing
- Configure API keys

**Organization owners/admins can:**
- Manage users in their own org
- View their org's usage
- Manage their org's billing
- But CANNOT access admin panel

---

## Data Flow Examples

### Example 1: Creating a New Organization

```
You (admin UI)
    ↓
POST /api/admin/organizations
    ↓
1. Check you're platform_admin
2. Validate org data
3. Create in database
4. Return org details
    ↓
UI shows new org
```

### Example 2: Creating User in Organization

```
You (admin UI → org page)
    ↓
Click "Add User"
    ↓
POST /api/admin/organizations/[orgId]/users
    ↓
1. Check you're platform_admin
2. Validate user data
3. Check seat limit
4. Create Supabase Auth user
5. Generate temp password
6. Create user in database
7. Add to organization_members
8. Log audit event
9. Send credentials email
    ↓
User receives email with login info
```

### Example 3: Viewing Usage Analytics

```
You (admin UI)
    ↓
Navigate to /admin/usage-analytics
    ↓
GET /api/admin/usage
    ↓
1. Check you're platform_admin
2. Query all usage records
3. Aggregate by date/user/org
4. Calculate costs
5. Return analytics data
    ↓
UI displays charts and tables
```

---

## Common Workflows

### Workflow 1: Onboard New Company

**Scenario:** Acme Corp signs up (50 users)

1. **Create Organization:**
   - Go to `/admin/organizations`
   - Click "Create Organization"
   - Fill in details (name, slug, plan, seats)
   - Click "Create"

2. **Create First Admin User:**
   - In org view, click "Add User"
   - Email: admin@acme.com
   - Role: Owner
   - Click "Create User"

3. **Admin receives email** with credentials

4. **Admin logs in** and invites team

**Result:** Acme Corp is set up and running

---

### Workflow 2: Handle Support Ticket

**Scenario:** "I can't log in"

1. **Find user:**
   - Go to `/admin/users`
   - Search for email
   - Click user

2. **Check status:**
   - Is account suspended? → Unsuspend
   - Is password expired? → Reset password
   - Need to see their view? → Impersonate

3. **Take action:**
   - Click "Reset Password"
   - New credentials sent

4. **Log it:**
   - Action automatically logged in activity logs
   - Tell user to check email

**Result:** User can log in again

---

### Workflow 3: Month-End Billing

**Scenario:** Process monthly billing

1. **Review pending charges:**
   - Go to `/admin/billing-config`
   - Click "View Pending Charges"
   - Verify amounts

2. **Process billing:**
   - Click "Process Billing"
   - System charges all users
   - Generates invoices

3. **Check results:**
   - View "Billing History"
   - See successes/failures
   - Handle failed payments

4. **Generate report:**
   - Click "Financial Report"
   - Export for accounting

**Result:** All users billed, report generated

---

## Tips & Best Practices

### 1. Regular Monitoring
- Check dashboard daily
- Review activity logs weekly
- Monitor usage trends monthly
- Check system health before major changes

### 2. User Management
- Always verify email before creating users
- Use descriptive names for organizations
- Document why you suspend/delete users (in activity logs)
- Keep temp passwords secure - they're only shown once

### 3. Billing & Pricing
- Test pricing changes on test users first
- Keep audit trail of pricing changes
- Monitor usage spikes (could indicate abuse)
- Review failed payments weekly

### 4. System Configuration
- Back up settings before major changes
- Test API keys before deploying
- Document all configuration changes
- Keep API keys rotated regularly

### 5. Security
- Never share your admin credentials
- Log out when done
- Review activity logs for suspicious activity
- Limit time in impersonation mode
- Use password manager for API keys

---

## Troubleshooting

### "Can't access admin panel"
**Check:**
1. Are you logged in?
2. Is your role `platform_admin`?
3. Run: `npx tsx scripts/check-admin-status.ts`

### "Stats not loading"
**Check:**
1. Database connection ok?
2. Check browser console for errors
3. Try "Refresh Now" button

### "Can't create user"
**Check:**
1. Email already exists?
2. Organization at max seats?
3. Valid email format?
4. Check API response in browser console

### "Email not sending"
**Check:**
1. API keys configured? (`/admin/api-keys`)
2. Resend/SendGrid credentials valid?
3. Check activity logs for send errors

---

## Quick Reference

### URLs
```
Dashboard:          /admin
Users:             /admin/users
Organizations:     /admin/organizations
Pricing:           /admin/pricing
Analytics:         /admin/usage-analytics
Billing:           /admin/billing-config
Templates:         /admin/email-templates
Logs:              /admin/activity-logs
API Keys:          /admin/api-keys
Settings:          /admin/settings
```

### Keyboard Shortcuts
```
Ctrl+K (Cmd+K)     Search (if implemented)
Esc                Close modals
```

### Common Commands
```bash
# Check your admin status
npx tsx scripts/check-admin-status.ts

# Make someone admin
npx tsx scripts/make-platform-admin.ts email@example.com

# Run database migrations
npx tsx scripts/migrations/add-user-admin-role.ts
```

---

## Summary

The admin back office is your complete control panel for EaseMail:

✅ **Access:** http://localhost:3001/admin (platform admins only)
✅ **10 main sections:** Dashboard, Users, Orgs, Pricing, Analytics, Billing, Templates, Logs, API Keys, Settings
✅ **Full control:** Create/manage users, organizations, pricing, billing
✅ **Monitoring:** Real-time stats, usage analytics, activity logs
✅ **Configuration:** System settings, API keys, email templates
✅ **Support tools:** User impersonation, password resets, system health

**You have complete control over the entire platform!** 🎉

---

**Your Account:** tdaniel@botmakers.ai (Platform Admin)
**Last Updated:** February 2, 2026
