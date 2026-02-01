/**
 * Generate PDF from IT Manager's Quick Reference Manual
 *
 * This script converts the markdown documentation to a professional PDF
 * with styling, table of contents, and proper page breaks.
 */

const { mdToPdf } = require('md-to-pdf');
const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../docs/IT-MANAGER-QUICK-REFERENCE.md');
const outputFile = path.join(__dirname, '../docs/IT-MANAGER-QUICK-REFERENCE.pdf');

// PDF configuration with professional styling
const pdfConfig = {
  // Page configuration
  pdf_options: {
    format: 'Letter',
    margin: {
      top: '30mm',
      right: '20mm',
      bottom: '30mm',
      left: '20mm'
    },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="width: 100%; font-size: 9px; text-align: center; color: #666; padding: 10px 0;">
        <span>EaseMail - IT Manager's Quick Reference Manual</span>
      </div>
    `,
    footerTemplate: `
      <div style="width: 100%; font-size: 9px; text-align: center; color: #666; padding: 10px 0;">
        <span class="pageNumber"></span> / <span class="totalPages"></span>
      </div>
    `
  },

  // CSS styling for professional appearance
  stylesheet: `
    @page {
      margin: 30mm 20mm;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
      max-width: 100%;
      padding: 0;
    }

    h1 {
      font-size: 24pt;
      font-weight: 700;
      color: #1a1a1a;
      margin-top: 30px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 3px solid #3b82f6;
      page-break-before: always;
    }

    h1:first-of-type {
      page-break-before: avoid;
      margin-top: 0;
    }

    h2 {
      font-size: 18pt;
      font-weight: 600;
      color: #2563eb;
      margin-top: 25px;
      margin-bottom: 12px;
      padding-bottom: 5px;
      border-bottom: 2px solid #dbeafe;
      page-break-after: avoid;
    }

    h3 {
      font-size: 14pt;
      font-weight: 600;
      color: #1e40af;
      margin-top: 20px;
      margin-bottom: 10px;
      page-break-after: avoid;
    }

    h4 {
      font-size: 12pt;
      font-weight: 600;
      color: #1e3a8a;
      margin-top: 15px;
      margin-bottom: 8px;
    }

    h5 {
      font-size: 11pt;
      font-weight: 600;
      color: #1e40af;
      margin-top: 12px;
      margin-bottom: 6px;
    }

    p {
      margin: 8px 0;
      text-align: justify;
    }

    ul, ol {
      margin: 10px 0;
      padding-left: 25px;
    }

    li {
      margin: 5px 0;
    }

    code {
      background-color: #f3f4f6;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 10pt;
      color: #dc2626;
    }

    pre {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 15px;
      overflow-x: auto;
      font-size: 9pt;
      line-height: 1.4;
      page-break-inside: avoid;
    }

    pre code {
      background-color: transparent;
      padding: 0;
      color: #1f2937;
      font-size: 9pt;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 10pt;
      page-break-inside: avoid;
    }

    thead {
      background-color: #3b82f6;
      color: white;
    }

    th {
      padding: 10px;
      text-align: left;
      font-weight: 600;
      border: 1px solid #2563eb;
    }

    td {
      padding: 8px 10px;
      border: 1px solid #e5e7eb;
    }

    tbody tr:nth-child(even) {
      background-color: #f9fafb;
    }

    tbody tr:hover {
      background-color: #f3f4f6;
    }

    blockquote {
      border-left: 4px solid #3b82f6;
      padding-left: 15px;
      margin: 15px 0;
      color: #4b5563;
      font-style: italic;
      background-color: #f9fafb;
      padding: 10px 15px;
      border-radius: 4px;
    }

    a {
      color: #2563eb;
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    hr {
      border: none;
      border-top: 2px solid #e5e7eb;
      margin: 30px 0;
    }

    strong {
      font-weight: 600;
      color: #1f2937;
    }

    em {
      font-style: italic;
      color: #4b5563;
    }

    kbd {
      background-color: #1f2937;
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 9pt;
      border: 1px solid #374151;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    /* Table of contents styling */
    .toc {
      background-color: #f9fafb;
      border: 2px solid #3b82f6;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      page-break-after: always;
    }

    .toc h2 {
      margin-top: 0;
      border-bottom: none;
    }

    /* Cover page styling */
    .cover {
      text-align: center;
      padding: 100px 0;
      page-break-after: always;
    }

    .cover h1 {
      font-size: 36pt;
      margin-bottom: 20px;
      border-bottom: none;
      page-break-before: avoid;
    }

    .cover .subtitle {
      font-size: 18pt;
      color: #6b7280;
      margin-bottom: 50px;
    }

    .cover .metadata {
      font-size: 12pt;
      color: #9ca3af;
      margin-top: 50px;
    }

    /* Avoid page breaks inside important elements */
    h1, h2, h3, h4, h5, h6 {
      page-break-after: avoid;
    }

    pre, table, figure {
      page-break-inside: avoid;
    }

    /* Print optimization */
    @media print {
      body {
        font-size: 10pt;
      }

      h1 {
        font-size: 22pt;
      }

      h2 {
        font-size: 16pt;
      }

      h3 {
        font-size: 13pt;
      }
    }
  `,

  // Launch options for Puppeteer
  launch_options: {
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
};

async function generatePDF() {
  console.log('📄 Generating PDF from IT Manager\'s Quick Reference Manual...\n');

  try {
    // Check if input file exists
    if (!fs.existsSync(inputFile)) {
      throw new Error(`Input file not found: ${inputFile}`);
    }

    console.log(`📖 Reading: ${inputFile}`);

    // Read the markdown file
    const markdown = fs.readFileSync(inputFile, 'utf-8');

    console.log('🎨 Applying professional styling...');
    console.log('📊 Generating tables and formatting code blocks...');
    console.log('⏳ This may take 1-2 minutes for a 100+ page document...\n');

    // Generate PDF with inline styles
    const pdf = await mdToPdf({ content: markdown }, {
      ...pdfConfig,
      stylesheet_encoding: 'utf-8'
    });

    if (pdf) {
      // Save PDF to file
      fs.writeFileSync(outputFile, pdf.content);

      console.log('✅ PDF generated successfully!\n');
      console.log(`📁 Output: ${outputFile}`);

      // Get file size
      const stats = fs.statSync(outputFile);
      const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`📊 File size: ${fileSizeInMB} MB`);
      console.log(`📄 Pages: ~${Math.ceil(markdown.split('\n').length / 50)} pages\n`);

      console.log('🎉 Done! You can now open the PDF file.\n');
    } else {
      throw new Error('PDF generation failed - no content returned');
    }

  } catch (error) {
    console.error('❌ Error generating PDF:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure Chromium is installed (required by Puppeteer)');
    console.error('2. Try running: npm install puppeteer');
    console.error('3. Check that the markdown file exists');
    process.exit(1);
  }
}

// Run the generator
generatePDF();
