-- Check current user role and update to platform_admin
-- Run this in your Supabase SQL Editor

-- First, let's see all users and their roles
SELECT id, email, full_name, role, created_at 
FROM public.users 
ORDER BY created_at DESC;

-- Update your user to platform_admin (replace with your email)
UPDATE public.users 
SET role = 'platform_admin'
WHERE email = 'tdaniel@botmakers.ai';

-- Verify the update
SELECT id, email, full_name, role 
FROM public.users 
WHERE email = 'tdaniel@botmakers.ai';

