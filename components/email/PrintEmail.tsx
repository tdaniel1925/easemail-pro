'use client';

import { useRef } from 'react';
import { formatDate } from '@/lib/utils';

interface PrintEmailProps {
  email: {
    id: string;
    subject?: string;
    fromEmail?: string;
    fromName?: string;
    to?: Array<{ email?: string; name?: string }>;
    cc?: Array<{ email?: string; name?: string }>;
    date?: number | Date;
    bodyHtml?: string;
    bodyText?: string;
    attachments?: Array<{ filename?: string; size?: number }>;
  };
}

export function printEmail(email: PrintEmailProps['email']) {
  // Create a new window for printing
  const printWindow = window.open('', '_blank', 'width=800,height=600');

  if (!printWindow) {
    alert('Please allow popups to print this email');
    return;
  }

  const formatRecipients = (recipients?: Array<{ email?: string; name?: string }>) => {
    if (!recipients || recipients.length === 0) return '';
    return recipients.map(r => r.name ? `${r.name} <${r.email}>` : r.email).join(', ');
  };

  const emailDate = email.date
    ? typeof email.date === 'number'
      ? new Date(email.date * 1000)
      : email.date
    : new Date();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${email.subject || 'Email'}</title>
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: #333;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          border-bottom: 2px solid #e5e5e5;
          padding-bottom: 20px;
          margin-bottom: 20px;
        }
        .subject {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 16px;
          color: #111;
        }
        .meta {
          display: grid;
          grid-template-columns: 80px 1fr;
          gap: 8px 16px;
          font-size: 13px;
        }
        .meta-label {
          color: #666;
          font-weight: 500;
        }
        .meta-value {
          color: #333;
        }
        .body {
          padding: 20px 0;
        }
        .body img {
          max-width: 100%;
          height: auto;
        }
        .attachments {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #e5e5e5;
        }
        .attachments-title {
          font-size: 13px;
          font-weight: 600;
          color: #666;
          margin-bottom: 8px;
        }
        .attachment-item {
          display: inline-block;
          background: #f5f5f5;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          margin-right: 8px;
          margin-bottom: 8px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 16px;
          border-top: 1px solid #e5e5e5;
          font-size: 11px;
          color: #999;
          text-align: center;
        }
        @media print {
          body {
            padding: 20px;
          }
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="subject">${email.subject || '(No Subject)'}</h1>
        <div class="meta">
          <span class="meta-label">From:</span>
          <span class="meta-value">${email.fromName ? `${email.fromName} <${email.fromEmail}>` : email.fromEmail || 'Unknown'}</span>

          <span class="meta-label">To:</span>
          <span class="meta-value">${formatRecipients(email.to) || 'Unknown'}</span>

          ${email.cc && email.cc.length > 0 ? `
            <span class="meta-label">CC:</span>
            <span class="meta-value">${formatRecipients(email.cc)}</span>
          ` : ''}

          <span class="meta-label">Date:</span>
          <span class="meta-value">${emailDate.toLocaleString()}</span>
        </div>
      </div>

      <div class="body">
        ${email.bodyHtml || (email.bodyText ? `<pre style="white-space: pre-wrap; font-family: inherit;">${email.bodyText}</pre>` : '<p style="color: #999;">No content</p>')}
      </div>

      ${email.attachments && email.attachments.length > 0 ? `
        <div class="attachments">
          <div class="attachments-title">Attachments (${email.attachments.length})</div>
          ${email.attachments.map(a => `
            <span class="attachment-item">${a.filename || 'Attachment'}</span>
          `).join('')}
        </div>
      ` : ''}

      <div class="footer">
        Printed from EaseMail on ${new Date().toLocaleString()}
      </div>

      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() {
            window.close();
          };
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

// React component version if needed
export function PrintEmailButton({ email, children }: PrintEmailProps & { children?: React.ReactNode }) {
  const handlePrint = () => {
    printEmail(email);
  };

  return (
    <button onClick={handlePrint}>
      {children || 'Print'}
    </button>
  );
}
