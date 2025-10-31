/**
 * Seed Data Generator for Attachments
 * Creates realistic test data for development/testing
 */

import { db } from '@/lib/db/drizzle';
import { attachments } from '@/lib/db/schema';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000000';

interface SeedAttachment {
  filename: string;
  extension: string;
  mimeType: string;
  sizeBytes: number;
  subject: string;
  senderEmail: string;
  senderName: string;
  daysAgo: number;
  documentType?: string;
  confidence?: number;
}

const SEED_DATA: SeedAttachment[] = [
  // Invoices
  {
    filename: 'invoice_AWS_2024_001.pdf',
    extension: 'pdf',
    mimeType: 'application/pdf',
    sizeBytes: 245000,
    subject: 'AWS Invoice for January 2024',
    senderEmail: 'billing@aws.amazon.com',
    senderName: 'AWS Billing',
    daysAgo: 2,
    documentType: 'invoice',
    confidence: 95,
  },
  {
    filename: 'invoice_hosting_feb.pdf',
    extension: 'pdf',
    mimeType: 'application/pdf',
    sizeBytes: 156000,
    subject: 'Monthly Hosting Bill - February',
    senderEmail: 'billing@digitalocean.com',
    senderName: 'DigitalOcean',
    daysAgo: 15,
    documentType: 'invoice',
    confidence: 94,
  },

  // Receipts
  {
    filename: 'receipt_starbucks_01.jpg',
    extension: 'jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 180000,
    subject: 'Your Starbucks Receipt',
    senderEmail: 'receipts@starbucks.com',
    senderName: 'Starbucks',
    daysAgo: 1,
    documentType: 'receipt',
    confidence: 92,
  },
  {
    filename: 'uber_trip_receipt.pdf',
    extension: 'pdf',
    mimeType: 'application/pdf',
    sizeBytes: 89000,
    subject: 'Your trip with Uber',
    senderEmail: 'receipts@uber.com',
    senderName: 'Uber',
    daysAgo: 4,
    documentType: 'receipt',
    confidence: 96,
  },

  // Contracts
  {
    filename: 'service_agreement_signed.pdf',
    extension: 'pdf',
    mimeType: 'application/pdf',
    sizeBytes: 520000,
    subject: 'Signed Service Agreement',
    senderEmail: 'legal@acmecorp.com',
    senderName: 'Acme Corp Legal',
    daysAgo: 5,
    documentType: 'contract',
    confidence: 88,
  },

  // Reports
  {
    filename: 'Q4_sales_report.xlsx',
    extension: 'xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    sizeBytes: 450000,
    subject: 'Q4 2024 Sales Report',
    senderEmail: 'sales@company.com',
    senderName: 'Sales Team',
    daysAgo: 7,
    documentType: 'report',
    confidence: 85,
  },
  {
    filename: 'analytics_dashboard.pdf',
    extension: 'pdf',
    mimeType: 'application/pdf',
    sizeBytes: 890000,
    subject: 'Monthly Analytics Report',
    senderEmail: 'analytics@company.com',
    senderName: 'Analytics Team',
    daysAgo: 10,
    documentType: 'report',
    confidence: 87,
  },

  // Presentations
  {
    filename: 'investor_deck_2024.pptx',
    extension: 'pptx',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    sizeBytes: 3500000,
    subject: 'Series A Investor Deck',
    senderEmail: 'ceo@startup.com',
    senderName: 'CEO',
    daysAgo: 12,
    documentType: 'presentation',
    confidence: 90,
  },

  // Images
  {
    filename: 'vacation_photo_beach.png',
    extension: 'png',
    mimeType: 'image/png',
    sizeBytes: 1200000,
    subject: 'Vacation Photos!',
    senderEmail: 'john.doe@gmail.com',
    senderName: 'John Doe',
    daysAgo: 3,
    documentType: 'image',
    confidence: 98,
  },
  {
    filename: 'screenshot_bug_report.png',
    extension: 'png',
    mimeType: 'image/png',
    sizeBytes: 520000,
    subject: 'Bug Screenshot',
    senderEmail: 'dev@team.com',
    senderName: 'Dev Team',
    daysAgo: 1,
    documentType: 'image',
    confidence: 99,
  },

  // Office Documents
  {
    filename: 'project_proposal.docx',
    extension: 'docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sizeBytes: 290000,
    subject: 'Project Proposal - Q2 Initiative',
    senderEmail: 'partner@agency.com',
    senderName: 'Agency Partner',
    daysAgo: 14,
    documentType: 'other',
    confidence: 75,
  },

  // More variety
  {
    filename: 'flight_confirmation.pdf',
    extension: 'pdf',
    mimeType: 'application/pdf',
    sizeBytes: 125000,
    subject: 'Your Flight Confirmation',
    senderEmail: 'noreply@united.com',
    senderName: 'United Airlines',
    daysAgo: 6,
    documentType: 'receipt',
    confidence: 91,
  },
  {
    filename: 'logo_design_final.png',
    extension: 'png',
    mimeType: 'image/png',
    sizeBytes: 450000,
    subject: 'Final Logo Design',
    senderEmail: 'designer@studio.com',
    senderName: 'Creative Studio',
    daysAgo: 8,
    documentType: 'image',
    confidence: 97,
  },
];

export async function seedAttachments() {
  console.log('🌱 Seeding attachments...');

  let created = 0;
  let failed = 0;

  for (const seed of SEED_DATA) {
    try {
      const emailDate = new Date();
      emailDate.setDate(emailDate.getDate() - seed.daysAgo);

      await db.insert(attachments).values({
        userId: TEST_USER_ID,
        filename: seed.filename,
        fileExtension: seed.extension,
        mimeType: seed.mimeType,
        fileSizeBytes: seed.sizeBytes,
        storagePath: `seed/${seed.filename}`,
        emailSubject: seed.subject,
        senderEmail: seed.senderEmail,
        senderName: seed.senderName,
        emailDate,
        documentType: seed.documentType,
        classificationConfidence: seed.confidence,
        aiProcessed: !!seed.documentType,
        processingStatus: seed.documentType ? 'completed' : 'pending',
      });

      created++;
      console.log(`✅ Created: ${seed.filename}`);
    } catch (error: any) {
      failed++;
      console.error(`❌ Failed: ${seed.filename}`, error.message);
    }
  }

  console.log(`\n🎉 Seeding complete!`);
  console.log(`   Created: ${created}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total: ${SEED_DATA.length}`);
}

// Run if called directly
if (require.main === module) {
  seedAttachments()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

