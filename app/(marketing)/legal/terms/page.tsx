import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | EaseMail',
  description: 'EaseMail Terms of Service - User agreement and service terms',
};

export default function TermsOfServicePage() {
  const lastUpdated = 'January 2025';
  const companyName = 'EaseMail';
  const companyEmail = 'legal@easemail.com';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://easemail.com';

  return (
    <div className="container mx-auto px-6 py-20 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Last updated: {lastUpdated}
      </p>

      <div className="prose prose-lg dark:prose-invert max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <p className="mb-4">
            By accessing or using {companyName} ("Service," "Platform," "we," "us," or "our"), you agree to be bound
            by these Terms of Service ("Terms"). If you disagree with any part of these terms, you do not have
            permission to access the Service.
          </p>
          <p className="mb-4">
            These Terms apply to all visitors, users, and others who access or use the Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
          <p className="mb-4">
            {companyName} is an email management platform that provides:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Unified inbox for multiple email accounts</li>
            <li>AI-powered email summarization and generation</li>
            <li>Smart inbox management and automation</li>
            <li>Contact management and organization</li>
            <li>Calendar integration and scheduling</li>
            <li>Team collaboration features (Enterprise plans)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Account Registration</h2>

          <h3 className="text-xl font-semibold mb-3 mt-6">3.1 Eligibility</h3>
          <p className="mb-4">
            You must be at least 18 years old to use {companyName}. By creating an account, you represent and warrant
            that you meet this requirement.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">3.2 Account Security</h3>
          <p className="mb-4">You are responsible for:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Maintaining the confidentiality of your password</li>
            <li>All activities that occur under your account</li>
            <li>Notifying us immediately of any unauthorized access</li>
            <li>Using strong, unique passwords and enabling MFA when available</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">3.3 Accurate Information</h3>
          <p className="mb-4">
            You agree to provide accurate, current, and complete information during registration
            and to update such information to keep it accurate and current.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Subscription Plans and Billing</h2>

          <h3 className="text-xl font-semibold mb-3 mt-6">4.1 Plan Tiers</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Free:</strong> Limited AI features (10 requests/month)</li>
            <li><strong>Starter:</strong> Enhanced AI features (100 requests/month)</li>
            <li><strong>Pro:</strong> Advanced features (500 requests/month)</li>
            <li><strong>Enterprise:</strong> Unlimited usage and dedicated support</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">4.2 Subscription Billing</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Subscriptions are billed monthly or annually as selected</li>
            <li>All fees are in USD unless otherwise stated</li>
            <li>Payment is processed securely through Stripe</li>
            <li>Automatic renewal unless canceled before billing date</li>
            <li>You must maintain a valid payment method on file for paid plans</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">4.3 Usage-Based Billing</h3>
          <p className="mb-4">
            In addition to subscription fees, certain features are billed based on actual usage:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>SMS Messages:</strong> $0.02 per message sent (after included allowance)</li>
            <li><strong>AI Requests:</strong> $0.001 per request (after included allowance)</li>
            <li><strong>Storage:</strong> $0.10 per GB per month (after included allowance)</li>
          </ul>
          <p className="mb-4">
            Usage is tracked hourly and billed monthly. You can view current usage at any time
            in your billing dashboard. Usage charges are added to your monthly invoice and charged
            to your payment method on file.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">4.4 Billing Address and Tax Calculation</h3>
          <p className="mb-4">
            You are required to provide and maintain an accurate billing address. We calculate and
            collect applicable sales tax, VAT, GST, or HST based on your billing address location:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>United States:</strong> Sales tax rates vary by state (0% to 10%+)</li>
            <li><strong>Canada:</strong> GST (5%), HST (13-15%), or PST (up to 20% combined)</li>
            <li><strong>European Union:</strong> VAT rates vary by country (up to 27%)</li>
          </ul>
          <p className="mb-4">
            Tax rates are automatically updated to reflect current regulations. You are responsible
            for providing accurate billing address information to ensure correct tax calculation.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">4.5 Payment Methods</h3>
          <p className="mb-4">
            We accept credit cards and debit cards via Stripe. Your payment information is stored
            securely by Stripe (we never see or store your full card number). You may:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Add, update, or remove payment methods in your billing settings</li>
            <li>Set a default payment method for automatic billing</li>
            <li>Update billing address at any time (affects future tax calculations)</li>
          </ul>
          <p className="mb-4">
            Paid plan subscribers must maintain at least one valid payment method on file.
            Failure to do so may result in service restrictions or account suspension.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">4.6 Payment Failures and Retries</h3>
          <p className="mb-4">
            If a payment fails:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>You will receive an email notification with the failure reason</li>
            <li>We will automatically retry the payment up to 3 times over 7 days</li>
            <li>You will receive notifications before each retry attempt</li>
            <li>After final failure, your account may be suspended until payment is resolved</li>
            <li>You can manually retry payment or update your payment method at any time</li>
          </ul>
          <p className="mb-4">
            During the retry period, your service access may be limited. Late fees are not charged,
            but service interruption may occur if payment cannot be collected.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">4.7 Invoices and Receipts</h3>
          <p className="mb-4">
            You will receive:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Email notification before each billing cycle with estimated charges</li>
            <li>Invoice and receipt after successful payment</li>
            <li>Detailed usage breakdown showing subscription fees, usage charges, and taxes</li>
            <li>Access to all invoices in your billing dashboard for download (PDF)</li>
          </ul>
          <p className="mb-4">
            Invoices are retained for 7 years for tax compliance purposes and are available
            for download at any time.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">4.8 Billing Disputes</h3>
          <p className="mb-4">
            If you believe a charge is incorrect, you must notify us within 30 days of the
            charge date. We will investigate and respond within 10 business days. Undisputed
            charges are considered final after 30 days.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">4.9 Refunds</h3>
          <p className="mb-4">
            We offer a 14-day money-back guarantee for first-time subscribers on subscription
            fees only (usage-based charges are non-refundable). Refunds after this period are
            granted at our sole discretion. To request a refund, contact {companyEmail}.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">4.10 Cancellation</h3>
          <p className="mb-4">
            You may cancel your subscription at any time through account settings.
            Cancellation takes effect at the end of the current billing period. You will
            continue to have access to paid features until the end of the period. No partial
            refunds are provided for unused time, but you will not be charged for subsequent periods.
          </p>
          <p className="mb-4">
            Usage-based charges incurred up to the cancellation date will be billed in your
            final invoice. After cancellation, your account will revert to the Free plan.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Usage Metering and Billing Accuracy</h2>

          <h3 className="text-xl font-semibold mb-3 mt-6">5.1 How We Track Usage</h3>
          <p className="mb-4">
            Usage is tracked automatically and in real-time when you use billable features:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>SMS Messages:</strong> Counted when message is successfully sent via our SMS provider</li>
            <li><strong>AI Requests:</strong> Counted when AI processing completes (summarization, email generation, etc.)</li>
            <li><strong>Storage:</strong> Calculated hourly based on total email and attachment size, aggregated monthly</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">5.2 Viewing Usage</h3>
          <p className="mb-4">
            You can view your current usage at any time in your billing dashboard. Usage data includes:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Current billing period usage with daily breakdown</li>
            <li>Included allowance vs. overage charges</li>
            <li>Estimated charges for the current period (updated hourly)</li>
            <li>Historical usage data from previous billing periods</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">5.3 Usage Limits and Throttling</h3>
          <p className="mb-4">
            Each plan tier includes specific usage allowances. If you exceed your plan limits:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>You will be charged overage fees at the rates specified in Section 4.3</li>
            <li>Excessive usage may trigger rate limiting to prevent abuse</li>
            <li>You will receive email notifications when approaching or exceeding limits</li>
            <li>You may upgrade to a higher tier to increase allowances</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">5.4 Billing Accuracy</h3>
          <p className="mb-4">
            We take billing accuracy seriously. Our systems:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Track usage with redundant logging for audit purposes</li>
            <li>Calculate charges using transparent, documented pricing</li>
            <li>Provide detailed invoices showing all charges and taxes</li>
            <li>Retain usage logs for 2 years for dispute resolution</li>
          </ul>
          <p className="mb-4">
            If you discover a billing error, notify us within 30 days and we will investigate
            and issue credits or refunds if the error is confirmed.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Acceptable Use Policy</h2>

          <h3 className="text-xl font-semibold mb-3 mt-6">6.1 Prohibited Activities</h3>
          <p className="mb-4">You agree NOT to:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Send spam, phishing emails, or malicious content</li>
            <li>Use the Service for illegal purposes or fraudulent activities</li>
            <li>Attempt to hack, disrupt, or compromise system security</li>
            <li>Abuse API rate limits or attempt to bypass usage restrictions</li>
            <li>Share your account credentials with unauthorized users</li>
            <li>Scrape, crawl, or reverse-engineer the Service</li>
            <li>Upload viruses, malware, or harmful code</li>
            <li>Impersonate others or misrepresent your affiliation</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">6.2 Consequences of Violation</h3>
          <p className="mb-4">
            Violation of these terms may result in immediate suspension or termination
            of your account without refund.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. AI Features and Content</h2>

          <h3 className="text-xl font-semibold mb-3 mt-6">7.1 AI-Generated Content</h3>
          <p className="mb-4">
            AI-generated summaries and drafts are provided as-is. You are responsible
            for reviewing and editing AI content before sending emails.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">7.2 Data Processing</h3>
          <p className="mb-4">
            By using AI features, you consent to your email content being sent to
            OpenAI for processing. See our Privacy Policy for details on data handling.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">7.3 Usage Limits</h3>
          <p className="mb-4">
            AI feature usage is subject to plan limits. Excessive usage may be throttled
            or require upgrade to a higher tier.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Intellectual Property</h2>

          <h3 className="text-xl font-semibold mb-3 mt-6">8.1 Our IP</h3>
          <p className="mb-4">
            The Service, including source code, design, trademarks, and content,
            is owned by {companyName} and protected by copyright, trademark, and other laws.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">8.2 Your Content</h3>
          <p className="mb-4">
            You retain all rights to your email content. You grant us a limited license
            to process your data solely to provide the Service.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">8.3 Feedback</h3>
          <p className="mb-4">
            Any feedback, suggestions, or ideas you provide may be used by us without
            compensation or attribution.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Third-Party Services</h2>
          <p className="mb-4">
            {companyName} integrates with third-party services (Nylas for email, OpenAI for AI,
            Stripe for payments). Your use of these services is subject to their respective terms.
            We are not responsible for third-party service failures or data breaches.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Service Availability</h2>

          <h3 className="text-xl font-semibold mb-3 mt-6">10.1 Uptime</h3>
          <p className="mb-4">
            We strive for 99.9% uptime but do not guarantee uninterrupted access.
            Scheduled maintenance will be communicated in advance when possible.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">10.2 Modifications</h3>
          <p className="mb-4">
            We reserve the right to modify, suspend, or discontinue the Service
            (or any part thereof) at any time with reasonable notice.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">11. Limitation of Liability</h2>
          <p className="mb-4">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, {companyName.toUpperCase()} SHALL NOT BE LIABLE FOR:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Indirect, incidental, special, or consequential damages</li>
            <li>Loss of profits, data, or business opportunities</li>
            <li>Damages exceeding the amount paid by you in the past 12 months</li>
            <li>Third-party service failures or data breaches</li>
            <li>AI-generated content errors or inaccuracies</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">12. Indemnification</h2>
          <p className="mb-4">
            You agree to indemnify and hold harmless {companyName}, its affiliates, officers,
            and employees from any claims, damages, or expenses arising from your use of the
            Service or violation of these Terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">13. Data Protection and Privacy</h2>
          <p className="mb-4">
            Your use of {companyName} is also governed by our Privacy Policy, which is
            incorporated into these Terms by reference. Please review it carefully.
          </p>
          <p className="mb-4">
            <a href="/legal/privacy" className="text-primary hover:underline">
              View Privacy Policy
            </a>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">14. Termination</h2>

          <h3 className="text-xl font-semibold mb-3 mt-6">14.1 By You</h3>
          <p className="mb-4">
            You may delete your account at any time through account settings.
            Data deletion occurs within 30 days.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">14.2 By Us</h3>
          <p className="mb-4">
            We may suspend or terminate your account for:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Violation of these Terms</li>
            <li>Fraudulent activity or payment failure</li>
            <li>Prolonged inactivity (6+ months on Free plan)</li>
            <li>Legal or regulatory requirements</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">15. Governing Law and Disputes</h2>
          <p className="mb-4">
            These Terms are governed by the laws of [Your Jurisdiction], excluding conflict
            of law provisions. Any disputes shall be resolved through binding arbitration
            or in courts located in [Your Jurisdiction].
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">16. Changes to Terms</h2>
          <p className="mb-4">
            We may revise these Terms at any time. Material changes will be notified via
            email or in-app notification 30 days in advance. Continued use after changes
            constitutes acceptance.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">17. Contact Information</h2>
          <p className="mb-4">
            For questions about these Terms:
          </p>
          <ul className="list-none mb-4 space-y-2">
            <li><strong>Email:</strong> {companyEmail}</li>
            <li><strong>Website:</strong> <a href={appUrl} className="text-primary hover:underline">{appUrl}</a></li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">18. Miscellaneous</h2>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Entire Agreement:</strong> These Terms constitute the entire agreement between you and {companyName}</li>
            <li><strong>Severability:</strong> If any provision is found unenforceable, the remainder stays in effect</li>
            <li><strong>No Waiver:</strong> Failure to enforce a provision does not waive our right to do so later</li>
            <li><strong>Assignment:</strong> You may not assign these Terms. We may assign them to an affiliate or acquirer</li>
          </ul>
        </section>

        <div className="mt-12 p-6 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            These Terms of Service are effective as of {lastUpdated}.
            By using {companyName}, you acknowledge that you have read, understood,
            and agree to be bound by these Terms.
          </p>
        </div>
      </div>
    </div>
  );
}
