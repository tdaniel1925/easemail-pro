# 📧 Resend Email Configuration

## Setup Instructions

### 1. Get Your Resend API Key
1. Sign up at [resend.com](https://resend.com)
2. Go to **API Keys** → **Create API Key**
3. Copy your API key (starts with `re_`)

### 2. Add to `.env.local`

```bash
# Email Configuration (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@easemail.app
EMAIL_FROM_NAME=EaseMail
EMAIL_REPLY_TO=support@easemail.app
```

### 3. Configure Supabase SMTP (Production)

In **Supabase Dashboard** → **Authentication** → **SMTP Settings**:

```
Enable Custom SMTP: ✓

SMTP Host: smtp.resend.com
SMTP Port: 587
SMTP Username: resend
SMTP Password: re_xxxxxxxxxxxx (your Resend API key)

Sender Email: noreply@easemail.app
Sender Name: EaseMail
```

### 4. Verify Your Domain in Resend

1. Go to **Domains** in Resend Dashboard
2. Click **Add Domain**
3. Add these DNS records to your domain:

```
Type: TXT
Name: _resend
Value: [provided by Resend]

Type: MX  
Name: @
Value: feedback-smtp.us-east-1.amazonses.com
Priority: 10
```

### 5. Update Supabase Email Templates

Copy the **Corporate Grey templates** from the documentation into:
- Supabase Dashboard → Authentication → Email Templates

---

## Email Templates Included

✅ **Team Invitation Email** - Sent automatically when inviting team members  
✅ **Confirmation Email** - Supabase signup verification  
✅ **Magic Link Email** - Passwordless login  
✅ **Password Reset** - Password recovery  
✅ **Email Change** - Email address change confirmation

---

## Testing

### Development (without Resend configured):
- Emails will be logged to console
- You'll see warning: "RESEND_API_KEY not configured"

### Production (with Resend):
- Emails sent via SMTP
- Track delivery in Resend Dashboard
- Check [mail-tester.com](https://mail-tester.com) for spam score

---

## Pricing

- **Free Tier:** 100 emails/day, 3,000/month
- **Pro:** $20/month for 50,000 emails/month
- **Enterprise:** Custom pricing

---

## Features

✅ Professional SMTP delivery  
✅ Branded email templates  
✅ Team invitation emails  
✅ Delivery analytics  
✅ Bounce handling  
✅ SPF, DKIM, DMARC support

