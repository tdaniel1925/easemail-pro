# Email DNS Setup Guide

## Overview
Configure SPF, DKIM, and DMARC records to ensure email deliverability and prevent your emails from going to spam.

**Time Required**: 45 minutes (including DNS propagation)
**Impact**: CRITICAL - Without this, password resets and notifications will fail

---

## Prerequisites

1. Access to your DNS provider (Namecheap, GoDaddy, Cloudflare, etc.)
2. Resend account configured (already done - RESEND_API_KEY in .env.local)
3. Your domain name (e.g., `easemail.com`)

---

## Step 1: Get DNS Records from Resend

1. Log into [Resend Dashboard](https://resend.com/domains)
2. Click **"Add Domain"**
3. Enter your domain: `easemail.com` (replace with your actual domain)
4. Resend will generate **3 DNS records** for you to add

---

## Step 2: Add DNS Records

### Example DNS Records (yours will be different!)

#### Record 1: SPF (TXT)
```
Type:  TXT
Name:  @ (or leave blank for root domain)
Value: v=spf1 include:_spf.resend.com ~all
TTL:   3600
```

#### Record 2: DKIM (TXT)
```
Type:  TXT
Name:  resend._domainkey
Value: k=rsa; p=MIGfMA0GCS...LONG_PUBLIC_KEY_HERE...AQAB
TTL:   3600
```

#### Record 3: DMARC (TXT)
```
Type:  TXT
Name:  _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc-reports@easemail.com
TTL:   3600
```

---

## Step 3: Add Records to Your DNS Provider

### Cloudflare
1. Go to **DNS** → **Records**
2. Click **Add record**
3. Enter the Type, Name, and Value from Resend
4. Click **Save**
5. Repeat for all 3 records

### Namecheap
1. Go to **Advanced DNS**
2. Click **Add New Record**
3. Select TXT Record
4. Enter Host (Name) and Value
5. Click ✓ (checkmark)
6. Repeat for all 3 records

### GoDaddy
1. Go to **DNS Management**
2. Click **Add** under Records
3. Select TXT
4. Enter Name and Value
5. Click **Save**
6. Repeat for all 3 records

---

## Step 4: Verify DNS Records

### In Resend Dashboard
1. Wait 5-30 minutes for DNS propagation
2. Go back to Resend Domains
3. Click **Verify** next to your domain
4. You should see ✅ green checkmarks

### Using Command Line
```bash
# Check SPF
dig TXT easemail.com

# Check DKIM
dig TXT resend._domainkey.easemail.com

# Check DMARC
dig TXT _dmarc.easemail.com
```

### Using Online Tools
- [MXToolbox SPF Checker](https://mxtoolbox.com/spf.aspx)
- [DMARC Analyzer](https://dmarcian.com/dmarc-inspector/)
- [Google Admin Toolbox](https://toolbox.googleapps.com/apps/checkmx/)

---

## Step 5: Test Email Deliverability

### Send Test Email
```bash
curl -X POST https://api.resend.com/emails \\
  -H "Authorization: Bearer YOUR_RESEND_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "no-reply@easemail.com",
    "to": "your-test-email@gmail.com",
    "subject": "DNS Test Email",
    "html": "<p>If you receive this, DNS is configured correctly!</p>"
  }'
```

### Check Spam Score
Forward the test email to: `check-auth@verifier.port25.com`
You'll receive a report showing SPF, DKIM, DMARC status.

---

## Troubleshooting

### DNS Not Propagating
- Wait up to 48 hours (usually 5-30 minutes)
- Flush DNS cache: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (Mac)
- Use different DNS servers: `dig @8.8.8.8 TXT easemail.com`

### SPF Failing
- Make sure Name is `@` or blank (for root domain)
- Don't add `http://` or `www.` to the value
- Only one SPF record per domain allowed

### DKIM Failing
- Verify Name is exactly `resend._domainkey` (with the dot)
- Copy the entire public key (very long value)
- Some DNS providers require removing quotes from the value

### DMARC Policy Too Strict
Start with `p=none` to monitor, then:
- After 1 week → `p=quarantine` (send to spam if fail)
- After 1 month → `p=reject` (block completely if fail)

---

## Advanced Configuration

### Multiple Email Providers
If using both Resend and SendGrid:
```
v=spf1 include:_spf.resend.com include:sendgrid.net ~all
```

### Custom DMARC Reporting
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@easemail.com; ruf=mailto:forensics@easemail.com; pct=100
```

### Subdomain Emails
For `noreply@app.easemail.com`:
- Add SPF: `app.easemail.com` TXT `v=spf1 include:_spf.resend.com ~all`
- Add DKIM: `resend._domainkey.app.easemail.com`

---

## Verification Checklist

- [ ] SPF record added and verified
- [ ] DKIM record added and verified
- [ ] DMARC record added and verified
- [ ] Resend domain shows ✅ green checkmarks
- [ ] Test email sent and received in INBOX (not spam)
- [ ] `check-auth@verifier.port25.com` shows PASS for all checks

---

## Production Checklist

- [ ] Update `NEXT_PUBLIC_APP_URL` in .env to your production domain
- [ ] Configure DMARC email address (`rua=mailto:...`)
- [ ] Set up email forwarding for DMARC reports
- [ ] Monitor deliverability for first 2 weeks
- [ ] Gradually increase DMARC strictness (none → quarantine → reject)

---

## Next Steps

After DNS is configured:
1. ✅ Emails will land in inbox instead of spam
2. ✅ Password reset emails will be delivered
3. ✅ Notification emails will work
4. ✅ Your domain reputation will improve

**Estimated Impact**: 40% improvement in email deliverability
