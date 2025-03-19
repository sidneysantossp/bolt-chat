/*
  # Fix Login Page and Analytics

  1. Changes
    - Simplify RLS policies
    - Add default analytics data
    - Fix analytics table structure
    
  2. Security
    - Maintain secure access control
    - Enable proper public access for login
*/

-- Drop existing policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "enable_read_access" ON users;
    DROP POLICY IF EXISTS "enable_insert_for_auth" ON users;
    DROP POLICY IF EXISTS "enable_update_for_own_auth" ON users;
    DROP POLICY IF EXISTS "enable_delete_for_own_auth" ON users;
    DROP POLICY IF EXISTS "enable_all_access_for_admin" ON users;
END $$;

-- Create simplified policies
CREATE POLICY "enable_read_access"
ON users
FOR SELECT
TO public
USING (true);

CREATE POLICY "enable_insert_for_auth"
ON users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "enable_update_for_own_auth"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "enable_delete_for_own_auth"
ON users
FOR DELETE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "enable_all_access_for_admin"
ON users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Ensure analytics_daily table exists with proper structure
CREATE TABLE IF NOT EXISTS analytics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  total_users integer DEFAULT 0,
  active_users integer DEFAULT 0,
  new_users integer DEFAULT 0,
  total_messages integer DEFAULT 0,
  reported_messages integer DEFAULT 0,
  total_rooms integer DEFAULT 0,
  active_rooms integer DEFAULT 0,
  CONSTRAINT analytics_daily_date_key UNIQUE (date)
);

-- Enable RLS on analytics_daily
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;

-- Create analytics policies
CREATE POLICY "enable_analytics_read"
ON analytics_daily
FOR SELECT
TO public
USING (true);

CREATE POLICY "enable_analytics_write"
ON analytics_daily
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Insert initial analytics data if none exists
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
  CURRENT_DATE,
  0, -- total_users
  0, -- active_users
  0, -- new_users
  0, -- total_messages
  0, -- reported_messages
  5, -- total_rooms (default rooms)
  3  -- active_rooms (default active rooms)
)
ON CONFLICT (date) 
DO NOTHING;