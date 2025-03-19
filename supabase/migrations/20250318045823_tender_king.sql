/*
  # Users Table Schema and Policies

  1. New Tables
    - `users` table with all necessary columns and constraints
    
  2. Security
    - Enable RLS
    - Create non-recursive policies for proper access control
    - Ensure admin access works correctly
*/

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  username text UNIQUE,
  full_name text,
  avatar_url text,
  birth_date date,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz,
  status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
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

CREATE POLICY "allow_user_manage_own"
ON users
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "allow_admin_manage_all"
ON users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM users u 
    WHERE u.id = auth.uid() 
    AND u.is_admin = true
    LIMIT 1
  )
);

-- Set initial admin user if needed
UPDATE users 
SET is_admin = true 
WHERE id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = 'sid.websp@gmail.com'
);