/**
 * EaseMail Attachments V1 - AI Service Integration
 * 
 * Handles document classification and data extraction using OpenAI GPT-4
 */

import OpenAI from 'openai';
import type { 
  Attachment, 
  DocumentType, 
  ExtractedMetadata,
  InvoiceMetadata,
  ReceiptMetadata,
  ContractMetadata 
} from './types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rate limiting and cost tracking
const COST_PER_CLASSIFICATION = 0.002; // $0.002 per image
const COST_PER_EXTRACTION = 0.001; // $0.001 per document
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// ============================================================================
// DOCUMENT CLASSIFICATION
// ============================================================================

export interface ClassificationResult {
  documentType: DocumentType;
  confidence: number;
  reasoning: string;
}

export async function classifyDocument(
  attachment: Attachment,
  fileBuffer: Buffer
): Promise<ClassificationResult> {
  const { fileExtension, mimeType, filename } = attachment;

  try {
    // For images and PDFs, use GPT-4 Vision
    if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
      return await classifyWithVision(fileBuffer, filename, mimeType);
    }

    // For text documents, extract text first then classify
    if (mimeType.startsWith('text/') || isTextDocument(fileExtension)) {
      const text = await extractText(fileBuffer, mimeType);
      return await classifyWithText(text, filename);
    }

    // Default classification for unsupported types
    return {
      documentType: 'other',
      confidence: 1.0,
      reasoning: 'Unsupported file type for AI classification',
    };
  } catch (error) {
    console.error('Classification error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to classify document: ${message}`);
  }
}

async function classifyWithVision(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string
): Promise<ClassificationResult> {
  const base64Image = fileBuffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64Image}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-vision-preview',
    messages: [
      {
        role: 'system',
        content: `You are a document classification expert. Classify documents into these categories:
- invoice: Business invoices with amounts and billing information
- receipt: Purchase receipts from stores/services
- contract: Legal contracts and agreements
- report: Business reports, analytics, presentations
- presentation: Slide decks and presentations
- image: Photos, screenshots, diagrams (not documents)
- other: Anything that doesn't fit above

Respond with JSON only: { "type": "...", "confidence": 0.0-1.0, "reasoning": "..." }`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Classify this document. Filename: ${filename}`,
          },
          {
            type: 'image_url',
            image_url: {
              url: dataUrl,
              detail: 'low', // Lower detail = cheaper API calls
            },
          },
        ],
      },
    ],
    max_tokens: 200,
    temperature: 0.3, // Lower temperature = more consistent
  });

  const result = JSON.parse(response.choices[0].message.content);

  return {
    documentType: result.type as DocumentType,
    confidence: result.confidence,
    reasoning: result.reasoning,
  };
}

async function classifyWithText(
  text: string,
  filename: string
): Promise<ClassificationResult> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are a document classification expert. Classify documents into categories.
Respond with JSON only: { "type": "invoice|receipt|contract|report|presentation|other", "confidence": 0.0-1.0, "reasoning": "..." }`,
      },
      {
        role: 'user',
        content: `Classify this document.\n\nFilename: ${filename}\n\nContent:\n${text.slice(0, 2000)}`,
      },
    ],
    max_tokens: 200,
    temperature: 0.3,
  });

  const result = JSON.parse(response.choices[0].message.content);

  return {
    documentType: result.type as DocumentType,
    confidence: result.confidence,
    reasoning: result.reasoning,
  };
}

// ============================================================================
// DATA EXTRACTION
// ============================================================================

export async function extractMetadata(
  attachment: Attachment,
  fileBuffer: Buffer,
  documentType: DocumentType
): Promise<ExtractedMetadata> {
  // Skip extraction for non-business documents
  if (['image', 'other'].includes(documentType)) {
    return {};
  }

  try {
    switch (documentType) {
      case 'invoice':
        return await extractInvoiceData(fileBuffer, attachment);
      case 'receipt':
        return await extractReceiptData(fileBuffer, attachment);
      case 'contract':
        return await extractContractData(fileBuffer, attachment);
      default:
        return await extractGenericData(fileBuffer, attachment);
    }
  } catch (error) {
    console.error('Extraction error:', error);
    return {}; // Return empty metadata on error
  }
}

async function extractInvoiceData(
  fileBuffer: Buffer,
  attachment: Attachment
): Promise<InvoiceMetadata> {
  const text = await extractText(fileBuffer, attachment.mimeType);

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `Extract invoice data from the text. Return JSON with these fields:
{
  "type": "invoice",
  "amount": number,
  "currency": "USD" | "EUR" | etc,
  "invoiceNumber": string,
  "dueDate": "YYYY-MM-DD",
  "issueDate": "YYYY-MM-DD",
  "vendor": string,
  "vendorEmail": string,
  "billTo": string,
  "isPaid": boolean,
  "paymentStatus": "paid" | "unpaid" | "overdue" | "pending",
  "lineItems": [{ "description": string, "quantity": number, "unitPrice": number, "total": number }],
  "tax": number,
  "subtotal": number
}

If a field cannot be determined, omit it. Be precise with numbers.`,
      },
      {
        role: 'user',
        content: `Extract invoice data:\n\n${text}`,
      },
    ],
    max_tokens: 800,
    temperature: 0.2,
  });

  return JSON.parse(response.choices[0].message.content) as InvoiceMetadata;
}

async function extractReceiptData(
  fileBuffer: Buffer,
  attachment: Attachment
): Promise<ReceiptMetadata> {
  const text = await extractText(fileBuffer, attachment.mimeType);

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `Extract receipt data from the text. Return JSON with these fields:
{
  "type": "receipt",
  "merchant": string,
  "merchantAddress": string,
  "total": number,
  "subtotal": number,
  "tax": number,
  "currency": string,
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "location": string,
  "paymentMethod": string,
  "lastFourDigits": string,
  "items": [{ "name": string, "quantity": number, "price": number }],
  "category": "food" | "transport" | "office" | "entertainment" | etc
}

If a field cannot be determined, omit it.`,
      },
      {
        role: 'user',
        content: `Extract receipt data:\n\n${text}`,
      },
    ],
    max_tokens: 600,
    temperature: 0.2,
  });

  return JSON.parse(response.choices[0].message.content) as ReceiptMetadata;
}

async function extractContractData(
  fileBuffer: Buffer,
  attachment: Attachment
): Promise<ContractMetadata> {
  const text = await extractText(fileBuffer, attachment.mimeType);

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `Extract contract data from the text. Return JSON with these fields:
{
  "type": "contract",
  "contractType": "service_agreement" | "nda" | "employment" | etc,
  "parties": [string, string],
  "effectiveDate": "YYYY-MM-DD",
  "expirationDate": "YYYY-MM-DD",
  "contractValue": number,
  "currency": string,
  "keyTerms": [string],
  "renewalTerms": string,
  "terminationClause": string,
  "governingLaw": string
}

Focus on critical business terms. If a field cannot be determined, omit it.`,
      },
      {
        role: 'user',
        content: `Extract contract data (first 3000 chars):\n\n${text.slice(0, 3000)}`,
      },
    ],
    max_tokens: 800,
    temperature: 0.2,
  });

  return JSON.parse(response.choices[0].message.content) as ContractMetadata;
}

async function extractGenericData(
  fileBuffer: Buffer,
  attachment: Attachment
): Promise<ExtractedMetadata> {
  const text = await extractText(fileBuffer, attachment.mimeType);

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `Extract key information from the document. Return JSON:
{
  "type": "generic",
  "summary": "2-3 sentence summary",
  "keyPoints": ["point 1", "point 2", ...],
  "entities": [
    { "type": "person|organization|location|date|amount", "value": string }
  ]
}`,
      },
      {
        role: 'user',
        content: `Extract key information:\n\n${text.slice(0, 2000)}`,
      },
    ],
    max_tokens: 400,
    temperature: 0.3,
  });

  return JSON.parse(response.choices[0].message.content);
}

// ============================================================================
// KEY TERMS EXTRACTION
// ============================================================================

export async function extractKeyTerms(
  attachment: Attachment,
  fileBuffer: Buffer,
  extractedMetadata: ExtractedMetadata
): Promise<string[]> {
  const text = await extractText(fileBuffer, attachment.mimeType);

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `Extract 3-5 key terms/phrases that best describe this document.
Terms should be specific and searchable (e.g., company names, document types, important topics).
Return JSON: { "terms": ["term1", "term2", ...] }`,
      },
      {
        role: 'user',
        content: `Document: ${attachment.filename}\n\nContent:\n${text.slice(0, 1500)}`,
      },
    ],
    max_tokens: 100,
    temperature: 0.3,
  });

  const result = JSON.parse(response.choices[0].message.content);
  return result.terms || [];
}

// ============================================================================
// UTILITIES
// ============================================================================

async function extractText(fileBuffer: Buffer, mimeType: string): Promise<string> {
  // For PDFs, use pdf-parse
  if (mimeType === 'application/pdf') {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(fileBuffer);
    return data.text;
  }

  // For text files, decode directly
  if (mimeType.startsWith('text/')) {
    return fileBuffer.toString('utf-8');
  }

  // For images, use OCR (Google Cloud Vision or similar)
  if (mimeType.startsWith('image/')) {
    return await performOCR(fileBuffer);
  }

  throw new Error(`Cannot extract text from MIME type: ${mimeType}`);
}

async function performOCR(imageBuffer: Buffer): Promise<string> {
  // TODO: Implement OCR using Google Cloud Vision API
  // For now, return empty string (OCR is optional)
  console.warn('OCR not implemented yet');
  return '';
}

function isTextDocument(extension: string | null): boolean {
  const textExtensions = ['txt', 'md', 'csv', 'json', 'xml', 'html'];
  return extension ? textExtensions.includes(extension.toLowerCase()) : false;
}

// ============================================================================
// FULL PROCESSING PIPELINE
// ============================================================================

export interface ProcessingResult {
  documentType: DocumentType;
  confidence: number;
  extractedMetadata: ExtractedMetadata;
  keyTerms: string[];
  error?: string;
}

export async function processAttachment(
  attachment: Attachment,
  fileBuffer: Buffer
): Promise<ProcessingResult> {
  try {
    // Step 1: Classify document
    const classification = await classifyDocument(attachment, fileBuffer);

    // Step 2: Extract metadata based on classification
    const metadata = await extractMetadata(
      attachment,
      fileBuffer,
      classification.documentType
    );

    // Step 3: Extract key terms
    const keyTerms = await extractKeyTerms(attachment, fileBuffer, metadata);

    return {
      documentType: classification.documentType,
      confidence: classification.confidence,
      extractedMetadata: metadata,
      keyTerms,
    };
  } catch (error) {
    console.error('Processing failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      documentType: 'other',
      confidence: 0,
      extractedMetadata: {},
      keyTerms: [],
      error: message,
    };
  }
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

export async function batchProcessAttachments(
  attachments: Array<{ attachment: Attachment; fileBuffer: Buffer }>
): Promise<ProcessingResult[]> {
  // Process in parallel with concurrency limit
  const BATCH_SIZE = 5;
  const results: ProcessingResult[] = [];

  for (let i = 0; i < attachments.length; i += BATCH_SIZE) {
    const batch = attachments.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(({ attachment, fileBuffer }) =>
        processAttachment(attachment, fileBuffer)
      )
    );
    results.push(...batchResults);

    // Rate limiting: delay between batches
    if (i + BATCH_SIZE < attachments.length) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  return results;
}

// ============================================================================
// COST TRACKING
// ============================================================================

export function estimateProcessingCost(attachmentCount: number): number {
  // Average cost per attachment (classification + extraction + key terms)
  const avgCostPerAttachment = 0.0035;
  return attachmentCount * avgCostPerAttachment;
}

export interface CostReport {
  totalProcessed: number;
  estimatedCost: number;
  byType: Record<DocumentType, number>;
}

// This would be stored in database and updated after each processing job
export function generateCostReport(results: ProcessingResult[]): CostReport {
  const report: CostReport = {
    totalProcessed: results.length,
    estimatedCost: estimateProcessingCost(results.length),
    byType: {} as Record<DocumentType, number>,
  };

  results.forEach((result) => {
    const type = result.documentType;
    report.byType[type] = (report.byType[type] || 0) + 1;
  });

  return report;
}

