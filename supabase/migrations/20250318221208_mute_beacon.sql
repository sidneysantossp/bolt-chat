/*
  # Fix User Registration Policies

  1. Changes
    - Drop existing policies
    - Create new policies for registration flow
    - Allow public to create users during registration
    - Fix admin access policies
    
  2. Security
    - Maintain RLS protection
    - Allow proper user creation during registration
*/

-- Drop existing policies
DROP POLICY IF EXISTS "allow_public_read" ON users;
DROP POLICY IF EXISTS "allow_user_insert" ON users;
DROP POLICY IF EXISTS "allow_user_update" ON users;
DROP POLICY IF EXISTS "allow_user_delete" ON users;
DROP POLICY IF EXISTS "allow_admin_all" ON users;

-- Create new policies
-- Public read access for basic info
CREATE POLICY "allow_public_read"
ON users
FOR SELECT
TO public
USING (true);

-- Allow users to insert their own record during registration
CREATE POLICY "allow_registration_insert"
ON users
FOR INSERT
TO public
WITH CHECK (auth.uid() IS NULL OR auth.uid() = id);

-- Allow users to update their own data
CREATE POLICY "allow_user_update"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow users to delete their own data
CREATE POLICY "allow_user_delete"
ON users
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- Admin policy for full access
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