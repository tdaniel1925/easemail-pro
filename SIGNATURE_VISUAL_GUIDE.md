# 🎨 Signature System - Visual Flow Guide

## 📸 User Interface Overview

### 1. Settings Page - Signatures Tab

```
┌─────────────────────────────────────────────────────────────┐
│  Settings                                                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📝 Email Signatures                   [+ New Signature]    │
│  Create and manage email signatures                         │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Work Signature                       Active    [🟢]  │  │
│  │ Default • For john@company.com                       │  │
│  │                                                       │  │
│  │ ┌─────────────────────────────────────────────────┐  │  │
│  │ │ John Doe                                        │  │  │
│  │ │ Product Manager                                 │  │  │
│  │ │ TechCorp Inc.                                   │  │  │
│  │ │ 📧 john@company.com | 📞 +1 (555) 123-4567     │  │  │
│  │ │ 🌐 www.techcorp.com                            │  │  │
│  │ └─────────────────────────────────────────────────┘  │  │
│  │                                                       │  │
│  │ [Edit]  [Preview]  [Delete]                          │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. Signature Editor Modal

```
┌──────────────────────────────────────────────────────────────┐
│  Create New Signature                                   [✕]  │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  Signature Name                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Work Signature                                         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│  Apply to Account                                             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ All Accounts ▼                                         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│  Template Variables (click to insert)                        │
│  [{{fullName}}] [{{email}}] [{{title}}] [{{company}}]       │
│  [{{phone}}] [{{website}}]                                   │
│                                                                │
│  Signature Content              [👁 Preview]  [<> HTML]      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ [B] [I] [U] | [🔗]                                     │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │                                                         │  │
│  │ {{fullName}}                                           │  │
│  │ {{title}}                                              │  │
│  │ {{company}}                                            │  │
│  │ 📧 {{email}} | 📞 {{phone}}                           │  │
│  │ 🌐 {{website}}                                         │  │
│  │                                                         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│  Signature Settings                                           │
│  ☑ Active (use in new emails)                                │
│  ☑ Set as default signature                                  │
│  ☑ Use for replies and reply all                             │
│  ☑ Use for forwards                                          │
│                                                                │
│                                      [Cancel]  [💾 Save]      │
└──────────────────────────────────────────────────────────────┘
```

---

### 3. Email Composer - With Signature Controls

```
┌──────────────────────────────────────────────────────────────┐
│  New Message                           [－] [□] [✕]          │
├──────────────────────────────────────────────────────────────┤
│  To      │ recipient@example.com                             │
│  Subject │ Hello                                             │
├──────────────────────────────────────────────────────────────┤
│  [B] [I] [U] | [•] | [🔗] [🖼]  ┊  [🖊✓] [Work Signature ▼]  │
│                                   └─Signature Controls─────┘  │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  Hi there,                                                    │
│                                                                │
│  I hope this email finds you well...                         │
│                                                                │
│                                                                │
│  ──────────────────────────────────────                      │
│  John Doe                                                     │
│  Product Manager                                              │
│  TechCorp Inc.                                                │
│  📧 john@company.com | 📞 +1 (555) 123-4567                  │
│  🌐 www.techcorp.com                                          │
│  ──────────────────────────────────────                      │
│                                                                │
├──────────────────────────────────────────────────────────────┤
│                                        [Save Draft]  [Send]   │
└──────────────────────────────────────────────────────────────┘

Legend:
  🖊✓ = Pen icon with checkmark (signature is active)
  🖊  = Pen icon without checkmark (signature is off)
  [Work Signature ▼] = Dropdown to select different signature
```

---

## 🔄 User Flow Diagrams

### Flow 1: Creating First Signature

```
User clicks "Settings"
        ↓
Navigates to "Signatures" tab
        ↓
Sees empty state: "No signatures yet"
        ↓
Clicks "Create Your First Signature" button
        ↓
Modal opens with default template
        ↓
User fills in:
  • Name: "Work Signature"
  • Clicks {{fullName}}, {{email}}, {{title}} buttons
  • Content auto-fills with variables
        ↓
User toggles settings:
  ✅ Active
  ✅ Set as default
  ✅ Use for replies
        ↓
Clicks "Save Signature"
        ↓
Modal closes, signature appears in list
        ↓
Success! ✅
```

---

### Flow 2: Composing Email with Signature

```
User clicks "Compose" button
        ↓
EmailCompose modal opens
        ↓
System checks:
  • Email type: compose
  • User has active default signature?
        ↓
YES → Auto-insert signature at bottom
        ↓
User types message:
  "Hi there,
   
   I hope this email finds you well..."
        ↓
Cursor is above signature
        ↓
Signature displays below with variables replaced:
  "John Doe
   Product Manager
   TechCorp Inc.
   📧 john@company.com..."
        ↓
User clicks "Send"
        ↓
Email sent with signature! ✅
```

---

### Flow 3: Replying with Smart Signature Placement

```
User clicks "Reply" on an email
        ↓
EmailCompose opens with:
  • To: sender@example.com
  • Subject: Re: Original subject
  • Body: quoted content
        ↓
System checks:
  • Email type: reply
  • Signature has "Use for replies" enabled?
        ↓
YES → Insert signature BEFORE quoted content
        ↓
Result:
  ┌────────────────────────────┐
  │ [User types reply here]    │
  │                            │
  │ ────────────────────       │
  │ John Doe                   │
  │ Product Manager            │
  │ john@company.com           │
  │ ────────────────────       │
  │                            │
  │ On Oct 31, 2025, wrote:   │
  │ > Original message...      │
  │ > [quoted content]         │
  └────────────────────────────┘
        ↓
User types reply above signature
        ↓
Clicks "Send"
        ↓
Reply sent with proper formatting! ✅
```

---

### Flow 4: Toggle Signature On/Off

```
User is composing email
Signature is auto-inserted
        ↓
User decides: "I don't want signature on this email"
        ↓
Clicks pen icon (🖊✓) in toolbar
        ↓
Checkmark disappears (🖊)
Signature is removed from body
        ↓
User continues typing without signature
        ↓
Later, user changes mind: "Actually, I do want it"
        ↓
Clicks pen icon again (🖊)
        ↓
Checkmark appears (🖊✓)
Signature re-inserted
        ↓
User has full control! ✅
```

---

### Flow 5: Switch Between Multiple Signatures

```
User has 3 signatures:
  • Work Signature (default)
  • Personal Signature
  • Sales Signature
        ↓
Composing email, "Work Signature" auto-inserted
        ↓
User thinks: "This is a sales email, need different signature"
        ↓
Clicks "Work Signature ▼" dropdown
        ↓
Dropdown shows:
  ☑ Work Signature (Default)
  ☐ Personal Signature
  ☐ Sales Signature
        ↓
User clicks "Sales Signature"
        ↓
System:
  1. Removes "Work Signature" from body
  2. Inserts "Sales Signature" at same position
        ↓
Body updates instantly with new signature
        ↓
User continues composing
        ↓
Flexibility achieved! ✅
```

---

## 🎯 Signature Insertion Logic

### For New Emails (Compose)

```
┌──────────────────────────────────────┐
│ User Message:                        │
│ "Hi, this is my email content..."   │
│                                      │
│ [blank line]                         │
│ [blank line]                         │
│                                      │
│ ──────────────                       │
│ SIGNATURE HERE                       │
│ (auto-inserted at bottom)            │
│ ──────────────                       │
└──────────────────────────────────────┘
```

### For Replies/Forwards

```
┌──────────────────────────────────────┐
│ User Reply:                          │
│ "Thanks for your email..."           │
│                                      │
│ [blank line]                         │
│ [blank line]                         │
│                                      │
│ ──────────────                       │
│ SIGNATURE HERE                       │
│ (inserted before quoted content)     │
│ ──────────────                       │
│                                      │
│ [blank line]                         │
│                                      │
│ On Oct 31, 2025, sender wrote:      │
│ > Original message...                │
│ > [quoted content continues]         │
└──────────────────────────────────────┘
```

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        User Interface                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Settings Page          Email Composer     Editor Modal │
│  ┌──────────┐          ┌──────────┐       ┌──────────┐ │
│  │ List     │          │ Compose  │       │ Create/  │ │
│  │ View     │◄────────►│ with     │       │ Edit     │ │
│  │ Edit     │          │ Signature│◄─────►│ Signature│ │
│  │ Delete   │          │ Controls │       │          │ │
│  └──────────┘          └──────────┘       └──────────┘ │
│       │                      │                   │       │
└───────┼──────────────────────┼───────────────────┼──────┘
        │                      │                   │
        └──────────┬───────────┴───────────────────┘
                   │
            ┌──────▼───────┐
            │              │
            │  useSignatures()  React Hook
            │              │
            │  • Load signatures
            │  • Get applicable signature
            │  • Render with variables
            │              │
            └──────┬───────┘
                   │
        ┌──────────┴───────────────┐
        │                          │
  ┌─────▼─────┐            ┌──────▼──────┐
  │           │            │             │
  │ Signature │            │ API Routes  │
  │ Service   │            │             │
  │           │            │ /signatures │
  │ • Replace │            │   GET       │
  │   variables│           │   POST      │
  │ • Insert  │            │             │
  │   position│            │ /[id]       │
  │ • Strip   │            │   GET       │
  │   signature│           │   PUT       │
  │           │            │   DELETE    │
  └───────────┘            └──────┬──────┘
                                  │
                           ┌──────▼──────┐
                           │             │
                           │  Database   │
                           │             │
                           │ emailSignatures
                           │   • id
                           │   • userId
                           │   • name
                           │   • contentHtml
                           │   • isDefault
                           │   • isActive
                           │   • useForReplies
                           │   • ...
                           │             │
                           └─────────────┘
```

---

## 📊 Data Flow

### Creating a Signature

```
User fills form
     │
     ▼
SignatureEditorModal
     │
     ▼
POST /api/signatures
     │
     ▼
Validate data
     │
     ▼
Check if default → unset others
     │
     ▼
INSERT into emailSignatures
     │
     ▼
Return signature
     │
     ▼
UI updates list
```

### Auto-Inserting Signature

```
EmailCompose opens
     │
     ▼
useSignatures() hook
     │
     ▼
getApplicableSignature(type, accountId)
     │
     ├─► Check account-specific signature
     ├─► Fall back to default
     └─► Check useForReplies/useForForwards
     │
     ▼
renderSignature(sig, user, account)
     │
     ├─► Replace {{fullName}}
     ├─► Replace {{email}}
     └─► Replace all variables
     │
     ▼
SignatureService.insertSignature(body, sig, options)
     │
     ├─► type = 'compose' → append at end
     └─► type = 'reply' → insert before quoted content
     │
     ▼
setBody(newBodyWithSignature)
     │
     ▼
User sees signature in composer ✅
```

---

## 🎨 UI States

### Empty State (No Signatures)
```
┌────────────────────────────┐
│         🖊️                 │
│                            │
│   No signatures yet        │
│                            │
│  [Create Your First        │
│   Signature]               │
│                            │
└────────────────────────────┘
```

### Loading State
```
┌────────────────────────────┐
│   Loading signatures...    │
└────────────────────────────┘
```

### Active Signature with Controls
```
┌────────────────────────────────────┐
│ Work Signature      Active  [🟢]  │
│ Default • All Accounts             │
│                                    │
│ ┌────────────────────────────────┐ │
│ │ John Doe                       │ │
│ │ Product Manager                │ │
│ │ ...                            │ │
│ └────────────────────────────────┘ │
│                                    │
│ [Edit]  [Preview]  [Delete]       │
└────────────────────────────────────┘
```

---

## ✅ Success Indicators

### User Knows Signature is Active
- ✅ Pen icon has checkmark (🖊✓)
- ✅ Signature visible in email body
- ✅ Toggle is in ON position (blue, right-aligned)

### User Knows Signature is Off
- ❌ Pen icon has no checkmark (🖊)
- ❌ No signature in email body
- ❌ Toggle is in OFF position (gray, left-aligned)

### User Knows Which Signature is Selected
- Current signature name shown in dropdown
- Selected item highlighted in dropdown menu

---

## 🚀 Quick Reference

### Keyboard Shortcuts (Future Enhancement)
- `Ctrl+Shift+S` - Toggle signature on/off
- `Ctrl+Shift+D` - Open signature dropdown

### Button Icons
- 🖊️ **PenTool** - Signature button
- ✓ **Check** - Signature is active
- ▼ **ChevronDown** - Dropdown menu

### Colors
- **Primary (Blue)** - Active signature, selected items
- **Muted (Gray)** - Inactive signature, unselected items
- **Destructive (Red)** - Delete button

---

This visual guide shows exactly how the signature system works from the user's perspective. Every interaction is intuitive and provides clear visual feedback! 🎉

