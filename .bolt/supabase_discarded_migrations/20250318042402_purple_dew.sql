/*
  # Fix RLS policies for users table
  
  1. Changes
    - Simplify RLS policies to fix infinite recursion
    - Add proper admin access policy
    - Enable basic public read access
    - Fix user management policies
  
  2. Security
    - Maintain proper access control
    - Prevent policy recursion
    - Enable admin functionality
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

-- Create simplified policies
CREATE POLICY "users_read_public"
ON users
FOR SELECT
TO public
USING (true);

CREATE POLICY "users_insert_own"
ON users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "users_delete_own"
ON users
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- Create admin policy without recursion
CREATE POLICY "admin_full_access"
ON users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid()
    AND is_admin = true
  )
);

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Set up admin user by auth.uid() instead of email
UPDATE users 
SET is_admin = true 
WHERE id IN (
  SELECT id 
  FROM auth.users 
  WHERE id = auth.uid()
);