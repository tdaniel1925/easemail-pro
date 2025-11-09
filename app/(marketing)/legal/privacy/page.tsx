import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | EaseMail',
  description: 'EaseMail Privacy Policy - How we collect, use, and protect your data',
};

export default function PrivacyPolicyPage() {
  const lastUpdated = 'January 2025';
  const companyName = 'EaseMail';
  const companyEmail = 'privacy@easemail.com';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://easemail.com';

  return (
    <div className="container mx-auto px-6 py-20 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Last updated: {lastUpdated}
      </p>

      <div className="prose prose-lg dark:prose-invert max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
          <p className="mb-4">
            {companyName} ("we," "our," or "us") respects your privacy and is committed to protecting your personal data.
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our
            email management platform and AI-powered services.
          </p>
          <p className="mb-4">
            By using {companyName}, you agree to the collection and use of information in accordance with this policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>

          <h3 className="text-xl font-semibold mb-3 mt-6">2.1 Personal Information</h3>
          <p className="mb-4">We collect information that you provide directly to us:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Account information (name, email address, password)</li>
            <li>Profile information (avatar, preferences, signatures)</li>
            <li>Billing information (processed securely through Stripe)</li>
            <li>Communication preferences and settings</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">2.2 Email Content</h3>
          <p className="mb-4">
            When you connect your email account(s) to {companyName}, we access and process:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Email messages (subject, body, attachments)</li>
            <li>Email metadata (sender, recipients, timestamps)</li>
            <li>Folder structure and labels</li>
            <li>Contact information from your address book</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">2.3 AI Processing Data</h3>
          <p className="mb-4">
            When you use AI features (summarization, email writing, smart replies):
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Email content sent to OpenAI for processing</li>
            <li>AI-generated summaries and drafts</li>
            <li>Usage metrics and feature interactions</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">2.4 Automatically Collected Data</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Device information (browser type, OS, IP address)</li>
            <li>Usage data (pages visited, features used, session duration)</li>
            <li>Cookies and similar tracking technologies</li>
            <li>Error logs and performance metrics</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
          <p className="mb-4">We use collected information for:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Service Delivery:</strong> Providing email management, AI features, and platform functionality</li>
            <li><strong>Personalization:</strong> Customizing your experience and improving AI accuracy</li>
            <li><strong>Communication:</strong> Sending service updates, security alerts, and support messages</li>
            <li><strong>Analytics:</strong> Understanding usage patterns to improve our services</li>
            <li><strong>Security:</strong> Detecting fraud, preventing abuse, and protecting user accounts</li>
            <li><strong>Billing:</strong> Processing payments and managing subscriptions</li>
            <li><strong>Legal Compliance:</strong> Meeting regulatory requirements and enforcing our terms</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Data Sharing and Third Parties</h2>

          <h3 className="text-xl font-semibold mb-3 mt-6">4.1 Service Providers</h3>
          <p className="mb-4">We share data with trusted third-party services:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Nylas:</strong> Email API provider for email synchronization</li>
            <li><strong>OpenAI:</strong> AI processing for summarization and generation features</li>
            <li><strong>Supabase:</strong> Authentication and database hosting</li>
            <li><strong>Stripe:</strong> Payment processing (we do not store credit card numbers)</li>
            <li><strong>Resend:</strong> Transactional email delivery</li>
            <li><strong>Upstash:</strong> Rate limiting and caching infrastructure</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">4.2 We Do NOT:</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Sell your personal information to third parties</li>
            <li>Share your email content for advertising purposes</li>
            <li>Use your data to train AI models without explicit consent</li>
            <li>Provide your data to government agencies without legal requirement</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Data Storage and Security</h2>
          <p className="mb-4">
            We implement industry-standard security measures:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>End-to-end encryption for data in transit (TLS/SSL)</li>
            <li>Encrypted database storage (PostgreSQL with encryption at rest)</li>
            <li>Rate limiting and DDoS protection</li>
            <li>Regular security audits and penetration testing</li>
            <li>Multi-factor authentication (MFA) support</li>
            <li>Role-based access controls for admin functions</li>
          </ul>
          <p className="mb-4">
            <strong>Data Retention:</strong> We retain your data for as long as your account is active.
            You may request deletion at any time through your account settings.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Your Rights (GDPR & CCPA)</h2>
          <p className="mb-4">You have the right to:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Update or correct inaccurate information</li>
            <li><strong>Deletion:</strong> Request deletion of your data ("Right to be Forgotten")</li>
            <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
            <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
            <li><strong>Restriction:</strong> Limit how we process your data</li>
          </ul>
          <p className="mb-4">
            To exercise these rights, contact us at {companyEmail} or use your account settings.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Cookies and Tracking</h2>
          <p className="mb-4">
            We use cookies and similar technologies for:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Authentication and session management</li>
            <li>User preferences and settings</li>
            <li>Analytics and performance monitoring (optional)</li>
          </ul>
          <p className="mb-4">
            You can manage cookie preferences through your browser settings or our cookie consent banner.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. International Data Transfers</h2>
          <p className="mb-4">
            Your data may be transferred and processed in countries outside your residence.
            We ensure appropriate safeguards are in place (EU-US Data Privacy Framework, Standard Contractual Clauses).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Children's Privacy</h2>
          <p className="mb-4">
            {companyName} is not intended for users under 18 years of age.
            We do not knowingly collect data from children. If you believe we have collected data from a minor,
            please contact us immediately.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Changes to This Policy</h2>
          <p className="mb-4">
            We may update this Privacy Policy periodically. We will notify you of significant changes via email
            or in-app notification. Continued use of {companyName} after changes constitutes acceptance.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
          <p className="mb-4">
            For privacy-related questions or concerns:
          </p>
          <ul className="list-none mb-4 space-y-2">
            <li><strong>Email:</strong> {companyEmail}</li>
            <li><strong>Website:</strong> <a href={appUrl} className="text-primary hover:underline">{appUrl}</a></li>
          </ul>
        </section>

        <div className="mt-12 p-6 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            This Privacy Policy is effective as of {lastUpdated}.
            By using {companyName}, you acknowledge that you have read and understood this policy.
          </p>
        </div>
      </div>
    </div>
  );
}
