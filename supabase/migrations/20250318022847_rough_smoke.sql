/*
  # Fix Admin Policy and Update Admin User

  1. Changes
    - Remove problematic updated_at column reference
    - Set admin status for specific user
    - Fix recursive policies

  2. Security
    - Maintain RLS policies
    - Ensure admin access is properly configured
*/

-- First ensure we have no recursive policies
DROP POLICY IF EXISTS "Admins can access all records" ON users;
DROP POLICY IF EXISTS "Admin access all records" ON users;

-- Create a new, simplified admin policy
CREATE POLICY "Admin full access"
ON users
FOR ALL
TO authenticated
USING (
  (auth.uid() = id) OR 
  (SELECT is_admin FROM users WHERE id = auth.uid())
)
WITH CHECK (
  (auth.uid() = id) OR 
  (SELECT is_admin FROM users WHERE id = auth.uid())
);

-- Update the specific user to be an admin
UPDATE users 
SET is_admin = true
WHERE id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = 'sid.websp@gmail.com'
);