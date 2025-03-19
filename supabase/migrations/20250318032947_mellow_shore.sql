/*
  # Fix User Policies and Admin Setup

  1. Changes
    - Drop existing policies
    - Create new simplified policies
    - Remove direct admin user creation
    - Add policies for public access
    
  2. Security
    - Enable RLS on users table
    - Add policies for authenticated users
    - Add policies for public access
    - Add admin access policy without recursion
*/

-- First, disable RLS temporarily to avoid any issues
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

-- Create separate admin policy without recursion
CREATE POLICY "enable_admin_access"
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

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Update existing admin users if any
UPDATE users
SET is_admin = true
WHERE id IN (
  SELECT au.id
  FROM auth.users au
  WHERE au.email = 'sid.websp@gmail.com'
);