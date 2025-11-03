-- Make tdaniel@botmakers.ai a Platform Admin
-- Run this in your Supabase SQL Editor

-- Update the role to platform_admin
UPDATE users 
SET role = 'platform_admin' 
WHERE email = 'tdaniel@botmakers.ai';

-- Verify the change
SELECT 
  id,
  email,
  full_name as "Full Name",
  role,
  created_at as "Created At"
FROM users 
WHERE email = 'tdaniel@botmakers.ai';

-- This should show:
-- role = 'platform_admin'

