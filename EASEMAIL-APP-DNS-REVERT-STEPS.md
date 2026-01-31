# Revert easemail.app DNS Back to Vercel - EXACT STEPS

## Current Situation ✅ Confirmed
- **Domain**: easemail.app
- **Current Nameservers**: Cloudflare (ruth.ns.cloudflare.com, koa.ns.cloudflare.com)
- **What You Need**: Point back to Vercel where your app is hosted

---

## 🎯 EXACT STEPS TO FIX THIS (5-10 minutes)

### Step 1: Find Where You Bought easemail.app

The domain was likely purchased from one of these:
- **Vercel Domains** (most likely since your project is on Vercel)
- GoDaddy
- Namecheap
- Google Domains
- Cloudflare Registrar

**To find out:**
1. Check your email for domain purchase confirmation
2. Or log in to Vercel → Domains → See if easemail.app is listed there

---

## 🚀 SOLUTION: Change Nameservers Back to Vercel

### If Domain Was Purchased from Vercel (Most Likely):

#### 1. Log in to Vercel
Go to: https://vercel.com/dashboard

#### 2. Go to Domains Section
- Click **Domains** in the sidebar
- Or go directly to: https://vercel.com/dashboard/domains

#### 3. Find easemail.app
- Look for `easemail.app` in your domains list
- Click on it

#### 4. Check Nameserver Settings
You should see nameservers listed. They should be:
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

But they're currently pointing to Cloudflare.

#### 5. Update Nameservers at Domain Registrar
Since you changed them to Cloudflare, you need to change them back:

**At Cloudflare:**
1. Go to https://dash.cloudflare.com
2. Click on **Registrar** or **Domain Registration**
3. Find `easemail.app`
4. Click **Manage Domain**
5. Find **Nameservers** section
6. Change from Cloudflare nameservers TO:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```
7. Click **Save** or **Update**

**OR If Domain is Registered Elsewhere (GoDaddy, Namecheap, etc.):**
1. Log in to your domain registrar
2. Go to domain management for `easemail.app`
3. Find **Nameservers** or **DNS Settings**
4. Change nameservers to:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```
5. Save changes

#### 6. Wait for Propagation (10-60 minutes)
- DNS changes take time to propagate
- Usually works within 10-30 minutes
- Can take up to 24-48 hours globally

#### 7. Verify in Vercel (After 10 minutes)
1. Go back to Vercel dashboard
2. Open your `easemail-pro` project
3. Click **Domains** tab
4. Check if `easemail.app` shows as "Valid" ✅
5. Visit https://easemail.app - should load your site
6. Check SSL certificate is valid (https)

---

## ⚡ ALTERNATIVE: If You Just Want It Working Now

### Keep Nameservers at Cloudflare but Point to Vercel:

#### 1. At Cloudflare DNS Settings
1. Go to https://dash.cloudflare.com
2. Select `easemail.app`
3. Go to **DNS** → **Records**

#### 2. Delete or Update Existing Records
Delete any A, AAAA, or CNAME records for the root domain (@) and www

#### 3. Add These New Records

**For Root Domain** (@):
```
Type:   A
Name:   @
IPv4:   76.76.21.21
Proxy:  OFF (click the cloud to make it gray "DNS only")
TTL:    Auto
```

**For WWW Subdomain**:
```
Type:   CNAME
Name:   www
Target: cname.vercel-dns.com
Proxy:  OFF (click the cloud to make it gray "DNS only")
TTL:    Auto
```

⚠️ **IMPORTANT**: The proxy MUST be OFF (gray cloud icon). If it's orange (proxied), click it to turn it gray.

#### 4. Verify Domain in Vercel
1. Go to Vercel project `easemail-pro`
2. Click **Domains**
3. Make sure `easemail.app` and `www.easemail.app` are both listed
4. If not, click **Add** and add them
5. Vercel will verify DNS automatically

#### 5. Test (After 5-10 minutes)
- Visit https://easemail.app
- Visit https://www.easemail.app
- Both should load your Vercel app
- SSL should be valid (green padlock)

---

## 📋 Quick Checklist

**Choose One Method:**

### Method 1: Change Nameservers (Recommended - Cleaner)
- [ ] Find where easemail.app is registered
- [ ] Change nameservers from Cloudflare to Vercel:
  - [ ] `ns1.vercel-dns.com`
  - [ ] `ns2.vercel-dns.com`
- [ ] Wait 10-60 minutes
- [ ] Verify in Vercel
- [ ] Test https://easemail.app

### Method 2: Keep Cloudflare Nameservers, Update DNS Records (Faster)
- [ ] Log in to Cloudflare dashboard
- [ ] Go to DNS settings for easemail.app
- [ ] Update/Create A record: @ → 76.76.21.21 (Proxy OFF)
- [ ] Update/Create CNAME: www → cname.vercel-dns.com (Proxy OFF)
- [ ] Add domain to Vercel project (if not already)
- [ ] Test https://easemail.app

---

## 🔍 Check Current Status

To verify it's working:

**Check Nameservers:**
```bash
nslookup -type=NS easemail.app
```
Should show `ns1.vercel-dns.com` and `ns2.vercel-dns.com` after change.

**Check DNS Propagation:**
Visit: https://dnschecker.org/#NS/easemail.app

**Check If Site Works:**
Visit: https://easemail.app (should load your app)

---

## ⏱️ Timeline

| Task | Time |
|------|------|
| Change nameservers | 2 minutes |
| Or update DNS records | 2 minutes |
| DNS starts propagating | Immediate |
| Works in most locations | 10-30 minutes |
| Fully propagated globally | 24-48 hours |
| Vercel detects and provisions SSL | 1-2 minutes after DNS works |

---

## 🆘 Troubleshooting

### After 1 Hour, Site Still Not Working

1. **Clear Browser Cache**
   - Chrome/Edge: Ctrl+Shift+Delete → Clear cache
   - Or try Incognito/Private mode

2. **Check DNS Propagation**
   - Visit https://dnschecker.org
   - Enter: easemail.app
   - Select: A record
   - Should show 76.76.21.21 (or Vercel IPs)

3. **Verify Cloudflare Proxy is OFF**
   - If using Method 2, cloud icon MUST be gray
   - Orange cloud = Cloudflare proxy (breaks Vercel)
   - Click it to toggle to gray

4. **Check Vercel Domain Settings**
   - Project `easemail-pro` → Domains
   - Ensure easemail.app is listed and shows "Valid"
   - If not, remove and re-add it

### SSL Certificate Error

- Vercel auto-provisions SSL certificates
- Takes 1-2 minutes after DNS is verified
- If still failing after 10 minutes:
  1. Go to Vercel Domains
  2. Remove easemail.app
  3. Re-add easemail.app
  4. Wait 2 minutes

### "This site can't be reached" Error

- DNS hasn't propagated yet - wait 10 more minutes
- Or clear DNS cache on your computer:
  ```bash
  # Windows
  ipconfig /flushdns
  ```
- Try on mobile data (different network)

---

## 🎯 What I Need to Help Further

If you're stuck, tell me:
1. Which method did you try? (Nameservers or DNS records)
2. What error message do you see?
3. Screenshot of Cloudflare DNS settings (if using Method 2)

---

## ✅ Success Criteria

You'll know it's working when:
- ✅ https://easemail.app loads your app
- ✅ Green padlock (SSL valid)
- ✅ No Cloudflare page/error
- ✅ Vercel shows domain as "Valid"

---

## 🚀 Recommended: Method 2 (Faster)

Since you just want it working ASAP, I recommend:
1. Keep nameservers at Cloudflare
2. Update DNS records to point to Vercel (Method 2 above)
3. Takes 2 minutes to configure
4. Works within 5-10 minutes

Then later, if you want cleaner setup, switch nameservers to Vercel (Method 1).

---

**Ready to start?** Just follow Method 2 steps above, and let me know if you hit any issues! 🚀
