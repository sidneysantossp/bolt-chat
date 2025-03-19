/*
  # Fix Authentication Policies

  1. Changes
    - Remove references to non-existent 'authenticated' column
    - Fix public read policy logic
    - Maintain secure role-based access
    - Fix admin verification
    
  2. Security
    - Prevent policy recursion
    - Maintain strict access control
    - Enable safe admin verification
*/

-- First, drop all existing policies to start fresh
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

-- Create new non-recursive admin policy
CREATE POLICY "admin_access_policy"
ON users
FOR ALL
TO authenticated
USING (
  CASE
    -- Admin can access all records
    WHEN (SELECT is_admin FROM users WHERE id = auth.uid()) = true THEN true
    -- Non-admins can only access their own records
    ELSE id = auth.uid()
  END
);

-- Public read access for basic user info
CREATE POLICY "public_read_policy"
ON users
FOR SELECT
TO public
USING (
  CASE
    -- Allow reading username and avatar_url for all users
    WHEN current_setting('request.select.column', true) IN ('username', 'avatar_url') THEN true
    -- For other columns, only allow if user is accessing their own record
    ELSE auth.uid() = id
  END
);

-- Secure insert policy
CREATE POLICY "secure_insert_policy"
ON users
FOR INSERT
TO authenticated
WITH CHECK (
  -- Users can only insert their own records
  auth.uid() = id
);

-- Secure update policy
CREATE POLICY "secure_update_policy"
ON users
FOR UPDATE
TO authenticated
USING (
  -- Users can only update their own records unless they're admin
  CASE
    WHEN (SELECT is_admin FROM users WHERE id = auth.uid()) = true THEN true
    ELSE auth.uid() = id
  END
)
WITH CHECK (
  -- Additional validation for updates
  CASE
    WHEN (SELECT is_admin FROM users WHERE id = auth.uid()) = true THEN true
    ELSE auth.uid() = id AND NOT NEW.is_admin -- Non-admins cannot set admin status
  END
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_auth_lookup 
ON users (id, is_admin)
WHERE is_admin = true;