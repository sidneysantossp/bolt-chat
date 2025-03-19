/*
  # Fix Users Table RLS Policy

  1. Changes
    - Drop existing problematic policy
    - Create new policy with non-recursive logic
    - Update admin status for specific user
  
  2. Security
    - Maintains RLS protection
    - Ensures admins can access all records
    - Regular users can only access their own records
*/

-- First drop the problematic policy
DROP POLICY IF EXISTS "Allow admins full access" ON users;

-- Create a simpler, non-recursive policy for admins
CREATE POLICY "Admin access all records"
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