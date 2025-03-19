/*
  # Make user admin and set up admin policies

  1. Changes
    - Update specific user to be an admin based on auth email
    - Add RLS policy for admin access

  2. Security
    - Enable RLS policies for admin users
    - Add policy for admin access to all records
*/

-- Update the specific user to be an admin using a subquery to get the user ID
UPDATE users 
SET is_admin = true 
WHERE id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'sid.websp@gmail.com'
);

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow admins full access" ON users;

-- Create new policy for admin access
CREATE POLICY "Allow admins full access" 
ON users
FOR ALL 
TO authenticated
USING (
  (auth.uid() = id) OR 
  (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND is_admin = true
    )
  )
)
WITH CHECK (
  (auth.uid() = id) OR 
  (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND is_admin = true
    )
  )
);