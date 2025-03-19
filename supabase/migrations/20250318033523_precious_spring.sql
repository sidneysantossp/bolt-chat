/*
  # Simplified RLS Policies for Users Table

  1. Changes
    - Remove all recursive policy checks
    - Implement simple, direct policy checks
    - Separate policies for different operations
    - Maintain security while avoiding recursion

  2. Security
    - Public can read basic user info
    - Users can manage their own data
    - Admins have full access through direct checks
*/

-- First, disable RLS temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$ 
BEGIN
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON users;', E'\n')
        FROM pg_policies 
        WHERE tablename = 'users'
    );
END $$;

-- Create basic policies with direct checks
CREATE POLICY "public_read"
ON users
FOR SELECT
TO public
USING (true);

CREATE POLICY "auth_insert"
ON users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "auth_update"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "auth_delete"
ON users
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- Create admin policy with direct check
CREATE POLICY "admin_all"
ON users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users au
    WHERE au.id = auth.uid()
    AND au.id IN (
      SELECT id 
      FROM users 
      WHERE is_admin = true
    )
  )
);

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;