/*
  # Fix Users Table RLS Policies - Simplified Approach

  1. Changes
    - Drop all existing policies
    - Create simplified non-recursive policies
    - Separate admin check into a function
    
  2. Security
    - Maintain row level security
    - Allow public read access
    - Allow users to manage their own data
    - Allow admins to manage all data without recursion
*/

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM users 
    WHERE id = user_id 
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
USING (auth.uid() = id OR is_admin(auth.uid()))
WITH CHECK (auth.uid() = id OR is_admin(auth.uid()));

CREATE POLICY "allow_user_delete"
ON users
FOR DELETE
TO authenticated
USING (auth.uid() = id OR is_admin(auth.uid()));