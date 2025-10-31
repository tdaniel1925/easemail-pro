# EaseMail Attachments V1 - API Documentation

## Base URL
```
/api/attachments
```

---

## Endpoints

### 1. List Attachments

Retrieve a paginated list of attachments with optional filtering, searching, and sorting.

**Endpoint:** `GET /api/attachments`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Page number (1-indexed) |
| `limit` | number | No | 50 | Items per page (max 200) |
| `search` | string | No | - | Full-text search query |
| `fileTypes` | string[] | No | - | Filter by file extensions (comma-separated) |
| `fileCategories` | string[] | No | - | Filter by categories: document, image, spreadsheet, etc. |
| `documentTypes` | string[] | No | - | Filter by AI-classified types: invoice, receipt, contract, etc. |
| `dateFrom` | ISO string | No | - | Filter attachments from this date |
| `dateTo` | ISO string | No | - | Filter attachments until this date |
| `senders` | string[] | No | - | Filter by sender emails (comma-separated) |
| `minSize` | number | No | - | Minimum file size in bytes |
| `maxSize` | number | No | - | Maximum file size in bytes |
| `aiProcessedOnly` | boolean | No | false | Only show AI-processed attachments |
| `hasMetadata` | boolean | No | false | Only show attachments with extracted metadata |
| `sortBy` | string | No | date | Sort field: date, name, size, sender, type |
| `sortOrder` | string | No | desc | Sort order: asc, desc |

**Example Request:**
```bash
GET /api/attachments?search=invoice&documentTypes=invoice&dateFrom=2025-01-01&sortBy=date&sortOrder=desc&page=1&limit=50
```

**Success Response (200):**
```typescript
{
  data: Attachment[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
  filters: AppliedFilters;
}
```

**Example Response:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "user-123",
      "emailId": "email-456",
      "filename": "Invoice_Acme_2025.pdf",
      "fileExtension": "pdf",
      "mimeType": "application/pdf",
      "fileSizeBytes": 524288,
      "storagePath": "user-123/attachments/invoice_123.pdf",
      "storageBucket": "email-attachments",
      "thumbnailPath": "user-123/thumbnails/invoice_123_thumb.webp",
      "senderEmail": "billing@acme.com",
      "senderName": "Acme Corp Billing",
      "emailSubject": "Invoice #INV-2025-1234",
      "emailDate": "2025-10-25T10:30:00Z",
      "documentType": "invoice",
      "classificationConfidence": 0.95,
      "extractedMetadata": {
        "type": "invoice",
        "amount": 2450.00,
        "currency": "USD",
        "invoiceNumber": "INV-2025-1234",
        "dueDate": "2025-11-15",
        "vendor": "Acme Corp",
        "isPaid": false,
        "paymentStatus": "unpaid"
      },
      "keyTerms": ["invoice", "acme corp", "payment", "services"],
      "aiProcessed": true,
      "aiProcessedAt": "2025-10-25T10:31:00Z",
      "aiModelVersion": "gpt-4-vision-2024",
      "accessCount": 5,
      "lastAccessedAt": "2025-10-30T14:20:00Z",
      "createdAt": "2025-10-25T10:30:00Z",
      "updatedAt": "2025-10-30T14:20:00Z"
    }
  ],
  "pagination": {
    "total": 127,
    "page": 1,
    "limit": 50,
    "totalPages": 3,
    "hasMore": true
  },
  "filters": {
    "search": "invoice",
    "documentTypes": ["invoice"],
    "dateRange": {
      "from": "2025-01-01T00:00:00Z",
      "to": "2025-10-31T23:59:59Z"
    }
  }
}
```

---

### 2. Get Single Attachment

Retrieve detailed information about a specific attachment.

**Endpoint:** `GET /api/attachments/:id`

**Path Parameters:**
- `id` (string, required): Attachment UUID

**Success Response (200):**
```typescript
{
  data: Attachment;
}
```

**Error Response (404):**
```json
{
  "error": "Attachment not found"
}
```

---

### 3. Get Attachment Preview URL

Get a signed URL for previewing the attachment (images, PDFs).

**Endpoint:** `GET /api/attachments/:id/preview`

**Path Parameters:**
- `id` (string, required): Attachment UUID

**Success Response (200):**
```json
{
  "url": "https://storage.supabase.co/...",
  "type": "image",
  "expiresAt": "2025-10-31T15:00:00Z"
}
```

**Preview Types:**
- `image`: Direct image URL
- `pdf`: PDF file URL
- `thumbnail`: Thumbnail image URL
- `unsupported`: No preview available

---

### 4. Download Attachment

Get a signed URL for downloading the attachment.

**Endpoint:** `GET /api/attachments/:id/download`

**Path Parameters:**
- `id` (string, required): Attachment UUID

**Success Response (200):**
```json
{
  "url": "https://storage.supabase.co/...",
  "filename": "Invoice_Acme_2025.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 524288,
  "expiresAt": "2025-10-31T15:00:00Z"
}
```

**Side Effects:**
- Increments `accessCount`
- Updates `lastAccessedAt`

---

### 5. Get Storage Statistics

Get aggregated statistics about user's attachments.

**Endpoint:** `GET /api/attachments/stats`

**Success Response (200):**
```typescript
{
  data: AttachmentStats;
}
```

**Example Response:**
```json
{
  "data": {
    "totalAttachments": 1234,
    "totalSizeBytes": 2147483648,
    "aiProcessedCount": 987,
    "documentTypeCounts": {
      "invoice": 145,
      "receipt": 234,
      "contract": 23,
      "report": 89,
      "image": 543,
      "other": 200
    },
    "fileTypeCounts": {
      "pdf": 456,
      "jpg": 321,
      "png": 234,
      "docx": 123,
      "xlsx": 100
    },
    "categoryCounts": {
      "document": 579,
      "image": 555,
      "spreadsheet": 100
    },
    "financialSummary": {
      "totalInvoices": 145,
      "totalInvoiceAmount": 125000.00,
      "unpaidInvoices": 23,
      "unpaidAmount": 34500.00,
      "totalReceipts": 234,
      "totalReceiptAmount": 12345.67
    },
    "latestAttachmentDate": "2025-10-31T10:00:00Z",
    "oldestAttachmentDate": "2023-01-15T08:00:00Z",
    "attachmentsByMonth": [
      { "month": "2025-10", "count": 123 },
      { "month": "2025-09", "count": 98 }
    ],
    "topSenders": [
      { "email": "billing@acme.com", "name": "Acme Corp", "count": 45 },
      { "email": "invoices@vendor.com", "name": "Vendor Inc", "count": 32 }
    ],
    "largestFiles": [
      { "id": "uuid-1", "filename": "presentation.pptx", "sizeBytes": 52428800 },
      { "id": "uuid-2", "filename": "video.mp4", "sizeBytes": 41943040 }
    ]
  }
}
```

---

### 6. Reprocess Attachment

Trigger AI reprocessing for a specific attachment (useful if initial processing failed or model improved).

**Endpoint:** `POST /api/attachments/:id/reprocess`

**Path Parameters:**
- `id` (string, required): Attachment UUID

**Request Body:**
```json
{
  "priority": 8
}
```

**Success Response (202 Accepted):**
```json
{
  "message": "Attachment queued for reprocessing",
  "jobId": "job-uuid-123"
}
```

---

### 7. Smart Filters

Get predefined smart filter configurations with counts.

**Endpoint:** `GET /api/attachments/smart-filters`

**Success Response (200):**
```json
{
  "filters": [
    {
      "id": "unpaid_invoices",
      "label": "Unpaid Invoices",
      "description": "Invoices marked as unpaid",
      "icon": "CurrencyDollarIcon",
      "count": 23,
      "params": {
        "documentTypes": ["invoice"],
        "hasMetadata": true
      }
    },
    {
      "id": "expiring_contracts",
      "label": "Contracts Expiring Soon",
      "description": "Contracts expiring within 90 days",
      "icon": "DocumentCheckIcon",
      "count": 3,
      "params": {
        "documentTypes": ["contract"]
      }
    },
    {
      "id": "receipts_by_amount",
      "label": "Large Receipts",
      "description": "Receipts over $100",
      "icon": "ReceiptPercentIcon",
      "count": 45,
      "params": {
        "documentTypes": ["receipt"]
      }
    },
    {
      "id": "recent_images",
      "label": "Recent Images",
      "description": "Images from last 30 days",
      "icon": "PhotoIcon",
      "count": 89,
      "params": {
        "fileCategories": ["image"],
        "dateFrom": "2025-10-01"
      }
    },
    {
      "id": "large_files",
      "label": "Large Files",
      "description": "Files over 10MB",
      "icon": "ArrowDownTrayIcon",
      "count": 34,
      "params": {
        "minSize": 10485760
      }
    },
    {
      "id": "unprocessed",
      "label": "Unprocessed",
      "description": "Attachments not yet analyzed by AI",
      "icon": "ClockIcon",
      "count": 12,
      "params": {
        "aiProcessedOnly": false
      }
    }
  ]
}
```

---

## Error Responses

All endpoints may return these error responses:

### 400 Bad Request
```json
{
  "error": "Invalid parameters",
  "details": {
    "limit": "Must be between 1 and 200"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "You do not have permission to access this attachment"
}
```

### 404 Not Found
```json
{
  "error": "Attachment not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

---

## Rate Limits

| Tier | Requests per minute | AI Processing per month |
|------|---------------------|-------------------------|
| Free | 60 | 50 |
| Pro | 300 | Unlimited |

---

## Authentication

All endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

Tokens are issued by Supabase Auth and include the user ID claim.

---

## Pagination

All list endpoints use cursor-based pagination:

- **Default page size**: 50 items
- **Maximum page size**: 200 items
- **Total count**: Included in `pagination.total`
- **Has more**: Boolean flag in `pagination.hasMore`

Example:
```javascript
// Fetch first page
const page1 = await fetch('/api/attachments?page=1&limit=50');

// Fetch next page
const page2 = await fetch('/api/attachments?page=2&limit=50');
```

---

## Filtering

Filters can be combined using AND logic:

```javascript
// Multiple filters
const response = await fetch(
  '/api/attachments?' + 
  'documentTypes=invoice,receipt&' +
  'dateFrom=2025-01-01&' +
  'minSize=100000&' +
  'search=acme'
);
```

---

## Sorting

Available sort fields:
- `date`: Email date (default DESC)
- `name`: Filename (alphabetical)
- `size`: File size in bytes
- `sender`: Sender email (alphabetical)
- `type`: Document type (alphabetical)

```javascript
// Sort by size descending
const response = await fetch('/api/attachments?sortBy=size&sortOrder=desc');
```

---

## Search

Full-text search searches across:
- Filename
- Sender name
- Email subject
- Key terms (extracted by AI)
- Extracted metadata (JSON content)

**Search Operators:**
- Basic: `invoice` (finds "invoice" anywhere)
- Phrase: `"Q3 report"` (exact phrase)
- Multiple: `invoice acme` (both terms, any order)

```javascript
// Search examples
const invoices = await fetch('/api/attachments?search=invoice');
const specific = await fetch('/api/attachments?search="Q3 2025 Report"');
const multiple = await fetch('/api/attachments?search=acme unpaid invoice');
```

---

## Webhooks (Future)

Webhooks for attachment events (planned for V2):

- `attachment.created`
- `attachment.ai_processed`
- `attachment.accessed`
- `attachment.deleted`

