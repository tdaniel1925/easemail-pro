/**
 * Billing Email Notifications
 * 
 * Sends email notifications for billing events via Resend
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface BillingNotificationData {
  runId: string;
  accountsProcessed: number;
  chargesSuccessful: number;
  chargesFailed: number;
  totalAmountCharged: number;
  errors: Array<{ userId?: string; organizationId?: string; error: string }>;
}

interface PaymentMethodRequiredData {
  userEmail: string;
  userName: string;
  subscriptionTier: string;
  enforceAfter: Date;
  gracePeriodDays: number;
}

interface ChargeSuccessData {
  userEmail: string;
  userName: string;
  amount: number;
  invoiceNumber?: string;
  periodStart: Date;
  periodEnd: Date;
  breakdown: {
    sms: number;
    ai: number;
    storage: number;
  };
}

interface ChargeFailureData {
  userEmail: string;
  userName: string;
  amount: number;
  reason: string;
  retryDate?: Date;
}

/**
 * Send billing run completion notification to admin
 */
export async function sendBillingRunNotification(
  data: BillingNotificationData,
  adminEmail: string
): Promise<void> {
  try {
    const subject = data.chargesFailed > 0
      ? `⚠️ Billing Run Completed with ${data.chargesFailed} Failures`
      : `✅ Billing Run Completed Successfully`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .stats { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .stat-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .stat-label { font-weight: 600; }
          .success { color: #059669; }
          .error { color: #dc2626; }
          .errors { background: #fee2e2; padding: 15px; border-radius: 6px; margin-top: 15px; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">EaseMail Billing Report</h1>
            <p style="margin: 5px 0 0 0;">Run ID: ${data.runId}</p>
          </div>
          <div class="content">
            <div class="stats">
              <div class="stat-row">
                <span class="stat-label">Accounts Processed:</span>
                <span>${data.accountsProcessed}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Successful Charges:</span>
                <span class="success">${data.chargesSuccessful}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Failed Charges:</span>
                <span class="${data.chargesFailed > 0 ? 'error' : 'success'}">${data.chargesFailed}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Total Revenue:</span>
                <span class="success"><strong>$${data.totalAmountCharged.toFixed(2)}</strong></span>
              </div>
            </div>
            
            ${data.errors.length > 0 ? `
              <div class="errors">
                <h3 style="margin-top: 0; color: #dc2626;">Failed Charges (${data.errors.length})</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  ${data.errors.slice(0, 10).map(err => `
                    <li>
                      <strong>${err.userId || err.organizationId}</strong><br>
                      <span style="color: #6b7280;">${err.error}</span>
                    </li>
                  `).join('')}
                  ${data.errors.length > 10 ? `<li><em>... and ${data.errors.length - 10} more</em></li>` : ''}
                </ul>
              </div>
            ` : ''}
            
            <p style="margin-top: 20px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/billing-config" 
                 style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Billing Dashboard
              </a>
            </p>
          </div>
          <div class="footer">
            <p>EaseMail Automated Billing System</p>
            <p>${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await resend.emails.send({
      from: 'EaseMail Billing <billing@easemail.app>',
      to: adminEmail,
      subject,
      html,
    });

    console.log(`✅ Billing notification sent to ${adminEmail}`);
  } catch (error) {
    console.error('Failed to send billing notification:', error);
  }
}

/**
 * Send payment method required notification to user
 */
export async function sendPaymentMethodRequiredEmail(
  data: PaymentMethodRequiredData
): Promise<void> {
  try {
    const daysLeft = Math.ceil((data.enforceAfter.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
          .cta { text-align: center; margin: 25px 0; }
          .button { background: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">⚠️ Payment Method Required</h1>
          </div>
          <div class="content">
            <p>Hi ${data.userName},</p>
            
            <div class="alert">
              <p style="margin: 0;"><strong>Action Required:</strong> Your EaseMail ${data.subscriptionTier} subscription requires a payment method on file.</p>
            </div>
            
            <p>To continue using EaseMail without interruption, please add a payment method to your account within the next <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>.</p>
            
            <p><strong>What happens if I don't add a payment method?</strong></p>
            <ul>
              <li>Your account will be temporarily suspended after ${data.gracePeriodDays} days</li>
              <li>You won't be able to send emails or use AI features</li>
              <li>Your account will be automatically reactivated once you add a payment method</li>
            </ul>
            
            <div class="cta">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/billing" class="button">
                Add Payment Method
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              <strong>Note:</strong> You can continue using all features during the grace period. This is just a friendly reminder to add your payment information.
            </p>
          </div>
          <div class="footer">
            <p>EaseMail - Making Email Management Effortless</p>
            <p>If you have questions, reply to this email or contact support.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await resend.emails.send({
      from: 'EaseMail <notifications@easemail.app>',
      to: data.userEmail,
      subject: '⚠️ Payment Method Required for Your EaseMail Account',
      html,
    });

    console.log(`✅ Payment method required notification sent to ${data.userEmail}`);
  } catch (error) {
    console.error('Failed to send payment method notification:', error);
  }
}

/**
 * Send successful charge notification to user
 */
export async function sendChargeSuccessEmail(
  data: ChargeSuccessData
): Promise<void> {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .invoice { background: white; padding: 20px; border-radius: 6px; margin: 15px 0; }
          .breakdown { border-top: 2px solid #e5e7eb; padding-top: 15px; margin-top: 15px; }
          .line-item { display: flex; justify-content: space-between; padding: 8px 0; }
          .total { font-size: 18px; font-weight: bold; border-top: 2px solid #4f46e5; padding-top: 15px; margin-top: 15px; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">✅ Payment Successful</h1>
            ${data.invoiceNumber ? `<p style="margin: 5px 0 0 0;">Invoice #${data.invoiceNumber}</p>` : ''}
          </div>
          <div class="content">
            <p>Hi ${data.userName},</p>
            
            <p>Your payment has been processed successfully. Thank you for using EaseMail!</p>
            
            <div class="invoice">
              <p><strong>Billing Period:</strong><br>
              ${data.periodStart.toLocaleDateString()} - ${data.periodEnd.toLocaleDateString()}</p>
              
              <div class="breakdown">
                <h3 style="margin: 0 0 15px 0;">Usage Charges</h3>
                ${data.breakdown.sms > 0 ? `
                  <div class="line-item">
                    <span>SMS Messages</span>
                    <span>$${data.breakdown.sms.toFixed(2)}</span>
                  </div>
                ` : ''}
                ${data.breakdown.ai > 0 ? `
                  <div class="line-item">
                    <span>AI Features</span>
                    <span>$${data.breakdown.ai.toFixed(2)}</span>
                  </div>
                ` : ''}
                ${data.breakdown.storage > 0 ? `
                  <div class="line-item">
                    <span>Storage Overage</span>
                    <span>$${data.breakdown.storage.toFixed(2)}</span>
                  </div>
                ` : ''}
              </div>
              
              <div class="line-item total">
                <span>Total Charged</span>
                <span style="color: #059669;">$${data.amount.toFixed(2)}</span>
              </div>
            </div>
            
            <p style="text-align: center; margin-top: 25px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/billing" 
                 style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Billing Details
              </a>
            </p>
          </div>
          <div class="footer">
            <p>EaseMail - Making Email Management Effortless</p>
            <p>Questions? Contact us at billing@easemail.app</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await resend.emails.send({
      from: 'EaseMail Billing <billing@easemail.app>',
      to: data.userEmail,
      subject: `✅ Payment Received - $${data.amount.toFixed(2)}`,
      html,
    });

    console.log(`✅ Charge success notification sent to ${data.userEmail}`);
  } catch (error) {
    console.error('Failed to send charge success notification:', error);
  }
}

/**
 * Send charge failure notification to user
 */
export async function sendChargeFailureEmail(
  data: ChargeFailureData
): Promise<void> {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .alert { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; }
          .cta { text-align: center; margin: 25px 0; }
          .button { background: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">❌ Payment Failed</h1>
          </div>
          <div class="content">
            <p>Hi ${data.userName},</p>
            
            <div class="alert">
              <p style="margin: 0;"><strong>Payment Failed:</strong> We were unable to process your payment of $${data.amount.toFixed(2)}.</p>
            </div>
            
            <p><strong>Reason:</strong> ${data.reason}</p>
            
            ${data.retryDate ? `
              <p>We'll automatically retry this charge on ${data.retryDate.toLocaleDateString()}. You can also update your payment method now to process the charge immediately.</p>
            ` : `
              <p>Please update your payment method to avoid service interruption.</p>
            `}
            
            <p><strong>What you should do:</strong></p>
            <ul>
              <li>Check if your card is expired or has insufficient funds</li>
              <li>Update your payment method in billing settings</li>
              <li>Contact your bank if the issue persists</li>
            </ul>
            
            <div class="cta">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/billing" class="button">
                Update Payment Method
              </a>
            </div>
          </div>
          <div class="footer">
            <p>EaseMail - Making Email Management Effortless</p>
            <p>Need help? Contact us at billing@easemail.app</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await resend.emails.send({
      from: 'EaseMail Billing <billing@easemail.app>',
      to: data.userEmail,
      subject: '❌ Payment Failed - Action Required',
      html,
    });

    console.log(`✅ Charge failure notification sent to ${data.userEmail}`);
  } catch (error) {
    console.error('Failed to send charge failure notification:', error);
  }
}

