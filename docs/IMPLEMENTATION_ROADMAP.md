# EaseMail Attachments V1 - Implementation Roadmap

## 📅 6-Week Sprint Plan

---

## WEEK 1: Foundation & Infrastructure

### Days 1-2: Database & Storage Setup

**Tasks:**
- [ ] Create Supabase project (or use existing)
- [ ] Run migration: `20251031_create_attachments.sql`
- [ ] Create storage bucket: `email-attachments`
- [ ] Configure storage bucket policies
- [ ] Create storage bucket for thumbnails
- [ ] Test RLS policies

**Deliverables:**
- ✅ Attachments table created
- ✅ Processing queue table created
- ✅ Indexes and triggers working
- ✅ Storage buckets configured

**Testing:**
- Insert test attachment record
- Verify RLS (user can only see own attachments)
- Upload test file to storage
- Verify auto-queue trigger fires

---

### Days 3-5: Email Sync Integration

**Tasks:**
- [ ] Modify email sync to detect attachments
- [ ] Extract attachment metadata from emails
- [ ] Upload attachments to Supabase storage
- [ ] Generate thumbnails for images (using Sharp)
- [ ] Generate thumbnails for PDFs (first page)
- [ ] Queue attachments for AI processing

**Files to Modify:**
- `lib/email-sync/process-email.ts` (add attachment detection)
- `lib/attachments/upload.ts` (new file)
- `lib/attachments/thumbnails.ts` (new file)

**Deliverables:**
- ✅ Attachments extracted during email sync
- ✅ Files uploaded to storage
- ✅ Thumbnails generated
- ✅ Processing jobs queued

**Testing:**
- Sync test email with attachments
- Verify files in storage bucket
- Verify thumbnails generated
- Check processing queue has entries

---

## WEEK 2: Core UI Implementation

### Days 1-2: Page Structure

**Tasks:**
- [ ] Create `/app/attachments/page.tsx`
- [ ] Create `/app/attachments/layout.tsx`
- [ ] Add "Attachments" to main navigation
- [ ] Create header component with stats
- [ ] Create loading skeleton components
- [ ] Create empty state component

**Components:**
- `app/attachments/page.tsx`
- `app/attachments/layout.tsx`
- `components/attachments/AttachmentsHeader.tsx`
- `components/attachments/EmptyState.tsx`
- `components/attachments/LoadingSkeleton.tsx`

**Deliverables:**
- ✅ Attachments page accessible at `/attachments`
- ✅ Page shows in navigation
- ✅ Header displays total count and size
- ✅ Loading state looks good

**Testing:**
- Navigate to `/attachments`
- Verify header shows correct stats
- Check responsive layout (mobile/tablet/desktop)

---

### Days 3-5: Grid View & Attachment Cards

**Tasks:**
- [ ] Create `AttachmentsGrid` component
- [ ] Create `AttachmentCard` component
- [ ] Implement responsive grid (4/2/1 columns)
- [ ] Add file type icons with colors
- [ ] Display thumbnails for images/PDFs
- [ ] Add hover effects
- [ ] Implement quick actions (preview, download, open email)

**Components:**
- `components/attachments/AttachmentsGrid.tsx`
- `components/attachments/AttachmentCard.tsx`
- `components/attachments/FileTypeIcon.tsx`
- `lib/attachments/utils.ts` (file size formatter, etc.)

**Deliverables:**
- ✅ Grid view displays attachments beautifully
- ✅ Cards show thumbnails and metadata
- ✅ Hover states smooth
- ✅ File type icons color-coded

**Testing:**
- View grid with various file types
- Check responsive breakpoints
- Test hover interactions
- Verify images/thumbnails load

---

## WEEK 3: Search & Filters

### Days 1-2: Search Implementation

**Tasks:**
- [ ] Create search bar component
- [ ] Implement debounced search input (300ms)
- [ ] Create full-text search API endpoint
- [ ] Add search highlighting (optional)
- [ ] Create "no results" state
- [ ] Add search clear button

**Components:**
- `components/attachments/SearchBar.tsx`
- `app/api/attachments/route.ts` (API endpoint)
- `lib/attachments/api.ts` (API client)

**API:**
```typescript
GET /api/attachments?search=invoice
```

**Deliverables:**
- ✅ Search bar in header
- ✅ Search returns results in < 500ms
- ✅ Debouncing works smoothly
- ✅ No results state displays

**Testing:**
- Search for "invoice"
- Search for partial filename
- Search for sender name
- Verify debouncing (doesn't search on every keystroke)

---

### Days 3-5: Filters Implementation

**Tasks:**
- [ ] Create filter bar component
- [ ] Implement date range picker
- [ ] Implement file type filter (multi-select chips)
- [ ] Implement sender autocomplete filter
- [ ] Implement document type filter (AI-powered)
- [ ] Add "Clear all filters" button
- [ ] Display active filters as removable chips

**Components:**
- `components/attachments/FilterBar.tsx`
- `components/attachments/DateRangePicker.tsx`
- `components/attachments/FileTypeFilter.tsx`
- `components/attachments/SenderFilter.tsx`

**Deliverables:**
- ✅ All filters functional
- ✅ Multiple filters combine correctly (AND logic)
- ✅ Active filters displayed as chips
- ✅ Clear filters works

**Testing:**
- Apply single filter
- Apply multiple filters (e.g., PDF + last month)
- Clear individual filter
- Clear all filters
- Verify API query string correct

---

## WEEK 4: AI Integration (The Magic ✨)

### Days 1-2: OpenAI Setup

**Tasks:**
- [ ] Add OpenAI API key to environment
- [ ] Create `lib/attachments/ai-service.ts`
- [ ] Implement rate limiting (max 10 concurrent)
- [ ] Add error handling and retries
- [ ] Implement cost tracking
- [ ] Add logging for debugging

**Files:**
- `lib/attachments/ai-service.ts`
- `.env.local` (add OPENAI_API_KEY)

**Cost Monitoring:**
- Track API calls per day
- Alert if cost > $50/day
- Log failed classifications

**Deliverables:**
- ✅ OpenAI client configured
- ✅ Rate limiting works
- ✅ Error handling robust
- ✅ Cost tracking in place

**Testing:**
- Call classification API manually
- Verify rate limiting (queue waits if > 10 concurrent)
- Test with invalid API key (error handling)
- Check logs for cost tracking

---

### Days 3-4: Classification & Extraction

**Tasks:**
- [ ] Implement document classification (GPT-4 Vision)
- [ ] Implement confidence scoring
- [ ] Create processing queue worker
- [ ] Implement invoice data extraction
- [ ] Implement receipt data extraction
- [ ] Implement contract data extraction
- [ ] Store results in `extracted_metadata` JSONB

**Processing Flow:**
1. Worker pulls job from queue
2. Downloads file from storage
3. Classifies document
4. Extracts metadata based on type
5. Extracts key terms
6. Updates attachment record
7. Marks job complete

**Deliverables:**
- ✅ Classification works for PDFs and images
- ✅ Data extraction accurate for invoices
- ✅ Data extraction accurate for receipts
- ✅ Results stored in database

**Testing:**
- Upload test invoice → Verify extracted amount, vendor, due date
- Upload test receipt → Verify merchant, total, date
- Upload test contract → Verify parties, dates
- Check confidence scores reasonable (> 0.8 for obvious documents)

---

### Day 5: Background Processing

**Tasks:**
- [ ] Create Supabase Edge Function for processing
- [ ] Set up cron job to process queue (or use polling)
- [ ] Implement batch processing (5 at a time)
- [ ] Add retry logic for failures
- [ ] Create processing status UI (optional)

**Edge Function:**
```typescript
// supabase/functions/process-attachment-queue/index.ts
```

**Deliverables:**
- ✅ Background worker processes queue
- ✅ Failed jobs retry up to 3 times
- ✅ Processing happens without blocking UI

**Testing:**
- Upload 20 attachments
- Verify all get processed within 5 minutes
- Check failed jobs get retried
- Verify no duplicate processing

---

## WEEK 5: Smart Features & Preview

### Days 1-2: Smart Filters

**Tasks:**
- [ ] Create smart filters API endpoint
- [ ] Implement "Unpaid Invoices" filter
- [ ] Implement "Contracts Expiring Soon" filter
- [ ] Implement "Large Receipts" filter (> $100)
- [ ] Create smart filter chips UI
- [ ] Show badge counts on each filter

**Filters:**
1. Unpaid Invoices
2. Contracts Expiring (next 90 days)
3. Receipts > $100
4. Recent Images (last 30 days)
5. Large Files (> 10MB)
6. Unprocessed (pending AI)

**Components:**
- `components/attachments/SmartFilters.tsx`
- `app/api/attachments/smart-filters/route.ts`

**Deliverables:**
- ✅ 6 smart filters implemented
- ✅ Badge counts accurate
- ✅ Clicking filter applies it
- ✅ UI looks polished

**Testing:**
- Click "Unpaid Invoices" → Only shows unpaid
- Click "Large Files" → Only shows files > 10MB
- Verify badge counts match filter results

---

### Days 3-5: Preview Modal

**Tasks:**
- [ ] Create preview modal component
- [ ] Implement PDF viewer (using react-pdf)
- [ ] Implement image viewer with zoom
- [ ] Display extracted metadata in sidebar
- [ ] Add download button
- [ ] Add "Open Email" button
- [ ] Add keyboard navigation (ESC to close, arrows for prev/next)

**Components:**
- `components/attachments/PreviewModal.tsx`
- `components/attachments/PDFViewer.tsx`
- `components/attachments/ImageViewer.tsx`
- `components/attachments/MetadataSidebar.tsx`

**Preview Types:**
- Images: Direct display with zoom
- PDFs: Embedded viewer
- Text files: Syntax highlighted text
- Others: "No preview available" + download button

**Deliverables:**
- ✅ Preview modal beautiful
- ✅ PDF viewer works smoothly
- ✅ Image zoom works
- ✅ Metadata sidebar shows extracted data
- ✅ Keyboard navigation works

**Testing:**
- Preview image → Verify zoom works
- Preview PDF → Verify can scroll pages
- Preview invoice → Verify extracted data displayed
- Press ESC → Modal closes
- Click backdrop → Modal closes

---

## WEEK 6: Polish, Testing & Launch 🚀

### Days 1-2: Performance Optimization

**Tasks:**
- [ ] Implement lazy loading for grid
- [ ] Optimize images (WebP format, compression)
- [ ] Add query caching (React Query)
- [ ] Optimize database queries (check EXPLAIN)
- [ ] Add CDN for static assets
- [ ] Implement virtualized scrolling for large lists

**Performance Targets:**
- Page load: < 2 seconds
- Search: < 500ms
- Preview open: < 1 second
- Thumbnail load: < 500ms

**Deliverables:**
- ✅ Page loads quickly
- ✅ Smooth scrolling with 100+ attachments
- ✅ No jank or lag

**Testing:**
- Test with 500 attachments
- Test with slow 3G network (Chrome DevTools)
- Check lighthouse score (aim for > 90)

---

### Days 3-4: UX Refinement & Testing

**Tasks:**
- [ ] Design empty state (no attachments yet)
- [ ] Add error boundaries
- [ ] Implement onboarding tour (first visit)
- [ ] Add help tooltips
- [ ] Implement keyboard shortcuts (optional)
- [ ] Run accessibility audit (WCAG AA)
- [ ] Test on mobile devices
- [ ] Fix any UI bugs

**Accessibility:**
- All interactive elements keyboard accessible
- Screen reader friendly
- Sufficient color contrast
- Focus indicators visible

**Deliverables:**
- ✅ Empty state looks inviting
- ✅ Error handling graceful
- ✅ Onboarding tour helpful
- ✅ Accessibility score > 95

**Testing:**
- Delete all attachments → Verify empty state
- Disconnect internet → Verify error state
- Use only keyboard → Navigate entire page
- Test with screen reader (NVDA or VoiceOver)

---

### Day 5: Launch Preparation

**Tasks:**
- [ ] Write E2E tests (critical paths)
- [ ] Invite 10-20 beta users
- [ ] Set up error monitoring (Sentry)
- [ ] Set up analytics (PostHog or similar)
- [ ] Write user documentation
- [ ] Create demo video (60-90 seconds)
- [ ] Prepare Product Hunt assets
- [ ] Deploy to production!

**E2E Tests (Playwright):**
- User can view attachments
- User can search attachments
- User can filter attachments
- User can preview attachment
- User can download attachment

**Analytics Events:**
- `attachments_page_viewed`
- `attachment_searched`
- `attachment_filtered`
- `attachment_previewed`
- `attachment_downloaded`
- `smart_filter_used`

**Deliverables:**
- ✅ E2E tests passing
- ✅ Monitoring configured
- ✅ Analytics tracking events
- ✅ Documentation written
- ✅ **FEATURE LAUNCHED** 🎉

**Launch Checklist:**
- [ ] Feature flag enabled for all users
- [ ] Database migrations run
- [ ] Storage configured
- [ ] OpenAI credits loaded
- [ ] Monitoring active
- [ ] Support team briefed
- [ ] Announcement email drafted
- [ ] Social media posts scheduled
- [ ] Product Hunt submission ready

---

## Post-Launch (Week 7+)

### Week 7: Monitor & Iterate

**Tasks:**
- [ ] Monitor error rates (< 0.1%)
- [ ] Track feature adoption (target: 40% of users)
- [ ] Collect user feedback
- [ ] Fix critical bugs within 24 hours
- [ ] Optimize AI costs based on usage
- [ ] Conduct 10 user interviews

**Metrics to Watch:**
- Daily active users accessing attachments
- Search queries per user
- AI processing success rate
- Page load time (p95)
- Error rate
- Attachment uploads per day

---

### Week 8-12: Iterate Based on Feedback

**Common Requests (Predicted):**
- Manual tagging
- Bulk download
- Sort by relevance
- More file type support
- Mobile app support
- Sharing attachments

**Don't build these yet!** Wait for actual user demand.

---

## 🎯 Success Criteria

Launch is successful if within 30 days:

**Adoption:**
- ✅ 50% of active users visit attachments page at least once
- ✅ 25% of active users visit attachments page weekly

**Engagement:**
- ✅ Average 5+ attachment views per user per week
- ✅ 50+ searches per day

**Performance:**
- ✅ Page load < 2 seconds (p95)
- ✅ Error rate < 0.5%
- ✅ AI classification accuracy > 85%

**Business:**
- ✅ 10% conversion to paid tier (attributed to attachments feature)
- ✅ NPS > 40
- ✅ 5+ testimonials mentioning attachments

**Cost:**
- ✅ AI costs < $1,000/month
- ✅ Cost per user < $0.10/month

---

## 🚨 Risk Mitigation

### Risk 1: AI Costs Too High
**Mitigation:**
- Monitor daily spend
- Set hard cap at $50/day
- Implement caching for duplicate files
- Offer limited AI processing on free tier

### Risk 2: Low Adoption
**Mitigation:**
- Prominent placement in navigation
- Onboarding tour
- Email campaign to existing users
- Dashboard widget showing "X attachments processed"

### Risk 3: Technical Issues
**Mitigation:**
- Feature flag (can disable quickly)
- Comprehensive error handling
- Real-time monitoring with alerts
- Rollback plan ready

---

## 📚 Resources Needed

**Team:**
- 1-2 Full-stack developers
- 1 Designer (UI/UX feedback)
- 1 QA tester (part-time)
- Product manager (you!)

**Tools:**
- Supabase Pro: $25/month
- OpenAI API credits: $500 initial
- Sentry: $26/month
- Figma: Free
- GitHub: Free

**Total Cost:** ~$600 for first month

---

## 📞 Daily Standups

**Questions to ask daily:**
1. What did you complete yesterday?
2. What are you working on today?
3. Any blockers?
4. Are we on track for the week's goals?
5. Any risks or concerns?

**Weekly Review:**
- Demo what was built
- Review metrics
- Adjust plan if needed
- Celebrate wins! 🎉

---

## ✅ Definition of Done

Feature is "done" when:
- [ ] All code merged to main
- [ ] All tests passing
- [ ] Documentation written
- [ ] Deployed to production
- [ ] Monitoring active
- [ ] Analytics tracking
- [ ] No critical bugs
- [ ] Beta users positive feedback
- [ ] Product team approved

---

**Let's ship this! 🚀**

Questions? Blockers? Reach out immediately. Ship fast, iterate faster.

Remember: V1 doesn't need to be perfect. It needs to be **magical** for one use case.

That use case: "I need to find that invoice, and I don't remember which email it was in."

Nail that, and everything else is gravy.

**Now go build it!** 💪

