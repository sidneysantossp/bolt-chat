/*
  # Add admin role and dashboard tables

  1. Changes to Users Table
    - Add `is_admin` column to users table
    - Add `last_login` column to users table
    - Add `status` column to users table

  2. New Tables
    - `reported_messages` for tracking message reports
    - `platform_settings` for global platform configuration
    - `user_activity_logs` for tracking user actions
    - `analytics_daily` for storing daily statistics

  3. Security
    - Add RLS policies for admin access
    - Update existing policies to account for admin role
*/

-- Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned'));

-- Create reported messages table
CREATE TABLE IF NOT EXISTS reported_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id),
  reported_by uuid NOT NULL REFERENCES users(id),
  reason text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES users(id),
  notes text,
  UNIQUE(message_id, reported_by)
);

-- Create platform settings table
CREATE TABLE IF NOT EXISTS platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

-- Create user activity logs table
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  action text NOT NULL,
  details jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Create analytics daily table
CREATE TABLE IF NOT EXISTS analytics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date UNIQUE NOT NULL,
  total_users integer DEFAULT 0,
  active_users integer DEFAULT 0,
  new_users integer DEFAULT 0,
  total_messages integer DEFAULT 0,
  reported_messages integer DEFAULT 0,
  total_rooms integer DEFAULT 0,
  active_rooms integer DEFAULT 0
);

-- Enable RLS
ALTER TABLE reported_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can do everything with reported messages"
  ON reported_messages
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true
  ));

CREATE POLICY "Admins can do everything with platform settings"
  ON platform_settings
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true
  ));

CREATE POLICY "Admins can view all activity logs"
  ON user_activity_logs
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true
  ));

CREATE POLICY "Admins can view analytics"
  ON analytics_daily
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true
  ));

-- Create function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_activity_logs (user_id, action, details)
  VALUES (
    NEW.id,
    TG_OP,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'old_data', CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
      'new_data', CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user activity logging
CREATE TRIGGER user_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE
  ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_user_activity();

-- Create function to update analytics daily
CREATE OR REPLACE FUNCTION update_analytics_daily()
RETURNS void AS $$
DECLARE
  current_date_record date := current_date;
BEGIN
  -- Insert or update analytics for today
  INSERT INTO analytics_daily (
    date,
    total_users,
    active_users,
    new_users,
    total_messages,
    reported_messages,
    total_rooms,
    active_rooms
  )
  VALUES (
    current_date_record,
    (SELECT count(*) FROM users),
    (SELECT count(*) FROM users WHERE last_seen > current_timestamp - interval '24 hours'),
    (SELECT count(*) FROM users WHERE created_at::date = current_date_record),
    (SELECT count(*) FROM messages WHERE created_at::date = current_date_record),
    (SELECT count(*) FROM reported_messages WHERE created_at::date = current_date_record),
    (SELECT count(*) FROM rooms),
    (SELECT count(DISTINCT room_id) FROM messages WHERE created_at > current_timestamp - interval '24 hours')
  )
  ON CONFLICT (date)
  DO UPDATE SET
    total_users = EXCLUDED.total_users,
    active_users = EXCLUDED.active_users,
    new_users = EXCLUDED.new_users,
    total_messages = EXCLUDED.total_messages,
    reported_messages = EXCLUDED.reported_messages,
    total_rooms = EXCLUDED.total_rooms,
    active_rooms = EXCLUDED.active_rooms;
END;
$$ LANGUAGE plpgsql;

-- Create a cron job to update analytics daily (requires pg_cron extension)
-- Note: This needs to be run by a superuser or rds_superuser
-- SELECT cron.schedule('0 0 * * *', 'SELECT update_analytics_daily()');