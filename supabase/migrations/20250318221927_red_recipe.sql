/*
  # Fix Analytics Daily Policies

  1. Changes
    - Add RLS policies for analytics_daily table
    - Allow public read access
    - Allow inserts during registration
    - Allow admins full access
    
  2. Security
    - Enable RLS
    - Maintain data privacy
    - Allow registration flow to work
*/

-- Enable RLS if not already enabled
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public can read analytics" ON analytics_daily;
DROP POLICY IF EXISTS "Admins can manage analytics" ON analytics_daily;
DROP POLICY IF EXISTS "Allow analytics updates" ON analytics_daily;

-- Allow public to read analytics
CREATE POLICY "Public can read analytics"
ON analytics_daily
FOR SELECT
TO public
USING (true);

-- Allow admins to manage analytics
CREATE POLICY "Admins can manage analytics"
ON analytics_daily
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_admin = true
  )
);

-- Allow analytics updates during registration and normal operation
CREATE POLICY "Allow analytics updates"
ON analytics_daily
FOR INSERT
TO public
WITH CHECK (true);

-- Update the analytics function to use SECURITY DEFINER
CREATE OR REPLACE FUNCTION update_analytics_on_user_insert()
RETURNS trigger AS $$
BEGIN
  INSERT INTO analytics_daily (date, new_users, total_users)
  VALUES (CURRENT_DATE, 1, (SELECT COUNT(*) FROM users))
  ON CONFLICT (date) 
  DO UPDATE SET
    new_users = analytics_daily.new_users + 1,
    total_users = (SELECT COUNT(*) FROM users);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the message analytics function to use SECURITY DEFINER
CREATE OR REPLACE FUNCTION update_analytics_on_message_insert()
RETURNS trigger AS $$
BEGIN
  INSERT INTO analytics_daily (date, total_messages)
  VALUES (CURRENT_DATE, 1)
  ON CONFLICT (date) 
  DO UPDATE SET
    total_messages = analytics_daily.total_messages + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;