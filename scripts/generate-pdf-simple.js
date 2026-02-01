/**
 * Simple PDF Generator for IT Manager's Quick Reference Manual
 * Uses marked to convert markdown to HTML, then puppeteer to generate PDF
 */

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const puppeteer = require('puppeteer');

const inputFile = path.join(__dirname, '../docs/IT-MANAGER-QUICK-REFERENCE.md');
const outputFile = path.join(__dirname, '../docs/IT-MANAGER-QUICK-REFERENCE.pdf');

// Professional CSS styles
const styles = `
  <style>
    @page {
      margin: 30mm 20mm;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
      max-width: 210mm;
      margin: 0 auto;
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
      font-family: 'Courier New', monospace;
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
      margin: 15px 0;
    }

    pre code {
      background-color: transparent;
      padding: 0;
      color: #1f2937;
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

    strong {
      font-weight: 600;
      color: #1f2937;
    }

    hr {
      border: none;
      border-top: 2px solid #e5e7eb;
      margin: 30px 0;
    }

    h1, h2, h3, h4, h5, h6 {
      page-break-after: avoid;
    }

    pre, table, figure {
      page-break-inside: avoid;
    }
  </style>
`;

async function generatePDF() {
  console.log('📄 Generating PDF from IT Manager\'s Quick Reference Manual...\n');

  try {
    // Check if input file exists
    if (!fs.existsSync(inputFile)) {
      throw new Error(`Input file not found: ${inputFile}`);
    }

    console.log(`📖 Reading: ${inputFile}`);
    const markdown = fs.readFileSync(inputFile, 'utf-8');

    console.log('🔄 Converting markdown to HTML...');
    const html = marked.parse(markdown);

    console.log('🎨 Applying professional styling...');
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>EaseMail - IT Manager's Quick Reference Manual</title>
        ${styles}
      </head>
      <body>
        ${html}
      </body>
      </html>
    `;

    console.log('🌐 Launching browser...');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

    console.log('📊 Generating PDF (this may take 1-2 minutes for 100+ pages)...\n');

    await page.pdf({
      path: outputFile,
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
        <div style="width: 100%; font-size: 9px; text-align: center; color: #666; padding: 10px 0; border-bottom: 1px solid #ddd;">
          <span>EaseMail - IT Manager's Quick Reference Manual</span>
        </div>
      `,
      footerTemplate: `
        <div style="width: 100%; font-size: 9px; text-align: center; color: #666; padding: 10px 0; border-top: 1px solid #ddd;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `
    });

    await browser.close();

    console.log('✅ PDF generated successfully!\n');
    console.log(`📁 Output: ${outputFile}`);

    // Get file size
    const stats = fs.statSync(outputFile);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`📊 File size: ${fileSizeInMB} MB`);

    const pageCount = Math.ceil(markdown.split('\n').length / 50);
    console.log(`📄 Estimated pages: ~${pageCount}\n`);

    console.log('🎉 Done! You can now open the PDF file.\n');
    console.log(`Location: ${outputFile}\n`);

  } catch (error) {
    console.error('❌ Error generating PDF:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure puppeteer is installed: npm install puppeteer');
    console.error('2. Make sure marked is installed: npm install marked');
    console.error('3. Check that the markdown file exists');
    console.error('4. On Windows, you may need to install Chrome/Chromium');
    process.exit(1);
  }
}

// Run the generator
generatePDF();
