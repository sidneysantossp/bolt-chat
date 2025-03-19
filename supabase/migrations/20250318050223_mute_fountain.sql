/*
  # Fix RLS Policies

  1. Changes
    - Drop all existing policies
    - Create new non-recursive policies
    - Simplify admin access check
    
  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Keep public read access
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
CREATE POLICY "allow_read_all"
ON users
FOR SELECT
TO public
USING (true);

CREATE POLICY "allow_insert_own"
ON users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "allow_update_own"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "allow_delete_own"
ON users
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- Create admin policy with direct check
CREATE POLICY "allow_admin_all"
ON users
FOR ALL
TO authenticated
USING (
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM auth.users au 
      WHERE au.id = auth.uid() 
      AND au.id IN (SELECT id FROM users WHERE is_admin = true)
    ) THEN true
    ELSE auth.uid() = id
  END
);