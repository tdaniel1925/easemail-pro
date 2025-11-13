/**
 * Print Email Utility
 *
 * Handles printing emails with a clean, print-friendly layout
 */

interface PrintEmailOptions {
  subject: string;
  from: { name: string; email: string };
  to?: Array<{ name?: string; email: string }>;
  cc?: Array<{ name?: string; email: string }>;
  date: Date;
  body: string;
  attachments?: Array<{
    filename: string;
    size: number;
  }>;
  includeHeaders?: boolean;
  includeAttachments?: boolean;
  onError?: (message: string) => void;
}

/**
 * Format email recipients for display
 */
function formatRecipients(recipients?: Array<{ name?: string; email: string }>): string {
  if (!recipients || recipients.length === 0) return '';
  return recipients
    .map(r => r.name ? `${r.name} <${r.email}>` : r.email)
    .join(', ');
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Print an email with a clean, print-friendly layout
 */
export function printEmail(options: PrintEmailOptions) {
  const {
    subject,
    from,
    to,
    cc,
    date,
    body,
    attachments = [],
    includeHeaders = true,
    includeAttachments = true,
    onError,
  } = options;

  // Create print window content
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    const message = 'Please allow pop-ups to print emails';
    if (onError) {
      onError(message);
    } else {
      alert(message);
    }
    return;
  }

  // Format date
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);

  // Build HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Print: ${subject}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 12pt;
          line-height: 1.6;
          color: #000;
          background: #fff;
          padding: 20mm;
        }

        .email-container {
          max-width: 100%;
        }

        .email-header {
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #000;
        }

        .email-subject {
          font-size: 18pt;
          font-weight: bold;
          margin-bottom: 20px;
          color: #000;
        }

        .email-meta {
          font-size: 11pt;
          line-height: 1.8;
        }

        .email-meta-row {
          display: flex;
          margin-bottom: 8px;
        }

        .email-meta-label {
          font-weight: bold;
          width: 80px;
          flex-shrink: 0;
          color: #333;
        }

        .email-meta-value {
          color: #000;
          word-break: break-word;
        }

        .email-body {
          margin: 30px 0;
          white-space: pre-wrap;
          word-wrap: break-word;
          font-size: 11pt;
          line-height: 1.6;
        }

        .email-attachments {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ccc;
        }

        .attachments-title {
          font-size: 12pt;
          font-weight: bold;
          margin-bottom: 15px;
          color: #000;
        }

        .attachment-item {
          padding: 10px;
          margin-bottom: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: #f9f9f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .attachment-name {
          font-weight: 500;
          color: #000;
        }

        .attachment-size {
          color: #666;
          font-size: 10pt;
        }

        .print-footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ccc;
          font-size: 9pt;
          color: #666;
          text-align: center;
        }

        @media print {
          body {
            padding: 0;
          }

          .email-header {
            page-break-after: avoid;
          }

          .email-body {
            page-break-inside: avoid;
          }

          .attachment-item {
            page-break-inside: avoid;
          }
        }

        @page {
          margin: 20mm;
          size: A4;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <!-- Subject -->
        <div class="email-header">
          <h1 class="email-subject">${subject}</h1>

          ${includeHeaders ? `
          <div class="email-meta">
            <div class="email-meta-row">
              <div class="email-meta-label">From:</div>
              <div class="email-meta-value">${from.name} &lt;${from.email}&gt;</div>
            </div>
            ${to && to.length > 0 ? `
            <div class="email-meta-row">
              <div class="email-meta-label">To:</div>
              <div class="email-meta-value">${formatRecipients(to)}</div>
            </div>
            ` : ''}
            ${cc && cc.length > 0 ? `
            <div class="email-meta-row">
              <div class="email-meta-label">Cc:</div>
              <div class="email-meta-value">${formatRecipients(cc)}</div>
            </div>
            ` : ''}
            <div class="email-meta-row">
              <div class="email-meta-label">Date:</div>
              <div class="email-meta-value">${formattedDate}</div>
            </div>
          </div>
          ` : ''}
        </div>

        <!-- Email Body -->
        <div class="email-body">${body}</div>

        <!-- Attachments -->
        ${includeAttachments && attachments.length > 0 ? `
        <div class="email-attachments">
          <h2 class="attachments-title">Attachments (${attachments.length})</h2>
          ${attachments.map(att => `
            <div class="attachment-item">
              <span class="attachment-name">${att.filename}</span>
              <span class="attachment-size">${formatFileSize(att.size)}</span>
            </div>
          `).join('')}
        </div>
        ` : ''}

        <!-- Print Footer -->
        <div class="print-footer">
          Printed on ${new Date().toLocaleString()} from EaseMail
        </div>
      </div>

      <script>
        // Auto-trigger print dialog when page loads
        window.onload = function() {
          window.print();
          // Optionally close the window after printing (user can cancel)
          // window.onafterprint = function() {
          //   window.close();
          // };
        };
      </script>
    </body>
    </html>
  `;

  // Write content and trigger print
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
