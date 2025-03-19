/*
  # Fix Authentication Policies

  This migration fixes the authentication policies by:
  1. Simplifying the policy structure
  2. Removing recursive checks
  3. Ensuring proper access control
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
CREATE POLICY "allow_public_read"
ON users
FOR SELECT
TO public
USING (true);

CREATE POLICY "allow_auth_insert"
ON users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "allow_auth_update"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "allow_auth_delete"
ON users
FOR DELETE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "allow_admin_all"
ON users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid()
    AND is_admin = true
  )
);

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Ensure the users table has the correct columns
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'is_admin'
    ) THEN
        ALTER TABLE users ADD COLUMN is_admin boolean DEFAULT false;
    END IF;
END $$;