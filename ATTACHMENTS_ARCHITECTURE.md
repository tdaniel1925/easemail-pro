# Email Attachments Architecture

## 📎 Overview

EaseMail uses **Nylas API** to handle email attachments. Attachments are **NOT stored locally** - only metadata is stored in your database, while actual files remain on the email provider's servers (Gmail, Outlook, etc.).

---

## 🔄 How It Works

### **1. Email Sync (Metadata Only)**

When emails are synced from Nylas:

```typescript
// From Nylas API Response
{
  id: "msg_123",
  subject: "Invoice Attached",
  attachments: [
    {
      id: "att_456",
      filename: "invoice.pdf",
      size: 245678,
      contentType: "application/pdf",
      contentId: "abc123@mail",
      url: null  // No direct URL initially
    }
  ]
}
```

### **2. Database Storage (Metadata)**

Only attachment **metadata** is stored in PostgreSQL:

```typescript
// Stored in emails.attachments (JSONB column)
[
  {
    id: "att_456",
    filename: "invoice.pdf",
    size: 245678,
    contentType: "application/pdf",
    contentId: "abc123@mail",
    url: null,
    providerFileId: "att_456"
  }
]
```

**Benefits:**
- ✅ No storage costs for files
- ✅ Fast database queries
- ✅ Unlimited attachment sizes
- ✅ Files stay on provider servers (Gmail, Outlook)

---

## 📥 Downloading Attachments

### **Current Implementation**

Right now, attachments are displayed but **download is not fully implemented**. Here's what exists:

**In `EmailList.tsx` (lines 254-284):**
```tsx
{email.attachments.map((attachment) => (
  <div className="flex items-center justify-between">
    <div>
      <p>{attachment.filename}</p>
      <p>{formatFileSize(attachment.size)}</p>
    </div>
    <Button size="sm" variant="outline">
      <Download className="h-3.5 w-3.5" />
    </Button>
  </div>
))}
```

### **How to Implement Download** (Future Enhancement)

To enable downloads, you need:

#### **1. Create Download API Route**

`app/api/nylas/attachments/[attachmentId]/route.ts`:

```typescript
import { nylas } from '@/lib/email/nylas-client';

export async function GET(
  request: Request,
  { params }: { params: { attachmentId: string } }
) {
  const { attachmentId } = params;
  const grantId = request.headers.get('X-Grant-Id'); // From session
  const messageId = request.headers.get('X-Message-Id');

  try {
    // Download from Nylas
    const attachment = await nylas.attachments.download({
      identifier: grantId,
      attachmentId: attachmentId,
      messageId: messageId,
    });

    // Stream to user
    return new Response(attachment.data, {
      headers: {
        'Content-Type': attachment.contentType,
        'Content-Disposition': `attachment; filename="${attachment.filename}"`,
        'Content-Length': attachment.size.toString(),
      },
    });
  } catch (error) {
    return Response.json({ error: 'Download failed' }, { status: 500 });
  }
}
```

#### **2. Add Download Handler**

```tsx
const handleDownload = async (attachment: Attachment, grantId: string, messageId: string) => {
  const response = await fetch(`/api/nylas/attachments/${attachment.id}`, {
    headers: {
      'X-Grant-Id': grantId,
      'X-Message-Id': messageId,
    },
  });
  
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = attachment.filename;
  a.click();
};
```

---

## 🎨 Attachment Display Features

### **Current Features:**

1. **Preview Badge** - Shows attachment count on email card
   ```tsx
   <Paperclip className="h-3.5 w-3.5" />
   {email.attachments.length}
   ```

2. **File Type Icons** - Visual indicators
   ```tsx
   PDF → Red "PDF" badge
   Excel → Green "XLS" badge
   Others → Blue "FILE" badge
   ```

3. **File Info** - Filename and size display
   ```tsx
   invoice.pdf
   240 KB
   ```

4. **Download Button** - UI ready, needs API hookup
   ```tsx
   <Button size="sm" variant="outline">
     <Download className="h-3.5 w-3.5" />
   </Button>
   ```

---

## 📊 Attachment Data Flow

```
┌─────────────────┐
│  Email Provider │ (Gmail/Outlook)
│  Stores Files   │
└────────┬────────┘
         │
         │ Sync
         ▼
┌─────────────────┐
│   Nylas API     │
│  (Proxy Layer)  │
└────────┬────────┘
         │
         │ Metadata
         ▼
┌─────────────────┐
│  Your Database  │
│  (PostgreSQL)   │
│  - filename     │
│  - size         │
│  - contentType  │
│  - id           │
└────────┬────────┘
         │
         │ Display
         ▼
┌─────────────────┐
│   React UI      │
│  (EmailList)    │
└─────────────────┘

         │ Click Download
         ▼
┌─────────────────┐
│  Nylas API      │
│  Downloads from │
│  Provider       │
└────────┬────────┘
         │
         │ Stream
         ▼
┌─────────────────┐
│  User Browser   │
│  (File Download)│
└─────────────────┘
```

---

## 🔒 Security Considerations

### **Current Implementation:**

1. **No File Storage** - Files never touch your server
2. **Nylas Authentication** - Grant ID required for downloads
3. **Provider Security** - Gmail/Outlook handle file access

### **Recommended for Production:**

1. **Rate Limiting** - Prevent abuse of download endpoint
2. **Virus Scanning** - Scan files before download (optional)
3. **Access Control** - Verify user owns the email
4. **Audit Logging** - Track who downloads what

---

## 📈 Performance

### **Advantages:**

- ✅ **Fast Sync** - Only metadata synced, not files
- ✅ **Low Storage** - JSONB column stores ~1KB per email
- ✅ **Scalable** - Can handle millions of attachments
- ✅ **Cost-Effective** - No file storage costs

### **Considerations:**

- ⚠️ **Download Speed** - Depends on Nylas → Provider connection
- ⚠️ **Nylas API Limits** - Bandwidth limits may apply
- ⚠️ **Provider Access** - Requires valid OAuth token

---

## 🚀 Future Enhancements

### **Planned Features:**

1. **Direct Downloads** - Implement download API route
2. **Preview** - PDF/Image previews in modal
3. **Inline Images** - Show images in email body
4. **Attachment Search** - Search by filename
5. **Batch Download** - Download all attachments as ZIP
6. **Cloud Storage** - Save to Google Drive/Dropbox
7. **Smart Detection** - AI-powered attachment categorization

---

## 💡 Pro Tips

### **For Developers:**

1. **Don't Store Files** - Always use Nylas as proxy
2. **Cache Metadata** - Database stores everything needed for display
3. **Stream Downloads** - Don't buffer entire file in memory
4. **Check File Size** - Warn for large files (>25MB)
5. **Handle Errors** - Token expiry, file deleted, etc.

### **For Users:**

1. Attachments load instantly (metadata only)
2. Downloads are always fresh from provider
3. No storage limits on your end
4. Original file permissions apply

---

## 🔧 Implementation Status

| Feature | Status | Location |
|---------|--------|----------|
| Sync Metadata | ✅ Done | `app/api/nylas/messages/route.ts` |
| Store in DB | ✅ Done | `lib/db/schema.ts` |
| Display List | ✅ Done | `components/email/EmailList.tsx` |
| Show Icons | ✅ Done | `components/email/EmailList.tsx` |
| Download API | ❌ TODO | Need to create |
| Preview | ❌ TODO | Need to create |
| Inline Images | ❌ TODO | Need to create |

---

## 📝 Summary

**EaseMail uses a smart metadata-only approach:**

- 📧 Emails synced with attachment metadata
- 💾 Only info stored (filename, size, type)
- 🔗 Files remain on provider servers
- ⬇️ Downloads proxied through Nylas
- 🚀 Fast, scalable, cost-effective

**No local file storage = No storage costs! 🎉**

