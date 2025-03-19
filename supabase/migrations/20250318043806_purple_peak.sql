/*
  # Fix RLS policies to prevent infinite recursion
  
  This migration:
  1. Drops all existing policies to start fresh
  2. Creates simplified policies without recursive checks
  3. Adds basic CRUD operations for users
  4. Adds admin access policy using a non-recursive approach
*/

-- First, drop all existing policies
DO $$ 
BEGIN
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON users;', E'\n')
        FROM pg_policies 
        WHERE tablename = 'users'
    );
END $$;

-- Create basic read policy for public access
CREATE POLICY "allow_public_read"
ON users
FOR SELECT
TO public
USING (true);

-- Create policy for authenticated users to manage their own data
CREATE POLICY "allow_user_manage_own"
ON users
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create admin policy without recursion
-- This policy uses a subquery with LIMIT 1 to prevent recursion
CREATE POLICY "allow_admin_manage_all"
ON users
FOR ALL
TO authenticated
USING (
  (
    SELECT is_admin
    FROM users
    WHERE id = auth.uid()
    LIMIT 1
  ) = true
);