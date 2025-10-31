# 🔑 AI Features Setup Guide

## ✅ Fixed: App No Longer Crashes Without API Key

The app will now load normally even without an OpenAI API key. However, to use the AI features, you need to add your OpenAI API key.

---

## 🚀 Quick Setup

### Step 1: Get Your OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (it starts with `sk-...`)

### Step 2: Add to Local Development

Create or edit `.env.local` in your project root:

```bash
# Add this line:
OPENAI_API_KEY=sk-your-actual-api-key-here
```

Then restart your development server:
```bash
npm run dev
```

### Step 3: Add to Vercel (Production)

1. Go to your Vercel dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Name:** `OPENAI_API_KEY`
   - **Value:** `sk-your-actual-api-key-here`
   - **Environment:** Production, Preview, Development (select all)
5. Click **Save**
6. **Redeploy** your application

---

## 🎯 Testing the AI Features

Once the API key is added, you can test:

### 1. ✨ AI Write
- Open compose modal
- Click **AI Write** button
- Try generating an email from a prompt

### 2. 🎨 AI Remix  
- Write some text in the compose modal
- Click **AI Remix** button
- Adjust tone or length

### 3. 🎤 Dictate
- Click **Dictate** button
- Allow microphone access
- Speak to transcribe
- (Whisper enhancement requires API key)

### 4. 🎙️ Voice Message
- Click **Voice Message** button
- Record audio
- Attach to email

---

## 💰 OpenAI Costs

Typical usage costs:
- **AI Write:** ~$0.02-0.05 per email
- **AI Remix:** ~$0.02-0.03 per transformation
- **Whisper Transcription:** ~$0.006 per minute

**Monthly estimate:**
- Light use (10-20 emails/day): ~$5-10/month
- Medium use (50-100 emails/day): ~$20-40/month
- Heavy use (200+ emails/day): ~$80-150/month

---

## ⚠️ Troubleshooting

### App still crashes after adding API key?
1. Make sure the key starts with `sk-`
2. Restart your dev server
3. Check for typos in `.env.local`
4. Clear browser cache (Ctrl+Shift+R)

### AI features not working in production?
1. Verify the API key is added in Vercel settings
2. Make sure all environments are selected
3. Redeploy after adding the variable
4. Check Vercel Function Logs for errors

### "Insufficient quota" error?
1. Go to https://platform.openai.com/account/billing
2. Add payment method
3. Add credits ($10 minimum)

---

## 📋 Complete Environment Variables

Create `.env.local` with all required variables:

```bash
# OpenAI (for AI features)
OPENAI_API_KEY=sk-your-key-here

# Supabase (for auth and storage)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Nylas (for email)
NYLAS_CLIENT_ID=your-client-id
NYLAS_API_KEY=your-api-key
NYLAS_API_URI=https://api.us.nylas.com

# App URL (for callbacks)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## ✅ Current Status

**Fixed in commit `b296271`:**
- ✅ App no longer crashes without OpenAI API key
- ✅ AI toolbar loads gracefully
- ✅ Features show helpful error messages if API key is missing
- ✅ Lazy loading prevents SSR issues

**To do:**
- ⚠️ Add `OPENAI_API_KEY` to environment variables
- ⚠️ Test AI features after adding key

---

## 🆘 Need Help?

If you're still having issues:
1. Check browser console for errors (F12)
2. Check Vercel Function Logs
3. Verify all environment variables are set
4. Make sure OpenAI account has credits

---

**Built with ❤️ for EaseMail**

