# Mail-0/Zero Integration Guide
## Integrating EaseMail's AI Features & Attachments Logic

**Created:** January 23, 2026
**Status:** Ready for execution
**Estimated Time:** 16-24 hours
**Risk Level:** Medium (architectural changes required)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step 1: Clone and Setup](#step-1-clone-and-setup)
4. [Step 2: Analyze Architecture](#step-2-analyze-architecture)
5. [Step 3: Port AI Features](#step-3-port-ai-features)
6. [Step 4: Port Attachment Logic](#step-4-port-attachment-logic)
7. [Step 5: Database Integration](#step-5-database-integration)
8. [Step 6: UI Integration](#step-6-ui-integration)
9. [Step 7: Testing](#step-7-testing)
10. [Step 8: Deployment](#step-8-deployment)

---

## 📖 Overview

### What We're Doing

Forking Mail-0/Zero as the new email client foundation and integrating:

1. **AI Features** from EaseMail:
   - AI Write Service (email generation)
   - AI Remix Service (draft transformation)
   - Thread Analyzer (conversation summaries)
   - Dictation & Voice Messages
   - Grammar Check & Style Learning

2. **Attachment System** from EaseMail:
   - Supabase Storage integration
   - AI-powered document classification
   - Metadata extraction (invoices, receipts, contracts)
   - Smart filtering and search

### Why Mail-0/Zero?

- Modern tech stack (Next.js, TypeScript, Drizzle ORM)
- Gmail API integration (vs Nylas dependency)
- Cloudflare R2 storage infrastructure
- Better Auth system
- Active development and community

### Architecture Comparison

| Feature | EaseMail | Mail-0/Zero | Integration Strategy |
|---------|----------|-------------|---------------------|
| **Auth** | Supabase Auth | Better Auth + Google OAuth | Keep Mail-0 auth, port AI user tracking |
| **Storage** | Supabase Storage | Cloudflare R2 | Adapt attachment upload to R2 |
| **Database** | PostgreSQL (Supabase) | PostgreSQL (Drizzle) | Port schema to Drizzle definitions |
| **Email Sync** | Nylas API | Gmail API directly | Keep Mail-0 sync, add AI features to UI |
| **AI Integration** | OpenAI SDK | None | **Port all AI features** |

---

## ✅ Prerequisites

Before you begin, ensure you have:

- [x] Node.js 18+ installed
- [x] pnpm installed (`npm install -g pnpm`)
- [x] Git configured
- [x] GitHub account with SSH keys set up
- [x] OpenAI API key (for AI features)
- [x] Access to both repositories:
  - EaseMail: `https://github.com/tdaniel1925/easemail-pro`
  - Mail-0/Zero: `https://github.com/Mail-0/Zero`

### Environment Setup Checklist

```bash
# Check Node version (should be 18+)
node --version

# Check pnpm
pnpm --version

# Check Git
git --version

# Verify SSH access to GitHub
ssh -T git@github.com
```

---

## 🚀 Step 1: Clone and Setup

### 1.1 Create Working Directory

```bash
# Create a workspace for the integration
cd C:\dev
mkdir mail-zero-ai
cd mail-zero-ai
```

### 1.2 Clone Both Repositories

```bash
# Clone Mail-0/Zero (the new base)
git clone https://github.com/Mail-0/Zero.git mail-zero
cd mail-zero

# Clone EaseMail (for reference)
cd ..
git clone https://github.com/tdaniel1925/easemail-pro.git easemail-reference
```

### 1.3 Create Integration Branch

```bash
cd mail-zero

# Create and switch to integration branch
git checkout -b feature/easemail-ai-integration

# Verify branch
git branch
# Output: * feature/easemail-ai-integration
#         main
```

### 1.4 Install Dependencies

```bash
# Install all packages
pnpm install

# Verify installation
pnpm --version
```

### 1.5 Copy Environment Template

```bash
# Mail-0 uses .env.local for Next.js
cp .env.example .env.local

# Edit .env.local and add required variables
# (We'll add AI-specific vars later)
```

---

## 🔍 Step 2: Analyze Architecture

### 2.1 Explore Mail-0/Zero Structure

```bash
# View directory structure
tree -L 2 -I "node_modules"

# Expected structure (pnpm monorepo):
# mail-zero/
# ├── apps/
# │   └── mail/          # Main Next.js application
# ├── packages/
# │   └── shared/        # Shared utilities
# ├── docker/
# ├── scripts/
# └── pnpm-workspace.yaml
```

### 2.2 Key Directories to Understand

```bash
cd apps/mail  # Main application

# Explore key directories
ls -la
# app/              Next.js app directory
# components/       React components
# lib/              Utilities and services
# public/           Static assets
# drizzle/          Database migrations
```

### 2.3 Find Email Composition Logic

```bash
# Search for email composer components
grep -r "compose" --include="*.tsx" --include="*.ts" apps/mail/components | head -10

# Search for email sending logic
grep -r "sendEmail\|send.*mail" --include="*.ts" apps/mail/lib | head -10

# Search for attachment handling
grep -r "attachment" --include="*.ts" apps/mail/lib | head -10
```

**Expected Locations:**
- Email composer: `apps/mail/components/email/Composer.tsx` (or similar)
- Send logic: `apps/mail/lib/email/send.ts` or `apps/mail/app/api/email/send/route.ts`
- Attachments: `apps/mail/lib/storage/` or `apps/mail/app/api/attachments/`

---

## 🤖 Step 3: Port AI Features

### 3.1 Create AI Services Directory

```bash
cd apps/mail

# Create AI module structure
mkdir -p lib/ai
mkdir -p app/api/ai
mkdir -p components/ai
```

### 3.2 Port AI Write Service

```bash
# Copy from EaseMail reference
cp ../../../../easemail-reference/lib/ai/ai-write-service.ts lib/ai/

# Copy related files
cp ../../../../easemail-reference/lib/ai/ai-write-types.ts lib/ai/
cp ../../../../easemail-reference/lib/ai/config.ts lib/ai/
cp ../../../../easemail-reference/lib/ai/retry.ts lib/ai/
```

**IMPORTANT:** Update imports in `lib/ai/ai-write-service.ts`:

```typescript
// Change from Supabase to Mail-0's auth system
// OLD:
import { createClient } from '@supabase/supabase-js';

// NEW:
import { auth } from '@/lib/auth'; // Mail-0's Better Auth
```

### 3.3 Port Thread Analyzer

```bash
cp ../../../../easemail-reference/lib/ai/thread-analyzer.ts lib/ai/
```

**Update for Mail-0's data structure:**

```typescript
// thread-analyzer.ts
// Update ThreadEmail interface to match Mail-0's email schema
interface ThreadEmail {
  id: string;
  subject: string | null;
  from: { name: string | null; email: string | null }; // Mail-0 uses nested object
  snippet: string | null;
  body: string | null; // Mail-0 may use 'body' instead of 'bodyPlainText'
  receivedAt: Date;
}
```

### 3.4 Create API Routes for AI Features

```bash
# AI Write endpoint
touch app/api/ai/write/route.ts

# AI Remix endpoint
touch app/api/ai/remix/route.ts

# Thread Summary endpoint
touch app/api/ai/summarize/route.ts

# Grammar Check endpoint
touch app/api/ai/grammar-check/route.ts

# Dictation endpoint
touch app/api/ai/dictation-polish/route.ts
```

**Example: `app/api/ai/write/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { aiWriteService } from '@/lib/ai/ai-write-service';

export async function POST(req: NextRequest) {
  try {
    // Check authentication (Mail-0's Better Auth)
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { method, content, preferences, context } = body;

    // Call AI Write Service
    const result = await aiWriteService.generateEmail({
      method,
      content,
      preferences,
      context,
      userId: session.user.id,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[AI Write] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate email' },
      { status: 500 }
    );
  }
}
```

### 3.5 Port AI UI Components

```bash
# Copy AI components from EaseMail
cp ../../../../easemail-reference/components/ai/UnifiedAIToolbar.tsx components/ai/
cp ../../../../easemail-reference/components/ai/AIWriteModal.tsx components/ai/
cp ../../../../easemail-reference/components/ai/AIRemixPanel.tsx components/ai/
cp ../../../../easemail-reference/components/ai/DictationDialog.tsx components/ai/
```

**Update imports** to use Mail-0's component library:

```typescript
// Update shadcn/ui imports
// OLD:
import { Button } from '@/components/ui/button';

// NEW: (verify Mail-0's component path)
import { Button } from '@/components/ui/button'; // Should be same if using shadcn

// Update icon library if different
// Mail-0 may use different icon set
```

### 3.6 Add OpenAI Dependency

```bash
# Install OpenAI SDK
pnpm add openai

# Install AI SDK if using Vercel AI SDK
pnpm add ai @ai-sdk/openai
```

### 3.7 Update Environment Variables

Add to `.env.local`:

```bash
# AI Features
OPENAI_API_KEY=sk-...your-key-here...

# Optional: AI Usage Tracking
AI_USAGE_TRACKING_ENABLED=true
```

---

## 📎 Step 4: Port Attachment Logic

### 4.1 Understand Mail-0's Storage System

```bash
# Find existing storage implementation
grep -r "R2\|storage\|upload" --include="*.ts" lib/ | head -20

# Mail-0 likely has:
# - lib/storage/r2-client.ts (Cloudflare R2 integration)
# - app/api/attachments/upload/route.ts
```

### 4.2 Create Attachments Module

```bash
mkdir -p lib/attachments
mkdir -p app/api/attachments
```

### 4.3 Adapt EaseMail's Upload Logic to R2

**Create `lib/attachments/r2-upload.ts`:**

```typescript
/**
 * Attachment Upload Service (adapted for Cloudflare R2)
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize R2 client (Cloudflare R2 is S3-compatible)
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!, // e.g., https://<account-id>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'mail-zero-attachments';

export interface UploadResult {
  storagePath: string;
  url: string;
}

/**
 * Upload attachment to R2
 */
export async function uploadAttachment(
  userId: string,
  file: Buffer,
  filename: string,
  mimeType: string
): Promise<UploadResult> {
  const sanitizedFilename = sanitizeFilename(filename);
  const timestamp = Date.now();
  const storagePath = `${userId}/attachments/${timestamp}_${sanitizedFilename}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storagePath,
      Body: file,
      ContentType: mimeType,
    })
  );

  // Generate signed URL (valid for 1 hour)
  const url = await getSignedUrl(
    r2Client,
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storagePath,
    }),
    { expiresIn: 3600 }
  );

  return { storagePath, url };
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
}

export async function getAttachmentUrl(
  storagePath: string,
  expiresIn: number = 3600
): Promise<string> {
  return await getSignedUrl(
    r2Client,
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storagePath,
    }),
    { expiresIn }
  );
}

export async function deleteAttachment(storagePath: string): Promise<void> {
  const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storagePath,
    })
  );
}
```

### 4.4 Port AI Attachment Classification

```bash
# Copy AI service for attachments
cp ../../../../easemail-reference/lib/attachments/ai-service.ts lib/attachments/

# Copy attachment types
cp ../../../../easemail-reference/lib/attachments/types.ts lib/attachments/
```

**Update `lib/attachments/ai-service.ts`:**

```typescript
// Update storage references to use R2
import { uploadAttachment, getAttachmentUrl } from './r2-upload';

// Rest of the AI classification logic stays the same
// (OpenAI-based document classification)
```

### 4.5 Create Attachment API Routes

```bash
# Upload endpoint
touch app/api/attachments/upload/route.ts

# Download endpoint
touch app/api/attachments/[id]/download/route.ts

# Process (AI classification) endpoint
touch app/api/attachments/process/route.ts

# Smart filters endpoint
touch app/api/attachments/smart-filters/route.ts
```

**Example: `app/api/attachments/upload/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { uploadAttachment } from '@/lib/attachments/r2-upload';
import { db } from '@/lib/db';
import { attachments } from '@/lib/db/schema';

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to R2
    const { storagePath, url } = await uploadAttachment(
      session.user.id,
      buffer,
      file.name,
      file.type
    );

    // Save to database
    const [attachment] = await db
      .insert(attachments)
      .values({
        userId: session.user.id,
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        storagePath,
        uploadedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ attachment, url });
  } catch (error: any) {
    console.error('[Attachment Upload] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
```

### 4.6 Install R2 Dependencies

```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 4.7 Update Environment Variables

Add to `.env.local`:

```bash
# Cloudflare R2 Storage
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=mail-zero-attachments
R2_PUBLIC_URL=https://attachments.yourdomain.com # Optional CDN
```

---

## 🗄️ Step 5: Database Integration

### 5.1 Locate Drizzle Schema

```bash
# Find schema files
find . -name "schema*.ts" -type f
# Expected: drizzle/schema.ts or lib/db/schema.ts
```

### 5.2 Add AI Usage Tracking Schema

**Add to `lib/db/schema.ts` (or equivalent):**

```typescript
import { pgTable, uuid, varchar, text, integer, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';

// AI Usage Tracking
export const aiUsage = pgTable('ai_usage', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  feature: varchar('feature', { length: 50 }).notNull(), // 'write', 'remix', 'summarize', etc.
  model: varchar('model', { length: 50 }).notNull(),
  tokensUsed: integer('tokens_used').notNull(),
  cost: integer('cost').notNull(), // in cents
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Attachments Schema (adapted from EaseMail)
export const attachments = pgTable('attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  emailId: varchar('email_id', { length: 255 }), // Optional: link to email
  filename: varchar('filename', { length: 500 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  fileSize: integer('file_size').notNull(),
  storagePath: varchar('storage_path', { length: 1000 }).notNull(),

  // AI Classification
  documentType: varchar('document_type', { length: 50 }), // 'invoice', 'receipt', etc.
  classificationConfidence: integer('classification_confidence'), // 0-100
  extractedMetadata: jsonb('extracted_metadata'), // JSON data
  aiProcessed: boolean('ai_processed').default(false),

  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Indexes for performance
export const attachmentsIndexes = {
  userIdIdx: index('attachments_user_id_idx').on(attachments.userId),
  emailIdIdx: index('attachments_email_id_idx').on(attachments.emailId),
  documentTypeIdx: index('attachments_document_type_idx').on(attachments.documentType),
};
```

### 5.3 Generate Migration

```bash
# Generate migration from schema changes
pnpm drizzle-kit generate:pg

# Expected output: new migration file in drizzle/migrations/
```

### 5.4 Run Migration

```bash
# Apply migration to database
pnpm drizzle-kit push:pg

# Or if Mail-0 uses different command:
pnpm db:migrate
```

---

## 🎨 Step 6: UI Integration

### 6.1 Find Email Composer Component

```bash
# Search for composer component
find components -name "*ompos*" -type f
# Expected: components/email/Composer.tsx or similar
```

### 6.2 Integrate AI Toolbar

**Edit `components/email/Composer.tsx` (or equivalent):**

```typescript
import { UnifiedAIToolbar } from '@/components/ai/UnifiedAIToolbar';
import { useState } from 'react';

export function EmailComposer() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);

  const handleAttachVoiceMessage = (file: File, duration: number) => {
    setAttachments(prev => [...prev, file]);
  };

  return (
    <div className="email-composer">
      {/* Subject */}
      <input
        type="text"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject"
      />

      {/* Body Editor */}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your message..."
      />

      {/* 🆕 AI Toolbar */}
      <UnifiedAIToolbar
        subject={subject}
        body={body}
        onSubjectChange={setSubject}
        onBodyChange={setBody}
        onAttachVoiceMessage={handleAttachVoiceMessage}
        userTier="pro" // Get from user's subscription
      />

      {/* Existing attachment UI */}
      {/* ... */}
    </div>
  );
}
```

### 6.3 Add Attachment Smart Filters

**Create `components/attachments/AttachmentsPage.tsx`:**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { AttachmentsGrid } from './AttachmentsGrid';
import { FilterBar } from './FilterBar';

export function AttachmentsPage() {
  const [attachments, setAttachments] = useState([]);
  const [filters, setFilters] = useState({
    documentType: 'all',
    dateRange: 'all',
    search: '',
  });

  useEffect(() => {
    // Fetch attachments with AI metadata
    fetch('/api/attachments')
      .then(res => res.json())
      .then(data => setAttachments(data.attachments));
  }, [filters]);

  return (
    <div className="attachments-page">
      <FilterBar filters={filters} onFilterChange={setFilters} />
      <AttachmentsGrid attachments={attachments} />
    </div>
  );
}
```

### 6.4 Update Navigation

Add "Attachments" link to Mail-0's navigation:

```typescript
// components/layout/Sidebar.tsx (or equivalent)
const navItems = [
  { name: 'Inbox', href: '/inbox', icon: InboxIcon },
  { name: 'Sent', href: '/sent', icon: SendIcon },
  { name: 'Drafts', href: '/drafts', icon: DraftsIcon },
  { name: 'Attachments', href: '/attachments', icon: PaperclipIcon }, // 🆕
];
```

---

## 🧪 Step 7: Testing

### 7.1 Create Test Suite

```bash
# Install testing dependencies if not already present
pnpm add -D vitest @testing-library/react @testing-library/jest-dom
```

**Create `lib/ai/__tests__/ai-write-service.test.ts`:**

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { aiWriteService } from '../ai-write-service';

describe('AI Write Service', () => {
  it('should generate email from prompt', async () => {
    const result = await aiWriteService.generateEmail({
      method: 'prompt',
      content: 'Write a thank you email to John for the meeting',
      preferences: { tone: 'professional', length: 'brief' },
    });

    expect(result.subject).toBeTruthy();
    expect(result.body).toBeTruthy();
    expect(result.metadata.tokensUsed).toBeGreaterThan(0);
  });
});
```

### 7.2 Run Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test lib/ai/__tests__/ai-write-service.test.ts
```

### 7.3 Manual Testing Checklist

```markdown
## AI Features Testing

- [ ] Open email composer
- [ ] Click "AI Remix" button
- [ ] Type some text and click "Make it professional"
- [ ] Verify remixed text appears
- [ ] Click "Dictate" button
- [ ] Record voice message
- [ ] Verify transcription appears
- [ ] Click "AI Write"
- [ ] Generate email from prompt
- [ ] Verify subject and body generated

## Attachments Testing

- [ ] Upload a PDF invoice
- [ ] Wait 5 seconds for AI processing
- [ ] Check attachment details
- [ ] Verify "Invoice" classification
- [ ] Verify extracted metadata (amount, date, vendor)
- [ ] Filter attachments by type
- [ ] Search for specific document
- [ ] Download attachment
```

---

## 🚀 Step 8: Deployment

### 8.1 Commit Changes

```bash
# Review changes
git status

# Add all new files
git add .

# Commit with descriptive message
git commit -m "feat: Integrate EaseMail AI features and attachments system

- Port AI Write, Remix, Thread Analyzer services
- Add OpenAI-based email generation
- Implement dictation and voice messages
- Port attachment system with R2 storage
- Add AI document classification
- Add metadata extraction for invoices/receipts/contracts
- Create unified AI toolbar component
- Add database schema for AI usage and attachments
- Add API routes for all AI features
- Update email composer with AI integration

Features:
✅ AI email writing with templates
✅ AI draft remixing (tone, length, formality)
✅ Thread summarization
✅ Voice dictation with polishing
✅ Voice message attachments
✅ Smart attachment classification
✅ Metadata extraction
✅ R2 storage integration

Breaking changes: None (additive only)"
```

### 8.2 Push to Remote

```bash
# If this is your own fork, push to your repository
git remote add origin https://github.com/YOUR-USERNAME/mail-zero-ai.git

# Push integration branch
git push -u origin feature/easemail-ai-integration
```

### 8.3 Create Pull Request

1. Go to GitHub: `https://github.com/YOUR-USERNAME/mail-zero-ai/pulls`
2. Click "New Pull Request"
3. Base: `main` ← Compare: `feature/easemail-ai-integration`
4. Title: `feat: Integrate EaseMail AI Features & Attachments`
5. Description:

```markdown
## Summary

Integrates AI-powered email features and smart attachments system from EaseMail into Mail-0/Zero.

## Features Added

### 🤖 AI Features
- **AI Write**: Generate complete emails from prompts, bullet points, or templates
- **AI Remix**: Transform existing drafts (tone, length, formality adjustments)
- **Thread Analyzer**: Auto-summarize email conversations
- **Dictation**: Voice-to-text with AI polishing
- **Voice Messages**: Record and attach voice notes
- **Grammar Check**: Real-time grammar and style suggestions
- **Style Learning**: AI learns user's writing style over time

### 📎 Smart Attachments
- **AI Classification**: Auto-categorize documents (invoice, receipt, contract, etc.)
- **Metadata Extraction**: Extract key data from business documents
  - Invoices: amount, due date, vendor, line items
  - Receipts: merchant, total, tax, payment method
  - Contracts: parties, dates, key terms
- **Smart Filters**: Filter by document type, date, size
- **R2 Storage**: Cloudflare R2 integration for scalable storage
- **Search**: Full-text search across attachments

## Technical Changes

- Added `lib/ai/` module with 8 AI services
- Added `lib/attachments/` module with R2 integration
- Added `app/api/ai/` endpoints (7 routes)
- Added `app/api/attachments/` endpoints (5 routes)
- Added `components/ai/` UI components (5 components)
- Updated database schema (ai_usage, attachments tables)
- Added environment variables for OpenAI and R2

## Testing

- [x] AI Write generates emails successfully
- [x] AI Remix transforms drafts correctly
- [x] Attachments upload to R2
- [x] AI classification works on PDFs/images
- [x] Metadata extraction for invoices
- [x] All TypeScript checks pass
- [x] No breaking changes to existing features

## Environment Variables Required

```bash
OPENAI_API_KEY=sk-...
R2_ENDPOINT=https://...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=mail-zero-attachments
```

## Screenshots

(Add screenshots of AI toolbar, attachments page, etc.)

## Breaking Changes

None. All features are additive and don't modify existing Mail-0 functionality.
```

### 8.4 Deploy to Staging

```bash
# If Mail-0 has staging environment
pnpm deploy:staging

# Or deploy to Vercel/Netlify
vercel deploy --prod
```

### 8.5 Production Deployment

After testing in staging:

```bash
# Merge to main
git checkout main
git merge feature/easemail-ai-integration

# Tag release
git tag -a v2.0.0-ai -m "Release: AI features and smart attachments"
git push origin v2.0.0-ai

# Deploy to production
pnpm deploy:production
```

---

## 📊 Post-Integration Checklist

### Monitoring

- [ ] Set up OpenAI API usage alerts
- [ ] Monitor R2 storage costs
- [ ] Track AI feature adoption (analytics)
- [ ] Set up error logging for AI failures

### Documentation

- [ ] Update user documentation
- [ ] Create AI features guide
- [ ] Document environment variables
- [ ] Add troubleshooting guide

### Optimization

- [ ] Implement AI response caching
- [ ] Add rate limiting for AI endpoints
- [ ] Optimize attachment processing queue
- [ ] Add retry logic for API failures

---

## 💰 Cost Estimates

### Monthly AI Costs (per user)

| Feature | Usage | Cost |
|---------|-------|------|
| AI Write | 50 emails/month | $0.75 |
| AI Remix | 20 drafts/month | $0.30 |
| Thread Summary | 10 threads/month | $0.15 |
| Dictation | 30 minutes/month | $0.90 |
| Attachment Classification | 50 docs/month | $0.20 |
| **Total** | - | **~$2.30/user/month** |

### Storage Costs (Cloudflare R2)

- Storage: $0.015/GB/month
- Class A operations: $4.50/million
- Class B operations: $0.36/million
- **Typical user**: ~$0.50/month

**Combined Cost**: ~$2.80/user/month

---

## 🐛 Troubleshooting

### OpenAI API Errors

```bash
# Check API key
echo $OPENAI_API_KEY

# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### R2 Upload Failures

```bash
# Verify R2 credentials
aws s3 ls --endpoint-url $R2_ENDPOINT

# Test upload
aws s3 cp test.txt s3://$R2_BUCKET_NAME/ --endpoint-url $R2_ENDPOINT
```

### Database Migration Errors

```bash
# Reset migrations (development only!)
pnpm drizzle-kit drop

# Re-run migrations
pnpm drizzle-kit push:pg
```

---

## 📚 Additional Resources

- [Mail-0/Zero Documentation](https://github.com/Mail-0/Zero/wiki)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [Drizzle ORM Guide](https://orm.drizzle.team/docs/overview)

---

## ✅ Success Criteria

Integration is complete when:

- [ ] All AI features work in Mail-0 composer
- [ ] Attachments upload to R2 successfully
- [ ] AI classification runs on all uploads
- [ ] No TypeScript errors
- [ ] All tests pass
- [ ] Deployed to staging
- [ ] User testing completed
- [ ] Documentation updated

---

## 🎯 Next Steps After Integration

1. **User Onboarding**: Create tutorial for new AI features
2. **Analytics**: Track which AI features are most used
3. **Feedback Loop**: Collect user feedback on AI quality
4. **Cost Optimization**: Implement caching and rate limiting
5. **Feature Expansion**: Add more AI capabilities (sentiment analysis, auto-replies, etc.)

---

**Questions or issues?** Open an issue or reach out in the Mail-0 community.

**Happy coding! 🚀**
