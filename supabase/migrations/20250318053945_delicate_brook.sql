/*
  # Update User Management Schema

  1. Changes
    - Drop existing policies in correct order
    - Update admin check function
    - Add required columns
    - Create new indexes
    - Add new policies
  
  2. Security
    - Enable RLS
    - Add policies for public read
    - Add policies for user self-management
    - Add policies for admin management
*/

-- First drop policies that depend on the is_admin function
DROP POLICY IF EXISTS "allow_admin_manage_all" ON users;
DROP POLICY IF EXISTS "allow_admin_all" ON users;

-- Now we can safely drop and recreate the is_admin function
DROP FUNCTION IF EXISTS is_admin;

-- Create admin check function
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

-- Drop remaining policies
DROP POLICY IF EXISTS "allow_public_read" ON users;
DROP POLICY IF EXISTS "allow_user_insert" ON users;
DROP POLICY IF EXISTS "allow_user_update" ON users;
DROP POLICY IF EXISTS "allow_user_delete" ON users;
DROP POLICY IF EXISTS "allow_user_manage_own" ON users;

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