/*
  # Fix Admin Authentication

  1. Changes
    - Drop existing policies
    - Create new simplified policies
    - Fix admin access checks
    - Grant necessary permissions
    
  2. Security
    - Enable RLS
    - Add policies for admin access
*/

-- Drop existing policies
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON users;', E'\n')
    FROM pg_policies 
    WHERE tablename = 'users'
  );
END $$;

-- Create simplified policies
CREATE POLICY "allow_public_read"
ON users
FOR SELECT
TO public
USING (true);

CREATE POLICY "allow_user_manage_own"
ON users
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "allow_admin_all"
ON users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
    AND u.is_admin = true
  )
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;