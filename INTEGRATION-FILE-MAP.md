# Mail-0/Zero Integration - File Structure Map

This document shows exactly which files from EaseMail need to go where in Mail-0/Zero.

---

## 📁 Directory Structure Overview

```
mail-zero/                           # Your new Mail-0/Zero integration
├── apps/
│   └── mail/                        # Main email application
│       ├── app/                     # Next.js app directory
│       │   └── api/                 # API routes
│       │       ├── ai/              # 🆕 AI feature endpoints
│       │       └── attachments/     # 🆕 Attachment endpoints
│       ├── components/              # React components
│       │   ├── ai/                  # 🆕 AI UI components
│       │   ├── attachments/         # 🆕 Attachment UI components
│       │   └── email/               # Existing: Email UI (modify composer)
│       ├── lib/                     # Utilities and services
│       │   ├── ai/                  # 🆕 AI services
│       │   ├── attachments/         # 🆕 Attachment services
│       │   ├── auth/                # Existing: Better Auth
│       │   ├── db/                  # Existing: Drizzle ORM (modify schema)
│       │   └── storage/             # Existing: R2 client (use for attachments)
│       ├── .env.local               # 🆕 Add AI and R2 env vars
│       └── package.json             # 🆕 Add OpenAI and AWS SDK deps
└── drizzle/                         # Database migrations
    └── migrations/                  # 🆕 New migration for AI tables
```

---

## 📋 File Mapping: EaseMail → Mail-0/Zero

### 1. AI Services (`lib/ai/`)

| EaseMail Source | Mail-0/Zero Destination | Changes Required |
|----------------|------------------------|------------------|
| `lib/ai/ai-write-service.ts` | `apps/mail/lib/ai/ai-write-service.ts` | ✏️ Update auth imports |
| `lib/ai/ai-write-types.ts` | `apps/mail/lib/ai/ai-write-types.ts` | ✅ No changes |
| `lib/ai/ai-remix-service.ts` | `apps/mail/lib/ai/ai-remix-service.ts` | ✏️ Update auth imports |
| `lib/ai/thread-analyzer.ts` | `apps/mail/lib/ai/thread-analyzer.ts` | ✏️ Update email interface |
| `lib/ai/dictation-service.ts` | `apps/mail/lib/ai/dictation-service.ts` | ✏️ Update auth imports |
| `lib/ai/dictation-polish.ts` | `apps/mail/lib/ai/dictation-polish.ts` | ✅ No changes |
| `lib/ai/system-knowledge.ts` | `apps/mail/lib/ai/system-knowledge.ts` | ✅ No changes |
| `lib/ai/context-builder.ts` | `apps/mail/lib/ai/context-builder.ts` | ✅ No changes |
| `lib/ai/retry.ts` | `apps/mail/lib/ai/retry.ts` | ✅ No changes |
| `lib/ai/config.ts` | `apps/mail/lib/ai/config.ts` | ✅ No changes |

**Changes to make:**

```typescript
// Before (EaseMail):
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(...);
const user = await supabase.auth.getUser();

// After (Mail-0/Zero):
import { auth } from '@/lib/auth'; // Better Auth
const session = await auth.api.getSession({ headers: req.headers });
const user = session.user;
```

---

### 2. AI API Routes (`app/api/ai/`)

| New File | Purpose | Template Source |
|----------|---------|----------------|
| `app/api/ai/write/route.ts` | Generate emails | Guide Section 3.4 |
| `app/api/ai/remix/route.ts` | Transform drafts | Similar to write |
| `app/api/ai/summarize/route.ts` | Thread summaries | Similar to write |
| `app/api/ai/grammar-check/route.ts` | Grammar checking | Similar to write |
| `app/api/ai/dictation-polish/route.ts` | Voice transcription | Similar to write |
| `app/api/ai/generate-reply/route.ts` | Smart replies | Similar to write |
| `app/api/ai/learn-style/route.ts` | Style learning | Similar to write |

**Template for all AI routes:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { aiServiceHere } from '@/lib/ai/service-name';

export async function POST(req: NextRequest) {
  try {
    // Auth check (Mail-0's Better Auth)
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const result = await aiServiceHere.method(body);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

---

### 3. AI UI Components (`components/ai/`)

| EaseMail Source | Mail-0/Zero Destination | Changes Required |
|----------------|------------------------|------------------|
| `components/ai/UnifiedAIToolbar.tsx` | `apps/mail/components/ai/UnifiedAIToolbar.tsx` | ✏️ Update component imports |
| `components/ai/AIWriteModal.tsx` | `apps/mail/components/ai/AIWriteModal.tsx` | ✏️ Update component imports |
| `components/ai/AIRemixPanel.tsx` | `apps/mail/components/ai/AIRemixPanel.tsx` | ✏️ Update component imports |
| `components/ai/DictationDialog.tsx` | `apps/mail/components/ai/DictationDialog.tsx` | ✏️ Update component imports |
| `components/audio/InlineDictationWidget.tsx` | `apps/mail/components/ai/InlineDictationWidget.tsx` | ✏️ Update component imports |
| `components/audio/InlineVoiceMessageWidget.tsx` | `apps/mail/components/ai/InlineVoiceMessageWidget.tsx` | ✏️ Update component imports |

**Changes to make:**

```typescript
// Check if Mail-0 uses same shadcn/ui structure:
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
// Should be the same if using shadcn

// Update API calls to Mail-0's API routes:
fetch('/api/ai/write', { ... })  // Not /api/emails/ai/write
```

---

### 4. Attachment Services (`lib/attachments/`)

| EaseMail Source | Mail-0/Zero Destination | Changes Required |
|----------------|------------------------|------------------|
| ❌ `lib/attachments/upload.ts` | ✅ Create `apps/mail/lib/attachments/r2-upload.ts` | 🔨 **Rewrite for R2** |
| `lib/attachments/ai-service.ts` | `apps/mail/lib/attachments/ai-service.ts` | ✏️ Update upload imports |
| `lib/attachments/types.ts` | `apps/mail/lib/attachments/types.ts` | ✅ No changes |
| `lib/attachments/utils.ts` | `apps/mail/lib/attachments/utils.ts` | ✅ No changes |
| `lib/attachments/extract-from-email.ts` | `apps/mail/lib/attachments/extract-from-email.ts` | ✏️ Update email structure |
| `lib/attachments/attachment-filter.ts` | `apps/mail/lib/attachments/attachment-filter.ts` | ✅ No changes |

**Critical Change: Supabase Storage → Cloudflare R2**

```typescript
// 🚫 DON'T port this (Supabase):
// lib/attachments/upload.ts (uses Supabase Storage)

// ✅ CREATE THIS INSTEAD (R2):
// apps/mail/lib/attachments/r2-upload.ts

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadAttachment(
  userId: string,
  file: Buffer,
  filename: string,
  mimeType: string
) {
  const key = `${userId}/attachments/${Date.now()}_${filename}`;

  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: mimeType,
  }));

  return { storagePath: key };
}
```

---

### 5. Attachment API Routes (`app/api/attachments/`)

| New File | Purpose | EaseMail Reference |
|----------|---------|-------------------|
| `app/api/attachments/upload/route.ts` | Upload files to R2 | `app/api/attachments/upload/route.ts` |
| `app/api/attachments/[id]/download/route.ts` | Download files | `app/api/attachments/[id]/download/route.ts` |
| `app/api/attachments/[id]/preview/route.ts` | Preview images | `app/api/attachments/[id]/preview/route.ts` |
| `app/api/attachments/process/route.ts` | AI classification | `app/api/attachments/process/route.ts` |
| `app/api/attachments/smart-filters/route.ts` | Filter by type | `app/api/attachments/smart-filters/route.ts` |
| `app/api/attachments/[id]/route.ts` | Get/update/delete | `app/api/attachments/[id]/route.ts` |

**Template:** Similar to AI routes (auth check → process → return JSON)

---

### 6. Attachment UI Components (`components/attachments/`)

| EaseMail Source | Mail-0/Zero Destination | Purpose |
|----------------|------------------------|---------|
| `components/attachments/AttachmentsGrid.tsx` | `apps/mail/components/attachments/AttachmentsGrid.tsx` | Grid view |
| `components/attachments/AttachmentCard.tsx` | `apps/mail/components/attachments/AttachmentCard.tsx` | Single card |
| `components/attachments/FilterBar.tsx` | `apps/mail/components/attachments/FilterBar.tsx` | Filter UI |
| `components/attachments/PreviewModal.tsx` | `apps/mail/components/attachments/PreviewModal.tsx` | Preview popup |
| `components/attachments/UploadButton.tsx` | `apps/mail/components/attachments/UploadButton.tsx` | Upload button |
| `components/attachments/SearchBar.tsx` | `apps/mail/components/attachments/SearchBar.tsx` | Search input |

---

### 7. Database Schema (`lib/db/schema.ts`)

**ADD TO EXISTING SCHEMA FILE** (don't create new file):

```typescript
// File: apps/mail/lib/db/schema.ts (or drizzle/schema.ts)

// 🆕 ADD THESE TABLES:

// AI Usage Tracking
export const aiUsage = pgTable('ai_usage', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  feature: varchar('feature', { length: 50 }).notNull(),
  model: varchar('model', { length: 50 }).notNull(),
  tokensUsed: integer('tokens_used').notNull(),
  cost: integer('cost').notNull(), // in cents
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Attachments (with AI metadata)
export const attachments = pgTable('attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  emailId: varchar('email_id', { length: 255 }),
  filename: varchar('filename', { length: 500 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  fileSize: integer('file_size').notNull(),
  storagePath: varchar('storage_path', { length: 1000 }).notNull(),

  // AI fields
  documentType: varchar('document_type', { length: 50 }),
  classificationConfidence: integer('classification_confidence'),
  extractedMetadata: jsonb('extracted_metadata'),
  aiProcessed: boolean('ai_processed').default(false),

  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

### 8. Integration Points (Modify Existing Files)

| File to Modify | Changes | Location |
|---------------|---------|----------|
| **Email Composer** | Add `<UnifiedAIToolbar>` | `components/email/Composer.tsx` |
| **Navigation/Sidebar** | Add "Attachments" link | `components/layout/Sidebar.tsx` |
| **Layout** | Include AI toolbar globally | `app/layout.tsx` |
| **Package.json** | Add dependencies | `package.json` |
| **.env.local** | Add AI and R2 vars | `.env.local` |

**Email Composer Integration:**

```typescript
// File: components/email/Composer.tsx

import { UnifiedAIToolbar } from '@/components/ai/UnifiedAIToolbar';

export function EmailComposer() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  return (
    <div className="composer">
      {/* Subject input */}
      <input value={subject} onChange={(e) => setSubject(e.target.value)} />

      {/* Body editor */}
      <textarea value={body} onChange={(e) => setBody(e.target.value)} />

      {/* 🆕 ADD THIS: */}
      <UnifiedAIToolbar
        subject={subject}
        body={body}
        onSubjectChange={setSubject}
        onBodyChange={setBody}
      />

      {/* Send button */}
      <button>Send</button>
    </div>
  );
}
```

---

## 📦 Dependencies to Install

```bash
# AI Features
pnpm add openai             # OpenAI SDK
pnpm add ai                 # Vercel AI SDK
pnpm add @ai-sdk/openai     # OpenAI provider for AI SDK

# R2 Storage (Cloudflare R2 is S3-compatible)
pnpm add @aws-sdk/client-s3
pnpm add @aws-sdk/s3-request-presigner

# PDF parsing (for attachment AI)
pnpm add pdf-parse

# Optional: Audio transcription
pnpm add @deepgram/sdk      # If using Deepgram for dictation
```

Add to `apps/mail/package.json`:

```json
{
  "dependencies": {
    "openai": "^4.28.0",
    "ai": "^3.0.0",
    "@ai-sdk/openai": "^0.0.20",
    "@aws-sdk/client-s3": "^3.500.0",
    "@aws-sdk/s3-request-presigner": "^3.500.0",
    "pdf-parse": "^1.1.1"
  }
}
```

---

## 🔐 Environment Variables

**Add to `.env.local`:**

```bash
# ========================================
# 🆕 AI FEATURES
# ========================================
OPENAI_API_KEY=sk-proj-...your-openai-key...
AI_USAGE_TRACKING_ENABLED=true
AI_MODEL_DEFAULT=gpt-4o-mini

# ========================================
# 🆕 CLOUDFLARE R2 STORAGE
# ========================================
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...get-from-cloudflare-dashboard...
R2_SECRET_ACCESS_KEY=...get-from-cloudflare-dashboard...
R2_BUCKET_NAME=mail-zero-attachments
R2_PUBLIC_URL=https://attachments.yourdomain.com  # Optional CDN

# ========================================
# 🆕 OPTIONAL: DEEPGRAM (Voice Transcription)
# ========================================
DEEPGRAM_API_KEY=...your-deepgram-key...  # Optional

# ========================================
# EXISTING MAIL-0 VARIABLES (keep these)
# ========================================
# ... (Mail-0's existing env vars)
```

---

## 🧪 Testing File Map

| Test File | Location | Purpose |
|-----------|----------|---------|
| `lib/ai/__tests__/ai-write-service.test.ts` | `apps/mail/lib/ai/__tests__/` | Test AI Write |
| `lib/ai/__tests__/thread-analyzer.test.ts` | `apps/mail/lib/ai/__tests__/` | Test summarization |
| `lib/attachments/__tests__/ai-service.test.ts` | `apps/mail/lib/attachments/__tests__/` | Test classification |
| `lib/attachments/__tests__/r2-upload.test.ts` | `apps/mail/lib/attachments/__tests__/` | Test R2 uploads |

---

## 📊 File Count Summary

| Category | Files to Create | Files to Modify | Files to Copy |
|----------|----------------|-----------------|---------------|
| AI Services | 0 | 2 | 10 |
| AI API Routes | 7 | 0 | 0 |
| AI Components | 0 | 0 | 6 |
| Attachment Services | 1 (R2 client) | 1 | 5 |
| Attachment API | 6 | 0 | 0 |
| Attachment UI | 0 | 0 | 6 |
| Database | 0 | 1 (schema) | 0 |
| Config | 0 | 2 (.env, pkg) | 0 |
| **Total** | **14** | **6** | **27** |

**Total new/modified files: ~47**

---

## ✅ Verification Checklist

After integration, verify these files exist:

```bash
# AI Services
ls apps/mail/lib/ai/ai-write-service.ts
ls apps/mail/lib/ai/thread-analyzer.ts

# AI API Routes
ls apps/mail/app/api/ai/write/route.ts
ls apps/mail/app/api/ai/remix/route.ts

# AI Components
ls apps/mail/components/ai/UnifiedAIToolbar.tsx

# Attachments
ls apps/mail/lib/attachments/r2-upload.ts
ls apps/mail/lib/attachments/ai-service.ts
ls apps/mail/app/api/attachments/upload/route.ts

# Schema
grep "aiUsage" apps/mail/lib/db/schema.ts
grep "attachments" apps/mail/lib/db/schema.ts
```

All should exist. If any are missing, review the integration steps.

---

## 🎯 Next Steps

1. Print this file map
2. Use it as a checklist while integrating
3. Check off each file as you copy/create it
4. Verify all imports are updated
5. Test build: `pnpm build`
6. Test functionality manually

---

**Happy integrating! 🚀**
