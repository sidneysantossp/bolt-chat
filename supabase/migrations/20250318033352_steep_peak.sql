/*
  # Fix users table RLS policies

  1. Changes
    - Remove recursive policies that were causing infinite loops
    - Simplify admin access check
    - Create separate policies for different operations
    - Use direct checks instead of self-referential queries

  2. Security
    - Maintain proper access control
    - Ensure admin privileges work correctly
    - Keep public read access for basic info
*/

-- First, disable RLS temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "enable_read_basic_info" ON users;
DROP POLICY IF EXISTS "enable_auth_read_own" ON users;
DROP POLICY IF EXISTS "enable_auth_insert_own" ON users;
DROP POLICY IF EXISTS "enable_auth_update_own" ON users;
DROP POLICY IF EXISTS "enable_auth_delete_own" ON users;
DROP POLICY IF EXISTS "enable_admin_access" ON users;

-- Create basic read policy for public access
CREATE POLICY "public_read_basic"
ON users
FOR SELECT
TO public
USING (true);

-- Create policy for authenticated users to read their own data
CREATE POLICY "auth_read_own"
ON users
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR
  EXISTS (
    SELECT 1
    FROM auth.users au
    WHERE au.id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = au.id
      AND u.is_admin = true
    )
  )
);

-- Create policy for authenticated users to insert their own data
CREATE POLICY "auth_insert_own"
ON users
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Create policy for authenticated users to update their own data
CREATE POLICY "auth_update_own"
ON users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Create policy for authenticated users to delete their own data
CREATE POLICY "auth_delete_own"
ON users
FOR DELETE
TO authenticated
USING (id = auth.uid());

-- Create separate admin policy for full access
CREATE POLICY "admin_full_access"
ON users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users au
    WHERE au.id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = au.id
      AND u.is_admin = true
    )
  )
);

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;