# Move Domain Back to Vercel from Cloudflare

## Overview
This guide walks you through moving your domain back to Vercel from Cloudflare, where you originally purchased it.

**Your Vercel Project**: `easemail-pro`
**Project ID**: `prj_t2jCZwG5E7b2O3ED0bzI7nAbrJHY`

---

## ⚠️ Important: What You Need to Know

1. **Domain Transfer Lock**: When transferring domains, there's usually a 60-day transfer lock. If you recently moved to Cloudflare, you may need to wait.
2. **Downtime**: There will be brief DNS propagation time (usually 24-48 hours)
3. **Backup**: Make sure you have all DNS records documented before starting
4. **Email**: If you use email with this domain, configure that first

---

## Option 1: Transfer Domain Ownership Back to Vercel (Recommended if you bought it from Vercel)

### Step 1: Unlock Domain at Cloudflare
1. Log in to your **Cloudflare dashboard**: https://dash.cloudflare.com
2. Go to **Domain Registration** > **Manage Domains**
3. Find your domain and click **Manage**
4. Scroll to **Domain Transfer** section
5. Click **Unlock Domain**
6. Get the **Authorization Code** (EPP code)

### Step 2: Initiate Transfer at Vercel
1. Log in to **Vercel**: https://vercel.com/dashboard
2. Go to your project: `easemail-pro`
3. Click **Domains** tab
4. Click **Add Domain** or **Transfer Domain**
5. Enter your domain name
6. Select **Transfer Domain to Vercel**
7. Enter the **Authorization Code** from Cloudflare
8. Confirm the transfer (you'll need to verify via email)

### Step 3: Wait for Transfer to Complete
- Transfer typically takes **5-7 days**
- You'll receive email notifications from both Cloudflare and Vercel
- Your site will continue to work during the transfer

### Step 4: Update DNS at Vercel (After Transfer Completes)
1. Go to Vercel **Domains** settings
2. Vercel will automatically configure DNS for your project
3. Verify your site is accessible at your domain

---

## Option 2: Keep Domain at Cloudflare, Just Point DNS to Vercel (Faster, No Transfer)

If you want to keep the domain registered at Cloudflare but use Vercel's infrastructure:

### Step 1: Get Vercel Deployment URL
1. Go to Vercel dashboard: https://vercel.com/dashboard
2. Open your `easemail-pro` project
3. Click **Domains**
4. Note your Vercel deployment URL (e.g., `easemail-pro.vercel.app`)

### Step 2: Update DNS at Cloudflare
1. Log in to **Cloudflare**: https://dash.cloudflare.com
2. Select your domain
3. Go to **DNS** > **Records**
4. Update/Create these records:

   **For Root Domain** (e.g., `example.com`):
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   Proxy: OFF (DNS Only)
   ```

   **For WWW Subdomain**:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   Proxy: OFF (DNS Only)
   ```

### Step 3: Add Domain to Vercel
1. Go to Vercel project settings
2. Click **Domains**
3. Click **Add**
4. Enter your domain (e.g., `example.com`)
5. Vercel will detect the DNS records
6. Click **Add**

### Step 4: Verify Domain
- Vercel will verify the DNS records
- This usually takes 10-60 seconds
- Once verified, your site will be live on your custom domain

---

## Option 3: Buy a New Domain from Vercel

If you just want to start fresh with a new domain:

1. Go to Vercel dashboard
2. Navigate to **Domains** in the sidebar
3. Click **Buy a Domain**
4. Search for available domains
5. Complete purchase
6. Vercel will automatically configure DNS

---

## Recommended Approach

**If you originally bought the domain from Vercel:** Use **Option 1** (Transfer back)

**If you need your site working ASAP:** Use **Option 2** (Just update DNS)

**If you want a fresh start:** Use **Option 3** (Buy new domain)

---

## Current DNS Records to Document (Before Making Changes)

Before you start, document your current Cloudflare DNS records:

1. Log in to Cloudflare
2. Go to **DNS** > **Records**
3. Take a screenshot or write down ALL records
4. Common records you might have:
   - A records (for root domain)
   - CNAME records (for www, mail, etc.)
   - MX records (for email)
   - TXT records (for verification, SPF, DKIM)

---

## After Domain is Moved/Pointed to Vercel

### Verify Everything Works
1. ✅ Visit your domain in a browser
2. ✅ Check SSL certificate is valid (https://)
3. ✅ Test login/logout functionality
4. ✅ Check API endpoints work
5. ✅ Verify email sending works (if applicable)

### Update Environment Variables (If Needed)
If you have any environment variables that reference your domain:
1. Go to Vercel project settings
2. Click **Environment Variables**
3. Update any URLs to use your custom domain

---

## Troubleshooting

### "Domain already in use" Error
- The domain might still be associated with another Vercel project
- Go to Vercel account settings > Domains
- Remove the domain from any old projects first

### DNS Propagation Takes Time
- Changes can take up to 48 hours to propagate globally
- Use https://dnschecker.org to check propagation status
- Clear your browser cache and try incognito mode

### SSL Certificate Issues
- Vercel automatically provisions SSL certificates
- This usually takes 10-60 seconds after domain is verified
- If it fails, remove and re-add the domain

### Site Returns 404 or DNS Error
- Double-check DNS records are correct
- Verify domain is added to your Vercel project
- Check Vercel project is deployed and live

---

## Need Help?

1. **Vercel Support**: https://vercel.com/support
2. **Cloudflare Support**: https://support.cloudflare.com
3. **Check Vercel Status**: https://vercel-status.com

---

## Quick Decision Helper

**Question**: What's your domain name and where did you originally buy it?

**If bought from Vercel originally:**
→ Use Option 1 (Transfer back to Vercel)

**If bought from Cloudflare or another registrar:**
→ Use Option 2 (Keep at Cloudflare, point DNS to Vercel)

**If you just want it working quickly:**
→ Use Option 2 (DNS only, no transfer)

---

**Next Steps**: Let me know which option you want to take, and I can provide more specific guidance!
