-- Migration: Add Organizations and Team Management
-- This enables multi-tenant team accounts with role-based access

-- ============================================================================
-- ORGANIZATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan_type VARCHAR(50) DEFAULT 'team', -- 'individual', 'team', 'enterprise'
  billing_email VARCHAR(255),
  max_seats INTEGER DEFAULT 5,
  current_seats INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(is_active);

-- ============================================================================
-- UPDATE USERS TABLE
-- ============================================================================
-- Add organization_id to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Expand role field to accommodate new roles
ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50);

-- Update role comments
COMMENT ON COLUMN users.role IS 'User role: platform_admin, org_admin, org_user, individual';

-- Create index for organization lookups
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);

-- ============================================================================
-- ORGANIZATION MEMBERS TABLE (Junction for team context)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- 'owner', 'admin', 'member'
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMP DEFAULT NOW(),
  joined_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{}', -- Custom permissions per user
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_active ON organization_members(is_active);

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- For individual accounts
  plan_name VARCHAR(50) NOT NULL, -- 'free', 'pro', 'team', 'enterprise'
  billing_cycle VARCHAR(20) DEFAULT 'monthly', -- 'monthly', 'annual'
  price_per_month DECIMAL(10,2),
  seats_included INTEGER DEFAULT 1,
  seats_used INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'past_due', 'canceled', 'trialing'
  trial_ends_at TIMESTAMP,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMP,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  -- Ensure either org or user is set, but not both
  CONSTRAINT subscription_owner_check CHECK (
    (organization_id IS NOT NULL AND user_id IS NULL) OR
    (organization_id IS NULL AND user_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);

-- ============================================================================
-- TEAM INVITATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL, -- 'admin', 'member'
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'expired', 'revoked'
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(organization_id, email, status) -- Prevent duplicate pending invites
);

CREATE INDEX IF NOT EXISTS idx_invitations_org ON team_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON team_invitations(status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can see their own organization
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (
    id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Organization Members: Users can see members of their organization
CREATE POLICY "Users can view their organization members"
  ON organization_members FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Subscriptions: Users can see their own subscription
CREATE POLICY "Users can view their own subscription"
  ON subscriptions FOR SELECT
  USING (
    user_id = auth.uid() OR
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Team Invitations: Members can see invitations for their org
CREATE POLICY "Organization members can view invitations"
  ON team_invitations FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get user's organization context
CREATE OR REPLACE FUNCTION get_user_org_context(user_uuid UUID)
RETURNS TABLE (
  user_id UUID,
  user_role VARCHAR(50),
  org_id UUID,
  org_role VARCHAR(50),
  is_platform_admin BOOLEAN,
  is_org_admin BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.role as user_role,
    u.organization_id as org_id,
    om.role as org_role,
    (u.role = 'platform_admin') as is_platform_admin,
    (om.role IN ('owner', 'admin')) as is_org_admin
  FROM users u
  LEFT JOIN organization_members om ON u.id = om.user_id AND u.organization_id = om.organization_id
  WHERE u.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can manage team
CREATE OR REPLACE FUNCTION can_manage_team(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_context RECORD;
BEGIN
  SELECT * INTO user_context FROM get_user_org_context(user_uuid);
  
  -- Platform admin can manage any team
  IF user_context.is_platform_admin THEN
    RETURN TRUE;
  END IF;
  
  -- User must be org admin of the specific org
  RETURN user_context.org_id = org_uuid AND user_context.is_org_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE EXISTING TRIGGER FOR NEW USERS
-- ============================================================================

-- Update the handle_new_user function to support account type selection
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  account_type VARCHAR(50);
  org_name VARCHAR(255);
  new_org_id UUID;
BEGIN
  -- Get account_type from user metadata (set during signup)
  account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'individual');
  
  -- Create user record
  INSERT INTO public.users (id, email, full_name, avatar_url, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'avatar_url',
    CASE 
      WHEN account_type = 'team' THEN 'org_admin'
      ELSE 'individual'
    END,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
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
    INSERT INTO public.subscriptions (user_id, plan_name, billing_cycle, seats_included, status)
    VALUES (NEW.id, 'free', 'monthly', 1, 'active');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE organizations IS 'Teams/Organizations that can have multiple users';
COMMENT ON TABLE organization_members IS 'Junction table linking users to organizations with roles';
COMMENT ON TABLE subscriptions IS 'Billing and subscription data for individuals or teams';
COMMENT ON TABLE team_invitations IS 'Pending invitations to join team accounts';

