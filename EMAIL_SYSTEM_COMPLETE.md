# 📧 Complete Email System with Resend

## 🎯 **Overview**

All emails in EaseMail are sent via **Resend** using custom templates with the **Corporate Grey** theme. This gives you full control over branding, analytics, and delivery.

---

## 📨 **Email Templates Available**

### **1. Team Invitation** ✅
- **File:** `lib/email/templates/team-invite.ts`
- **Trigger:** When admin invites a team member
- **Sent from:** `app/api/team/members/route.ts`

### **2. Signup Confirmation** ✅
- **File:** `lib/email/templates/signup-confirmation.ts`
- **Trigger:** When user signs up
- **Use:** Custom signup flow (optional)

### **3. Password Reset** ✅
- **File:** `lib/email/templates/password-reset.ts`
- **Trigger:** When user requests password reset
- **Use:** Custom password reset flow (optional)

### **4. Magic Link** ✅
- **File:** `lib/email/templates/magic-link.ts`
- **Trigger:** When user requests passwordless login
- **Use:** Custom magic link flow (optional)

---

## ⚙️ **Setup Instructions**

### **1. Install Resend SDK** ✅ (Already done!)
```bash
npm install resend
```

### **2. Add Environment Variables**

Add to `.env.local`:

```bash
# Resend Configuration
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@easemail.app
EMAIL_FROM_NAME=EaseMail
EMAIL_REPLY_TO=support@easemail.app
```

### **3. Get Your Resend API Key**

1. Sign up at [resend.com](https://resend.com) (free 100 emails/day)
2. Go to **API Keys** → **Create API Key**
3. Copy the key (starts with `re_`)
4. Paste into `.env.local`

### **4. Verify Your Domain** (Production)

In Resend Dashboard → **Domains**:

```
Type: TXT
Name: _resend
Value: [provided by Resend]

Type: MX
Name: @
Value: feedback-smtp.us-east-1.amazonses.com
Priority: 10
```

---

## 🔧 **Email Architecture**

### **Current Setup:**

```
📧 CUSTOM EMAILS (Your App via Resend)
├─ Team Invitations ✅ (Working now!)
├─ Signup Confirmation ✅ (Template ready)
├─ Password Reset ✅ (Template ready)
└─ Magic Link ✅ (Template ready)
   │
   └─► Sent via: Resend API
       Templates: lib/email/templates/
       Utility: lib/email/send.ts

📧 AUTH EMAILS (Supabase Default)
├─ Signup Confirmation
├─ Password Reset  
└─ Magic Link
   │
   └─► Sent via: Supabase
       Can override with Resend SMTP (optional)
```

---

## 🎨 **Option 1: Use Supabase + Resend SMTP** (Easier)

**Best for:** Quick setup, minimal code changes

### **Setup:**

1. **Configure Supabase SMTP:**
   - Go to **Supabase Dashboard** → **Authentication** → **SMTP Settings**
   ```
   Enable Custom SMTP: ✓
   
   Host: smtp.resend.com
   Port: 587
   Username: resend
   Password: re_xxxxxxxxxxxx (your Resend API key)
   
   Sender Email: noreply@easemail.app
   Sender Name: EaseMail
   ```

2. **Customize Templates in Supabase:**
   - Go to **Authentication** → **Email Templates**
   - Copy Corporate Grey templates (see `SUPABASE_EMAIL_TEMPLATES.md`)
   - Paste into each template type

### **Pros:**
- ✅ No code changes needed
- ✅ Supabase handles triggers automatically
- ✅ Still uses your Resend account

### **Cons:**
- ❌ Less flexibility
- ❌ Can't add custom logic
- ❌ Limited template variables

---

## 🚀 **Option 2: Send Everything from Your App** (Full Control)

**Best for:** Production apps, custom logic, advanced features

### **Setup:**

1. **Disable Supabase email confirmation:**
   - Go to **Supabase Dashboard** → **Authentication** → **Settings**
   - Disable "Enable email confirmations"

2. **Handle auth events in your app:**
   - Use Supabase auth webhooks
   - Or listen to auth state changes
   - Send emails via Resend

### **Example: Custom Signup Flow**

```typescript
// app/api/auth/signup/route.ts
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send';
import { getSignupConfirmationTemplate, getSignupConfirmationSubject } from '@/lib/email/templates';

export async function POST(request: Request) {
  const { email, password, fullName } = await request.json();
  
  const supabase = createClient();
  
  // Sign up user (with email confirmation disabled in Supabase)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
    },
  });

  if (error) throw error;

  // Send custom confirmation email via Resend
  await sendEmail({
    to: email,
    subject: getSignupConfirmationSubject(),
    html: getSignupConfirmationTemplate({
      userName: fullName,
      userEmail: email,
      confirmationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?token=${data.user?.id}`,
    }),
  });

  return Response.json({ success: true });
}
```

### **Pros:**
- ✅ Full control over email sending
- ✅ Add custom logic (e.g., send welcome email after confirmation)
- ✅ Better analytics in Resend
- ✅ Consistent branding across ALL emails

### **Cons:**
- ❌ More code to write
- ❌ Need to handle triggers yourself

---

## 📊 **Recommended Approach**

### **For MVP / Getting Started:**
👉 **Use Option 1** (Supabase + Resend SMTP)
- Quickest to set up
- Supabase handles auth flows
- Still uses your Resend account for deliverability

### **For Production / Scalable Apps:**
👉 **Use Option 2** (Everything from your app)
- Full control and flexibility
- Better analytics and tracking
- Easier to add features (e.g., email preferences, unsubscribe)

---

## ✅ **What's Already Working**

### **Team Invitations** ✅
- Automatically sends via Resend
- Uses Corporate Grey template
- Works right now!

**Test it:**
```bash
# 1. Add RESEND_API_KEY to .env.local
# 2. Restart dev server: npm run dev
# 3. Go to /team
# 4. Click "Invite Member"
# 5. Check email! 📬
```

---

## 🧪 **Testing**

### **Development (without Resend configured):**
```bash
# Console output:
⚠️ RESEND_API_KEY not configured - email not sent
📧 Invitation created for user@example.com
Invitation link: http://localhost:3001/team/accept-invite?token=abc123
```

### **Production (with Resend configured):**
```bash
# Console output:
✅ Email sent: 550e8400-e29b-41d4-a716-446655440000
```

### **Check Email Deliverability:**
- Go to [mail-tester.com](https://mail-tester.com)
- Send test email to the provided address
- Check spam score (should be 10/10)

---

## 📈 **Resend Dashboard**

Track all your emails:
- **Emails** - View sent/delivered/bounced
- **Logs** - Debug sending issues
- **Analytics** - Open rates (if enabled)
- **Domains** - Verify domain status

---

## 💰 **Pricing**

- **Free:** 100 emails/day, 3,000/month
- **Pro:** $20/month for 50,000 emails/month
- **Enterprise:** Custom pricing

Start with free tier and upgrade as you grow! 🚀

---

## 🎨 **Template Customization**

All templates use the **Corporate Grey** theme:
- Background: `#F5F6F8`
- Primary: `#4C6B9A`  
- Text: `#1A1D23`
- Muted: `#5C616B`

**To customize colors:**
Edit files in `lib/email/templates/` and search/replace hex codes.

---

## 📋 **Next Steps**

1. ✅ **Add RESEND_API_KEY** to `.env.local`
2. ✅ **Test team invitations** (already working!)
3. 🔄 **Choose Option 1 or 2** for auth emails
4. 🚀 **Deploy to production**

---

Need help? Check the Resend docs at [resend.com/docs](https://resend.com/docs) 📚

