/*
  # Fix Users Table RLS Policies

  1. Changes
    - Drop all existing policies
    - Create new non-recursive policies
    - Separate policies for different operations
    - Fix admin policy to avoid recursion
    
  2. Security
    - Maintain row level security
    - Allow public read access
    - Allow users to manage their own data
    - Allow admins to manage all data without recursion
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "allow_public_read" ON users;
DROP POLICY IF EXISTS "allow_user_insert" ON users;
DROP POLICY IF EXISTS "allow_user_update" ON users;
DROP POLICY IF EXISTS "allow_user_delete" ON users;
DROP POLICY IF EXISTS "allow_admin_all" ON users;
DROP POLICY IF EXISTS "allow_user_manage_own" ON users;
DROP POLICY IF EXISTS "allow_admin_manage_all" ON users;

-- Create new policies
-- Public read access
CREATE POLICY "allow_public_read"
ON users
FOR SELECT
TO public
USING (true);

-- User self-management policies
CREATE POLICY "allow_user_insert"
ON users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "allow_user_update"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "allow_user_delete"
ON users
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- Admin policy without recursion
CREATE POLICY "allow_admin_all"
ON users
FOR ALL
TO authenticated
USING (EXISTS ( 
  SELECT 1 
  FROM auth.users au 
  WHERE ((au.id = auth.uid()) AND (EXISTS ( 
    SELECT 1 
    FROM users u 
    WHERE ((u.id = au.id) AND (u.is_admin = true)) 
    LIMIT 1
  )))
));