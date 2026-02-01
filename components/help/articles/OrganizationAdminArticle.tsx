export default function OrganizationAdminArticle() {
  return (
    <div>
      <h2>Organization Administration</h2>
      <p className="lead">
        Complete guide for IT managers and administrators managing EaseMail for their organization.
      </p>

      <h3>Overview</h3>
      <p>
        EaseMail's organization features allow IT managers to centrally manage user accounts,
        configure security policies, monitor usage, and control billing across their entire organization.
      </p>

      <h3>Organization Setup</h3>
      <h4>1. Creating an Organization</h4>
      <ol>
        <li>Navigate to <strong>Admin → Organizations</strong></li>
        <li>Click <strong>"Create Organization"</strong></li>
        <li>Enter organization details:
          <ul>
            <li><strong>Name</strong>: Your company name</li>
            <li><strong>Domain</strong>: Company email domain (e.g., company.com)</li>
            <li><strong>Billing Email</strong>: Email for invoices and billing notifications</li>
            <li><strong>Tier</strong>: Select pricing tier (Free, Pro, Enterprise)</li>
          </ul>
        </li>
        <li>Configure initial settings</li>
        <li>Click <strong>"Create"</strong></li>
      </ol>

      <h4>2. Organization Settings</h4>
      <p>Access organization settings from <strong>Admin → Organizations → Settings</strong>:</p>
      <ul>
        <li><strong>General</strong>: Name, logo, domain, contact information</li>
        <li><strong>Security</strong>: 2FA requirements, password policies, session timeout</li>
        <li><strong>Email</strong>: Domain verification, SPF/DKIM settings, email routing</li>
        <li><strong>Integrations</strong>: SSO, API access, third-party apps</li>
        <li><strong>Branding</strong>: Custom logo, colors, email templates</li>
      </ul>

      <h3>User Management</h3>
      <h4>Adding Users</h4>
      <ol>
        <li>Go to <strong>Admin → Users</strong></li>
        <li>Click <strong>"Invite User"</strong></li>
        <li>Enter user email address</li>
        <li>Select user role:
          <ul>
            <li><strong>User</strong>: Standard email access</li>
            <li><strong>Manager</strong>: Team management capabilities</li>
            <li><strong>Admin</strong>: Full administrative access</li>
            <li><strong>Super Admin</strong>: Organization-level control</li>
          </ul>
        </li>
        <li>Assign to team (optional)</li>
        <li>Send invitation</li>
      </ol>

      <h4>Bulk User Import</h4>
      <ol>
        <li>Navigate to <strong>Admin → Users → Import</strong></li>
        <li>Download CSV template</li>
        <li>Fill in user information (email, name, role, team)</li>
        <li>Upload CSV file</li>
        <li>Review import preview</li>
        <li>Confirm and send invitations</li>
      </ol>

      <h4>User Roles & Permissions</h4>
      <table>
        <thead>
          <tr>
            <th>Feature</th>
            <th>User</th>
            <th>Manager</th>
            <th>Admin</th>
            <th>Super Admin</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Email Access</td>
            <td>✓</td>
            <td>✓</td>
            <td>✓</td>
            <td>✓</td>
          </tr>
          <tr>
            <td>Contacts</td>
            <td>✓</td>
            <td>✓</td>
            <td>✓</td>
            <td>✓</td>
          </tr>
          <tr>
            <td>Calendar</td>
            <td>✓</td>
            <td>✓</td>
            <td>✓</td>
            <td>✓</td>
          </tr>
          <tr>
            <td>Team Management</td>
            <td>-</td>
            <td>✓</td>
            <td>✓</td>
            <td>✓</td>
          </tr>
          <tr>
            <td>User Management</td>
            <td>-</td>
            <td>-</td>
            <td>✓</td>
            <td>✓</td>
          </tr>
          <tr>
            <td>Usage Analytics</td>
            <td>-</td>
            <td>Team Only</td>
            <td>✓</td>
            <td>✓</td>
          </tr>
          <tr>
            <td>Billing Management</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
            <td>✓</td>
          </tr>
          <tr>
            <td>Security Policies</td>
            <td>-</td>
            <td>-</td>
            <td>✓</td>
            <td>✓</td>
          </tr>
          <tr>
            <td>Organization Settings</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
            <td>✓</td>
          </tr>
        </tbody>
      </table>

      <h3>Security Configuration</h3>
      <h4>Two-Factor Authentication (2FA)</h4>
      <ul>
        <li><strong>Optional</strong>: Users can enable voluntarily</li>
        <li><strong>Required</strong>: Enforce 2FA for all users</li>
        <li><strong>Admin Only</strong>: Require for administrators only</li>
      </ul>
      <p>Configure at: <strong>Admin → Settings → Security → Two-Factor Authentication</strong></p>

      <h4>Password Policies</h4>
      <ul>
        <li><strong>Minimum Length</strong>: 8-32 characters (default: 12)</li>
        <li><strong>Complexity</strong>: Require uppercase, lowercase, numbers, symbols</li>
        <li><strong>Expiration</strong>: Force password change every N days (0 = never)</li>
        <li><strong>History</strong>: Prevent reusing last N passwords</li>
        <li><strong>Max Attempts</strong>: Lock account after N failed login attempts</li>
      </ul>

      <h4>Session Management</h4>
      <ul>
        <li><strong>Timeout</strong>: Auto-logout after inactivity (1-480 minutes)</li>
        <li><strong>Remember Me</strong>: Allow extended sessions (up to 30 days)</li>
        <li><strong>Concurrent Sessions</strong>: Limit number of active sessions per user</li>
        <li><strong>IP Restriction</strong>: Allow login only from specific IP ranges</li>
      </ul>

      <h4>Email Encryption</h4>
      <p>
        EaseMail uses AES-256-GCM encryption for emails at rest:
      </p>
      <ul>
        <li>All email content encrypted in database</li>
        <li>End-to-end encryption for internal emails (optional)</li>
        <li>S/MIME certificate support (Enterprise plan)</li>
        <li>PGP encryption support (Enterprise plan)</li>
      </ul>

      <h3>Usage Analytics</h3>
      <p>Monitor organization-wide usage at <strong>Admin → Usage Analytics</strong>:</p>

      <h4>Available Metrics</h4>
      <ul>
        <li><strong>Active Users</strong>: Daily/weekly/monthly active users</li>
        <li><strong>Email Volume</strong>: Sent/received email counts</li>
        <li><strong>Storage Usage</strong>: Per-user and organization-wide storage</li>
        <li><strong>Feature Adoption</strong>: AI features, rules, calendar usage</li>
        <li><strong>API Usage</strong>: API calls, rate limits, quotas</li>
        <li><strong>Login Activity</strong>: Successful/failed logins, session duration</li>
      </ul>

      <h4>Reports</h4>
      <ul>
        <li><strong>Executive Summary</strong>: High-level usage overview (weekly/monthly)</li>
        <li><strong>User Activity</strong>: Per-user detailed activity report</li>
        <li><strong>Security Events</strong>: Login attempts, 2FA usage, policy violations</li>
        <li><strong>Billing Forecast</strong>: Projected costs based on current usage</li>
      </ul>

      <h3>Billing Management</h3>
      <h4>Subscription Plans</h4>
      <table>
        <thead>
          <tr>
            <th>Feature</th>
            <th>Free</th>
            <th>Pro</th>
            <th>Enterprise</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Users</td>
            <td>Up to 10</td>
            <td>Unlimited</td>
            <td>Unlimited</td>
          </tr>
          <tr>
            <td>Email Accounts</td>
            <td>3 per user</td>
            <td>10 per user</td>
            <td>Unlimited</td>
          </tr>
          <tr>
            <td>Storage</td>
            <td>10 GB</td>
            <td>100 GB</td>
            <td>Unlimited</td>
          </tr>
          <tr>
            <td>AI Features</td>
            <td>Basic</td>
            <td>Advanced</td>
            <td>Premium</td>
          </tr>
          <tr>
            <td>Support</td>
            <td>Community</td>
            <td>Email</td>
            <td>24/7 Phone</td>
          </tr>
          <tr>
            <td>SSO</td>
            <td>-</td>
            <td>-</td>
            <td>✓</td>
          </tr>
          <tr>
            <td>Custom Branding</td>
            <td>-</td>
            <td>-</td>
            <td>✓</td>
          </tr>
          <tr>
            <td>Price</td>
            <td>Free</td>
            <td>$12/user/mo</td>
            <td>Custom</td>
          </tr>
        </tbody>
      </table>

      <h4>Managing Subscription</h4>
      <ol>
        <li>Navigate to <strong>Admin → Billing</strong></li>
        <li>View current plan and usage</li>
        <li>Click <strong>"Change Plan"</strong> to upgrade/downgrade</li>
        <li>Update payment method</li>
        <li>View billing history and invoices</li>
      </ol>

      <h3>Team Management</h3>
      <h4>Creating Teams</h4>
      <ol>
        <li>Go to <strong>Admin → Teams</strong></li>
        <li>Click <strong>"Create Team"</strong></li>
        <li>Enter team name and description</li>
        <li>Add team members</li>
        <li>Assign team manager</li>
        <li>Configure team settings:
          <ul>
            <li>Shared mailboxes</li>
            <li>Team calendar</li>
            <li>File sharing</li>
            <li>Collaboration rules</li>
          </ul>
        </li>
      </ol>

      <h4>Shared Mailboxes</h4>
      <p>
        Create shared mailboxes for departments (e.g., support@company.com):
      </p>
      <ol>
        <li>Navigate to <strong>Admin → Teams → Shared Mailboxes</strong></li>
        <li>Click <strong>"Create Shared Mailbox"</strong></li>
        <li>Enter email address and display name</li>
        <li>Assign team members with permissions:
          <ul>
            <li><strong>Read</strong>: View emails only</li>
            <li><strong>Send</strong>: Send from shared address</li>
            <li><strong>Manage</strong>: Full control</li>
          </ul>
        </li>
        <li>Configure auto-responses and rules</li>
      </ol>

      <h3>Email Rules & Automation</h3>
      <p>Set organization-wide email rules:</p>
      <ul>
        <li><strong>Compliance Rules</strong>: Auto-archive, retention policies</li>
        <li><strong>Routing Rules</strong>: Forward to teams/departments</li>
        <li><strong>Security Rules</strong>: Block external forwarding, DLP policies</li>
        <li><strong>Auto-Responses</strong>: Out-of-office, auto-replies</li>
      </ul>

      <h3>API & Integrations</h3>
      <h4>API Access</h4>
      <ol>
        <li>Navigate to <strong>Admin → API Keys</strong></li>
        <li>Click <strong>"Generate API Key"</strong></li>
        <li>Set key permissions:
          <ul>
            <li>Read emails</li>
            <li>Send emails</li>
            <li>Manage contacts</li>
            <li>User management</li>
          </ul>
        </li>
        <li>Set rate limits</li>
        <li>Copy and securely store API key</li>
      </ol>

      <h4>SSO Configuration (Enterprise)</h4>
      <p>Configure Single Sign-On with SAML 2.0 or OAuth:</p>
      <ol>
        <li>Go to <strong>Admin → Settings → SSO</strong></li>
        <li>Choose SSO provider (Okta, Azure AD, Google Workspace, etc.)</li>
        <li>Enter SSO configuration:
          <ul>
            <li>Entity ID</li>
            <li>SSO URL</li>
            <li>X.509 Certificate</li>
          </ul>
        </li>
        <li>Configure attribute mapping</li>
        <li>Test SSO connection</li>
        <li>Enable for organization</li>
      </ol>

      <h3>Monitoring & Logs</h3>
      <h4>Activity Logs</h4>
      <p>
        Access comprehensive logs at <strong>Admin → Activity Logs</strong>:
      </p>
      <ul>
        <li><strong>User Actions</strong>: Login, email sent, settings changed</li>
        <li><strong>Admin Actions</strong>: User created, role changed, settings updated</li>
        <li><strong>Security Events</strong>: Failed logins, 2FA enabled, password changed</li>
        <li><strong>API Calls</strong>: API requests, rate limit hits</li>
        <li><strong>System Events</strong>: Sync errors, webhook failures</li>
      </ul>

      <h4>System Health</h4>
      <p>
        Monitor system status at <strong>Admin → System Health</strong>:
      </p>
      <ul>
        <li><strong>Email Sync Status</strong>: Last sync time, pending emails</li>
        <li><strong>API Status</strong>: Nylas/Aurinko connection health</li>
        <li><strong>Database Performance</strong>: Query times, connection pool</li>
        <li><strong>Error Rates</strong>: 5xx errors, failed API calls</li>
        <li><strong>Webhook Status</strong>: Delivery success rate</li>
      </ul>

      <h3>Data Management</h3>
      <h4>Data Retention</h4>
      <p>Configure retention policies:</p>
      <ul>
        <li><strong>Email Retention</strong>: Auto-delete emails after N days</li>
        <li><strong>Trash Retention</strong>: Permanently delete after N days</li>
        <li><strong>Draft Cleanup</strong>: Delete old drafts automatically</li>
        <li><strong>Attachment Storage</strong>: Archive or delete old attachments</li>
      </ul>

      <h4>Data Export</h4>
      <p>Export organization data for compliance or backup:</p>
      <ol>
        <li>Navigate to <strong>Admin → Data Export</strong></li>
        <li>Select data types:
          <ul>
            <li>Emails (per user or organization-wide)</li>
            <li>Contacts</li>
            <li>Calendar events</li>
            <li>User activity logs</li>
          </ul>
        </li>
        <li>Choose export format (MBOX, PST, CSV, JSON)</li>
        <li>Select date range</li>
        <li>Request export (processed asynchronously)</li>
        <li>Download when ready (email notification sent)</li>
      </ol>

      <h4>GDPR Compliance</h4>
      <ul>
        <li><strong>Data Access Requests</strong>: Users can export their data</li>
        <li><strong>Right to be Forgotten</strong>: Complete user data deletion</li>
        <li><strong>Data Processing Agreement</strong>: Available in Admin → Legal</li>
        <li><strong>Consent Management</strong>: Track user consents</li>
      </ul>

      <h3>Troubleshooting</h3>
      <h4>Common Issues</h4>

      <h5>Users Can't Login</h5>
      <ul>
        <li>Check if account is active (Admin → Users)</li>
        <li>Verify email domain matches organization domain</li>
        <li>Check password policy requirements</li>
        <li>Review activity logs for lockout events</li>
        <li>Ensure 2FA is set up correctly</li>
      </ul>

      <h5>Emails Not Syncing</h5>
      <ul>
        <li>Check email account connection status</li>
        <li>Verify OAuth tokens haven't expired</li>
        <li>Review System Health dashboard</li>
        <li>Check webhook delivery logs</li>
        <li>Contact support if Nylas/Aurinko is down</li>
      </ul>

      <h5>High API Usage</h5>
      <ul>
        <li>Review API logs for unusual patterns</li>
        <li>Check for misconfigured integrations</li>
        <li>Implement rate limiting on API keys</li>
        <li>Consider upgrading plan if legitimate usage</li>
      </ul>

      <h3>Best Practices</h3>
      <ul>
        <li><strong>Regular Audits</strong>: Review user access quarterly</li>
        <li><strong>2FA Enforcement</strong>: Require for all administrators</li>
        <li><strong>Role-Based Access</strong>: Use least privilege principle</li>
        <li><strong>Monitor Logs</strong>: Review security events weekly</li>
        <li><strong>Backup Strategy</strong>: Regular data exports</li>
        <li><strong>Update Policies</strong>: Review security policies annually</li>
        <li><strong>User Training</strong>: Onboard new users properly</li>
        <li><strong>Incident Response</strong>: Have security incident plan</li>
      </ul>

      <h3>Support & Resources</h3>
      <ul>
        <li><strong>Documentation</strong>: <a href="/help">help.easemail.com</a></li>
        <li><strong>API Docs</strong>: <a href="/api/docs">api.easemail.com/docs</a></li>
        <li><strong>Status Page</strong>: <a href="https://status.easemail.com">status.easemail.com</a></li>
        <li><strong>Enterprise Support</strong>: support@easemail.com (24/7)</li>
        <li><strong>Community</strong>: community.easemail.com</li>
      </ul>

      <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="text-lg font-semibold mb-2">Need Help?</h4>
        <p>
          For enterprise support and custom configurations, contact your account manager
          or email <strong>enterprise@easemail.com</strong>
        </p>
      </div>
    </div>
  );
}
