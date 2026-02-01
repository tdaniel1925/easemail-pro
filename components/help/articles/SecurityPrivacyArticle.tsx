export default function SecurityPrivacyArticle() {
  return (
    <div>
      <h2>Security & Privacy Guide</h2>
      <p className="lead">
        Understanding how EaseMail protects your data and ensures your privacy.
      </p>

      <h3>Two-Factor Authentication (2FA)</h3>
      <p>
        Add an extra layer of security to your account by requiring a second form of authentication
        in addition to your password.
      </p>

      <h4>Setting Up 2FA</h4>
      <ol>
        <li>Navigate to <strong>Settings → Security</strong></li>
        <li>Click <strong>"Enable Two-Factor Authentication"</strong></li>
        <li>Choose your 2FA method:
          <ul>
            <li><strong>Authenticator App</strong> (Recommended): Google Authenticator, Authy, 1Password</li>
            <li><strong>SMS</strong>: Receive codes via text message</li>
          </ul>
        </li>
        <li>For Authenticator App:
          <ul>
            <li>Scan the QR code with your authenticator app</li>
            <li>Enter the 6-digit code shown in your app</li>
          </ul>
        </li>
        <li>Save your recovery codes in a secure location</li>
        <li>Click <strong>"Complete Setup"</strong></li>
      </ol>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 my-4">
        <h5 className="text-lg font-semibold mb-2">⚠️ Important: Recovery Codes</h5>
        <p>
          Your recovery codes are the only way to access your account if you lose access to your 2FA device.
          Save them in a password manager or print them and store them securely.
        </p>
      </div>

      <h4>Using 2FA</h4>
      <p>
        After enabling 2FA, you'll need to enter a code from your authenticator app after entering your password:
      </p>
      <ol>
        <li>Enter your email and password as usual</li>
        <li>Open your authenticator app</li>
        <li>Enter the 6-digit code for EaseMail</li>
        <li>Click <strong>"Verify"</strong></li>
        <li>Optionally check "Trust this device for 30 days" on personal devices</li>
      </ol>

      <h4>Recovering Access</h4>
      <p>Lost access to your 2FA device?</p>
      <ol>
        <li>Click <strong>"Lost access to your device?"</strong> on the 2FA prompt</li>
        <li>Enter one of your recovery codes</li>
        <li>You'll be logged in and can disable/re-setup 2FA</li>
      </ol>
      <p>
        If you've lost your recovery codes, contact your administrator or support@easemail.com
      </p>

      <h3>Email Encryption</h3>

      <h4>At-Rest Encryption</h4>
      <p>
        All emails stored in EaseMail are automatically encrypted using AES-256-GCM encryption:
      </p>
      <ul>
        <li>Email content encrypted in the database</li>
        <li>Attachments encrypted separately</li>
        <li>Encryption keys rotated every 90 days</li>
        <li>Zero-knowledge architecture (Enterprise plan)</li>
      </ul>

      <h4>In-Transit Encryption</h4>
      <p>
        All email transmission uses TLS 1.2+ encryption:
      </p>
      <ul>
        <li>HTTPS for all web connections</li>
        <li>TLS for SMTP/IMAP connections</li>
        <li>Certificate pinning for enhanced security</li>
      </ul>

      <h4>End-to-End Encryption (Enterprise)</h4>
      <p>
        Enterprise customers can enable E2E encryption for internal emails:
      </p>
      <ul>
        <li><strong>S/MIME</strong>: Industry-standard email encryption</li>
        <li><strong>PGP/GPG</strong>: Open-source encryption protocol</li>
        <li>Setup: Settings → Security → End-to-End Encryption</li>
      </ul>

      <h3>Password Security</h3>

      <h4>Creating a Strong Password</h4>
      <p>Your password should be:</p>
      <ul>
        <li>At least 12 characters long (longer is better)</li>
        <li>Include uppercase and lowercase letters</li>
        <li>Include numbers and special characters</li>
        <li>Not used on other websites</li>
        <li>Not contain personal information (name, birthday, etc.)</li>
      </ul>

      <h5>✓ Good Passwords:</h5>
      <ul>
        <li><code>T8#mP!w9$kL2@xQ5</code> - Random mix of characters</li>
        <li><code>Correct-Horse-Battery-Staple-2024!</code> - Passphrase method</li>
        <li><code>MyD0g&LovesRunnin9OnBeach!</code> - Personal phrase with substitutions</li>
      </ul>

      <h5>✗ Bad Passwords:</h5>
      <ul>
        <li><code>password123</code> - Too common</li>
        <li><code>JohnSmith2024</code> - Contains personal info</li>
        <li><code>qwerty</code> - Keyboard pattern</li>
      </ul>

      <h4>Changing Your Password</h4>
      <ol>
        <li>Navigate to <strong>Settings → Security</strong></li>
        <li>Click <strong>"Change Password"</strong></li>
        <li>Enter your current password</li>
        <li>Enter your new password (twice)</li>
        <li>Click <strong>"Update Password"</strong></li>
      </ol>
      <p>
        Your password will be updated immediately and you'll be logged out on all other devices.
      </p>

      <h4>Password Managers (Recommended)</h4>
      <p>
        Use a password manager to generate and store strong, unique passwords:
      </p>
      <ul>
        <li><strong>1Password</strong> - Family and business plans available</li>
        <li><strong>Bitwarden</strong> - Open-source, self-hosted option</li>
        <li><strong>LastPass</strong> - Free tier available</li>
        <li><strong>Dashlane</strong> - Business-focused features</li>
      </ul>

      <h3>Session Security</h3>

      <h4>Active Sessions</h4>
      <p>
        View and manage all active login sessions:
      </p>
      <ol>
        <li>Navigate to <strong>Settings → Security → Active Sessions</strong></li>
        <li>Review list of active sessions:
          <ul>
            <li>Device type (Desktop, Mobile, Tablet)</li>
            <li>Browser and operating system</li>
            <li>IP address and location</li>
            <li>Last active time</li>
          </ul>
        </li>
        <li>Click <strong>"Revoke"</strong> on any suspicious sessions</li>
        <li>Click <strong>"Revoke All Other Sessions"</strong> to logout everywhere except current device</li>
      </ol>

      <h4>Session Timeouts</h4>
      <p>
        Your session will automatically expire after:
      </p>
      <ul>
        <li><strong>Inactivity timeout</strong>: 60 minutes (configurable by admin)</li>
        <li><strong>Maximum session</strong>: 24 hours (requires re-login)</li>
        <li><strong>"Remember me"</strong>: Up to 30 days (if enabled)</li>
      </ul>

      <h3>Privacy Controls</h3>

      <h4>Data Collection</h4>
      <p>EaseMail collects only what's necessary to provide the service:</p>
      <ul>
        <li><strong>Account data</strong>: Email, name, profile information</li>
        <li><strong>Email data</strong>: Emails, contacts, calendar events</li>
        <li><strong>Usage data</strong>: Feature usage, login times (anonymized for analytics)</li>
        <li><strong>Technical data</strong>: IP address, browser type, error logs</li>
      </ul>

      <h4>What We DON'T Do</h4>
      <ul>
        <li>❌ Read your emails for advertising</li>
        <li>❌ Sell your data to third parties</li>
        <li>❌ Track you across other websites</li>
        <li>❌ Share data without your consent</li>
      </ul>

      <h4>Your Data Rights (GDPR/CCPA)</h4>
      <p>You have the right to:</p>
      <ul>
        <li><strong>Access</strong>: Download all your data</li>
        <li><strong>Rectify</strong>: Correct inaccurate data</li>
        <li><strong>Delete</strong>: Request complete data deletion</li>
        <li><strong>Port</strong>: Export your data in standard formats</li>
        <li><strong>Restrict</strong>: Limit processing of your data</li>
        <li><strong>Object</strong>: Opt-out of certain data uses</li>
      </ul>

      <h4>Exporting Your Data</h4>
      <ol>
        <li>Navigate to <strong>Settings → Privacy</strong></li>
        <li>Click <strong>"Export My Data"</strong></li>
        <li>Select data to export:
          <ul>
            <li>Emails (MBOX format)</li>
            <li>Contacts (CSV format)</li>
            <li>Calendar (ICS format)</li>
            <li>Settings and preferences (JSON)</li>
          </ul>
        </li>
        <li>Click <strong>"Request Export"</strong></li>
        <li>You'll receive an email when ready (usually within 24 hours)</li>
        <li>Download link expires after 7 days</li>
      </ol>

      <h4>Deleting Your Account</h4>
      <ol>
        <li>Navigate to <strong>Settings → Privacy</strong></li>
        <li>Scroll to <strong>"Delete Account"</strong> section</li>
        <li>Click <strong>"Delete My Account"</strong></li>
        <li>Confirm by entering your password</li>
        <li>Choose what happens to your data:
          <ul>
            <li><strong>Delete immediately</strong>: All data deleted within 24 hours</li>
            <li><strong>Archive for 30 days</strong>: Can recover account within 30 days</li>
          </ul>
        </li>
        <li>Confirm deletion</li>
      </ol>

      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 my-4">
        <h5 className="text-lg font-semibold mb-2">⚠️ Warning: Account Deletion is Permanent</h5>
        <p>
          Once your account is deleted (after the grace period), all data is permanently removed and cannot be recovered.
          Export your data before deleting if you need to keep any information.
        </p>
      </div>

      <h3>Email Privacy</h3>

      <h4>External Images</h4>
      <p>
        External images in emails can be used to track when you open an email (tracking pixels).
        EaseMail blocks external images by default:
      </p>
      <ul>
        <li>Click <strong>"Show Images"</strong> to load images in trusted emails</li>
        <li>Click <strong>"Always show images from this sender"</strong> to whitelist</li>
        <li>Configure default: <strong>Settings → Privacy → External Images</strong></li>
      </ul>

      <h4>Read Receipts</h4>
      <p>
        Control whether senders can see if you've read their emails:
      </p>
      <ol>
        <li>Navigate to <strong>Settings → Privacy</strong></li>
        <li>Under <strong>"Read Receipts"</strong>:
          <ul>
            <li><strong>Never send</strong>: Maximum privacy (default)</li>
            <li><strong>Ask me</strong>: Prompt for each request</li>
            <li><strong>Always send</strong>: Automatically send receipts</li>
          </ul>
        </li>
      </ol>

      <h4>Link Tracking Protection</h4>
      <p>
        EaseMail can protect you from link tracking:
      </p>
      <ul>
        <li>Removes tracking parameters from links</li>
        <li>Blocks known tracking domains</li>
        <li>Configure: <strong>Settings → Privacy → Link Protection</strong></li>
      </ul>

      <h3>Audit Logs</h3>
      <p>
        View a complete history of actions on your account:
      </p>
      <ol>
        <li>Navigate to <strong>Settings → Security → Activity Log</strong></li>
        <li>Review:
          <ul>
            <li>Login attempts (successful and failed)</li>
            <li>Password changes</li>
            <li>2FA changes</li>
            <li>Settings updates</li>
            <li>Email account connections</li>
            <li>Data exports</li>
          </ul>
        </li>
        <li>Each entry shows:
          <ul>
            <li>Timestamp</li>
            <li>Action performed</li>
            <li>IP address</li>
            <li>Location (approximate)</li>
            <li>Device/browser</li>
          </ul>
        </li>
      </ol>

      <h3>Reporting Security Issues</h3>

      <h4>Suspicious Account Activity</h4>
      <p>
        If you notice suspicious activity:
      </p>
      <ol>
        <li>Immediately change your password</li>
        <li>Enable 2FA if not already enabled</li>
        <li>Review active sessions and revoke suspicious ones</li>
        <li>Check activity log for unauthorized actions</li>
        <li>Contact support: security@easemail.com</li>
      </ol>

      <h4>Phishing Emails</h4>
      <p>
        If you receive a suspicious email claiming to be from EaseMail:
      </p>
      <ul>
        <li>Do NOT click any links in the email</li>
        <li>Do NOT enter your password</li>
        <li>Forward the email to: phishing@easemail.com</li>
        <li>Delete the email</li>
      </ul>

      <h5>How to Identify Phishing:</h5>
      <ul>
        <li>Check sender email: EaseMail only sends from @easemail.com</li>
        <li>Look for urgency/threats ("Account will be closed!")</li>
        <li>Hover over links to see real destination</li>
        <li>Check for spelling/grammar errors</li>
        <li>We never ask for your password via email</li>
      </ul>

      <h4>Security Vulnerabilities</h4>
      <p>
        Found a security vulnerability in EaseMail? We appreciate responsible disclosure:
      </p>
      <ul>
        <li>Email: security@easemail.com</li>
        <li>PGP Key: Available at easemail.com/security</li>
        <li>Bug Bounty: Up to $10,000 for critical vulnerabilities</li>
        <li>We'll acknowledge within 24 hours</li>
      </ul>

      <h3>Compliance & Certifications</h3>
      <ul>
        <li><strong>GDPR</strong>: EU data protection compliance</li>
        <li><strong>CCPA</strong>: California privacy compliance</li>
        <li><strong>SOC 2 Type II</strong>: Security audit (in progress)</li>
        <li><strong>ISO 27001</strong>: Information security (in progress)</li>
        <li><strong>HIPAA</strong>: Healthcare data (Enterprise with BAA)</li>
      </ul>

      <h3>Security Best Practices</h3>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 my-4">
        <h4 className="text-lg font-semibold mb-2">✓ Security Checklist</h4>
        <ul className="space-y-2">
          <li>✓ Enable two-factor authentication</li>
          <li>✓ Use a strong, unique password</li>
          <li>✓ Use a password manager</li>
          <li>✓ Review active sessions regularly</li>
          <li>✓ Keep recovery codes secure</li>
          <li>✓ Be cautious with external images</li>
          <li>✓ Never share your password</li>
          <li>✓ Logout on shared devices</li>
          <li>✓ Keep your email app updated</li>
          <li>✓ Review activity log monthly</li>
        </ul>
      </div>

      <h3>Privacy Policy & Terms</h3>
      <p>
        Read our full policies:
      </p>
      <ul>
        <li><strong>Privacy Policy</strong>: <a href="/legal/privacy">easemail.com/legal/privacy</a></li>
        <li><strong>Terms of Service</strong>: <a href="/legal/terms">easemail.com/legal/terms</a></li>
        <li><strong>Cookie Policy</strong>: <a href="/legal/cookies">easemail.com/legal/cookies</a></li>
        <li><strong>Security</strong>: <a href="/security">easemail.com/security</a></li>
      </ul>

      <h3>Contact Us</h3>
      <ul>
        <li><strong>Security Team</strong>: security@easemail.com</li>
        <li><strong>Privacy Team</strong>: privacy@easemail.com</li>
        <li><strong>Data Protection Officer</strong>: dpo@easemail.com</li>
        <li><strong>General Support</strong>: support@easemail.com</li>
      </ul>

      <div className="mt-8 p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <h4 className="text-lg font-semibold mb-2">Your Security is Our Priority</h4>
        <p>
          We take security and privacy seriously. If you have any questions or concerns,
          don't hesitate to reach out to our security team.
        </p>
      </div>
    </div>
  );
}
