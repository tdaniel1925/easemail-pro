-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' NOT NULL;

-- Create index on role for faster admin queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Add comment
COMMENT ON COLUMN users.role IS 'User role: admin or user';

