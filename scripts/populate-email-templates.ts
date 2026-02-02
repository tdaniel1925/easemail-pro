/**
 * Populate Email Templates with Actual HTML
 *
 * This script updates the default email templates in the database
 * with the beautiful HTML from lib/email/templates/*.ts files
 */

import { db } from '../lib/db/drizzle';
import { emailTemplates } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSignupConfirmationTemplate, getSignupConfirmationSubject } from '../lib/email/templates/signup-confirmation';
import { getTeamInviteTemplate, getTeamInviteSubject } from '../lib/email/templates/team-invite';
import { getPasswordResetTemplate, getPasswordResetSubject } from '../lib/email/templates/password-reset';
import { getMagicLinkTemplate, getMagicLinkSubject } from '../lib/email/templates/magic-link';

async function populateTemplates() {
  console.log('🚀 Starting email template population...\n');

  try {
    // 1. Signup Confirmation Template
    console.log('📧 Updating signup-confirmation template...');
    const signupHtml = getSignupConfirmationTemplate({
      userName: '{{recipientName}}',
      userEmail: '{{recipientEmail}}',
      confirmationUrl: '{{confirmationLink}}',
    });

    const result1 = await db.update(emailTemplates)
      .set({
        subjectTemplate: getSignupConfirmationSubject(),
        htmlTemplate: signupHtml,
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.templateKey, 'signup-confirmation'))
      .returning();

    if (result1.length === 0) {
      console.log('⚠️  Template not found, skipping...');
    }
    console.log('✅ Signup confirmation updated\n');

    // 2. Team Invite Template
    console.log('📧 Updating team-invite template...');
    const teamInviteHtml = getTeamInviteTemplate({
      organizationName: '{{organizationName}}',
      inviterName: '{{inviterName}}',
      inviterEmail: '{{inviterEmail}}',
      recipientEmail: '{{recipientEmail}}',
      role: '{{role}}',
      inviteLink: '{{inviteLink}}',
      expiryDate: '{{expiryDate}}',
    });

    await db.update(emailTemplates)
      .set({
        subjectTemplate: getTeamInviteSubject({
          organizationName: '{{organizationName}}',
          inviterName: '{{inviterName}}',
        }),
        htmlTemplate: teamInviteHtml,
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.templateKey, 'team-invite'));
    console.log('✅ Team invite updated\n');

    // 3. Password Reset Template
    console.log('📧 Updating password-reset template...');
    const passwordResetHtml = getPasswordResetTemplate({
      recipientName: '{{recipientName}}',
      resetLink: '{{resetLink}}',
      expiryHours: '{{expiryHours}}',
    });

    await db.update(emailTemplates)
      .set({
        subjectTemplate: getPasswordResetSubject(),
        htmlTemplate: passwordResetHtml,
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.templateKey, 'password-reset'));
    console.log('✅ Password reset updated\n');

    // 4. Magic Link Template
    console.log('📧 Updating magic-link template...');
    const magicLinkHtml = getMagicLinkTemplate({
      recipientName: '{{recipientName}}',
      magicLink: '{{magicLink}}',
      expiryMinutes: '{{expiryMinutes}}',
    });

    await db.update(emailTemplates)
      .set({
        subjectTemplate: getMagicLinkSubject(),
        htmlTemplate: magicLinkHtml,
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.templateKey, 'magic-link'));
    console.log('✅ Magic link updated\n');

    // 5. New User Credentials Template (keep placeholder - will be created via UI)
    console.log('ℹ️  Skipping new-user-credentials (custom template)\n');

    console.log('✨ All default templates populated successfully!');
    console.log('\nYou can now view and edit them at: /admin/email-templates');

  } catch (error) {
    console.error('❌ Error populating templates:', error);
    throw error;
  }
}

// Run the script
populateTemplates()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
