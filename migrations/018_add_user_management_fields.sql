-- ============================================================================
-- MIGRATION 018: Add User Management Fields for Organization User Creation
-- ============================================================================
-- Purpose: Support admin creation of org users with temp passwords, 
--          password change enforcement, account status tracking, and audit logging

-- Add new fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS temp_password VARCHAR(255), -- Encrypted temporary password
ADD COLUMN IF NOT EXISTS require_password_change BOOLEAN DEFAULT FALSE, -- Force password change on next login
ADD COLUMN IF NOT EXISTS temp_password_expires_at TIMESTAMP, -- Temp password expiry (7 days)
ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'active', -- pending, active, suspended, deactivated
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP, -- Track last login time
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP, -- When account was deactivated (for 60-day deletion)
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL; -- Admin who created this user

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_deactivated_at ON users(deactivated_at);
CREATE INDEX IF NOT EXISTS idx_users_temp_password_expires_at ON users(temp_password_expires_at);

-- Create audit log table for user management actions
CREATE TABLE IF NOT EXISTS user_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL, -- 'created', 'password_changed', 'suspended', 'deactivated', 'deleted', 'credentials_resent'
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Admin who performed the action
  details JSONB, -- Additional context (e.g., old/new values)
  ip_address VARCHAR(45), -- IP address of the action
  user_agent TEXT, -- Browser/client info
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Add indexes for audit log
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_user_id ON user_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_action ON user_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_created_at ON user_audit_logs(created_at DESC);

-- Function to automatically clean up deactivated users after 60 days
CREATE OR REPLACE FUNCTION cleanup_deactivated_users()
RETURNS TRIGGER AS $$
BEGIN
  -- If account is being deactivated, set deactivated_at timestamp
  IF NEW.account_status = 'deactivated' AND OLD.account_status != 'deactivated' THEN
    NEW.deactivated_at := NOW();
  END IF;
  
  -- If account is reactivated, clear deactivated_at
  IF NEW.account_status != 'deactivated' AND OLD.account_status = 'deactivated' THEN
    NEW.deactivated_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for cleanup
DROP TRIGGER IF EXISTS user_deactivation_trigger ON users;
CREATE TRIGGER user_deactivation_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_deactivated_users();

-- Function to delete users deactivated for more than 60 days (to be called by cron job)
CREATE OR REPLACE FUNCTION delete_expired_deactivated_users()
RETURNS TABLE(deleted_count INTEGER) AS $$
DECLARE
  count INTEGER;
BEGIN
  -- Delete users deactivated more than 60 days ago
  WITH deleted AS (
    DELETE FROM users
    WHERE account_status = 'deactivated'
      AND deactivated_at IS NOT NULL
      AND deactivated_at < NOW() - INTERVAL '60 days'
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO count FROM deleted;
  
  RETURN QUERY SELECT count;
END;
$$ LANGUAGE plpgsql;

-- Update the handle_new_user trigger to set account_status
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  account_type VARCHAR(50);
  org_name VARCHAR(255);
  new_org_id UUID;
BEGIN
  -- Get account_type from user metadata (set during signup)
  account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'individual');
  
  -- Create user record with proper account_status
  INSERT INTO public.users (
    id, 
    email, 
    full_name, 
    avatar_url, 
    role, 
    account_status,
    last_login_at,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'avatar_url',
    CASE 
      WHEN account_type = 'team' THEN 'org_admin'
      ELSE 'individual'
    END,
    'active', -- Self-registered users are active immediately
    NOW(), -- Set first login time
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    last_login_at = NOW(), -- Update last login on subsequent logins
    updated_at = NOW();
  
  -- If team account, create organization
  IF account_type = 'team' THEN
    org_name := COALESCE(NEW.raw_user_meta_data->>'organization_name', NEW.email || '''s Team');
    
    INSERT INTO public.organizations (name, slug, plan_type, billing_email, created_at, updated_at)
    VALUES (
      org_name,
      LOWER(REGEXP_REPLACE(org_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8),
      'team',
      NEW.email,
      NOW(),
      NOW()
    )
    RETURNING id INTO new_org_id;
    
    -- Update user with organization_id
    UPDATE public.users SET organization_id = new_org_id WHERE id = NEW.id;
    
    -- Add user as organization owner
    INSERT INTO public.organization_members (organization_id, user_id, role, joined_at, is_active)
    VALUES (new_org_id, NEW.id, 'owner', NOW(), true);
    
    -- Create team subscription
    INSERT INTO public.subscriptions (organization_id, plan_name, billing_cycle, seats_included, status)
    VALUES (new_org_id, 'team', 'monthly', 5, 'trialing');
  ELSE
    -- Create individual subscription
    INSERT INTO public.subscriptions (user_id, plan_name, billing_cycle, status)
    VALUES (NEW.id, 'free', 'monthly', 'active');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT ON user_audit_logs TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE user_audit_logs IS 'Audit log for user management actions performed by admins';
COMMENT ON COLUMN users.temp_password IS 'Encrypted temporary password for admin-created users';
COMMENT ON COLUMN users.require_password_change IS 'Forces user to change password on next login';
COMMENT ON COLUMN users.temp_password_expires_at IS 'Expiry date for temporary password (7 days from creation)';
COMMENT ON COLUMN users.account_status IS 'User account status: pending, active, suspended, deactivated';
COMMENT ON COLUMN users.deactivated_at IS 'Timestamp when account was deactivated (triggers 60-day deletion)';
COMMENT ON FUNCTION delete_expired_deactivated_users() IS 'Deletes users deactivated for more than 60 days';

