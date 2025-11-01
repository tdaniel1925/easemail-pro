# Database Trigger Setup

This migration creates database triggers to automatically sync Supabase Auth users with the public.users table.

## Run This Migration

**Copy and paste this SQL into your Supabase SQL Editor:**

1. Go to your Supabase project
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Paste the contents of `migrations/008_sync_auth_users.sql`
5. Click "Run"

## What it does

1. **Creates a trigger function** that automatically creates a record in `public.users` whenever someone signs up
2. **Creates a trigger** that keeps email/name in sync when users update their profile
3. **Backfills existing users** - if you already signed up, this will create your user record

## After running

- Go back to `/admin-setup`
- Enter your email (tdaniel@botmakers.ai)
- Click "Make Admin"
- It should work now! ✅

