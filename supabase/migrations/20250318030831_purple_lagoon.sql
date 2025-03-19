/*
  # Fix Authentication Policies

  1. Changes
    - Simplify authentication policies
    - Fix public access for login
    - Ensure proper user creation on signup
    
  2. Security
    - Maintain secure access control
    - Allow proper public access for auth
*/

-- Drop existing policies
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admin_full_access' AND tablename = 'users') THEN
        DROP POLICY "admin_full_access" ON users;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_read_own' AND tablename = 'users') THEN
        DROP POLICY "user_read_own" ON users;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_update_own' AND tablename = 'users') THEN
        DROP POLICY "user_update_own" ON users;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_read_basic' AND tablename = 'users') THEN
        DROP POLICY "public_read_basic" ON users;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_insert_own' AND tablename = 'users') THEN
        DROP POLICY "user_insert_own" ON users;
    END IF;
END $$;

-- Create simplified policies
CREATE POLICY "enable_read_access"
ON users
FOR SELECT
TO public
USING (true);

CREATE POLICY "enable_insert_for_auth"
ON users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "enable_update_for_own_auth"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "enable_delete_for_own_auth"
ON users
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- Create admin policy
CREATE POLICY "enable_all_access_for_admin"
ON users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND is_admin = true
  )
);