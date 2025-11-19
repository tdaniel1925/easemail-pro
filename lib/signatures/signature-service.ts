/**
 * Signature Service - Business Logic
 */

import type { SignatureContext, SignatureInsertOptions } from './types';

export class SignatureService {
  /**
   * Replace template variables in signature
   */
  static replaceVariables(signature: string, context: SignatureContext): string {
    const now = new Date();
    
    return signature
      .replace(/\{\{firstName\}\}/g, context.firstName || '')
      .replace(/\{\{lastName\}\}/g, context.lastName || '')
      .replace(/\{\{fullName\}\}/g, context.fullName || `${context.firstName || ''} ${context.lastName || ''}`.trim())
      .replace(/\{\{email\}\}/g, context.email || context.accountEmail || '')
      .replace(/\{\{phone\}\}/g, context.phone || '')
      .replace(/\{\{mobile\}\}/g, context.mobile || '')
      .replace(/\{\{title\}\}/g, context.title || '')
      .replace(/\{\{company\}\}/g, context.company || '')
      .replace(/\{\{website\}\}/g, context.website || '')
      .replace(/\{\{linkedin\}\}/g, context.linkedin || '')
      .replace(/\{\{twitter\}\}/g, context.twitter || '')
      .replace(/\{\{date\}\}/g, now.toLocaleDateString())
      .replace(/\{\{time\}\}/g, now.toLocaleTimeString());
  }

  /**
   * Insert signature into email body at appropriate position
   */
  static insertSignature(
    body: string,
    signature: string,
    options: SignatureInsertOptions
  ): string {
    const { type, quotedContent } = options;

    // Shared spacing for signature insertion to guarantee blank lines
    const signatureSpacingHtml = '<div><br/></div><div><br/></div>';

    // For new emails, append signature after two blank lines so users can type above it
    if (type === 'compose') {
      return `${body || ''}${signatureSpacingHtml}${signature}`;
    }

    // For replies/forwards, insert before quoted content
    if (quotedContent && body.includes(quotedContent)) {
      const parts = body.split(quotedContent);
      return `${parts[0]}\n\n${signature}\n\n${quotedContent}${parts[1] || ''}`;
    }

    // Fallback: Look for common reply indicators
    const replyIndicators = [
      /\n\n?On .+wrote:\n/,
      /\n\n?From: .+\n/,
      /\n\n?-+Original Message-+\n/,
      /\n\n?-+Forwarded [Mm]essage-+\n/,
    ];

    for (const indicator of replyIndicators) {
      const match = body.match(indicator);
      if (match && match.index !== undefined) {
        const insertPoint = match.index;
        return `${body.slice(0, insertPoint)}\n\n${signature}\n${body.slice(insertPoint)}`;
      }
    }

    // If no quoted content found, append at end
    return `${body}\n\n${signature}`;
  }

  /**
   * Strip existing signature from body
   */
  static stripSignature(body: string, signature: string): string {
    // Remove exact signature match
    if (body.includes(signature)) {
      return body.replace(signature, '').trim();
    }

    // Remove signature without variable replacement
    const signaturePattern = signature
      .replace(/\{\{[^}]+\}\}/g, '[^<>]+')
      .replace(/\n/g, '\\s*');
    
    const regex = new RegExp(signaturePattern, 'gi');
    return body.replace(regex, '').trim();
  }

  /**
   * Get signature context from user and account data
   */
  static getSignatureContext(
    user: any,
    account: any
  ): SignatureContext {
    return {
      firstName: user?.firstName || user?.fullName?.split(' ')[0] || '',
      lastName: user?.lastName || user?.fullName?.split(' ').slice(1).join(' ') || '',
      fullName: user?.fullName || user?.email?.split('@')[0] || '',
      email: user?.email || '',
      accountEmail: account?.emailAddress || account?.email || '',
      // These would come from user profile settings
      phone: user?.phone || '',
      mobile: user?.mobile || '',
      title: user?.title || '',
      company: user?.company || '',
      website: user?.website || '',
      linkedin: user?.linkedin || '',
      twitter: user?.twitter || '',
    };
  }

  /**
   * Get default signature HTML template
   */
  static getDefaultTemplate(context: SignatureContext): string {
    return `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
  <p style="margin: 0 0 8px 0;"><strong>{{fullName}}</strong></p>
  <p style="margin: 0 0 4px 0; font-size: 13px; color: #666;">{{title}}</p>
  <p style="margin: 0 0 12px 0; font-size: 13px; color: #666;">{{company}}</p>
  <p style="margin: 0; font-size: 12px; color: #666;">
    📧 <a href="mailto:{{email}}" style="color: #0066cc; text-decoration: none;">{{email}}</a>
    ${context.phone ? ' | 📞 {{phone}}' : ''}
  </p>
  ${context.website ? '<p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">🌐 <a href="{{website}}" style="color: #0066cc; text-decoration: none;">{{website}}</a></p>' : ''}
</div>`;
  }

  /**
   * Convert HTML signature to plain text
   */
  static htmlToPlainText(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}

