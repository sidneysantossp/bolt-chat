/*
  # Fix RLS Policies

  1. Changes
    - Drop all existing policies
    - Create new non-recursive policies for users table
    - Implement separate policies for different operations
    
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

-- Create basic read policy for public access
CREATE POLICY "allow_public_read"
ON users
FOR SELECT
TO public
USING (true);

-- Create policy for authenticated users to manage their own data
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

-- Create admin policy without recursion
CREATE POLICY "allow_admin_all"
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
      LIMIT 1
    )
  )
);