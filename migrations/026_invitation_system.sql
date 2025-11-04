-- Add invitation fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for fast invitation token lookup
CREATE INDEX IF NOT EXISTS idx_users_invitation_token ON users(invitation_token) WHERE invitation_token IS NOT NULL;

-- Add comment
COMMENT ON COLUMN users.invitation_token IS 'Secure token for invitation link (modern flow where user creates their own password)';
COMMENT ON COLUMN users.invitation_expires_at IS 'Invitation expiry (typically 7 days from sending)';
COMMENT ON COLUMN users.invitation_accepted_at IS 'When the user accepted the invitation and set their password';
COMMENT ON COLUMN users.invited_by IS 'Admin who invited this user';

