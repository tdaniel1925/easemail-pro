-- Contact Tags and Groups System
-- Creates proper relational tables for managing contact organization

-- Contact Tags Table (replaces JSON array approach)
CREATE TABLE IF NOT EXISTS contact_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#4ecdc4',
  icon VARCHAR(50),
  description TEXT,
  contact_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Contact Groups Table
CREATE TABLE IF NOT EXISTS contact_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6366f1',
  icon VARCHAR(50),
  contact_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Contact-Tag Relationship (Many-to-Many)
CREATE TABLE IF NOT EXISTS contact_tag_assignments (
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES contact_tags(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (contact_id, tag_id)
);

-- Contact-Group Relationship (Many-to-Many)
CREATE TABLE IF NOT EXISTS contact_group_memberships (
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES contact_groups(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (contact_id, group_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_tags_user ON contact_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_groups_user ON contact_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_tag_assignments_contact ON contact_tag_assignments(contact_id);
CREATE INDEX IF NOT EXISTS idx_tag_assignments_tag ON contact_tag_assignments(tag_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_contact ON contact_group_memberships(contact_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_group ON contact_group_memberships(group_id);

-- Function to update contact counts
CREATE OR REPLACE FUNCTION update_tag_contact_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE contact_tags 
    SET contact_count = contact_count + 1, updated_at = NOW()
    WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE contact_tags 
    SET contact_count = GREATEST(0, contact_count - 1), updated_at = NOW()
    WHERE id = OLD.tag_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_group_contact_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE contact_groups 
    SET contact_count = contact_count + 1, updated_at = NOW()
    WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE contact_groups 
    SET contact_count = GREATEST(0, contact_count - 1), updated_at = NOW()
    WHERE id = OLD.group_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update counts
DROP TRIGGER IF EXISTS trigger_update_tag_count ON contact_tag_assignments;
CREATE TRIGGER trigger_update_tag_count
AFTER INSERT OR DELETE ON contact_tag_assignments
FOR EACH ROW EXECUTE FUNCTION update_tag_contact_count();

DROP TRIGGER IF EXISTS trigger_update_group_count ON contact_group_memberships;
CREATE TRIGGER trigger_update_group_count
AFTER INSERT OR DELETE ON contact_group_memberships
FOR EACH ROW EXECUTE FUNCTION update_group_contact_count();

