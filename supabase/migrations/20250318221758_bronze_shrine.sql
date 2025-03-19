/*
  # Fix User Activity Logs Policies

  1. Changes
    - Add RLS policies for user_activity_logs table
    - Allow public insert during registration
    - Allow users to view their own logs
    - Allow admins full access
    
  2. Security
    - Enable RLS
    - Maintain data privacy
    - Allow registration flow to work
*/

-- Enable RLS if not already enabled
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own activity logs" ON user_activity_logs;
DROP POLICY IF EXISTS "Admins can view all activity logs" ON user_activity_logs;
DROP POLICY IF EXISTS "Allow registration logging" ON user_activity_logs;

-- Allow users to view their own activity logs
CREATE POLICY "Users can view own activity logs"
ON user_activity_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow admins to view all activity logs
CREATE POLICY "Admins can view all activity logs"
ON user_activity_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_admin = true
  )
);

-- Allow public insert during registration
CREATE POLICY "Allow registration logging"
ON user_activity_logs
FOR INSERT
TO public
WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NOT NULL) OR
  (auth.uid() = user_id)
);

-- Update trigger function to handle registration
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
$$ LANGUAGE plpgsql SECURITY DEFINER;