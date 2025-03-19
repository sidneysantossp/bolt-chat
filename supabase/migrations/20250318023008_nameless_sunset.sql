/*
  # Fix Users Table Schema and Policies

  1. Changes
    - Add missing required columns to users table
    - Fix recursive policies
    - Set up proper access policies
    - Update admin user

  2. Security
    - Enable RLS
    - Set up proper access policies for users and admins
*/

-- First ensure we have no recursive policies
DROP POLICY IF EXISTS "Admins can access all records" ON users;
DROP POLICY IF EXISTS "Admin access all records" ON users;
DROP POLICY IF EXISTS "Admin full access" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Public can read basic user info" ON users;

-- Ensure all required columns exist
DO $$ 
BEGIN
  -- Add username column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'username'
  ) THEN
    ALTER TABLE users ADD COLUMN username text;
  END IF;

  -- Add is_admin column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_admin boolean DEFAULT false;
  END IF;

  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'status'
  ) THEN
    ALTER TABLE users ADD COLUMN status text DEFAULT 'active';
  END IF;
END $$;

-- Create non-recursive policies
CREATE POLICY "Users can read own data"
ON users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Public can read basic user info"
ON users
FOR SELECT
TO public
USING (true);

-- Create admin policy without recursion
CREATE POLICY "Admin full access"
ON users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users au
    JOIN users u ON u.id = au.id
    WHERE au.id = auth.uid() AND u.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM auth.users au
    JOIN users u ON u.id = au.id
    WHERE au.id = auth.uid() AND u.is_admin = true
  )
);

-- Update admin user
UPDATE users 
SET 
  is_admin = true,
  status = 'active'
WHERE id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = 'sid.websp@gmail.com'
);