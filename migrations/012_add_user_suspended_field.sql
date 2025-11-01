-- Add suspended field to users table for admin user management
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended BOOLEAN DEFAULT false;

-- Create index for faster queries on suspended users
CREATE INDEX IF NOT EXISTS idx_users_suspended ON users(suspended);

-- Add comment
COMMENT ON COLUMN users.suspended IS 'Whether the user account is suspended by an admin';

