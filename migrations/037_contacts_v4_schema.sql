-- ============================================
-- CONTACTS V4 - Complete Rebuild
-- Following Nylas V3 API Structure
-- ============================================

-- Drop old contacts table (save data first if needed)
-- ALTER TABLE contacts RENAME TO contacts_legacy;

-- ============================================
-- MAIN CONTACTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contacts_v4 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,

    -- Nylas Integration
    nylas_contact_id VARCHAR(255),
    nylas_grant_id VARCHAR(255) NOT NULL,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('google', 'microsoft')),
    source VARCHAR(20) DEFAULT 'address_book' CHECK (source IN ('address_book', 'domain', 'inbox', 'easemail')),

    -- Name Fields (matching Nylas structure)
    given_name VARCHAR(255),
    middle_name VARCHAR(255),
    surname VARCHAR(255),
    suffix VARCHAR(50),
    nickname VARCHAR(255),

    -- Display name (computed via trigger instead of generated column)
    display_name VARCHAR(512),

    -- Email Addresses (JSONB array matching Nylas format)
    emails JSONB DEFAULT '[]'::JSONB,
    -- Format: [{"type": "work", "email": "john@company.com"}, {"type": "personal", "email": "john@gmail.com"}]
    -- Valid types: "work", "personal", "other"

    -- Phone Numbers (JSONB array)
    phone_numbers JSONB DEFAULT '[]'::JSONB,
    -- Format: [{"type": "mobile", "number": "+1234567890"}, {"type": "work", "number": "+0987654321"}]
    -- Valid types: "work", "home", "mobile", "fax", "pager", "other"

    -- Physical Addresses (JSONB array)
    physical_addresses JSONB DEFAULT '[]'::JSONB,
    -- Format: [{
    --   "type": "work",
    --   "street_address": "123 Main St",
    --   "city": "San Francisco",
    --   "state": "CA",
    --   "postal_code": "94105",
    --   "country": "USA"
    -- }]

    -- Web Pages (JSONB array)
    web_pages JSONB DEFAULT '[]'::JSONB,
    -- Format: [{"type": "profile", "url": "https://linkedin.com/in/john"}, {"type": "homepage", "url": "https://example.com"}]

    -- Instant Messenger (JSONB array)
    im_addresses JSONB DEFAULT '[]'::JSONB,
    -- Format: [{"type": "skype", "im_address": "john.doe"}]

    -- Professional Information
    job_title VARCHAR(255),
    company_name VARCHAR(255),
    manager_name VARCHAR(255),
    office_location VARCHAR(255),
    department VARCHAR(255),

    -- Personal Information
    birthday DATE,
    notes TEXT,

    -- Profile Picture
    picture_url TEXT,
    picture_data BYTEA, -- Base64 decoded image
    picture_updated_at TIMESTAMP WITH TIME ZONE,

    -- Contact Groups (JSONB array of group IDs/names)
    groups JSONB DEFAULT '[]'::JSONB,
    -- Format: [{"id": "group-123", "name": "Family"}, {"id": "group-456", "name": "Work"}]

    -- User-defined Tags (separate from provider groups)
    tags JSONB DEFAULT '[]'::JSONB,
    -- Format: ["vip", "important", "client"]

    -- Metadata
    is_favorite BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,

    -- Sync State
    sync_status VARCHAR(20) DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending_create', 'pending_update', 'pending_delete', 'error', 'conflict')),
    sync_error TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,

    -- Versioning for conflict detection
    version INTEGER DEFAULT 1,
    etag VARCHAR(255), -- Provider's ETag if available
    local_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    remote_updated_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT contacts_v4_email_or_phone CHECK (
        jsonb_array_length(emails) > 0 OR
        jsonb_array_length(phone_numbers) > 0
    ),
    CONSTRAINT contacts_v4_unique_nylas UNIQUE (account_id, nylas_contact_id)
);

-- ============================================
-- CONTACT SYNC STATE (per account)
-- ============================================
CREATE TABLE IF NOT EXISTS contact_sync_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,

    -- Sync Tracking
    last_successful_sync TIMESTAMP WITH TIME ZONE,
    last_sync_attempt TIMESTAMP WITH TIME ZONE,
    next_sync_scheduled TIMESTAMP WITH TIME ZONE,

    -- Sync Statistics
    total_contacts INTEGER DEFAULT 0,
    synced_contacts INTEGER DEFAULT 0,
    pending_contacts INTEGER DEFAULT 0,
    error_contacts INTEGER DEFAULT 0,
    conflict_contacts INTEGER DEFAULT 0,

    -- Status
    sync_status VARCHAR(20) DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error', 'paused')),
    sync_error TEXT,
    current_operation VARCHAR(50), -- "fetching", "processing", "uploading", etc.

    -- Progress (for UI)
    progress_current INTEGER DEFAULT 0,
    progress_total INTEGER DEFAULT 0,
    progress_percentage INTEGER DEFAULT 0,

    -- Sync Configuration
    sync_enabled BOOLEAN DEFAULT TRUE,
    sync_interval_minutes INTEGER DEFAULT 5, -- Google polls every 5 min
    auto_sync BOOLEAN DEFAULT TRUE,

    -- Last sync cursor (for pagination)
    last_sync_cursor VARCHAR(512),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT contact_sync_state_unique UNIQUE (account_id)
);

-- ============================================
-- CONTACT SYNC LOGS (audit trail)
-- ============================================
CREATE TABLE IF NOT EXISTS contact_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts_v4(id) ON DELETE SET NULL,

    -- Operation Details
    operation VARCHAR(20) NOT NULL CHECK (operation IN ('create', 'update', 'delete', 'sync', 'conflict', 'error')),
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('local_to_remote', 'remote_to_local', 'bidirectional')),

    -- Status
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error', 'skipped', 'pending')),
    error_message TEXT,
    error_code VARCHAR(50),

    -- Change Details
    changes_made JSONB,
    -- Format: [{"field": "email", "old_value": "...", "new_value": "..."}]

    -- Performance
    duration_ms INTEGER,

    -- Context
    triggered_by VARCHAR(50) CHECK (triggered_by IN ('user', 'scheduled_sync', 'manual_sync', 'webhook', 'system')),

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CONTACT CONFLICTS (manual resolution queue)
-- ============================================
CREATE TABLE IF NOT EXISTS contact_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts_v4(id) ON DELETE CASCADE,

    -- Conflict Data
    local_version JSONB NOT NULL,
    remote_version JSONB NOT NULL,

    -- Conflict Details
    conflict_fields JSONB NOT NULL,
    -- Format: ["emails", "phone_numbers", "company_name"]

    conflict_reason TEXT,
    conflict_type VARCHAR(50) CHECK (conflict_type IN ('concurrent_edit', 'delete_modified', 'field_mismatch')),

    -- Resolution
    resolution_strategy VARCHAR(50) CHECK (resolution_strategy IN ('keep_local', 'keep_remote', 'merge', 'manual')),
    resolved_version JSONB,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,

    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'ignored', 'auto_resolved')),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CONTACT GROUPS (matching Nylas structure)
-- ============================================
CREATE TABLE IF NOT EXISTS contact_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,

    -- Group Details
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Nylas Integration
    nylas_group_id VARCHAR(255),
    group_type VARCHAR(20) DEFAULT 'user' CHECK (group_type IN ('system', 'user')),

    -- UI Customization
    color VARCHAR(7), -- Hex color
    icon VARCHAR(50),

    -- Stats
    contact_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT contact_groups_unique UNIQUE (account_id, name)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Primary lookups
CREATE INDEX IF NOT EXISTS idx_contacts_v4_user_id ON contacts_v4(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_contacts_v4_account_id ON contacts_v4(account_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_contacts_v4_nylas_id ON contacts_v4(nylas_contact_id) WHERE nylas_contact_id IS NOT NULL;

-- Display name search
CREATE INDEX IF NOT EXISTS idx_contacts_v4_display_name ON contacts_v4(display_name) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_contacts_v4_surname ON contacts_v4(surname) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_contacts_v4_company ON contacts_v4(company_name) WHERE is_deleted = FALSE;

-- JSONB searches (GIN indexes)
CREATE INDEX IF NOT EXISTS idx_contacts_v4_emails_gin ON contacts_v4 USING GIN (emails);
CREATE INDEX IF NOT EXISTS idx_contacts_v4_phones_gin ON contacts_v4 USING GIN (phone_numbers);
CREATE INDEX IF NOT EXISTS idx_contacts_v4_groups_gin ON contacts_v4 USING GIN (groups);
CREATE INDEX IF NOT EXISTS idx_contacts_v4_tags_gin ON contacts_v4 USING GIN (tags);

-- Full-text search
CREATE INDEX IF NOT EXISTS idx_contacts_v4_fulltext ON contacts_v4 USING GIN (
    to_tsvector('english',
        COALESCE(display_name, '') || ' ' ||
        COALESCE(company_name, '') || ' ' ||
        COALESCE(job_title, '') || ' ' ||
        COALESCE(notes, '') || ' ' ||
        COALESCE(nickname, '')
    )
) WHERE is_deleted = FALSE;

-- Sync status indexes
CREATE INDEX IF NOT EXISTS idx_contacts_v4_sync_status ON contacts_v4(sync_status) WHERE sync_status != 'synced';
CREATE INDEX IF NOT EXISTS idx_contacts_v4_last_synced ON contacts_v4(last_synced_at);
CREATE INDEX IF NOT EXISTS idx_contacts_v4_updated_at ON contacts_v4(local_updated_at);
CREATE INDEX IF NOT EXISTS idx_contacts_v4_favorite ON contacts_v4(is_favorite) WHERE is_favorite = TRUE;

-- Sync state indexes
CREATE INDEX IF NOT EXISTS idx_sync_state_account_v4 ON contact_sync_state(account_id);
CREATE INDEX IF NOT EXISTS idx_sync_state_status_v4 ON contact_sync_state(sync_status);
CREATE INDEX IF NOT EXISTS idx_sync_state_next_sync_v4 ON contact_sync_state(next_sync_scheduled) WHERE sync_enabled = TRUE;

-- Sync logs indexes
CREATE INDEX IF NOT EXISTS idx_sync_logs_account_v4 ON contact_sync_logs(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_contact_v4 ON contact_sync_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status_v4 ON contact_sync_logs(status) WHERE status = 'error';
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_v4 ON contact_sync_logs(created_at DESC);

-- Conflict indexes
CREATE INDEX IF NOT EXISTS idx_conflicts_user_v4 ON contact_conflicts(user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_conflicts_contact_v4 ON contact_conflicts(contact_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_status_v4 ON contact_conflicts(status);

-- Group indexes
CREATE INDEX IF NOT EXISTS idx_groups_account_v4 ON contact_groups(account_id);
CREATE INDEX IF NOT EXISTS idx_groups_name_v4 ON contact_groups(name);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE contacts_v4 ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_groups ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY contacts_v4_user_policy ON contacts_v4
    FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY sync_state_user_policy ON contact_sync_state
    FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY sync_logs_user_policy ON contact_sync_logs
    FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY conflicts_user_policy ON contact_conflicts
    FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY groups_user_policy ON contact_groups
    FOR ALL
    USING (user_id = auth.uid());

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-compute display_name
CREATE OR REPLACE FUNCTION compute_contact_display_name()
RETURNS TRIGGER AS $$
BEGIN
    -- Compute display name from name fields
    NEW.display_name = COALESCE(
        NULLIF(TRIM(
            CONCAT(
                COALESCE(NEW.given_name, ''),
                CASE WHEN NEW.middle_name IS NOT NULL THEN ' ' || NEW.middle_name ELSE '' END,
                CASE WHEN NEW.surname IS NOT NULL THEN ' ' || NEW.surname ELSE '' END,
                CASE WHEN NEW.suffix IS NOT NULL THEN ' ' || NEW.suffix ELSE '' END
            )
        ), ''),
        NEW.nickname,
        'Unknown Contact'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER compute_contacts_v4_display_name
    BEFORE INSERT OR UPDATE ON contacts_v4
    FOR EACH ROW
    EXECUTE FUNCTION compute_contact_display_name();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contacts_v4_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.local_updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_v4_updated_at
    BEFORE UPDATE ON contacts_v4
    FOR EACH ROW
    EXECUTE FUNCTION update_contacts_v4_updated_at();

CREATE TRIGGER sync_state_updated_at
    BEFORE UPDATE ON contact_sync_state
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER conflicts_updated_at
    BEFORE UPDATE ON contact_conflicts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Increment version on update
CREATE OR REPLACE FUNCTION increment_contact_v4_version()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.* IS DISTINCT FROM NEW.* AND NEW.sync_status != 'conflict' THEN
        NEW.version = OLD.version + 1;
        NEW.sync_status = 'pending_update';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_v4_version_increment
    BEFORE UPDATE ON contacts_v4
    FOR EACH ROW
    EXECUTE FUNCTION increment_contact_v4_version();

-- ============================================
-- VALIDATION FUNCTIONS
-- ============================================

-- Validate email format in JSONB array
CREATE OR REPLACE FUNCTION validate_contact_emails_v4()
RETURNS TRIGGER AS $$
DECLARE
    email_obj JSONB;
BEGIN
    IF NEW.emails IS NOT NULL AND jsonb_array_length(NEW.emails) > 0 THEN
        FOR email_obj IN SELECT jsonb_array_elements(NEW.emails)
        LOOP
            IF NOT (email_obj->>'email' ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$') THEN
                RAISE EXCEPTION 'Invalid email format: %', email_obj->>'email';
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_contacts_v4_emails
    BEFORE INSERT OR UPDATE ON contacts_v4
    FOR EACH ROW
    EXECUTE FUNCTION validate_contact_emails_v4();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get primary email from JSONB array
CREATE OR REPLACE FUNCTION get_primary_email(emails JSONB)
RETURNS TEXT AS $$
BEGIN
    IF emails IS NULL OR jsonb_array_length(emails) = 0 THEN
        RETURN NULL;
    END IF;

    -- Try to find "work" type first, then "personal", then first email
    RETURN COALESCE(
        (SELECT email_obj->>'email'
         FROM jsonb_array_elements(emails) email_obj
         WHERE email_obj->>'type' = 'work'
         LIMIT 1),
        (SELECT email_obj->>'email'
         FROM jsonb_array_elements(emails) email_obj
         WHERE email_obj->>'type' = 'personal'
         LIMIT 1),
        emails->0->>'email'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get primary phone from JSONB array
CREATE OR REPLACE FUNCTION get_primary_phone(phone_numbers JSONB)
RETURNS TEXT AS $$
BEGIN
    IF phone_numbers IS NULL OR jsonb_array_length(phone_numbers) = 0 THEN
        RETURN NULL;
    END IF;

    -- Try mobile first, then work, then first phone
    RETURN COALESCE(
        (SELECT phone_obj->>'number'
         FROM jsonb_array_elements(phone_numbers) phone_obj
         WHERE phone_obj->>'type' = 'mobile'
         LIMIT 1),
        (SELECT phone_obj->>'number'
         FROM jsonb_array_elements(phone_numbers) phone_obj
         WHERE phone_obj->>'type' = 'work'
         LIMIT 1),
        phone_numbers->0->>'number'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Search contacts by email
CREATE OR REPLACE FUNCTION search_contacts_by_email(search_email TEXT, search_user_id UUID)
RETURNS SETOF contacts_v4 AS $$
BEGIN
    RETURN QUERY
    SELECT c.*
    FROM contacts_v4 c
    WHERE c.user_id = search_user_id
      AND c.is_deleted = FALSE
      AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(c.emails) email_obj
          WHERE LOWER(email_obj->>'email') = LOWER(search_email)
      );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- INITIAL DATA / MIGRATION
-- ============================================

-- Create sync state for existing accounts
-- Note: This will be executed when migration runs
-- Commented out for now since it depends on email_accounts table structure
-- INSERT INTO contact_sync_state (user_id, account_id, sync_enabled, auto_sync)
-- SELECT DISTINCT
--     ea.user_id,
--     ea.id,
--     TRUE,
--     TRUE
-- FROM email_accounts ea
-- WHERE ea.is_active = TRUE
--   AND ea.nylas_grant_id IS NOT NULL
-- ON CONFLICT (account_id) DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE contacts_v4 IS 'Contacts V4 - Complete rebuild with proper Nylas V3 sync support';
COMMENT ON TABLE contact_sync_state IS 'Per-account sync state tracking for contacts';
COMMENT ON TABLE contact_sync_logs IS 'Audit trail of all contact sync operations';
COMMENT ON TABLE contact_conflicts IS 'Manual conflict resolution queue';
COMMENT ON TABLE contact_groups IS 'Contact groups synchronized with email provider';

COMMENT ON COLUMN contacts_v4.emails IS 'JSONB array of email objects: [{"type": "work", "email": "..."}]';
COMMENT ON COLUMN contacts_v4.phone_numbers IS 'JSONB array of phone objects: [{"type": "mobile", "number": "..."}]';
COMMENT ON COLUMN contacts_v4.sync_status IS 'Current sync state: synced, pending_*, error, conflict';
COMMENT ON COLUMN contacts_v4.version IS 'Incremented on each local update for conflict detection';
