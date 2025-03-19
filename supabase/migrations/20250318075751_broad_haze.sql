/*
  # Platform Settings Schema

  1. New Tables
    - `platform_settings`
      - `id` (uuid, primary key)
      - `key` (text, unique)
      - `value` (jsonb)
      - `description` (text)
      - `updated_at` (timestamptz)
      - `updated_by` (uuid, references users)
      - `version` (integer)

  2. Security
    - Enable RLS
    - Add policies for admin access
*/

-- Create platform_settings table if it doesn't exist
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS platform_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text UNIQUE NOT NULL,
    value jsonb NOT NULL,
    description text,
    updated_at timestamptz DEFAULT now(),
    updated_by uuid REFERENCES users(id),
    version integer DEFAULT 1
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage platform settings"
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

-- Create indexes (with IF NOT EXISTS to prevent conflicts)
CREATE INDEX IF NOT EXISTS platform_settings_key_idx ON platform_settings(key);

-- Insert default settings
INSERT INTO platform_settings (key, value, description) VALUES
-- Chat Settings
('chat.message_length', jsonb_build_object(
  'max', 1000,
  'min', 1
), 'Maximum and minimum length for chat messages'),

('chat.rate_limit', jsonb_build_object(
  'messages_per_minute', 30,
  'enabled', true
), 'Rate limiting for chat messages'),

('chat.file_sharing', jsonb_build_object(
  'enabled', true,
  'max_size_mb', 5,
  'allowed_types', ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
), 'File sharing settings'),

-- Room Settings
('rooms.capacity', jsonb_build_object(
  'default_max_users', 25,
  'absolute_max_users', 100,
  'auto_archive_empty_rooms', true,
  'auto_archive_after_hours', 24
), 'Room capacity and archival settings'),

('rooms.creation', jsonb_build_object(
  'allow_user_creation', false,
  'require_approval', true,
  'max_rooms_per_user', 3
), 'Room creation settings'),

-- Moderation Settings
('moderation.content_filter', jsonb_build_object(
  'enabled', true,
  'sensitivity', 'medium',
  'auto_delete_flagged', false,
  'notify_admins', true
), 'Content moderation settings'),

('moderation.user_reports', jsonb_build_object(
  'enabled', true,
  'require_reason', true,
  'max_reports_per_day', 10,
  'auto_suspend_threshold', 5
), 'User reporting settings'),

-- Security Settings
('security.authentication', jsonb_build_object(
  'min_password_length', 8,
  'require_special_chars', true,
  'require_numbers', true,
  'max_login_attempts', 5,
  'lockout_duration_minutes', 30
), 'Authentication security settings'),

('security.sessions', jsonb_build_object(
  'max_concurrent_sessions', 3,
  'session_timeout_hours', 24,
  'remember_me_duration_days', 30
), 'Session management settings'),

-- System Settings
('system.maintenance', jsonb_build_object(
  'enabled', false,
  'message', 'Sistema em manutenção. Voltaremos em breve!',
  'allowed_ips', ARRAY[]::text[]
), 'System maintenance settings'),

('system.analytics', jsonb_build_object(
  'enabled', true,
  'track_user_activity', true,
  'track_performance', true,
  'retention_days', 90
), 'Analytics settings');

-- Create function to track settings changes
CREATE OR REPLACE FUNCTION track_settings_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tracking changes
DROP TRIGGER IF EXISTS settings_update_trigger ON platform_settings;
CREATE TRIGGER settings_update_trigger
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION track_settings_update();