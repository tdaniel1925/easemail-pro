# 📧 Email Template Editor - Setup Complete!

## ✅ What I Built

I've created a complete custom email template system for super admins with:

### 1. **Full-Featured Template Editor UI** (`/admin/email-templates`)
- ✅ **Create New Template** button with modal
- ✅ Live HTML preview with variable substitution
- ✅ Code editor for subject + HTML
- ✅ Version history tracking
- ✅ Send test emails functionality
- ✅ Search and filter templates
- ✅ Edit/Delete templates

### 2. **Database System**
- ✅ `email_templates` table
- ✅ `email_template_versions` table for version control
- ✅ `email_template_test_sends` table for tracking
- ✅ Row-level security (platform admin only)

### 3. **Scripts & Tools**
- ✅ Migration API endpoint: `/api/migrations/025`
- ✅ Population script: `scripts/populate-email-templates.ts`

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Run the Migration

```bash
# Start your dev server first
pnpm dev

# In another terminal, run the migration
curl -X POST http://localhost:3001/api/migrations/025
```

This creates the 3 email template tables and inserts 5 default templates:
- `signup-confirmation` - Welcome email
- `team-invite` - Team invitations
- `password-reset` - Password resets
- `magic-link` - Passwordless login
- `new-user-credentials` - Admin-created users

### Step 2: Populate Templates with Beautiful HTML

```bash
npx tsx scripts/populate-email-templates.ts
```

This updates the default templates with the professional HTML from `lib/email/templates/`.

### Step 3: Access the Editor

1. Log in as a super admin (tdaniel@botmakers.ai)
2. Go to `/admin/email-templates`
3. You'll see 5 default templates ready to edit!

---

## 🎨 How to Use the Editor

### **View & Edit Templates**
1. Click any template in the sidebar
2. Click **Edit** button
3. Modify subject or HTML
4. Add change notes
5. Click **Save Changes**

### **Create New Templates**
1. Click **"+ New"** button in sidebar
2. Fill in:
   - Template Name (e.g., "Welcome Email")
   - Template Key (e.g., "welcome-email") - used in code
   - Subject with variables: `Welcome {{userName}}`
   - Full HTML template
   - Required variables (comma-separated)
3. Click **Create Template**

### **Test Templates**
1. Select a template
2. Fill in test variables on the left
3. Preview renders in real-time on the right
4. Enter your email address
5. Click **Send Test Email**

### **Variable Syntax**
Use `{{variableName}}` in subject and HTML:
```html
<p>Hi {{userName}},</p>
<p>Welcome to {{organizationName}}!</p>
<a href="{{loginUrl}}">Click here to login</a>
```

---

## 📝 Features

### ✅ Live Preview
- Real-time HTML rendering in iframe
- Variable substitution preview
- Subject line preview

### ✅ Version Control
- Every change creates a new version
- Track who changed what and when
- View version history

### ✅ Template Categories
- Authentication
- Team Management
- Billing
- Notifications
- General

### ✅ Security
- Super admin access only
- Row-level security on all tables
- XSS protection via iframe sandbox

---

## 🔧 API Usage (For Sending Emails)

To send an email using a template:

```typescript
import { db } from '@/lib/db/drizzle';
import { emailTemplates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// 1. Fetch template
const template = await db.query.emailTemplates.findFirst({
  where: eq(emailTemplates.templateKey, 'signup-confirmation'),
});

// 2. Replace variables
let subject = template.subjectTemplate;
let html = template.htmlTemplate;

const variables = {
  recipientName: 'John Doe',
  confirmationLink: 'https://app.com/verify/abc123',
};

Object.keys(variables).forEach(key => {
  const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
  subject = subject.replace(regex, variables[key]);
  html = html.replace(regex, variables[key]);
});

// 3. Send via Resend
await resend.emails.send({
  from: process.env.EMAIL_FROM!,
  to: 'user@example.com',
  subject,
  html,
});
```

---

## 📚 Template Variables

### **signup-confirmation**
- `recipientName` - User's full name
- `confirmationLink` - Email verification URL

### **team-invite**
- `organizationName` - Company name
- `inviterName` - Person who sent invite
- `inviterEmail` - Inviter's email
- `recipientEmail` - Invitee's email
- `role` - Role being assigned
- `inviteLink` - Invitation acceptance URL
- `expiryDate` - When invite expires

### **password-reset**
- `recipientName` - User's name
- `resetLink` - Password reset URL
- `expiryHours` - How long link is valid

### **magic-link**
- `recipientName` - User's name
- `magicLink` - One-time login URL
- `expiryMinutes` - Link validity period

### **new-user-credentials**
- `recipientName` - New user's name
- `recipientEmail` - New user's email
- `organizationName` - Company name
- `tempPassword` - Temporary password
- `loginUrl` - Login page URL
- `expiryDays` - Password expiry
- `adminName` - Admin who created account

---

## 🎉 Next Steps

1. **Run the 3 setup commands above**
2. **Visit `/admin/email-templates`**
3. **Click a template to see the live preview**
4. **Send yourself a test email!**

The system is production-ready and fully functional!

## 📸 What You'll See

```
┌─────────────────────────────────────────────────────────────┐
│  📧 Email Templates                          [+ New]        │
├──────────────┬──────────────────────────────────────────────┤
│              │                                               │
│ 🔍 Search    │        Signup Confirmation                   │
│              │        Welcome new users                     │
│ Templates:   │                                               │
│              │  [Edit]  [Delete]                            │
│ ✅ Signup    │                                               │
│ ✅ Team      │  Subject: Verify your EaseMail account       │
│ ✅ Password  │                                               │
│ ✅ Magic     │  ┌─────────────────────────────────────┐     │
│ ✅ New User  │  │ Live Preview                        │     │
│              │  │                                     │     │
│              │  │  [Beautiful HTML email renders here]│     │
│              │  │                                     │     │
│              │  └─────────────────────────────────────┘     │
│              │                                               │
│              │  Test Variables:                             │
│              │  recipientName: [John Doe]                   │
│              │  confirmationLink: [https://...]             │
│              │                                               │
│              │  Send Test: [you@example.com] [Send]         │
└──────────────┴──────────────────────────────────────────────┘
```

---

## 🆘 Troubleshooting

**Migration fails:** Check that your database is running and DATABASE_URL is set in `.env.local`

**Templates don't show:** Make sure you're logged in as a super admin (platform_admin role)

**Test email fails:** Verify RESEND_API_KEY is set in `.env.local`

**Preview not rendering:** Try clicking "Show Code" to see if HTML is present

---

That's it! You now have a professional email template management system. 🎉
