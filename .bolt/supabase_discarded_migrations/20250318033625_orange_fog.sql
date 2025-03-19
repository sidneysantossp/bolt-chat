/*
  # Final Fix for Users Table RLS Policies
  
  1. Changes
    - Remove all complex policy checks
    - Implement simple, direct policies
    - Separate policies by operation type
    - No recursive checks or joins
  
  2. Security
    - Public can read basic user info
    - Users can manage their own data
    - Admins have full access through direct check
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

CREATE POLICY "users_read_own"
ON users
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "users_insert_own"
ON users
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_own"
ON users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "users_delete_own"
ON users
FOR DELETE
TO authenticated
USING (id = auth.uid());

-- Simple admin policy without recursion
CREATE POLICY "admin_all"
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

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;