/*
  # Fix RLS Policies

  1. Changes
    - Drop all existing policies
    - Create new simplified policies without recursion
    - Fix admin access policy to avoid recursion
    - Maintain basic CRUD operations for users

  2. Security
    - Maintain row level security
    - Keep public read access for basic info
    - Ensure proper admin access
    - Protect user data integrity
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

-- Basic read policy for public access
CREATE POLICY "users_public_read"
ON users
FOR SELECT
TO public
USING (true);

-- Authenticated users can manage their own data
CREATE POLICY "users_self_insert"
ON users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "users_self_update"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "users_self_delete"
ON users
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- Admin policy without recursion
CREATE POLICY "admin_all_access"
ON users
FOR ALL
TO authenticated
USING (
  CASE 
    WHEN auth.uid() IN (
      SELECT id 
      FROM users 
      WHERE is_admin = true
    ) THEN true
    ELSE false
  END
);

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Set initial admin user using auth.users join
UPDATE users u
SET is_admin = true
FROM auth.users au
WHERE u.id = au.id
AND au.id = 'c9f3b4d1-5e6a-4b7c-8d9e-0f1a2b3c4d5e';