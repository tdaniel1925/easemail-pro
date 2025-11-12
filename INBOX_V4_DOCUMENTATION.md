# EaseMail Inbox V4 - Complete Documentation

## Overview

EaseMail Inbox V4 is a complete rewrite of the inbox experience, built from scratch with modern React patterns, proper TypeScript types, and comprehensive error handling. This implementation replaces all V1-V3 legacy code with a clean, maintainable architecture.

## Architecture

### Component Structure

```
app/(dashboard)/inbox-v4/
  └─ page.tsx                    # Server component (data fetching)

components/inbox/
  ├─ InboxV4.tsx                 # Main client component (state management)
  ├─ EmailCard.tsx               # Individual email list item
  ├─ EmailDetail.tsx             # Full email viewer with thread support
  ├─ AttachmentItem.tsx          # Attachment display and download
  ├─ FolderNav.tsx               # Sidebar folder navigation
  ├─ SearchBar.tsx               # Debounced search input
  ├─ BulkActions.tsx             # Bulk action toolbar
  └─ EmailComposer.tsx           # Reply/compose dialog
```

## Features

### Core Functionality

#### 1. Email List View
- **Clean Card Layout**: Modern card-based design with hover effects
- **Thread Grouping**: Automatically groups emails by conversation
- **Read/Unread Status**: Visual indicators with bold text for unread emails
- **Star Emails**: Quick star/unstar functionality
- **Attachment Indicators**: Shows attachment count with icons
- **Quick Actions**: Archive and delete on hover
- **Infinite Scroll**: Load more emails as you scroll

#### 2. Email Detail Pane
- **Split-Screen View**: Side-by-side email list and detail view
- **Full Thread Support**: Expand/collapse emails in conversation
- **HTML Rendering**: Proper sanitization with DOMPurify
- **Image Security**: Blocks external images by default with "Show Images" button
- **Working Attachments**: Download functionality that actually works
- **Action Buttons**: Reply, Reply All, Forward, Star, Archive, Delete

#### 3. Folder Navigation
- **Standard Folders**: Inbox, Sent, Drafts, Trash, Archive, Starred
- **Account Switcher**: Switch between multiple email accounts
- **Visual Feedback**: Active folder highlighting
- **Storage Info**: Display storage usage (optional)

#### 4. Search Functionality
- **Full-Text Search**: Searches subject, from, to, snippet, body
- **Debounced Input**: 500ms delay to prevent excessive API calls
- **Clear Button**: Quick clear with X icon
- **Real-Time Results**: Updates as you type

#### 5. Bulk Actions
- **Multi-Select**: Checkbox selection for multiple emails
- **Quick Actions**: Read, Unread, Star, Archive, Delete
- **Select All**: Select all visible emails
- **Visual Feedback**: Blue highlight bar with action buttons

#### 6. Filters
- **Unread Filter**: Show only unread emails
- **Starred Filter**: Show only starred emails
- **Attachments Filter**: Show only emails with attachments
- **Combinable**: Stack multiple filters

## API Integration

### Endpoints Used

#### GET `/api/nylas/messages`
Fetch emails for a specific account and folder.

**Parameters:**
- `accountId`: Email account ID (required)
- `folder`: Folder name (inbox, sent, drafts, etc.)
- `limit`: Number of emails to fetch (default: 50)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "messages": [...]
}
```

#### GET `/api/nylas/messages/[messageId]`
Fetch full email body and details.

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "...",
    "subject": "...",
    "bodyHtml": "...",
    "bodyText": "...",
    ...
  }
}
```

#### PUT `/api/nylas/messages/[messageId]`
Update email properties (read status, star, etc.).

**Body:**
```json
{
  "isRead": true,
  "isStarred": false,
  ...
}
```

#### POST `/api/nylas/messages/bulk`
Perform bulk actions on multiple emails.

**Body:**
```json
{
  "messageIds": ["id1", "id2", ...],
  "action": "delete" | "archive" | "markRead" | "markUnread" | "star" | "unstar"
}
```

#### GET `/api/nylas/messages/search`
Search emails by query.

**Parameters:**
- `accountId`: Email account ID (required)
- `query`: Search query (required)
- `folder`: Optional folder filter
- `limit`: Number of results (default: 100)

#### POST `/api/nylas/messages`
Sync new emails from Nylas.

**Body:**
```json
{
  "accountId": "...",
  "limit": 100,
  "fullSync": false
}
```

#### GET `/api/nylas/messages/[messageId]/attachments/[attachmentId]`
Download an attachment.

**Parameters:**
- `accountId`: Email account ID (required)

**Response:** Binary blob for download

## Security Features

### HTML Sanitization
- Uses DOMPurify to sanitize all HTML content
- Prevents XSS attacks
- Allows safe HTML tags only (p, br, strong, em, etc.)

### Image Blocking
- External images are blocked by default
- Inline images (data URLs) are allowed
- "Show Images" button for trusted emails
- Prevents tracking pixels

### Authentication
- Server-side authentication check
- Account ownership verification
- Secure API calls with user context

## State Management

### Local State (useState)
- `emails`: Array of email objects
- `selectedEmail`: Currently viewed email
- `selectedAccount`: Active email account
- `currentFolder`: Active folder (inbox, sent, etc.)
- `searchQuery`: Current search query
- `selectedIds`: Set of selected email IDs
- `isLoading`: Loading state for API calls
- `isSyncing`: Syncing state for background sync
- `error`: Error message display
- `filterUnread/Starred/Attachments`: Filter toggles
- `hasMore`: Pagination flag
- `offset`: Current pagination offset

### Computed State (useMemo)
- `filteredEmails`: Filtered and searched emails
- `emailsByThread`: Grouped by thread ID
- `displayEmails`: One email per thread for list view

## Performance Optimizations

### Memoization
- `EmailCard` component is memoized with `React.memo`
- `useMemo` for expensive filtering and grouping operations
- `useCallback` for stable function references

### Debouncing
- Search input debounced at 500ms
- Prevents excessive API calls while typing

### Lazy Loading
- Email bodies loaded on demand
- Only fetch full HTML when email is opened
- Infinite scroll for pagination

### Optimistic Updates
- Mark as read immediately on click
- Update local state before API response
- Smooth user experience

## Error Handling

### Network Errors
- Try-catch blocks around all API calls
- User-friendly error messages
- Error state displayed in UI

### API Errors
- Proper error responses checked
- Error details logged to console
- Fallback behavior for failed actions

### Missing Data
- Null checks for all email fields
- Default values for missing data
- Graceful degradation

## Accessibility

### Keyboard Navigation
- All buttons are keyboard accessible
- Proper tab order
- Enter/Space key support

### ARIA Labels
- Buttons have descriptive titles
- Icons have proper aria labels
- Semantic HTML structure

### Screen Reader Support
- Meaningful text content
- Proper heading hierarchy
- Form labels

## Responsive Design

### Breakpoints
- Mobile: < 768px (stacked layout)
- Tablet: 768px - 1024px (compact sidebar)
- Desktop: > 1024px (full three-column layout)

### Mobile Optimizations
- Touch-friendly tap targets
- Swipe gestures (future enhancement)
- Responsive grid for attachments

## Known Limitations

### Current Version
1. **Email Composer**: Basic implementation, needs rich text editor
2. **Draft Auto-Save**: Not yet implemented
3. **Keyboard Shortcuts**: Not yet implemented
4. **Undo Actions**: Not yet implemented
5. **Labels/Tags**: UI placeholders only
6. **Virtualized List**: Not implemented (may be needed for large inboxes)

### Future Enhancements
1. Rich text editor (Tiptap or Lexical)
2. Drag-and-drop for attachments
3. Keyboard shortcuts (Gmail-style)
4. Advanced search with filters
5. Email templates
6. Snooze functionality
7. Custom labels and tags
8. Email rules integration
9. Calendar integration
10. Contact integration

## Troubleshooting

### Emails Not Loading
1. Check account connection in Settings
2. Verify API endpoint is accessible
3. Check browser console for errors
4. Ensure accountId is valid

### Attachments Not Downloading
1. Verify attachment API endpoint
2. Check browser popup blocker
3. Ensure proper authentication
4. Check console for CORS errors

### Search Not Working
1. Verify search API endpoint
2. Check query format
3. Ensure accountId parameter
4. Check database indices

### Thread Grouping Issues
1. Verify threadId in database
2. Check email grouping logic
3. Ensure proper sorting

## Migration from V1/V2/V3

### Breaking Changes
1. New component structure
2. Different prop interfaces
3. Removed legacy email renderer
4. New API integration patterns

### Migration Steps
1. Update route to `/inbox-v4`
2. Test all features thoroughly
3. Migrate user preferences
4. Update documentation
5. Deploy gradually with feature flag

## Testing

### Manual Testing Checklist
- [ ] Load inbox with emails
- [ ] Switch between folders
- [ ] Search for emails
- [ ] Select and bulk delete
- [ ] Open email and view body
- [ ] Download attachments
- [ ] Reply to email
- [ ] Star/unstar emails
- [ ] Mark read/unread
- [ ] Archive emails
- [ ] Load more (pagination)
- [ ] Switch accounts
- [ ] Apply filters
- [ ] View threaded conversations
- [ ] Block/show images

### Browser Testing
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Performance Metrics

### Target Metrics
- **Initial Load**: < 2 seconds
- **Email Open**: < 500ms
- **Search Results**: < 1 second
- **Bulk Actions**: < 2 seconds
- **Smooth Scrolling**: 60 FPS

### Monitoring
- Use React DevTools Profiler
- Monitor API response times
- Track error rates
- Measure user interactions

## Code Quality

### TypeScript
- Full type safety
- Proper interfaces for all data
- No `any` types (except necessary)
- Strict mode enabled

### Code Style
- Consistent formatting
- Descriptive variable names
- Comments for complex logic
- Component documentation

### Best Practices
- Single Responsibility Principle
- DRY (Don't Repeat Yourself)
- Composition over inheritance
- Proper error boundaries (recommended)

## Deployment

### Environment Variables
- `NEXT_PUBLIC_APP_URL`: Application URL
- Database connection string
- Nylas API credentials

### Build Steps
1. `npm run build`
2. Verify no TypeScript errors
3. Test production build locally
4. Deploy to staging
5. Run smoke tests
6. Deploy to production

### Rollback Plan
1. Keep V3 route active
2. Feature flag for V4
3. Database backups
4. Quick revert capability

## Support

### Documentation
- This file: `INBOX_V4_DOCUMENTATION.md`
- API docs: `/docs/api.md`
- Component docs: Inline JSDoc

### Getting Help
- Check console errors first
- Review API logs
- Test in different browser
- Check network tab
- Review database data

## Changelog

### Version 4.0.0 (2025-11-11)
- Initial V4 release
- Complete rewrite from scratch
- Modern React patterns
- Full TypeScript support
- Proper error handling
- Security improvements
- Performance optimizations
- Mobile responsive
- Accessibility improvements

---

## Quick Start

### For Users
1. Navigate to `/inbox-v4`
2. Select your email account
3. Start reading emails!

### For Developers
1. Read this documentation
2. Review component files
3. Understand API integration
4. Check database schema
5. Start building features!

---

**Built with**: Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui, Nylas API

**Maintained by**: EaseMail Development Team

**Last Updated**: November 11, 2025
