/*
  # Fix Authentication Login Issues

  1. Changes
    - Drop existing policies
    - Create new simplified policies for authentication
    - Grant necessary permissions to public role
    - Add policy for public registration
    
  2. Security
    - Enable RLS
    - Add policies for public access
    - Add policies for user management
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
-- Allow public read access
CREATE POLICY "allow_public_read"
ON users
FOR SELECT
TO public
USING (true);

-- Allow public registration
CREATE POLICY "allow_public_registration"
ON users
FOR INSERT
TO public
WITH CHECK (
  -- Allow registration when auth.uid() is NULL (new registration)
  -- or when the user is inserting their own record
  auth.uid() IS NULL OR auth.uid() = id
);

-- Allow authenticated users to manage their own data
CREATE POLICY "allow_user_manage_own"
ON users
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow admins to manage all users
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

-- Grant necessary permissions to public role
GRANT USAGE ON SCHEMA auth TO public;
GRANT USAGE ON SCHEMA public TO public;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO public;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO public;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO public;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Ensure proper foreign key constraint
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_id_fkey,
ADD CONSTRAINT users_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Grant additional permissions needed for auth
GRANT SELECT ON auth.users TO public;
GRANT SELECT ON auth.refresh_tokens TO public;
GRANT EXECUTE ON FUNCTION auth.role() TO public;
GRANT EXECUTE ON FUNCTION auth.uid() TO public;

-- Grant additional permissions for user management
GRANT INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant insert permission to public for registration
GRANT INSERT ON users TO public;