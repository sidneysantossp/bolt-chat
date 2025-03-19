/*
  # Fix User Policies and Admin Assignment

  1. Changes
    - Drop existing policies safely
    - Remove materialized approach
    - Create new simplified policies
    - Set admin user using auth.users table
    
  2. Security
    - Maintain row level security
    - Direct policy checks without recursion
    - Ensure proper access control
*/

-- First check and drop existing policies
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin access' AND tablename = 'users') THEN
        DROP POLICY "Admin access" ON users;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin full access' AND tablename = 'users') THEN
        DROP POLICY "Admin full access" ON users;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users read own' AND tablename = 'users') THEN
        DROP POLICY "Users read own" ON users;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users select own data' AND tablename = 'users') THEN
        DROP POLICY "Users select own data" ON users;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users update own data' AND tablename = 'users') THEN
        DROP POLICY "Users update own data" ON users;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read access' AND tablename = 'users') THEN
        DROP POLICY "Public read access" ON users;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users insert own data' AND tablename = 'users') THEN
        DROP POLICY "Users insert own data" ON users;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Test user access' AND tablename = 'users') THEN
        DROP POLICY "Test user access" ON users;
    END IF;
END $$;

-- Drop materialized approach safely
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'admin_materialized_trigger') THEN
        DROP TRIGGER admin_materialized_trigger ON users;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'maintain_admin_materialized') THEN
        DROP FUNCTION maintain_admin_materialized();
    END IF;
    
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'is_admin_materialized'
    ) THEN
        ALTER TABLE users DROP COLUMN is_admin_materialized;
    END IF;
END $$;

-- Create new simplified policies
CREATE POLICY "admin_full_access"
ON users
FOR ALL
TO authenticated
USING (
  CASE 
    WHEN auth.uid() = id AND is_admin = true THEN true
    ELSE false
  END
);

CREATE POLICY "user_read_own"
ON users
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "user_update_own"
ON users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "public_read_basic"
ON users
FOR SELECT
TO public
USING (true);

CREATE POLICY "user_insert_own"
ON users
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Set admin user using auth.users table
UPDATE users u
SET is_admin = true
FROM auth.users au
WHERE u.id = au.id
AND au.email = 'sid.websp@gmail.com';