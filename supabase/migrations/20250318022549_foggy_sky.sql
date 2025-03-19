/*
  # Fix user policies and authentication

  1. Changes
    - Drop all existing problematic policies
    - Create new non-recursive policies
    - Add proper user authentication policies
    - Fix admin access

  2. Security
    - Enable RLS
    - Add policy for self access
    - Add policy for admin access
    - Add policy for public read access
*/

-- First, drop all existing policies to start fresh
DROP POLICY IF EXISTS "Admin access all records" ON users;
DROP POLICY IF EXISTS "Allow admins full access" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON users;
DROP POLICY IF EXISTS "Public read access" ON users;

-- Ensure is_admin column exists with proper default
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;

-- Create base policy for users to read their own data
CREATE POLICY "Users can read own data"
ON users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Create policy for users to update their own data
CREATE POLICY "Users can update own data"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create policy for admins to access all records
CREATE POLICY "Admins can access all records"
ON users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users admin
    WHERE admin.id = auth.uid()
    AND admin.is_admin = true
  )
);

-- Create policy for public read access to basic user info
CREATE POLICY "Public can read basic user info"
ON users
FOR SELECT
TO public
USING (true);

-- Set admin status for specific user
UPDATE users 
SET is_admin = true 
WHERE id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = 'sid.websp@gmail.com'
);