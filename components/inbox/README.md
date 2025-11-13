# Inbox Components

## ⚠️ Important: Email Composer Location

### DO NOT USE: `EmailComposer.tsx`

The file `EmailComposer.tsx` in this directory is **DEPRECATED** and **NOT USED** by the application.

### USE INSTEAD: `components/email/EmailCompose.tsx`

The actual email composer used by the inbox is located at:
```
components/email/EmailCompose.tsx
```

This is the component that:
- Is imported and used by `app/(dashboard)/inbox/page.tsx`
- Contains the full-featured RichTextEditor with TipTap
- Supports inline image pasting
- Has draft auto-save functionality
- Includes signature management
- Has all the rich text formatting tools

## Why This Confusion Exists

The `EmailComposer.tsx` file in this directory appears to be a legacy component that was replaced but not deleted. Any modifications made to `components/inbox/EmailComposer.tsx` will have **NO EFFECT** on the actual email composer functionality.

## When Working on Email Composer Features

**Always edit:** `components/email/EmailCompose.tsx`

**Never edit:** `components/inbox/EmailComposer.tsx` (deprecated)

## File Locations Quick Reference

| Feature | File Path |
|---------|-----------|
| **Email Composer (CURRENT)** | `components/email/EmailCompose.tsx` |
| Rich Text Editor | `components/editor/RichTextEditor.tsx` |
| Email Autocomplete | `components/email/EmailAutocomplete.tsx` |
| Signature Management | `lib/signatures/signature-service.ts` |
| ~~Email Composer (DEPRECATED)~~ | ~~`components/inbox/EmailComposer.tsx`~~ |

---

Last updated: 2025-01-13
