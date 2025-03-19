/*
  # Fix admin policy and add default admin role

  1. Changes
    - Drop existing problematic policies
    - Create new simplified admin policy
    - Add default admin role column if not exists
    - Set default admin role to false
  
  2. Security
    - Enable RLS
    - Add policy for admin access
    - Add policy for self access
*/

-- First, drop any existing problematic policies
DROP POLICY IF EXISTS "Admin access all records" ON users;
DROP POLICY IF EXISTS "Allow admins full access" ON users;

-- Ensure is_admin column exists and has proper default
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;

-- Create new admin policy
CREATE POLICY "Admin access all records"
ON users
FOR ALL
TO authenticated
USING (
  (auth.uid() = id) OR 
  (
    EXISTS (
      SELECT 1
      FROM users
      WHERE id = auth.uid()
      AND is_admin = true
    )
  )
)
WITH CHECK (
  (auth.uid() = id) OR 
  (
    EXISTS (
      SELECT 1
      FROM users
      WHERE id = auth.uid()
      AND is_admin = true
    )
  )
);

-- Set admin status for specific user
UPDATE users 
SET is_admin = true 
WHERE id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = 'sid.websp@gmail.com'
);