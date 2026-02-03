# 🐛 Composer AI Formatting Issue - Deep Dive Analysis

## Problem Statement

When using **AI Remix** or **Dictate** features in the composer, the text is not properly formatted in the editor. The content appears as raw HTML or loses proper paragraph spacing.

---

## Root Cause Analysis

### The Issue

The composer's `setBody` function **requires TWO parameters**:

```typescript
// lib/composer/store.ts:133-135
setBody: (bodyHtml: string, bodyText: string) => {
  set({ bodyHtml, bodyText, isDirty: true });
}
```

But the AI features only pass **ONE parameter** (HTML only):

```typescript
// components/ai/UnifiedAIToolbar.tsx:71-73
const handleAIRemix = (remixedBody: string) => {
  onBodyChange(remixedBody);  // ❌ Only HTML, missing text
};

// components/ai/UnifiedAIToolbar.tsx:121-124
const handleUsePolished = (polishedSubject: string, polishedText: string) => {
  const newBody = insertAtTop(polishedText);
  onBodyChange(newBody);  // ❌ Only HTML, missing text
};
```

### The Data Flow

```
AI Service (Server)
  ↓
Returns HTML with <p> tags
  ↓
UnifiedAIToolbar.handleAIRemix() / handleUsePolished()
  ↓
Calls onBodyChange(htmlOnly)  ← ❌ MISSING PLAIN TEXT
  ↓
Composer's setBody(bodyHtml, bodyText)
  ↓
bodyText is undefined!
  ↓
TipTap Editor receives HTML but bodyText is wrong
  ↓
Editor state becomes inconsistent
```

---

## Technical Details

### 1. **AI Remix Service** (`lib/ai/ai-remix-service.ts`)

**Lines 76-87:** Returns properly formatted HTML
```typescript
// Format the content with proper HTML paragraphs
const formattedContent = this.formatEmailBody(content.trim());

return {
  body: formattedContent,  // ✅ Properly formatted HTML
  changes: this.identifyChanges(options),
  confidence: 0.9,
  metadata: { ... },
};
```

**Lines 189-208:** The `formatEmailBody` function correctly converts plain text to HTML:
```typescript
private formatEmailBody(text: string): string {
  // Split by double newlines (paragraph breaks)
  const paragraphs = text
    .split(/\n\n+/)
    .map(para => para.trim())
    .filter(para => para.length > 0);

  // Wrap each paragraph in <p> tags
  return paragraphs.map(para => `<p>${para.replace(/\n/g, ' ')}</p>`).join('');
}
```

**Problem:** This function returns HTML, but **doesn't return the plain text version**.

### 2. **Dictation Polish Service** (`lib/ai/dictation-polish.ts`)

**Lines 113:** Same formatting function
```typescript
body = formatEmailBody(body);  // Returns HTML only
```

**Lines 131-146:** Same `formatEmailBody` implementation
```typescript
function formatEmailBody(body: string): string {
  // Returns HTML with <p> tags
  return paragraphs.map(para => `<p>${para.replace(/\n/g, ' ')}</p>`).join('');
}
```

**Problem:** Again, only HTML is returned, no plain text.

### 3. **AIRemixPanel** (`components/ai/AIRemixPanel.tsx`)

**Line 86:** Passes only HTML to onApply
```typescript
const data = await response.json();
onApply(data.email.body);  // ❌ Only HTML, no plain text
onClose();
```

### 4. **UnifiedAIToolbar** (`components/ai/UnifiedAIToolbar.tsx`)

**Lines 71-73:** handleAIRemix receives HTML and passes it to onBodyChange
```typescript
const handleAIRemix = (remixedBody: string) => {
  onBodyChange(remixedBody);  // ❌ onBodyChange expects (html, text)
};
```

**Lines 114-124:** handleUsePolished does the same
```typescript
const handleUsePolished = (polishedSubject: string, polishedText: string) => {
  onSubjectChange(polishedSubject);
  const newBody = insertAtTop(polishedText);
  onBodyChange(newBody);  // ❌ onBodyChange expects (html, text)
};
```

**Problem:** `onBodyChange` is a wrapper that needs to call the store's `setBody(html, text)`, but it only receives HTML.

### 5. **Composer Integration** (Where UnifiedAIToolbar is used)

Need to find where UnifiedAIToolbar is called and what `onBodyChange` is connected to...

Let me check the ActionBar or similar files to find the connection:

---

## The Missing Link

The issue is that **UnifiedAIToolbar** has this prop signature:
```typescript
interface UnifiedAIToolbarProps {
  onBodyChange: (body: string) => void;  // ❌ Only one parameter!
}
```

But it should be:
```typescript
interface UnifiedAIToolbarProps {
  onBodyChange: (bodyHtml: string, bodyText: string) => void;  // ✅ Two parameters
}
```

Or the handlers should extract plain text from HTML before calling the store.

---

## Impact

### Symptoms:
1. ✅ AI generates properly formatted HTML
2. ❌ Editor receives HTML but `bodyText` is undefined or wrong
3. ❌ Editor's text extraction might fail
4. ❌ Sending email uses wrong plain text version
5. ❌ Editor state becomes inconsistent

### Affected Features:
- **AI Remix** - Transforms existing drafts
- **Dictate (Polished)** - AI-polished dictation
- Potentially **AI Write** (commented out but same pattern)

### What Works:
- Manual typing in editor (TipTap handles both HTML and text)
- Direct text entry
- Signature insertion (likely implemented correctly)

---

## Solution Options

### Option 1: Extract Plain Text in UnifiedAIToolbar ✅ RECOMMENDED

**Change:** Update `handleAIRemix` and `handleUsePolished` to extract plain text from HTML

```typescript
// Add helper function
const stripHtmlToText = (html: string): string => {
  // Create a temporary div to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
};

const handleAIRemix = (remixedBody: string) => {
  const plainText = stripHtmlToText(remixedBody);
  onBodyChange(remixedBody, plainText);  // ✅ Pass both
};

const handleUsePolished = (polishedSubject: string, polishedText: string) => {
  onSubjectChange(polishedSubject);
  const newBody = insertAtTop(polishedText);
  const plainText = stripHtmlToText(newBody);
  onBodyChange(newBody, plainText);  // ✅ Pass both
};
```

**Pros:**
- Fixes the issue at the source
- Simple, one-file change
- Works for all AI features

**Cons:**
- Requires updating UnifiedAIToolbar prop interface
- Need to update all callers of UnifiedAIToolbar

### Option 2: Return Both HTML and Text from AI Services

**Change:** Update AI services to return both formats

```typescript
// lib/ai/ai-remix-service.ts
export interface RemixedEmail {
  bodyHtml: string;   // HTML version
  bodyText: string;   // Plain text version
  changes: string[];
  confidence: number;
}
```

**Pros:**
- Clean separation of concerns
- Services provide complete data

**Cons:**
- Requires changes in multiple files
- More API surface area
- Overkill for this problem

### Option 3: Make setBody Smart (Extract Text from HTML)

**Change:** Update the store's `setBody` to accept HTML only and extract text

```typescript
setBody: (bodyHtml: string, bodyText?: string) => {
  const text = bodyText || extractTextFromHtml(bodyHtml);
  set({ bodyHtml, bodyText: text, isDirty: true });
}
```

**Pros:**
- Single point of fix
- Backward compatible (optional second param)

**Cons:**
- Mixing concerns (store shouldn't parse HTML)
- Harder to test
- May not work server-side if needed

---

## Recommended Fix

**Use Option 1** - Extract plain text in UnifiedAIToolbar before calling onBodyChange.

### Implementation Steps:

1. Update `UnifiedAIToolbarProps` interface to expect `(html, text) => void`
2. Add `stripHtmlToText` helper function
3. Update `handleAIRemix` to extract text
4. Update `handleUsePolished` to extract text
5. Update all callers of UnifiedAIToolbar to pass the correct signature
6. Test AI Remix with different content
7. Test Dictate with polished option
8. Verify editor displays properly
9. Verify sent emails have correct plain text

---

## Files to Change

1. **`components/ai/UnifiedAIToolbar.tsx`** - Add text extraction, update handlers
2. **Find where UnifiedAIToolbar is used** - Update onBodyChange prop
3. **`components/composer-v2/ComposerWindow.tsx`** or similar - Connect to store correctly

---

## Testing Checklist

After fix:
- [ ] AI Remix formats text with proper paragraphs
- [ ] AI Remix preserves line breaks
- [ ] Dictate (polished) formats properly
- [ ] Editor shows content correctly
- [ ] Plain text version is correct
- [ ] Sending email uses correct bodyText
- [ ] No console errors
- [ ] Multiple AI operations work consecutively

---

## Priority

**🔴 HIGH PRIORITY** - This affects core AI features that are selling points of the product.

---

## ✅ RESOLUTION

**Status:** FIXED (2026-02-02)

### Implementation Details:

**Files Changed:**
1. `components/ai/UnifiedAIToolbar.tsx`
   - Added `stripHtmlToText()` helper function (lines 45-57)
   - Updated `UnifiedAIToolbarProps` interface: `onBodyChange` now accepts `(bodyHtml: string, bodyText: string)`
   - Updated `handleAIWrite()` to extract and pass plain text
   - Updated `handleAIRemix()` to extract and pass plain text
   - Updated `handleUseAsIs()` to extract and pass plain text
   - Updated `handleUsePolished()` to extract and pass plain text

2. `components/email/EmailCompose.tsx` (line 1894-1897)
   - Updated `onBodyChange` callback to accept both HTML and text parameters

3. `components/nylas-v3/email-compose-v3.tsx` (line 1152-1158)
   - Updated `onBodyChange` callback to accept both HTML and text parameters

### How It Works:

The `stripHtmlToText()` function uses DOM parsing to accurately extract plain text from HTML:
```typescript
function stripHtmlToText(html: string): string {
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
}
```

Each AI handler now:
1. Receives HTML from the AI service
2. Extracts plain text using `stripHtmlToText()`
3. Passes BOTH HTML and plain text to `onBodyChange(html, text)`
4. Composer store's `setBody(html, text)` receives both parameters correctly

### Testing:

- ✅ TypeScript compilation passes (no errors in changed files)
- ✅ Dev server compiles successfully
- ✅ All AI handlers updated consistently
- ⏳ Manual testing needed: AI Remix, Dictate features

---

*Analysis completed: 2026-02-02*
*Implementation completed: 2026-02-02*
