# Mail-0/Zero Integration - Quick Start Checklist

**Created:** January 23, 2026
**Estimated Time:** 2-3 hours for setup, 16-24 hours total

---

## 🚀 Phase 1: Setup (30 minutes)

```bash
# 1. Create workspace
cd C:\dev
mkdir mail-zero-ai
cd mail-zero-ai

# 2. Clone repositories
git clone https://github.com/Mail-0/Zero.git mail-zero
git clone https://github.com/tdaniel1925/easemail-pro.git easemail-reference

# 3. Create integration branch
cd mail-zero
git checkout -b feature/easemail-ai-integration

# 4. Install dependencies
pnpm install

# 5. Copy environment template
cp .env.example .env.local
```

**Status:** [ ] Complete

---

## 🤖 Phase 2: Port AI Features (4-6 hours)

### 2.1 Create Directory Structure

```bash
cd apps/mail  # or wherever the main app is

mkdir -p lib/ai
mkdir -p app/api/ai
mkdir -p components/ai
```

### 2.2 Copy Core AI Services

```bash
# From C:\dev\mail-zero-ai\mail-zero\apps\mail

# AI Write Service (most important)
cp ../../../../easemail-reference/lib/ai/ai-write-service.ts lib/ai/
cp ../../../../easemail-reference/lib/ai/ai-write-types.ts lib/ai/
cp ../../../../easemail-reference/lib/ai/config.ts lib/ai/

# Thread Analyzer
cp ../../../../easemail-reference/lib/ai/thread-analyzer.ts lib/ai/

# Supporting files
cp ../../../../easemail-reference/lib/ai/retry.ts lib/ai/
cp ../../../../easemail-reference/lib/ai/system-knowledge.ts lib/ai/
```

**Status:** [ ] Complete

### 2.3 Update Imports

**CRITICAL:** Update these imports in ALL copied files:

```typescript
// 1. Auth System
// OLD: import { createClient } from '@supabase/supabase-js'
// NEW: import { auth } from '@/lib/auth' // Better Auth

// 2. Database
// OLD: import { db } from '@/lib/db/drizzle'
// NEW: import { db } from '@/lib/db' // Or wherever Mail-0 has it

// 3. Check component paths match Mail-0's structure
```

**Files to update:**
- [ ] `lib/ai/ai-write-service.ts`
- [ ] `lib/ai/thread-analyzer.ts`
- [ ] `lib/ai/config.ts`

**Status:** [ ] Complete

### 2.4 Create API Routes

Create these 5 files:

```bash
touch app/api/ai/write/route.ts          # AI email generation
touch app/api/ai/remix/route.ts          # Draft transformation
touch app/api/ai/summarize/route.ts      # Thread summaries
touch app/api/ai/grammar-check/route.ts  # Grammar checking
touch app/api/ai/dictation-polish/route.ts # Voice transcription
```

**Copy template from guide** (Section 3.4) and adapt for each endpoint.

**Status:** [ ] Complete

### 2.5 Copy UI Components

```bash
cp ../../../../easemail-reference/components/ai/UnifiedAIToolbar.tsx components/ai/
cp ../../../../easemail-reference/components/ai/AIWriteModal.tsx components/ai/
cp ../../../../easemail-reference/components/ai/AIRemixPanel.tsx components/ai/
cp ../../../../easemail-reference/components/ai/DictationDialog.tsx components/ai/
```

**Status:** [ ] Complete

### 2.6 Install Dependencies

```bash
pnpm add openai ai @ai-sdk/openai
```

**Status:** [ ] Complete

### 2.7 Environment Variables

Add to `.env.local`:

```bash
OPENAI_API_KEY=sk-proj-...your-key...
AI_USAGE_TRACKING_ENABLED=true
```

**Status:** [ ] Complete

---

## 📎 Phase 3: Port Attachment System (4-6 hours)

### 3.1 Create Attachments Module

```bash
mkdir -p lib/attachments
mkdir -p app/api/attachments
```

### 3.2 Create R2 Upload Service

Create `lib/attachments/r2-upload.ts` (copy from guide Section 4.3)

**Status:** [ ] Complete

### 3.3 Copy AI Classification Service

```bash
cp ../../../../easemail-reference/lib/attachments/ai-service.ts lib/attachments/
cp ../../../../easemail-reference/lib/attachments/types.ts lib/attachments/
cp ../../../../easemail-reference/lib/attachments/utils.ts lib/attachments/
```

**Update import:** Change `uploadAttachment` to use R2 instead of Supabase.

**Status:** [ ] Complete

### 3.4 Create Attachment API Routes

```bash
touch app/api/attachments/upload/route.ts
touch app/api/attachments/[id]/download/route.ts
touch app/api/attachments/process/route.ts
touch app/api/attachments/smart-filters/route.ts
```

**Status:** [ ] Complete

### 3.5 Install R2 Dependencies

```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Status:** [ ] Complete

### 3.6 Environment Variables

Add to `.env.local`:

```bash
# Get these from Cloudflare R2 dashboard
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=mail-zero-attachments
```

**Status:** [ ] Complete

---

## 🗄️ Phase 4: Database Schema (2-3 hours)

### 4.1 Find Schema File

```bash
# Usually one of these:
# - drizzle/schema.ts
# - lib/db/schema.ts
# - apps/mail/lib/db/schema.ts

find . -name "schema.ts" -type f | grep -v node_modules
```

**Location:** _______________

### 4.2 Add Tables

Add to schema file (copy from guide Section 5.2):

- [ ] `aiUsage` table (tracks AI feature usage and costs)
- [ ] `attachments` table (stores attachment metadata)
- [ ] Indexes for performance

**Status:** [ ] Complete

### 4.3 Generate Migration

```bash
# Generate migration file
pnpm drizzle-kit generate:pg

# OR (if different command)
pnpm db:generate
```

**Status:** [ ] Complete

### 4.4 Apply Migration

```bash
# Apply to database
pnpm drizzle-kit push:pg

# OR
pnpm db:migrate
```

**Status:** [ ] Complete

---

## 🎨 Phase 5: UI Integration (3-4 hours)

### 5.1 Find Email Composer

```bash
# Search for composer component
find components -name "*ompos*" -type f

# Common locations:
# - components/email/Composer.tsx
# - components/compose/EmailComposer.tsx
# - app/(mail)/compose/page.tsx
```

**Location:** _______________

### 5.2 Add AI Toolbar

Edit the composer component:

```typescript
import { UnifiedAIToolbar } from '@/components/ai/UnifiedAIToolbar';

// Add inside composer component:
<UnifiedAIToolbar
  subject={subject}
  body={body}
  onSubjectChange={setSubject}
  onBodyChange={setBody}
  userTier={userTier} // Get from user's subscription
/>
```

**Status:** [ ] Complete

### 5.3 Create Attachments Page

```bash
# Create attachments page
mkdir -p app/(mail)/attachments
touch app/(mail)/attachments/page.tsx
```

Copy template from guide Section 6.3.

**Status:** [ ] Complete

### 5.4 Update Navigation

Add "Attachments" link to sidebar/navigation.

**Status:** [ ] Complete

---

## 🧪 Phase 6: Testing (2-3 hours)

### 6.1 TypeScript Check

```bash
npx tsc --noEmit
```

**Errors:** [ ] None / [ ] Need to fix: _______________

### 6.2 Build Check

```bash
pnpm build
```

**Status:** [ ] Success / [ ] Failed: _______________

### 6.3 Manual Testing

- [ ] AI Write: Generate email from prompt
- [ ] AI Remix: Transform existing draft
- [ ] Dictation: Record and transcribe voice
- [ ] Upload attachment (PDF)
- [ ] Check AI classification (should show "Invoice" or similar)
- [ ] View extracted metadata
- [ ] Filter attachments by type
- [ ] Search attachments

---

## 🚀 Phase 7: Deployment (1-2 hours)

### 7.1 Commit Changes

```bash
git add .
git status  # Review what's being committed

git commit -m "feat: Integrate EaseMail AI features and attachments

- Port AI Write, Remix, Thread Analyzer
- Add attachment system with R2 storage
- Add AI document classification
- Create unified AI toolbar
- Update database schema

Features:
✅ AI email writing
✅ AI draft remixing
✅ Thread summarization
✅ Voice dictation
✅ Smart attachments
✅ Document classification"
```

**Status:** [ ] Complete

### 7.2 Push to Remote

```bash
# If forking Mail-0/Zero to your own repo
git remote add origin https://github.com/YOUR-USERNAME/mail-zero-ai.git
git push -u origin feature/easemail-ai-integration
```

**Status:** [ ] Complete

### 7.3 Create Pull Request

1. Go to GitHub
2. Create PR: `feature/easemail-ai-integration` → `main`
3. Use description from guide Section 8.3

**Status:** [ ] Complete

### 7.4 Deploy

```bash
# Deploy to Vercel/Netlify/etc.
vercel deploy --prod

# OR
pnpm deploy
```

**Status:** [ ] Complete

---

## ✅ Success Checklist

Integration is successful when:

- [ ] No TypeScript errors
- [ ] Build succeeds
- [ ] All AI features work in composer
- [ ] Attachments upload to R2
- [ ] AI classification works
- [ ] Tests pass
- [ ] Deployed successfully

---

## 📊 Progress Tracker

| Phase | Time Estimate | Actual Time | Status |
|-------|---------------|-------------|--------|
| 1. Setup | 30 min | _____ | [ ] |
| 2. AI Features | 4-6 hrs | _____ | [ ] |
| 3. Attachments | 4-6 hrs | _____ | [ ] |
| 4. Database | 2-3 hrs | _____ | [ ] |
| 5. UI Integration | 3-4 hrs | _____ | [ ] |
| 6. Testing | 2-3 hrs | _____ | [ ] |
| 7. Deployment | 1-2 hrs | _____ | [ ] |
| **Total** | **16-24 hrs** | **_____** | **[ ]** |

---

## 🆘 Help & Support

**If you get stuck:**

1. Check the full guide: `MAIL-0-INTEGRATION-GUIDE.md`
2. Review troubleshooting section (Section 9)
3. Check Mail-0/Zero docs: https://github.com/Mail-0/Zero/wiki
4. Open an issue on GitHub

**Common issues:**

- **Import errors:** Check that you updated auth/db imports to Mail-0's structure
- **Build errors:** Run `npx tsc --noEmit` to see detailed TypeScript errors
- **R2 upload fails:** Verify R2 credentials in `.env.local`
- **OpenAI errors:** Check `OPENAI_API_KEY` is valid

---

**Next:** Start with Phase 1 (Setup) and work through each phase sequentially.

Good luck! 🚀
