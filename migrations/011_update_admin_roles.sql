-- Migration: Update old role values to new role system
-- This migration converts the old 'admin'/'user' roles to the new multi-tenant role system

-- Convert 'admin' to 'platform_admin'
UPDATE users 
SET role = 'platform_admin' 
WHERE role = 'admin';

-- Convert 'user' to 'individual'
UPDATE users 
SET role = 'individual' 
WHERE role = 'user';

-- Update the role column to allow longer role names (already done in schema, but ensure it's applied)
ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50);

-- Update the comment to reflect new role system
COMMENT ON COLUMN users.role IS 'User role: platform_admin, org_admin, org_user, or individual';

-- Verify the changes
SELECT 
  role, 
  COUNT(*) as user_count 
FROM users 
GROUP BY role
ORDER BY role;

