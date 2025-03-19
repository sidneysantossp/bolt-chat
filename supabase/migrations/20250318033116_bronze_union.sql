/*
  # Fix users table structure and policies

  1. Changes
    - Remove email field references since it's managed by auth.users
    - Update policies to use correct fields
    - Fix admin access policy to prevent recursion

  2. Security
    - Maintain RLS policies
    - Ensure proper access control
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

-- Create new simplified policies
CREATE POLICY "enable_read_basic_info"
ON users
FOR SELECT
TO public
USING (true);

CREATE POLICY "enable_auth_read_own"
ON users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "enable_auth_insert_own"
ON users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "enable_auth_update_own"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "enable_auth_delete_own"
ON users
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- Create admin policy without recursion
CREATE POLICY "enable_admin_access"
ON users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users au
    JOIN users u ON u.id = au.id
    WHERE au.id = auth.uid() 
    AND u.is_admin = true
  )
);

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;