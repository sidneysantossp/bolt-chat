/*
  # Create Groups and Platform Settings Tables

  1. New Tables
    - `groups` table for managing chat groups
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `description` (text)
      - `member_count` (integer)
      - `status` (text: active/archived)
      - `created_at` (timestamp)
      - `created_by` (uuid, references users)
      - `last_message` (text)
      - `last_message_at` (timestamp)
      - `parent_id` (uuid, self-reference for subgroups)

    - `platform_settings` table for system configuration
      - `id` (uuid, primary key)
      - `key` (text, unique)
      - `value` (jsonb)
      - `description` (text)
      - `updated_at` (timestamp)
      - `updated_by` (uuid, references users)

  2. Security
    - Enable RLS
    - Add policies for public read access
    - Add policies for admin management

  3. Indexes
    - Index on group status and hierarchy
    - Index on settings keys
*/

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  member_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users(id),
  last_message text,
  last_message_at timestamptz,
  parent_id uuid REFERENCES groups(id),
  
  CONSTRAINT groups_status_check CHECK (status IN ('active', 'archived')),
  CONSTRAINT groups_member_count_check CHECK (member_count >= 0)
);

-- Create indexes for groups
CREATE INDEX IF NOT EXISTS idx_groups_status ON groups(status);
CREATE INDEX IF NOT EXISTS idx_groups_parent ON groups(parent_id);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups(created_at);
CREATE INDEX IF NOT EXISTS idx_groups_last_message ON groups(last_message_at);

-- Enable RLS for groups
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Create policies for groups

-- Public can view active groups
CREATE POLICY "allow_public_view_active_groups"
ON groups
FOR SELECT
TO public
USING (status = 'active');

-- Admins can manage groups
CREATE POLICY "allow_admin_manage_groups"
ON groups
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_admin = true
  )
);

-- Create platform_settings table
CREATE TABLE IF NOT EXISTS platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

-- Create index for settings
CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON platform_settings(key);

-- Enable RLS for platform_settings
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for platform_settings

-- Admins can do everything with platform settings
CREATE POLICY "allow_admin_manage_platform_settings"
ON platform_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_admin = true
  )
);

-- Insert initial groups
INSERT INTO groups (name, description, status)
VALUES 
  ('General', 'General discussion group', 'active'),
  ('Support', 'Support and help group', 'active'),
  ('Community', 'Community discussions', 'active')
ON CONFLICT DO NOTHING;

-- Insert default platform settings
INSERT INTO platform_settings (key, value, description)
VALUES 
  (
    'general',
    '{
      "max_users_per_room": 25,
      "max_message_length": 1000,
      "enable_file_sharing": false,
      "allowed_file_types": ["image/jpeg", "image/png", "image/gif"],
      "profanity_filter": true,
      "maintenance_mode": false
    }'::jsonb,
    'General platform settings'
  )
ON CONFLICT (key) DO NOTHING;