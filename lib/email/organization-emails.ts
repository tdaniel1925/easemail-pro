import { sendEmail } from './send';
import { getOrganizationWelcomeTemplate, getOrganizationWelcomeSubject } from './templates/organization-welcome';
import { logger } from '@/lib/utils/logger';

interface SendOrganizationWelcomeEmailParams {
  ownerName: string;
  ownerEmail: string;
  organizationName: string;
  organizationSlug: string;
}

/**
 * Send welcome email to organization owner after organization creation
 */
export async function sendOrganizationWelcomeEmail(params: SendOrganizationWelcomeEmailParams) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.easemail.com';

    const emailData = {
      ownerName: params.ownerName,
      ownerEmail: params.ownerEmail,
      organizationName: params.organizationName,
      organizationSlug: params.organizationSlug,
      loginUrl: `${appUrl}/login`,
      dashboardUrl: `${appUrl}/inbox`,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@easemail.app',
    };

    const result = await sendEmail({
      to: params.ownerEmail,
      subject: getOrganizationWelcomeSubject(params.organizationName),
      html: getOrganizationWelcomeTemplate(emailData),
    });

    if (result.success) {
      logger.email.info('Organization welcome email sent successfully', {
        recipient: params.ownerEmail,
        organization: params.organizationName,
      });
    } else {
      logger.email.error('Failed to send organization welcome email', {
        recipient: params.ownerEmail,
        organization: params.organizationName,
        error: result.error,
      });
    }

    return result;
  } catch (error: any) {
    logger.email.error('Exception sending organization welcome email', {
      error: error.message,
      recipient: params.ownerEmail,
      organization: params.organizationName,
    });

    return { success: false, error };
  }
}
