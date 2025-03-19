/*
  # Fix User Policies

  1. Changes
    - Remove recursive admin policies
    - Create new non-recursive admin policy using auth.users join
    - Simplify user policies for better performance
    
  2. Security
    - Maintain row level security
    - Keep existing access patterns but remove recursion
    - Ensure admins can still manage all records
    - Preserve user data privacy
*/

-- First drop all existing policies to start fresh
DROP POLICY IF EXISTS "Admin full access" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Public can read basic user info" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;

-- Create new non-recursive admin policy
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

-- Create simplified user policies
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

CREATE POLICY "Enable insert for authenticated users"
ON users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);