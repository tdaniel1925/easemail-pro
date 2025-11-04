/**
 * Migration Script: Load Email Templates into Database
 * 
 * This script reads the existing email template files and inserts them into the database.
 * Run this once to migrate from code-based templates to database-stored templates.
 * 
 * Usage: npx tsx scripts/migrate-email-templates.ts
 */

import { db } from '../lib/db/drizzle';
import { emailTemplates, emailTemplateVersions } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { getNewUserCredentialsTemplate, getNewUserCredentialsSubject } from '../lib/email/templates/new-user-credentials';
import { getTeamInviteTemplate, getTeamInviteSubject } from '../lib/email/templates/team-invite';

// Sample data for generating templates
const sampleNewUserData = {
  recipientName: 'John Doe',
  recipientEmail: 'john@example.com',
  organizationName: 'Acme Corp',
  tempPassword: 'temp123456',
  loginUrl: 'https://easemail.app/login',
  expiryDays: 7,
  adminName: 'Jane Admin',
};

const sampleTeamInviteData = {
  organizationName: 'Acme Corp',
  inviterName: 'Jane Admin',
  inviterEmail: 'jane@example.com',
  recipientEmail: 'john@example.com',
  role: 'member' as const,
  inviteLink: 'https://easemail.app/invite/abc123',
  expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
};

const templatesToMigrate = [
  {
    templateKey: 'new-user-credentials',
    name: 'New User Credentials',
    description: 'Sent when an admin creates a new user account with temporary credentials',
    category: 'auth',
    triggerEvent: 'Admin creates new user',
    requiredVariables: [
      'recipientName',
      'recipientEmail',
      'organizationName',
      'tempPassword',
      'loginUrl',
      'expiryDays',
      'adminName',
    ],
    getSubject: () => getNewUserCredentialsSubject(sampleNewUserData),
    getHtml: () => getNewUserCredentialsTemplate(sampleNewUserData),
  },
  {
    templateKey: 'team-invite',
    name: 'Team Invitation',
    description: 'Sent when inviting a user to join an organization team',
    category: 'team',
    triggerEvent: 'Admin invites team member',
    requiredVariables: [
      'organizationName',
      'inviterName',
      'inviterEmail',
      'recipientEmail',
      'role',
      'inviteLink',
      'expiryDate',
    ],
    getSubject: () => getTeamInviteSubject(sampleTeamInviteData),
    getHtml: () => getTeamInviteTemplate(sampleTeamInviteData),
  },
  {
    templateKey: 'password-reset',
    name: 'Password Reset',
    description: 'Sent when a user requests a password reset link',
    category: 'auth',
    triggerEvent: 'User requests password reset',
    requiredVariables: ['recipientName', 'resetLink', 'expiryHours'],
    getSubject: () => 'Reset Your EaseMail Password',
    getHtml: () => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">Reset Your Password</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a5568;">
                Hi <strong>{{recipientName}}</strong>,
              </p>
              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #4a5568;">
                We received a request to reset your password. Click the button below to choose a new password:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{resetLink}}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <div style="padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; margin-bottom: 30px;">
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #78350f;">
                  <strong>⚠️ Security Notice:</strong> This link will expire in <strong>{{expiryHours}} hours</strong>. If you didn't request this reset, please ignore this email.
                </p>
              </div>
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #718096; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <strong>Having trouble with the button?</strong> Copy and paste this URL:<br>
                <a href="{{resetLink}}" style="color: #667eea; word-break: break-all;">{{resetLink}}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; text-align: center; background-color: #f7fafc; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 12px; color: #a0aec0;">
                © ${new Date().getFullYear()} EaseMail. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  },
  {
    templateKey: 'magic-link',
    name: 'Magic Link Login',
    description: 'Sent when a user requests a passwordless sign-in link',
    category: 'auth',
    triggerEvent: 'User requests magic link',
    requiredVariables: ['recipientName', 'magicLink', 'expiryMinutes'],
    getSubject: () => 'Your Magic Link to Sign In',
    getHtml: () => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Magic Link</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <div style="font-size: 48px; margin-bottom: 16px;">✨</div>
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">Your Magic Link</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a5568;">
                Hi <strong>{{recipientName}}</strong>,
              </p>
              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #4a5568;">
                Click the button below to sign in to your EaseMail account. No password needed!
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{magicLink}}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Sign In Now
                    </a>
                  </td>
                </tr>
              </table>
              <div style="padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; margin-bottom: 30px;">
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #78350f;">
                  <strong>⏱️ Quick Action Required:</strong> This link will expire in <strong>{{expiryMinutes}} minutes</strong>. If you didn't request this link, please ignore this email.
                </p>
              </div>
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #718096; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <strong>Having trouble with the button?</strong> Copy and paste this URL:<br>
                <a href="{{magicLink}}" style="color: #667eea; word-break: break-all;">{{magicLink}}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; text-align: center; background-color: #f7fafc; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 12px; color: #a0aec0;">
                © ${new Date().getFullYear()} EaseMail. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  },
  {
    templateKey: 'signup-confirmation',
    name: 'Signup Confirmation',
    description: 'Sent when a new user signs up to verify their email address',
    category: 'auth',
    triggerEvent: 'User signs up',
    requiredVariables: ['recipientName', 'confirmationLink'],
    getSubject: () => 'Confirm Your EaseMail Account',
    getHtml: () => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Account</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">Welcome to EaseMail!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a5568;">
                Hi <strong>{{recipientName}}</strong>,
              </p>
              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #4a5568;">
                Thank you for signing up! To complete your registration and start using EaseMail, please confirm your email address by clicking the button below:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{confirmationLink}}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Confirm Email Address
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #4a5568;">
                Once confirmed, you'll be able to:
              </p>
              <ul style="margin: 0 0 30px; padding-left: 24px; font-size: 15px; line-height: 1.8; color: #4a5568;">
                <li>Connect your email accounts</li>
                <li>Use AI-powered email features</li>
                <li>Automate your workflows</li>
                <li>Access all premium features</li>
              </ul>
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #718096; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <strong>Having trouble with the button?</strong> Copy and paste this URL:<br>
                <a href="{{confirmationLink}}" style="color: #667eea; word-break: break-all;">{{confirmationLink}}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; text-align: center; background-color: #f7fafc; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 12px; color: #a0aec0;">
                © ${new Date().getFullYear()} EaseMail. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  },
];

async function migrateTemplates() {
  console.log('🚀 Starting email template migration...\n');

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const template of templatesToMigrate) {
    try {
      console.log(`📧 Processing: ${template.name} (${template.templateKey})`);

      // Check if template already exists
      const existing = await db.query.emailTemplates.findFirst({
        where: eq(emailTemplates.templateKey, template.templateKey),
      });

      if (existing) {
        console.log(`   ⏭️  Skipped - already exists (v${existing.version})\n`);
        skippedCount++;
        continue;
      }

      // Generate template content
      const subjectTemplate = template.getSubject();
      const htmlTemplate = template.getHtml();

      // Replace actual values with template variables
      let processedHtml = htmlTemplate;
      let processedSubject = subjectTemplate;

      // Insert template
      const [newTemplate] = await db.insert(emailTemplates).values({
        templateKey: template.templateKey,
        name: template.name,
        description: template.description,
        subjectTemplate: processedSubject,
        htmlTemplate: processedHtml,
        category: template.category,
        triggerEvent: template.triggerEvent,
        requiredVariables: template.requiredVariables,
        version: 1,
        isActive: true,
        isDefault: true, // Mark as system default
      }).returning();

      // Create initial version
      await db.insert(emailTemplateVersions).values({
        templateId: newTemplate.id,
        version: 1,
        subjectTemplate: processedSubject,
        htmlTemplate: processedHtml,
        changeNotes: 'Initial template migration from code',
      });

      console.log(`   ✅ Success - created template (ID: ${newTemplate.id})\n`);
      successCount++;
    } catch (error) {
      console.error(`   ❌ Error - ${error}\n`);
      errorCount++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Successfully migrated: ${successCount}`);
  console.log(`   ⏭️  Skipped (already exist): ${skippedCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (errorCount === 0) {
    console.log('✨ Migration completed successfully!');
  } else {
    console.log('⚠️  Migration completed with errors. Please review the output above.');
  }
}

// Run migration
migrateTemplates()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });

