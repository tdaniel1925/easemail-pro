# =============================================================================
# EASEMAIL - ENVIRONMENT VARIABLES REFERENCE
# =============================================================================
# Copy these to your .env.local file and fill in your actual values
# NEVER commit .env.local to version control!

# =============================================================================
# CORE - REQUIRED FOR APP TO RUN
# =============================================================================

# Supabase Configuration (Get from: https://app.supabase.com/project/_/settings/api)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Database URL (Get from Supabase: Settings > Database > Connection string > URI)
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# Application URL (Development: http://localhost:3001, Production: https://yourdomain.com)
NEXT_PUBLIC_APP_URL=http://localhost:3001

# =============================================================================
# EMAIL PROVIDERS - REQUIRED
# =============================================================================

# Nylas (Primary Email Provider) - Get from: https://dashboard.nylas.com
NYLAS_API_KEY=your_nylas_api_key_here
NYLAS_API_URI=https://api.us.nylas.com
NYLAS_CLIENT_ID=your_nylas_client_id_here
NYLAS_CLIENT_SECRET=your_nylas_client_secret_here

# Aurinko (Fallback Email Provider - Optional but recommended)
AURINKO_API_URL=https://api.aurinko.io
AURINKO_CLIENT_ID=your_aurinko_client_id_here
AURINKO_CLIENT_SECRET=your_aurinko_client_secret_here

# =============================================================================
# SECURITY - REQUIRED
# =============================================================================

# Email Encryption Key (Generate: openssl rand -base64 32)
# Must be exactly 32 characters
EMAIL_ENCRYPTION_KEY=your_32_character_encryption_key_here

# Webhook Secret (Generate: openssl rand -hex 32)
# Used to verify webhook authenticity from Nylas, Twilio, etc.
WEBHOOK_SECRET=your_webhook_secret_here

# =============================================================================
# TRANSACTIONAL EMAILS - REQUIRED
# =============================================================================

# Resend (For sending invite emails, password resets, etc.)
# Get from: https://resend.com/api-keys
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx

# Email Configuration
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=EaseMail
EMAIL_REPLY_TO=support@yourdomain.com

# =============================================================================
# AI FEATURES - REQUIRED FOR AI FUNCTIONALITY
# =============================================================================

# OpenAI API Key (Get from: https://platform.openai.com/api-keys)
# Used for: Email summaries, smart compose, AI categorization
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx

# =============================================================================
# SMS SYSTEM - OPTIONAL (Only if using SMS features)
# =============================================================================

# Twilio Configuration (Get from: https://console.twilio.com)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567

# SMS Pricing (USD)
SMS_PRICE_PER_MESSAGE=0.05        # What you charge customers
SMS_COST_PER_MESSAGE=0.0075       # What Twilio charges you
SMS_TEST_MODE=true                # Set to 'false' in production

# SMS Rate Limits (per user)
SMS_RATE_LIMIT_PER_MINUTE=10
SMS_RATE_LIMIT_PER_HOUR=100
SMS_RATE_LIMIT_PER_DAY=500
SMS_RATE_LIMIT_PER_MONTH=5000

# =============================================================================
# OPTIONAL - ADVANCED FEATURES
# =============================================================================

# Vercel Analytics (Production only)
# NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your_analytics_id

# Sentry Error Tracking (Production)
# SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
# SENTRY_AUTH_TOKEN=your_sentry_auth_token

# LogRocket Session Recording (Production)
# LOGROCKET_APP_ID=your_app_id/your_project

# Stripe (If implementing payments)
# STRIPE_SECRET_KEY=sk_test_xxxxx
# STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
# STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# =============================================================================
# DEVELOPMENT - OPTIONAL
# =============================================================================

# Development Features
# DEV_MODE=true
# SKIP_AUTH=false
# LOG_LEVEL=debug

# =============================================================================
# NOTES
# =============================================================================
# 
# SECURITY TIPS:
# 1. Never commit .env.local to git
# 2. Rotate all keys after deployment
# 3. Use different keys for dev/staging/production
# 4. Enable MFA on all service provider accounts
# 
# REQUIRED SETUP STEPS:
# 1. Copy this file to .env.local
# 2. Fill in all REQUIRED variables
# 3. Generate encryption keys using commands provided
# 4. Verify Supabase authentication is enabled
# 5. Configure Nylas webhooks: https://yourdomain.com/api/webhooks/nylas
# 6. Configure Twilio webhooks (if SMS): https://yourdomain.com/api/webhooks/twilio
# 7. Verify Resend domain (production only)
# 
# TESTING:
# - Run `npm run dev` to test locally
# - Visit http://localhost:3001
# - Create a test account
# - Connect an email account
# 
# DEPLOYMENT:
# - Set all variables in Vercel/hosting dashboard
# - Use production URLs (no localhost)
# - Enable all security features
# - Test email sending/receiving
# - Monitor error logs for 24-48 hours
# 
# =============================================================================

