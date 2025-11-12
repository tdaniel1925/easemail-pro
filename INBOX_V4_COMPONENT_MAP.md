# EaseMail Inbox V4 - Component Architecture Map

## Visual Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│                     app/(dashboard)/inbox-v4/page.tsx                │
│                        (Server Component)                            │
│  - Fetches initial data                                             │
│  - Authenticates user                                               │
│  - Passes props to InboxV4                                          │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   components/inbox/InboxV4.tsx                       │
│                      (Main Client Component)                         │
│  - State management                                                  │
│  - API integration                                                   │
│  - Layout orchestration                                             │
└───────┬─────────────────┬─────────────────┬──────────────────┬──────┘
        │                 │                 │                  │
        ▼                 ▼                 ▼                  ▼
┌───────────────┐  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐
│  FolderNav    │  │ Email List  │  │ EmailDetail  │  │   Modals    │
│               │  │   Column    │  │    Pane      │  │             │
└───────┬───────┘  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘
        │                 │                 │                  │
        │                 │                 │                  │
        │                 ▼                 ▼                  ▼
        │         ┌──────────────┐  ┌──────────────┐  ┌─────────────┐
        │         │  SearchBar   │  │ Email Header │  │EmailComposer│
        │         └──────────────┘  │   Actions    │  └─────────────┘
        │                           └──────────────┘
        │         ┌──────────────┐
        │         │BulkActions   │  ┌──────────────┐
        │         │  Toolbar     │  │ Thread View  │
        │         └──────────────┘  │   Emails     │
        │                           └──────┬───────┘
        │         ┌──────────────┐         │
        │         │  Filters     │         │
        │         │ Unread/Star  │         │
        │         └──────────────┘         ▼
        │                           ┌──────────────┐
        │         ┌──────────────┐  │ Attachments  │
        │         │  EmailCard   │  │   Section    │
        │         │  (List Item) │  └──────┬───────┘
        │         └──────────────┘         │
        │                                   ▼
        │                           ┌──────────────┐
        │                           │AttachmentItem│
        │                           │  (Download)  │
        │                           └──────────────┘
        │
        ▼
┌───────────────────────────────────────────┐
│         Account Selector                  │
│         Folder List (Inbox, Sent, etc)    │
│         Labels Section                    │
│         Settings Link                     │
│         Storage Info                      │
└───────────────────────────────────────────┘
```

## Component Details

### 1. **page.tsx** (Server Component)
```
Role: Data Fetching & Authentication
Dependencies: Supabase, Drizzle ORM
Outputs: initialEmails, accounts, defaultAccountId
```

### 2. **InboxV4.tsx** (Main Client Component)
```
Role: Central State Management & Orchestration
State:
  - emails: Email[]
  - selectedEmail: Email | null
  - selectedAccount: string | null
  - currentFolder: FolderType
  - searchQuery: string
  - selectedIds: Set<string>
  - loading/error states
  - filter states

Methods:
  - fetchEmails()
  - syncEmails()
  - handleEmailClick()
  - handleBulkAction()
  - handleSearch()
  - toggleSelection()
```

### 3. **FolderNav.tsx** (Sidebar)
```
Role: Folder & Account Navigation
Props:
  - currentFolder
  - accounts
  - selectedAccount
  - onFolderChange
  - onAccountChange

Features:
  - Folder list with icons
  - Account dropdown
  - Active state highlighting
  - Storage display
```

### 4. **EmailCard.tsx** (List Item)
```
Role: Individual Email Display in List
Props:
  - email
  - isSelected
  - isActive
  - onSelect
  - onClick
  - threadCount

Features:
  - Avatar with initial
  - Read/unread styling
  - Star button
  - Attachment badge
  - Thread count badge
  - Quick actions (hover)
  - Checkbox selection
```

### 5. **EmailDetail.tsx** (Detail View)
```
Role: Full Email Viewer
Props:
  - email
  - accountId
  - onClose/onDelete/onArchive/onStar
  - thread[]

Features:
  - Header with actions
  - Thread expansion
  - HTML rendering (sanitized)
  - Image blocking/showing
  - Attachment section
  - Reply buttons
```

### 6. **AttachmentItem.tsx** (Attachment)
```
Role: Single Attachment Display
Props:
  - attachment
  - emailId
  - accountId
  - onDownload

Features:
  - File type icon
  - File size display
  - Extension badge
  - Download button
  - Preview button (for images/PDFs)
```

### 7. **SearchBar.tsx** (Search Input)
```
Role: Search Input with Debounce
Props:
  - onSearch
  - debounceMs (default: 500)

Features:
  - Debounced input
  - Clear button
  - Search icon
  - Auto-submit on Enter
```

### 8. **BulkActions.tsx** (Toolbar)
```
Role: Bulk Action Toolbar
Props:
  - selectedCount
  - onAction
  - onSelectAll
  - onClearSelection

Features:
  - Selection count badge
  - Quick action buttons
  - More actions dropdown
  - Clear selection
```

### 9. **EmailComposer.tsx** (Modal)
```
Role: Email Composition & Reply
Props:
  - isOpen
  - onClose
  - replyTo
  - accountId
  - mode

Features:
  - To/Cc/Bcc fields
  - Subject input
  - Body textarea
  - Attachment upload
  - Send functionality
```

## Data Flow

### Loading Emails
```
Server (page.tsx)
  ↓ Fetch initial emails from DB
InboxV4
  ↓ Display in state
EmailCard (multiple)
  ↓ Render list
```

### Opening Email
```
EmailCard
  ↓ onClick event
InboxV4
  ↓ handleEmailClick()
  ↓ Fetch full body if needed
  ↓ Mark as read
  ↓ setSelectedEmail()
EmailDetail
  ↓ Render full email
```

### Bulk Actions
```
EmailCard (checkbox)
  ↓ onSelect()
InboxV4
  ↓ Update selectedIds
BulkActions
  ↓ Show toolbar
  ↓ User clicks action
InboxV4
  ↓ handleBulkAction()
  ↓ API call to /api/nylas/messages/bulk
  ↓ Update local state (optimistic)
  ↓ Clear selection
EmailCard
  ↓ Re-render with updated state
```

### Search Flow
```
SearchBar
  ↓ User types
  ↓ Debounce 500ms
  ↓ onSearch callback
InboxV4
  ↓ handleSearch()
  ↓ If query: API call to /search
  ↓ If empty: fetchEmails()
  ↓ Update emails state
EmailCard (multiple)
  ↓ Re-render with filtered results
```

## State Management Patterns

### Local State (useState)
```typescript
// InboxV4.tsx
const [emails, setEmails] = useState<Email[]>([]);
const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
```

### Computed State (useMemo)
```typescript
// InboxV4.tsx
const filteredEmails = useMemo(() => {
  // Apply folder, filters, search
}, [emails, folder, filters, searchQuery]);

const emailsByThread = useMemo(() => {
  // Group by threadId
}, [filteredEmails]);

const displayEmails = useMemo(() => {
  // One email per thread
}, [emailsByThread]);
```

### Callbacks (useCallback)
```typescript
// InboxV4.tsx
const handleEmailClick = useCallback(async (email) => {
  // Mark as read, fetch body, set selected
}, []);

const handleBulkAction = useCallback(async (action) => {
  // API call, update state
}, [selectedIds]);
```

## API Integration Points

### InboxV4.tsx
- `fetchEmails()` → GET `/api/nylas/messages`
- `syncEmails()` → POST `/api/nylas/messages`
- `handleEmailClick()` → GET `/api/nylas/messages/[id]`
- `handleBulkAction()` → POST `/api/nylas/messages/bulk`
- `handleSearch()` → GET `/api/nylas/messages/search`

### EmailDetail.tsx
- `downloadAttachment()` → GET `/api/nylas/messages/[id]/attachments/[id]`

### EmailComposer.tsx
- `handleSend()` → POST `/api/nylas/messages/send`

## Props Flow Diagram

```
page.tsx
  │
  └─► InboxV4
        ├─► FolderNav
        │     └─► props: currentFolder, accounts, selectedAccount
        │     └─► events: onFolderChange, onAccountChange
        │
        ├─► SearchBar
        │     └─► props: onSearch
        │     └─► events: search query changes
        │
        ├─► BulkActions (conditional)
        │     └─► props: selectedCount, onAction
        │     └─► events: bulk action clicks
        │
        ├─► EmailCard (multiple)
        │     └─► props: email, isSelected, isActive
        │     └─► events: onClick, onSelect
        │
        └─► EmailDetail (conditional)
              ├─► props: email, thread, accountId
              ├─► events: onClose, onDelete, onArchive, onStar
              │
              └─► AttachmentItem (multiple)
                    └─► props: attachment, emailId, accountId
                    └─► events: onDownload
```

## Performance Optimizations

### Memoization
```
EmailCard: React.memo() - prevents re-render if props unchanged
filteredEmails: useMemo() - cached filtered results
emailsByThread: useMemo() - cached thread grouping
displayEmails: useMemo() - cached display list
```

### Lazy Loading
```
Email body: Fetched only when email is opened
Attachments: Downloaded only when clicked
Images: Loaded only when "Show Images" clicked
```

### Debouncing
```
Search input: 500ms debounce prevents API spam
```

### Optimistic Updates
```
Mark as read: Update UI immediately, API call async
Star/unstar: Update UI immediately, API call async
Delete: Remove from list immediately, API call async
```

## Component Sizes (LOC)

```
InboxV4.tsx        ████████████████████████░░░░ 450 lines
EmailDetail.tsx    ██████████████████░░░░░░░░░░ 350 lines
EmailComposer.tsx  █████████████░░░░░░░░░░░░░░░ 250 lines
FolderNav.tsx      ██████████░░░░░░░░░░░░░░░░░░ 180 lines
EmailCard.tsx      ████████░░░░░░░░░░░░░░░░░░░░ 150 lines
BulkActions.tsx    ███████░░░░░░░░░░░░░░░░░░░░░ 130 lines
AttachmentItem.tsx ███████░░░░░░░░░░░░░░░░░░░░░ 130 lines
page.tsx           ████░░░░░░░░░░░░░░░░░░░░░░░░  70 lines
SearchBar.tsx      ███░░░░░░░░░░░░░░░░░░░░░░░░░  60 lines
separator.tsx      ██░░░░░░░░░░░░░░░░░░░░░░░░░░  40 lines
```

## Component Dependencies

### External Dependencies
- React: useState, useEffect, useCallback, useMemo, memo
- Next.js: Server Components, Client Components
- shadcn/ui: Button, Input, Badge, Card, Dialog, etc.
- lucide-react: Icons
- date-fns: Date formatting
- isomorphic-dompurify: HTML sanitization

### Internal Dependencies
```
InboxV4 depends on:
  - EmailCard
  - EmailDetail
  - FolderNav
  - SearchBar
  - BulkActions

EmailDetail depends on:
  - AttachmentItem
  - Button, Badge, ScrollArea, Separator

EmailComposer depends on:
  - Dialog, Input, Textarea, Button
```

## File Structure Summary

```
app/(dashboard)/inbox-v4/
  └─ page.tsx                    # Entry point (Server)

components/inbox/
  ├─ InboxV4.tsx                 # Main container (Client)
  ├─ EmailCard.tsx               # List item
  ├─ EmailDetail.tsx             # Detail viewer
  ├─ AttachmentItem.tsx          # Attachment
  ├─ FolderNav.tsx               # Sidebar
  ├─ SearchBar.tsx               # Search
  ├─ BulkActions.tsx             # Bulk toolbar
  └─ EmailComposer.tsx           # Composer modal

components/ui/
  └─ separator.tsx               # New UI component
```

---

**Total Files Created:** 10
**Total Lines of Code:** ~1,810
**Total Components:** 9 + 1 UI component
**Architecture:** Server/Client Component Pattern
**State Management:** React Hooks (useState, useMemo, useCallback)
**Performance:** Memoized, Debounced, Optimistic Updates

---

**Last Updated:** November 11, 2025
