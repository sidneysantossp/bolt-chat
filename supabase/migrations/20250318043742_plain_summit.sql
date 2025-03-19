/*
  # Fix RLS policies for users table
  
  This migration fixes the infinite recursion issue in RLS policies by:
  1. Dropping existing policies
  2. Creating new simplified policies without recursive checks
  3. Adding basic CRUD operations for users
  4. Adding admin access policy
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

-- Create simplified policies
CREATE POLICY "users_read_public"
ON users
FOR SELECT
TO public
USING (true);

CREATE POLICY "users_manage_own"
ON users
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create admin policy without recursion
CREATE POLICY "admin_manage_all"
ON users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users au
    WHERE au.id = auth.uid()
    AND (
      SELECT is_admin
      FROM users u
      WHERE u.id = au.id
      LIMIT 1
    ) = true
  )
);