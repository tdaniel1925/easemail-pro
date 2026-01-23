# 🎨 COMPOSER RE-ENGINEERING PLAN
## EaseMail - Complete Composer Overhaul with AI-First Design
**Date:** January 22, 2026
**Status:** Planning
**Project Type:** BUSINESS - Full Product Re-Architecture
**Methodology:** CodeBakers Autonomous Development System

---

## EXECUTIVE SUMMARY

Complete redesign of the EaseMail Composer from a traditional "email editor with AI features" to an **AI-first intelligent composition system** that learns, predicts, and assists proactively.

### Current Problems
- **Two separate implementations** (v3 + legacy, 10,000+ lines)
- **AI features feel bolted-on** (modals, interrupts flow)
- **Complex state management** (5 sources of truth)
- **Performance issues** (large components, frequent re-renders)
- **Poor mobile UX** (fullscreen-only, small touch targets)
- **No test coverage** (manual testing only)

### Vision
**"The composer that writes with you, not for you"**

Transform the composer from a tool that requires manual input to an intelligent assistant that:
- Predicts what you want to say
- Suggests completions as you type
- Adapts to your writing style
- Proactively catches errors
- Learns from every email

### Success Metrics

| Metric | Current | Target (6 months) |
|--------|---------|------------------|
| **User Metrics** |
| Time to compose email | ~5-8 min | ~2-3 min (50-60% faster) |
| AI feature adoption | ~15% | ~80% |
| Emails sent with AI assist | ~20% | ~90% |
| User satisfaction (NPS) | Unknown | 70+ |
| **Technical Metrics** |
| Codebase lines of code | 10,000+ | ~4,000 (60% reduction) |
| Component count | 31+ files | ~12 files (61% reduction) |
| Test coverage | 0% | 85%+ |
| Performance (typing lag) | 50-100ms | <16ms (60fps) |
| **Business Metrics** |
| Pro feature usage | ~10% | ~40% |
| Conversion from AI features | ~2% | ~15% |
| User retention (30-day) | Unknown | 75%+ |

---

## 1. PROBLEM STATEMENT

### 1.1 Current Pain Points

**For Users:**
1. **AI features are disconnected** - User writes email → realizes they need help → clicks AI button → modal opens → breaks flow
2. **Too many modals** - Write modal, Remix panel, Dictation dialog = context switching
3. **No inline assistance** - Unlike Gmail/Notion, no real-time suggestions
4. **Mobile experience is poor** - Tiny buttons, fullscreen-only, no mobile-optimized AI
5. **Drafts feel unreliable** - Complex sync status, sometimes fail silently

**For Developers:**
1. **Technical debt is crushing** - Two separate composers, duplicated logic
2. **Hard to add features** - Touch one part, break another
3. **No tests** - Every change is manual QA
4. **Performance issues** - Large components cause lag
5. **Complex state** - 5 sources of truth = sync bugs

### 1.2 Why Now?

1. **AI technology has matured** - Real-time streaming, affordable tokens, fast models
2. **Competition is heating up** - Google/Microsoft adding AI everywhere
3. **Technical debt is blocking progress** - Can't add features without rewrite
4. **User expectations have shifted** - Users now expect AI assistance everywhere

### 1.3 What Success Looks Like (2 Years)

**Users:**
- Compose emails 3x faster with AI co-pilot
- Never see a blank page (AI suggests openings)
- Zero grammar/spelling errors (real-time checking)
- Consistent voice across all emails (style learning)

**Business:**
- Composer becomes main competitive advantage
- 80%+ of Pro users use AI features daily
- AI features drive 50% of conversions
- Industry-leading NPS for email composition

---

## 2. RE-ARCHITECTURE VISION

### 2.1 Core Principles

#### **Principle #1: AI-First, Not AI-Later**
Every interaction should be AI-enhanced by default, not opt-in.

**Before:**
```
User writes → Realizes needs help → Opens AI modal → Gets help
```

**After:**
```
User starts typing → AI suggests completions → User accepts/rejects → Continues
```

#### **Principle #2: Local-First, Cloud-Enhanced**
Everything should work offline, sync should be invisible.

**Architecture:**
```
Browser → IndexedDB → Background Sync → API
(instant)  (instant)    (non-blocking)
```

#### **Principle #3: Component-Based Architecture**
Small, reusable, testable components instead of monolithic files.

**Before:** `EmailCompose.tsx` (1,905 lines)
**After:**
- `Composer.tsx` (200 lines) - Orchestrator
- `EditorCore.tsx` (150 lines) - Text editor
- `AIAssistant.tsx` (150 lines) - AI layer
- `RecipientFields.tsx` (100 lines) - To/Cc/Bcc
- `AttachmentManager.tsx` (100 lines) - Files
- `DraftSync.tsx` (100 lines) - Background sync
- `ActionBar.tsx` (80 lines) - Send/schedule/etc
- `SignatureManager.tsx` (80 lines) - Signatures

#### **Principle #4: Progressive Enhancement**
Work without JavaScript, enhance with it.

**Layers:**
1. **Base:** HTML form that works without JS
2. **Enhanced:** React for interactivity
3. **Advanced:** AI for intelligence
4. **Premium:** Real-time collaboration

#### **Principle #5: Test Everything**
Unit tests, integration tests, E2E tests, visual regression tests.

**Coverage Targets:**
- Unit: 90%+
- Integration: 80%+
- E2E: Critical paths only
- Visual: Key screens

### 2.2 New Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE LAYER                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     ComposerWindow                            │  │
│  │  ┌─────────────────────────────────────────────────────────┐ │  │
│  │  │  RecipientFields (To/Cc/Bcc with smart suggestions)     │ │  │
│  │  └─────────────────────────────────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────────────────┐ │  │
│  │  │  SubjectField (AI-powered subject suggestions)          │ │  │
│  │  └─────────────────────────────────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────────────────┐ │  │
│  │  │              SmartEditor (TipTap + AI)                   │ │  │
│  │  │  ┌───────────────────────────────────────────────────┐  │ │  │
│  │  │  │  InlineAIAssistant (floating suggestions)         │  │ │  │
│  │  │  │  • Auto-complete (as you type)                    │  │ │  │
│  │  │  │  • Grammar check (underlines)                     │  │ │  │
│  │  │  │  • Tone suggestions (sidebar)                     │  │ │  │
│  │  │  │  • Quick actions (shortcuts)                      │  │ │  │
│  │  │  └───────────────────────────────────────────────────┘  │ │  │
│  │  └─────────────────────────────────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────────────────┐ │  │
│  │  │  AttachmentZone (drag-drop, preview)                   │ │  │
│  │  └─────────────────────────────────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────────────────┐ │  │
│  │  │  ActionBar (Send, Schedule, AI tools)                  │ │  │
│  │  └─────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────┐
│                      STATE MANAGEMENT LAYER                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   ComposerStore (Zustand)                     │  │
│  │  • Draft state (subject, body, recipients, attachments)      │  │
│  │  • UI state (fullscreen, minimized, focused field)           │  │
│  │  • AI state (suggestions, loading, error)                    │  │
│  │  • Sync state (status, last saved, pending changes)          │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────┐
│                      BUSINESS LOGIC LAYER                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │  DraftSync  │  │ AIAssistant │  │ Validation  │  │ Analytics│ │
│  │   Service   │  │   Service   │  │   Service   │  │  Service │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └──────────┘ │
│       │                 │                │                 │       │
│       │  Auto-save      │  Streaming     │  Real-time      │  Track│
│       │  every 3s       │  AI calls      │  validation     │  usage│
└───────┼─────────────────┼────────────────┼─────────────────┼───────┘
        │                 │                │                 │
        ▼                 ▼                ▼                 ▼
┌────────────────────────────────────────────────────────────────────┐
│                       DATA ACCESS LAYER                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │  IndexedDB  │  │  API Client │  │ WebSockets  │  │  Cache   │ │
│  │ (Offline DB)│  │(HTTP calls) │  │(Real-time)  │  │ (Memory) │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └──────────┘ │
└────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────┐
│                           API LAYER                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────┐│
│  │  /api/drafts │  │  /api/ai/*   │  │ /api/messages│  │ Nylas  ││
│  │  (CRUD ops)  │  │ (AI features)│  │ (Send email) │  │  API   ││
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────┘│
└────────────────────────────────────────────────────────────────────┘
```

### 2.3 Key Innovations

#### **Innovation #1: Streaming AI Suggestions**

Instead of modal-based AI, suggestions appear inline as you type.

**Implementation:**
```typescript
// As user types, AI streams suggestions
const suggestion = await aiService.streamComplete({
  context: emailBody,
  cursorPosition: selection.end,
  tone: userPreferences.tone,
  style: userWritingStyle,
});

// Show floating suggestion bubble
<InlineSuggestion
  text={suggestion}
  onAccept={() => insertText(suggestion)}
  onReject={() => dismissSuggestion()}
  shortcuts={{ accept: 'Tab', reject: 'Esc' }}
/>
```

**UX:**
```
User types: "Hi John, I wanted to follow up on"
              ↓
AI suggests: " the proposal we discussed last week."
              ↓
User presses Tab → suggestion inserted
```

#### **Innovation #2: Smart Subject Line Generation**

Subject auto-generates from email body as you type.

**Implementation:**
```typescript
// Debounced subject generation
useEffect(() => {
  const timer = setTimeout(async () => {
    if (!subject && body.length > 50) {
      const suggested = await aiService.generateSubject(body);
      suggestSubject(suggested);
    }
  }, 2000);
  return () => clearTimeout(timer);
}, [body]);
```

**UX:**
```
Body: "Hi team, I'd like to schedule our quarterly review..."
       ↓
Subject auto-suggests: "Quarterly Review - Scheduling"
       ↓
User can accept, edit, or ignore
```

#### **Innovation #3: Writing Style Learning**

System learns from sent emails to match user's voice.

**Implementation:**
```typescript
// After every sent email
await aiService.learnFromEmail({
  userId,
  subject,
  body,
  recipients,
  metadata: { tone, formality, length },
});

// Build user profile
userWritingProfile = {
  avgLength: 150 words,
  preferredTone: 'friendly-professional',
  commonPhrases: ["Thanks for reaching out", "Let me know"],
  signaturePattern: "Best,\nJohn",
};
```

#### **Innovation #4: Context-Aware Assistance**

AI knows who you're emailing and suggests appropriate content.

**Implementation:**
```typescript
// Get recipient context
const recipient = await getContact(toEmail);
const conversation = await getEmailThread(replyToId);
const relationship = inferRelationship(recipient, conversation);

// Adjust AI suggestions based on context
const suggestions = await aiService.getSuggestions({
  recipient: {
    name: recipient.name,
    relationship, // 'boss', 'colleague', 'client', 'friend'
    previousEmails: conversation,
  },
  intent: detectIntent(body), // 'request', 'follow-up', 'thank-you'
});
```

**Example:**
```
To: boss@company.com
AI suggests: More formal tone, concise language, action items

To: friend@gmail.com
AI suggests: Casual tone, emojis OK, longer messages OK
```

#### **Innovation #5: Proactive Error Prevention**

Catch mistakes before sending.

**Real-time Checks:**
- ❌ Forgot attachment? ("You mentioned 'attached' but no files")
- ❌ Wrong recipient? ("This seems like a reply to John, but sending to Mary")
- ❌ Missing CC? ("Last 3 emails included Sarah, add her now?")
- ❌ Tone mismatch? ("This sounds frustrated, is that intentional?")
- ❌ Grammar errors? (underline with suggestions)
- ❌ Unclear language? ("This sentence is complex, simplify?")

---

## 3. MVP SCOPE

### 3.1 In Scope (Must Have)

#### **Epic 1: Core Composer (Week 1-2)**

**US-001: Unified Composer Component**
- **As a** developer
- **I want to** have a single composer implementation
- **So that** we have consistency and easier maintenance
- **Priority:** P0
- **Effort:** XL (2 weeks)

**Acceptance Criteria:**
- [ ] Single `Composer.tsx` component replaces both v3 and legacy
- [ ] Supports all email types (compose, reply, reply-all, forward)
- [ ] Feature parity with current best features
- [ ] Mobile responsive (fullscreen + minimize options)
- [ ] <200 lines per component file

**US-002: Smart Editor Integration**
- **As a** user
- **I want to** type with rich formatting
- **So that** my emails look professional
- **Priority:** P0
- **Effort:** M (3 days)

**Acceptance Criteria:**
- [ ] TipTap editor with toolbar
- [ ] Bold, italic, underline, lists, links
- [ ] Image paste (max 5MB)
- [ ] Undo/redo
- [ ] No typing lag (<16ms)

#### **Epic 2: AI-First Features (Week 3-4)**

**US-003: Inline AI Autocomplete**
- **As a** user
- **I want to** see AI suggestions as I type
- **So that** I write faster without breaking flow
- **Priority:** P0
- **Effort:** L (1 week)

**Acceptance Criteria:**
- [ ] AI suggests next phrase/sentence as I type
- [ ] Suggestions appear inline (gray text)
- [ ] Tab to accept, Esc to reject
- [ ] Context-aware (knows email content, recipient)
- [ ] Works in real-time (<500ms latency)

**US-004: Smart Subject Generation**
- **As a** user
- **I want to** auto-generate subject lines
- **So that** I save time and have better subjects
- **Priority:** P1
- **Effort:** M (3 days)

**Acceptance Criteria:**
- [ ] Auto-suggests subject after 50+ words in body
- [ ] Updates as body changes
- [ ] User can accept, edit, or ignore
- [ ] Learns from user's subject preferences

**US-005: Real-time Grammar Check**
- **As a** user
- **I want to** see grammar errors as I type
- **So that** I send error-free emails
- **Priority:** P1
- **Effort:** M (3 days)

**Acceptance Criteria:**
- [ ] Underline grammar/spelling errors
- [ ] Click underline to see suggestions
- [ ] One-click fix
- [ ] Ignore false positives

#### **Epic 3: Local-First Drafting (Week 5)**

**US-006: Instant Draft Saving**
- **As a** user
- **I want to** never lose my draft
- **So that** I can close/reopen without worry
- **Priority:** P0
- **Effort:** M (4 days)

**Acceptance Criteria:**
- [ ] Auto-save to IndexedDB every keystroke (debounced 500ms)
- [ ] Background sync to API every 3 seconds
- [ ] Clear save status indicator
- [ ] Offline support (queues for later sync)
- [ ] Draft recovery if browser crashes

#### **Epic 4: Performance & Testing (Week 6)**

**US-007: Performance Optimization**
- **As a** developer
- **I want to** achieve 60fps typing
- **So that** users have smooth experience
- **Priority:** P0
- **Effort:** M (3 days)

**Acceptance Criteria:**
- [ ] Typing latency <16ms
- [ ] No jank during auto-save
- [ ] Component re-renders minimized
- [ ] Bundle size <100KB (gzipped)

**US-008: Test Coverage**
- **As a** developer
- **I want to** have comprehensive tests
- **So that** we catch bugs before users do
- **Priority:** P0
- **Effort:** L (1 week)

**Acceptance Criteria:**
- [ ] 90% unit test coverage
- [ ] 80% integration test coverage
- [ ] E2E tests for critical paths (send, draft, AI)
- [ ] Visual regression tests for UI

### 3.2 Out of Scope (V1)

Pushed to V2 (Month 2):
- ❌ **Real-time collaboration** - Multiple users editing same draft
- ❌ **Advanced voice features** - Full voice-to-email (keep basic dictation)
- ❌ **Email templates library** - Pre-built templates (keep basic signature)
- ❌ **Scheduled sending** - Send later (add in V2)
- ❌ **Email tracking** - Open/click tracking (keep current implementation)
- ❌ **Multiple accounts** - Compose from different accounts (single account for MVP)

### 3.3 Future Considerations (V2+)

**V2 (Month 3-4):**
- Real-time collaboration (Google Docs-style)
- Advanced email templates
- Smart scheduling (AI picks best send time)
- Multi-account support
- Enhanced mobile app

**V3 (Month 5-6):**
- Voice-first composition
- AI email agent (fully autonomous)
- Smart follow-up reminders
- Email analytics dashboard

---

## 4. TECHNICAL ARCHITECTURE

### 4.1 Component Structure

```
src/
├── components/
│   └── composer/
│       ├── Composer.tsx              # Main orchestrator (200 lines)
│       ├── ComposerWindow.tsx        # Window/modal wrapper (150 lines)
│       │
│       ├── fields/
│       │   ├── RecipientFields.tsx   # To/Cc/Bcc (100 lines)
│       │   ├── SubjectField.tsx      # Subject with AI (80 lines)
│       │   └── ContactAutocomplete.tsx # Email suggestions (80 lines)
│       │
│       ├── editor/
│       │   ├── SmartEditor.tsx       # TipTap wrapper (150 lines)
│       │   ├── EditorToolbar.tsx     # Formatting toolbar (100 lines)
│       │   └── EditorExtensions.ts   # Custom extensions (100 lines)
│       │
│       ├── ai/
│       │   ├── InlineAIAssistant.tsx # Inline suggestions (150 lines)
│       │   ├── GrammarChecker.tsx    # Real-time grammar (100 lines)
│       │   ├── ToneSuggestions.tsx   # Tone adjustments (80 lines)
│       │   └── SubjectGenerator.tsx  # Auto subjects (80 lines)
│       │
│       ├── attachments/
│       │   ├── AttachmentZone.tsx    # Drag-drop area (100 lines)
│       │   ├── AttachmentList.tsx    # File list (80 lines)
│       │   └── AttachmentUploader.ts # Upload service (100 lines)
│       │
│       ├── actions/
│       │   ├── ActionBar.tsx         # Send/schedule/etc (100 lines)
│       │   ├── SendButton.tsx        # Primary action (60 lines)
│       │   └── MoreActions.tsx       # Dropdown menu (60 lines)
│       │
│       └── signatures/
│           ├── SignatureSelector.tsx # Signature dropdown (80 lines)
│           └── SignatureInserter.ts  # Insertion logic (60 lines)
│
├── lib/
│   └── composer/
│       ├── store.ts                  # Zustand store (150 lines)
│       ├── draft-service.ts          # Draft CRUD (200 lines)
│       ├── ai-service.ts             # AI integration (300 lines)
│       ├── validation-service.ts     # Validation rules (150 lines)
│       └── types.ts                  # TypeScript types (100 lines)
│
└── hooks/
    └── composer/
        ├── useComposer.ts            # Main hook (100 lines)
        ├── useDraftSync.ts           # Sync logic (150 lines)
        ├── useAISuggestions.ts       # AI hooks (100 lines)
        └── useValidation.ts          # Validation hooks (80 lines)
```

**Total:** ~4,000 lines (vs 10,000+ currently)
**Reduction:** 60%

### 4.2 State Management (Zustand)

**Why Zustand?**
- Simpler than Redux (no boilerplate)
- Better than Context API (no re-render issues)
- TypeScript-first
- DevTools support

**Store Structure:**
```typescript
interface ComposerStore {
  // Draft State
  draft: {
    id: string | null;
    to: EmailAddress[];
    cc: EmailAddress[];
    bcc: EmailAddress[];
    subject: string;
    body: string;
    attachments: Attachment[];
  };

  // UI State
  ui: {
    isOpen: boolean;
    isMinimized: boolean;
    isFullscreen: boolean;
    focusedField: 'to' | 'cc' | 'bcc' | 'subject' | 'body' | null;
    showCc: boolean;
    showBcc: boolean;
  };

  // AI State
  ai: {
    suggestions: AISuggestion[];
    isStreaming: boolean;
    grammarErrors: GrammarError[];
    subjectSuggestion: string | null;
  };

  // Sync State
  sync: {
    status: 'idle' | 'saving' | 'saved' | 'error';
    lastSaved: Date | null;
    isDirty: boolean;
    error: string | null;
  };

  // Actions
  updateDraft: (updates: Partial<Draft>) => void;
  saveDraft: () => Promise<void>;
  sendEmail: () => Promise<void>;
  clearDraft: () => void;
  // ... more actions
}
```

### 4.3 Data Flow

```
User Action → Store Update → UI Re-render
                  ↓
            Side Effect (async)
                  ↓
          API Call / IndexedDB
                  ↓
          Store Update → UI Re-render
```

**Example: Typing in editor**
```typescript
// User types
onEditorChange(newContent) {
  // 1. Update store immediately
  store.updateDraft({ body: newContent });

  // 2. Trigger side effects (non-blocking)
  debouncedSave();           // Save to IndexedDB after 500ms
  debouncedAISuggest();      // Get AI suggestions after 1s
  debouncedGrammarCheck();   // Check grammar after 2s
}
```

### 4.4 Performance Optimization

**Strategy 1: Code Splitting**
```typescript
// Lazy load AI features
const InlineAIAssistant = lazy(() => import('./ai/InlineAIAssistant'));
const GrammarChecker = lazy(() => import('./ai/GrammarChecker'));
```

**Strategy 2: Memoization**
```typescript
// Memoize expensive computations
const grammarErrors = useMemo(() =>
  checkGrammar(body),
  [body]
);

// Memoize components
const RecipientFields = memo(RecipientFieldsComponent);
```

**Strategy 3: Debouncing**
```typescript
// Debounce auto-save
const debouncedSave = useDebouncedCallback(
  () => saveDraft(),
  500 // 500ms delay
);
```

**Strategy 4: Virtual Scrolling**
```typescript
// For large attachment lists
<VirtualList
  items={attachments}
  itemHeight={60}
  renderItem={renderAttachment}
/>
```

### 4.5 Testing Strategy

#### **Unit Tests (Vitest)**
```typescript
// Example: Draft saving
describe('DraftService', () => {
  it('should save draft to IndexedDB', async () => {
    const draft = createMockDraft();
    await draftService.save(draft);
    const saved = await draftService.get(draft.id);
    expect(saved).toEqual(draft);
  });

  it('should sync to API in background', async () => {
    const draft = createMockDraft();
    await draftService.save(draft);
    await waitFor(() => {
      expect(apiClient.saveDraft).toHaveBeenCalledWith(draft);
    });
  });
});
```

#### **Integration Tests (React Testing Library)**
```typescript
// Example: Typing in editor
describe('Composer Integration', () => {
  it('should auto-save after typing', async () => {
    const { getByRole } = render(<Composer />);
    const editor = getByRole('textbox');

    await userEvent.type(editor, 'Hello world');

    await waitFor(() => {
      expect(draftService.save).toHaveBeenCalled();
    }, { timeout: 1000 });
  });
});
```

#### **E2E Tests (Playwright)**
```typescript
// Example: Send email flow
test('should send email successfully', async ({ page }) => {
  await page.goto('/inbox');
  await page.click('[data-testid="compose-button"]');

  await page.fill('[data-testid="to-field"]', 'test@example.com');
  await page.fill('[data-testid="subject-field"]', 'Test Subject');
  await page.fill('[data-testid="editor"]', 'Test body');

  await page.click('[data-testid="send-button"]');

  await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
});
```

### 4.6 API Design

#### **Draft API**
```typescript
// POST /api/drafts - Create draft
{
  to: ['john@example.com'],
  subject: 'Meeting tomorrow',
  body: '<p>Hi John...</p>',
  attachments: [{ id: 'abc123', name: 'doc.pdf', size: 1024 }],
}

// PATCH /api/drafts/:id - Update draft
{
  subject: 'Meeting tomorrow at 2pm', // Changed
}

// DELETE /api/drafts/:id - Delete draft
// (no body)
```

#### **AI API**
```typescript
// POST /api/ai/suggest - Get inline suggestions
{
  context: 'Hi John, I wanted to follow up on',
  cursorPosition: 36,
  tone: 'professional',
  userId: 'user123',
}
// Response (streaming):
{
  suggestion: ' the proposal we discussed last week.',
  confidence: 0.92,
}

// POST /api/ai/check-grammar - Check grammar
{
  text: 'Me and John is going to the meeting.',
}
// Response:
{
  errors: [
    {
      text: 'Me and John',
      suggestion: 'John and I',
      type: 'grammar',
      position: { start: 0, end: 11 },
    },
    {
      text: 'is going',
      suggestion: 'are going',
      type: 'subject-verb agreement',
      position: { start: 12, end: 20 },
    },
  ],
}
```

---

## 5. BENEFITS & IMPACT

### 5.1 User Benefits

| Benefit | Current | After Redesign | Impact |
|---------|---------|----------------|--------|
| **Time to compose** | 5-8 min | 2-3 min | 50-60% faster |
| **Error-free emails** | ~70% | ~95% | 25% improvement |
| **AI feature usage** | 15% | 80% | 5x increase |
| **Mobile usability** | 3/10 | 8/10 | 2.7x better |
| **Satisfaction (NPS)** | Unknown | 70+ | Industry-leading |

### 5.2 Developer Benefits

| Benefit | Current | After Redesign | Impact |
|---------|---------|----------------|--------|
| **Lines of code** | 10,000+ | ~4,000 | 60% reduction |
| **Component files** | 31+ | ~12 | 61% reduction |
| **Test coverage** | 0% | 85%+ | Testable codebase |
| **Time to add feature** | 2-3 days | 4-6 hours | 4x faster |
| **Bug rate** | High | Low | Fewer prod issues |

### 5.3 Business Benefits

| Benefit | Current | Target | Impact |
|---------|---------|--------|--------|
| **Pro conversions** | ~2% | ~15% | 7.5x increase |
| **User retention** | Unknown | 75%+ | Higher LTV |
| **Support tickets** | High | -50% | Lower costs |
| **Competitive edge** | Medium | High | Market leader |
| **Revenue per user** | Baseline | +40% | AI upsells |

---

## 6. IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1-2)
**Goal:** Build solid foundation, consolidate composers

**Deliverables:**
- [ ] New component architecture (12 files)
- [ ] Zustand store setup
- [ ] Basic editor (TipTap)
- [ ] Recipient fields
- [ ] Subject field
- [ ] Attachment manager
- [ ] Action bar
- [ ] Feature parity with current (no AI yet)

**Success Criteria:**
- Can compose and send email
- All email types work (compose, reply, forward)
- Mobile responsive
- <200 lines per component
- 60fps typing

### Phase 2: AI Integration (Week 3-4)
**Goal:** Add AI-first features

**Deliverables:**
- [ ] Inline AI autocomplete
- [ ] Real-time grammar check
- [ ] Smart subject generation
- [ ] Tone suggestions
- [ ] Context-aware assistance
- [ ] Writing style learning

**Success Criteria:**
- AI suggestions appear <500ms
- Grammar errors underlined inline
- Subject auto-generates from body
- Tone adapts to recipient
- System learns from sent emails

### Phase 3: Performance & Polish (Week 5-6)
**Goal:** Optimize and test thoroughly

**Deliverables:**
- [ ] Local-first drafting (IndexedDB)
- [ ] Background sync
- [ ] Offline support
- [ ] Performance optimization
- [ ] 90% unit test coverage
- [ ] E2E tests
- [ ] Visual regression tests
- [ ] Accessibility audit

**Success Criteria:**
- Typing <16ms latency
- Auto-save works offline
- 90% test coverage
- WCAG 2.1 AA compliant
- No P0 bugs

### Phase 4: Launch (Week 7-8)
**Goal:** Ship to production, monitor, iterate

**Deliverables:**
- [ ] Feature flag rollout (10% → 50% → 100%)
- [ ] Monitoring dashboards
- [ ] User feedback collection
- [ ] Bug fixes
- [ ] Documentation
- [ ] Marketing materials

**Success Criteria:**
- 0 P0 bugs in production
- <1% error rate
- Positive user feedback
- 80%+ AI feature adoption
- 50%+ faster composition time

---

## 7. RISKS & MITIGATIONS

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **AI latency too high** | Medium | High | Implement aggressive caching, use faster models (GPT-3.5), show loading states gracefully |
| **Users don't adopt AI** | Low | High | Make AI default (opt-out not opt-in), show clear value prop, progressive disclosure |
| **Performance regression** | Medium | High | Continuous performance monitoring, bundle size tracking, lighthouse CI |
| **Data loss during migration** | Low | Critical | Comprehensive testing, gradual rollout, easy rollback plan, data backups |
| **Scope creep** | High | Medium | Strict MVP scope, ruthless prioritization, weekly check-ins |
| **Team bandwidth** | Medium | Medium | Clear ownership, pair programming for complex parts, ask for help early |

---

## 8. SUCCESS METRICS & KPIs

### Week 2 (Foundation Complete)
- [ ] Can send email end-to-end
- [ ] All email types work
- [ ] 60fps typing
- [ ] 0 P0 bugs

### Week 4 (AI Features Complete)
- [ ] AI suggestions working
- [ ] Grammar check live
- [ ] Subject auto-generation
- [ ] Internal team testing

### Week 6 (Launch Ready)
- [ ] 90% test coverage
- [ ] Performance targets met
- [ ] Accessibility audit passed
- [ ] Feature flag ready

### Week 8 (Fully Launched)
- [ ] 100% rollout complete
- [ ] 80%+ AI adoption
- [ ] 50%+ faster composition
- [ ] 70+ NPS
- [ ] <1% error rate

### Month 3 (Post-Launch)
- [ ] 15% Pro conversion from AI
- [ ] 75%+ retention
- [ ] User testimonials
- [ ] Case studies

---

## 9. TEAM & RESOURCES

### Required Skills
- **Frontend:** React, TypeScript, TipTap, Zustand
- **AI:** OpenAI/Anthropic APIs, streaming, prompt engineering
- **Testing:** Vitest, React Testing Library, Playwright
- **Performance:** Lighthouse, bundle analysis, profiling
- **Design:** Figma, interaction design, accessibility

### Timeline
- **Total:** 8 weeks
- **Phase 1:** 2 weeks (Foundation)
- **Phase 2:** 2 weeks (AI features)
- **Phase 3:** 2 weeks (Performance & testing)
- **Phase 4:** 2 weeks (Launch & monitoring)

### Estimated Effort
- **Development:** 6 weeks full-time
- **Testing:** Continuous + 1 week dedicated
- **Design:** 1 week (upfront)
- **Total:** ~8 weeks with buffer

---

## 10. NEXT STEPS

### Immediate Actions (This Week)

1. **Review & Approve Plan**
   - Team review of this document
   - Stakeholder sign-off
   - Finalize scope and timeline

2. **Design Mockups**
   - Create Figma designs for new composer
   - User flow diagrams
   - AI interaction patterns

3. **Set Up Project**
   - Create feature branch
   - Set up test infrastructure
   - Configure CI/CD for testing

4. **Spike: AI Latency**
   - Test different models for suggestion latency
   - Benchmark streaming performance
   - Choose model/provider

### Week 1 Kickoff

- [ ] Design review with team
- [ ] Architecture walkthrough
- [ ] Set up development environment
- [ ] Create initial component structure
- [ ] Write first tests

---

## CONCLUSION

This re-engineering transforms the Composer from a traditional email editor to an **AI-first intelligent composition system**. By consolidating code, improving performance, adding real-time AI assistance, and thoroughly testing everything, we create a competitive advantage that drives user satisfaction, retention, and revenue.

**Key Outcomes:**
- ✅ 60% less code (10,000 → 4,000 lines)
- ✅ 50-60% faster composition time
- ✅ 80%+ AI feature adoption
- ✅ 85%+ test coverage
- ✅ Industry-leading user experience

**Investment:**
- 8 weeks development time
- Significant but achievable scope
- High ROI (better UX → more conversions → higher revenue)

**Ready to build the future of email composition?** 🚀

---

**Document Version:** 1.0
**Last Updated:** January 22, 2026
**Status:** Awaiting Approval
**Next Review:** After stakeholder feedback
