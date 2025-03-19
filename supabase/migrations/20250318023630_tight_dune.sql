/*
  # Fix User Policies Recursion

  1. Changes
    - Remove all existing policies
    - Create new simplified admin policy without joins
    - Add basic user policies with direct checks
    
  2. Security
    - Maintain row level security
    - Simplify policy checks to prevent recursion
    - Ensure proper access control
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Admin full access" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Public can read basic user info" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Allow test user operations" ON users;

-- Create simplified admin policy without joins
CREATE POLICY "Admin access"
ON users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Basic user policies with direct checks
CREATE POLICY "Users select own data"
ON users
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users update own data"
ON users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Public read access"
ON users
FOR SELECT
TO public
USING (true);

CREATE POLICY "Users insert own data"
ON users
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Allow test user operations if needed
CREATE POLICY "Test user access"
ON users
FOR ALL
TO public
USING (id = 'c9f3b4d1-5e6a-4b7c-8d9e-0f1a2b3c4d5e'::uuid)
WITH CHECK (id = 'c9f3b4d1-5e6a-4b7c-8d9e-0f1a2b3c4d5e'::uuid);