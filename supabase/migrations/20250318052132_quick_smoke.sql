/*
  # Fix User Management Schema and Policies

  1. Schema Updates
    - Add missing columns to users table
    - Add proper constraints and defaults
    - Add necessary indexes

  2. Security Updates
    - Fix recursive policies
    - Add proper admin policies
    - Add user self-management policies

  3. Functions
    - Add helper functions for admin checks
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "allow_public_read" ON users;
DROP POLICY IF EXISTS "allow_user_insert" ON users;
DROP POLICY IF EXISTS "allow_user_update" ON users;
DROP POLICY IF EXISTS "allow_user_delete" ON users;
DROP POLICY IF EXISTS "allow_admin_all" ON users;

-- Drop existing admin check function
DROP FUNCTION IF EXISTS is_admin;

-- Create admin check function without recursion
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

-- Ensure all required columns exist
DO $$ 
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'status') THEN
    ALTER TABLE users ADD COLUMN status text DEFAULT 'active'::text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'birth_date') THEN
    ALTER TABLE users ADD COLUMN birth_date date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_login') THEN
    ALTER TABLE users ADD COLUMN last_login timestamptz;
  END IF;
END $$;

-- Add status constraint if it doesn't exist
DO $$ 
BEGIN
  ALTER TABLE users 
    ADD CONSTRAINT users_status_check 
    CHECK (status = ANY (ARRAY['active'::text, 'suspended'::text, 'banned'::text]));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- Create policies for user management
-- Public read access (limited fields)
CREATE POLICY "allow_public_read"
ON users
FOR SELECT
TO public
USING (true);

-- Users can manage their own profiles
CREATE POLICY "allow_user_manage_own"
ON users
FOR ALL
TO authenticated
USING (
  auth.uid() = id
)
WITH CHECK (
  auth.uid() = id
);

-- Admins can manage all users
CREATE POLICY "allow_admin_manage_all"
ON users
FOR ALL
TO authenticated
USING (
  is_admin(auth.uid())
)
WITH CHECK (
  is_admin(auth.uid())
);