# EMAIL RENDERING & COMPOSITION SYSTEM AUDIT
**Date:** January 31, 2026
**Scope:** Email cards, content rendering, composer, images, attachments

---

## EXECUTIVE SUMMARY

### Top 5 Critical Issues

| Priority | Issue | Impact | Location | Fix Time |
|----------|-------|--------|----------|----------|
| 🚨 P0 | `<style>` tag allowed in emails | XSS vulnerability | SimpleEmailViewer.tsx:124 | 5 min |
| 🚨 P0 | No virus scanning on attachments | Malware risk | Attachment upload | 2-3 days |
| ⚠️ P0 | Line spacing inconsistency | UX broken | SimpleEmailViewer.tsx | 1 day |
| ⚠️ P1 | Draft/send race condition | Duplicate sends | EmailCompose.tsx | 4 hours |
| 📦 P1 | 3 different composers | Tech debt | components/composer-* | 1 week |

---

## 1. LINE SPACING ISSUES - ROOT CAUSE

**Problem:** Inconsistent spacing between paragraphs in email display

**Root Causes:**

### A. Triple Normalization Conflict
`components/email/SimpleEmailViewer.tsx` has 3 competing functions:

1. `normalizeEmailParagraphs()` - Converts 3+ `<br>` to paragraphs
2. `removeLeadingWhitespace()` - Strips empty elements
3. Global CSS rules - Adds margins between paragraphs

Result: Spacing varies based on email source (AI vs manual vs forwarded)

### B. Signature Insertion
`EmailCompose.tsx` lines 431-455 adds too much space:
- 2 empty paragraphs + signature
- Each paragraph gets 1.5em margin
- Total: 4.5em gap (should be 1.5em)

### C. RichTextEditor CSS Conflicts
`RichTextEditor.tsx` injects inline styles that conflict with `globals.css`

---

## 2. SECURITY VULNERABILITIES 🚨

### A. XSS via `<style>` Tag - CRITICAL
**File:** `SimpleEmailViewer.tsx:124`
`<style>` is in ALLOWED_TAGS array - allows CSS injection attacks

**Fix:** Remove `'style'` from ALLOWED_TAGS immediately

### B. No Virus Scanning - CRITICAL
Attachments go directly to storage without scanning
Can distribute malware through email system

**Fix:** Add ClamAV or VirusTotal integration (2-3 days)

---

## 3. EMAIL CARDS ISSUES

### Found Components:
- `components/ui/EmailCard.tsx` - Used in inbox
- `components/inbox/EmailCard.tsx` - Duplicate, unused
- `components/email/EmailListItem.tsx` - Different styling

### Issues:
1. **Duplicate components** - Features scattered
2. **Snippets include HTML tags** - Shows `<p>` in preview
3. **No attachment count** - Just shows icon

---

## 4. EMAIL COMPOSER ISSUES

### Found 3 Versions:
- V1: `EmailCompose.tsx` (1961 lines, 45 useEffects!)
- V2 modular: `composer-v2/` (800 lines)
- V2 single: `Composer.tsx` (1547 lines, unused)

### Critical Issues:
1. **Draft/send race condition** - Can send stale data
2. **Sequential attachment uploads** - Slow
3. **No upload progress** - Users don't know status

---

## 5. IMAGE HANDLING

### Current: Base64 embedding → Email bloat
### Better: Upload to CDN → Reference URL

**Missing:**
- Image optimization (resize, compress)
- Format conversion (JPEG → WebP)
- Upload progress indicators

---

## 6. ATTACHMENT HANDLING

### Issues:
1. No file size limit check
2. No file type restrictions
3. No upload progress
4. No virus scanning

---

## PRIORITIZED FIX LIST

### P0 - Fix Immediately (< 1 day)
1. Remove `<style>` from ALLOWED_TAGS (5 min)
2. Fix line spacing normalization (1 day)
3. Fix draft/send race condition (4 hours)

### P1 - This Sprint (< 1 week)
4. Add virus scanning (2-3 days)
5. Consolidate email cards (2 hours)
6. Strip HTML from snippets (30 min)
7. Parallel attachment uploads (4 hours)

### P2 - Next Sprint (1-2 weeks)
8. Consolidate composers (1 week)
9. Add virtualization to email list (1 day)
10. Implement image CDN upload (3 days)

---

## QUICK WINS (< 1 Hour)

1. Remove `<style>` tag (5 min)
2. Strip HTML from snippets (30 min)
3. Show attachment count (15 min)
4. Add file size limit (20 min)
5. Add Ctrl+Enter to send (30 min)

---

**Total Estimated Fix Time:** 4-6 weeks for all P0-P2 issues
