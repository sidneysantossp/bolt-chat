/*
  # Fix Admin Authentication

  1. Changes
    - Drop existing policies
    - Create new simplified policies
    - Set admin status for specific user
    - Add proper permissions
    
  2. Security
    - Enable RLS
    - Add policies for public read access
    - Add policies for user self-management
    - Add policies for admin access
*/

-- Drop existing problematic policies
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON users;', E'\n')
    FROM pg_policies 
    WHERE tablename = 'users'
  );
END $$;

-- Create new policies
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

CREATE POLICY "allow_user_manage_own"
ON users
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "allow_public_read"
ON users
FOR SELECT
TO public
USING (true);

-- Set admin status for specific user
UPDATE users u
SET is_admin = true
FROM auth.users au
WHERE u.id = au.id
AND au.email = 'sid.websp@gmail.com';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;