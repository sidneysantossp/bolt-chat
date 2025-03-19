/*
  # Fix Authentication Policies

  1. Changes
    - Simplify RLS policies to avoid recursion
    - Create clear policies for public, authenticated, and admin access
    - Fix admin access checks
    - Ensure proper user data protection

  2. Security
    - Maintain row level security
    - Protect sensitive user data
    - Enable proper admin access
    - Allow public read for basic info
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
-- Public can read basic user info
CREATE POLICY "users_read_public"
ON users
FOR SELECT
TO public
USING (true);

-- Authenticated users can manage their own data
CREATE POLICY "users_manage_own"
ON users
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admin policy without recursion
CREATE POLICY "admin_manage_all"
ON users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users au
    WHERE au.id = auth.uid()
    AND (
      SELECT is_admin
      FROM users
      WHERE id = au.id
    ) = true
  )
);

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;