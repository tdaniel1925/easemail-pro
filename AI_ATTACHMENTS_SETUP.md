# 🤖 AI Attachments System - Complete Setup Guide

## **📋 Overview**

Your AI-powered attachments system is **90% complete**! This guide will walk you through the final setup steps.

---

## **✅ What's Already Built**

1. ✅ **Database Schema** - `attachments` table in Drizzle & migration ready
2. ✅ **AI Service** - OpenAI integration for classification & extraction
3. ✅ **Background Processor** - `/api/attachments/process` endpoint
4. ✅ **API Routes** - Full CRUD, search, filtering, stats
5. ✅ **UI Components** - Attachments page with search/filters/preview
6. ✅ **Sidebar Navigation** - Paperclip icon link added

---

## **🚀 Setup Steps (15 minutes)**

### **Step 1: Run Database Migration**

```bash
# Run the migration to create attachments table
npx drizzle-kit push:pg

# OR if using your existing setup:
psql -U postgres -d your_database -f migrations/add_attachments_table.sql
```

---

### **Step 2: Configure Supabase Storage**

**A. Create Bucket in Supabase Dashboard:**

1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/storage
2. Click "New bucket"
3. Name: `attachments`
4. Set to **Private** (not public)
5. Click "Create bucket"

**B. Set Storage Policies (Run in SQL Editor):**

```sql
-- Allow users to upload attachments
CREATE POLICY "Users can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'attachments');

-- Allow users to read attachments
CREATE POLICY "Users can read attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'attachments');

-- Allow users to delete attachments
CREATE POLICY "Users can delete attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'attachments');
```

---

### **Step 3: Add Environment Variable**

Add to your `.env.local`:

```bash
# AI Processing Security Key
ATTACHMENT_PROCESSING_KEY=your-secret-key-here-change-in-production
```

**Generate a secure key:**
```bash
# Mac/Linux
openssl rand -hex 32

# Windows PowerShell
-join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

---

### **Step 4: Install Missing Dependencies (if needed)**

```bash
npm install openai pdf-parse
```

---

### **Step 5: Add Attachment Extraction to Email Sync**

You need to modify your email sync (`app/api/nylas/sync/background/route.ts`) to extract attachments.

**Add this helper function to your sync file (around line 200):**

```typescript
// Helper function to extract and save attachments
async function extractAttachments(
  email: any,
  accountId: string,
  userId: string,
  grantId: string
) {
  if (!email.files || email.files.length === 0) return;

  const supabase = createClient();

  for (const file of email.files) {
    try {
      // Skip inline images and very large files
      if (file.contentDisposition === 'inline') continue;
      if (file.size > 20 * 1024 * 1024) continue; // Skip > 20MB

      // Download attachment from Nylas
      const attachmentResponse = await nylas.messages.downloadAttachment({
        identifier: grantId,
        messageId: email.id,
        attachmentId: file.id,
      });

      // Upload to Supabase Storage
      const storagePath = `${userId}/${email.id}/${file.filename}`;
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(storagePath, attachmentResponse, {
          contentType: file.contentType,
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      // Get file extension
      const extension = file.filename.split('.').pop()?.toLowerCase();

      // Create attachment record
      await db.insert(attachments).values({
        userId,
        emailId: emailRecord.id,
        accountId,
        filename: file.filename,
        fileExtension: extension,
        mimeType: file.contentType,
        fileSizeBytes: file.size,
        storagePath,
        emailSubject: email.subject,
        senderEmail: email.from[0]?.email,
        senderName: email.from[0]?.name,
        emailDate: new Date(email.date * 1000),
        processingStatus: 'pending',
        aiProcessed: false,
      });

      console.log(`📎 Saved attachment: ${file.filename}`);
    } catch (error) {
      console.error(`Failed to save attachment ${file.filename}:`, error);
    }
  }
}
```

**Then add this line after saving each email (around line 200-250):**

```typescript
// After: await db.insert(emails).values({ ... })

// Extract and save attachments
await extractAttachments(message, accountId, account.userId, grantId);
```

---

## **🎯 Testing the AI System**

### **1. Sync Some Emails with Attachments**

Run your email sync to get emails with attachments into the system.

### **2. Check Attachments Queued**

```bash
curl http://localhost:3001/api/attachments/process
```

You should see:
```json
{
  "stats": {
    "pending": 5,
    "processing": 0,
    "completed": 0,
    "failed": 0
  }
}
```

### **3. Run AI Processing**

```bash
curl -X POST http://localhost:3001/api/attachments/process \
  -H "Authorization: Bearer your-secret-key-here"
```

Watch the console for AI classification output:
```
🤖 Processing 5 attachments...
📄 Processing: invoice.pdf
🧠 Running AI classification...
✅ Processed: invoice.pdf → invoice
```

### **4. View in UI**

Navigate to `http://localhost:3001/attachments` and see:
- Attachments with AI-classified types (Invoice, Receipt, etc.)
- Smart filters working
- Search by document type

---

## **💰 Cost Estimates**

**OpenAI API Costs:**
- Classification: ~$0.002 per file
- Data Extraction: ~$0.001 per file
- **Total: ~$0.003 per attachment**

**For 1,000 attachments: ~$3.00**

---

## **🔄 Automated Processing**

### **Option A: Cron Job (Recommended)**

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/attachments/process",
    "schedule": "*/15 * * * *"
  }]
}
```

### **Option B: Manual Trigger**

Create an admin button to run processing on demand.

### **Option C: Process After Sync**

Add to email sync completion:
```typescript
// After sync completes
await fetch('/api/attachments/process', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.ATTACHMENT_PROCESSING_KEY}`
  }
});
```

---

## **📊 Monitoring**

**Check Processing Status:**
```bash
GET /api/attachments/process
```

**View Statistics:**
```bash
GET /api/attachments/stats
```

Returns:
```json
{
  "totalAttachments": 150,
  "aiProcessedCount": 150,
  "documentTypeCounts": {
    "invoice": 45,
    "receipt": 30,
    "contract": 12,
    "image": 50,
    "other": 13
  }
}
```

---

## **🎉 You're Done!**

Your AI attachments system is now fully operational! Key features:

✅ **Automatic extraction** from synced emails
✅ **AI classification** (invoice, receipt, contract, etc.)
✅ **Smart data extraction** (amounts, dates, vendors)
✅ **Full-text search** with filters
✅ **Beautiful UI** with preview
✅ **Cost-effective** processing

---

## **🐛 Troubleshooting**

**Problem: "No attachments found"**
- Check if emails have attachments
- Verify storage bucket is created
- Check console for sync errors

**Problem: "Processing fails"**
- Verify `OPENAI_API_KEY` in `.env.local`
- Check OpenAI API credits/limits
- Review console logs for specific errors

**Problem: "Unauthorized" when processing**
- Verify `ATTACHMENT_PROCESSING_KEY` matches in header

---

## **📈 Next Steps**

1. **Add more document types** - Extend AI prompts in `ai-service.ts`
2. **Enable OCR for images** - Add Google Cloud Vision
3. **Financial summaries** - Aggregate invoice/receipt amounts
4. **Email integration** - Link back to original emails
5. **Batch upload** - Allow manual file uploads

---

**Questions? Check the code comments in:**
- `app/api/attachments/process/route.ts` - AI processor
- `lib/attachments/ai-service.ts` - AI classification logic
- `app/(dashboard)/attachments/page.tsx` - UI components

