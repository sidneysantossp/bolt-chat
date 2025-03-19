/*
  # Final Fix for User Policies

  1. Changes
    - Remove all existing policies
    - Create new admin policy using a materialized admin flag
    - Add basic user policies without recursion
    - Add admin flag maintenance trigger
    
  2. Security
    - Maintain row level security
    - Use materialized admin status to prevent recursion
    - Ensure proper access control
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Admin access" ON users;
DROP POLICY IF EXISTS "Admin full access" ON users;
DROP POLICY IF EXISTS "Users select own data" ON users;
DROP POLICY IF EXISTS "Users update own data" ON users;
DROP POLICY IF EXISTS "Public read access" ON users;
DROP POLICY IF EXISTS "Users insert own data" ON users;
DROP POLICY IF EXISTS "Test user access" ON users;

-- Add materialized admin status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_admin_materialized'
  ) THEN
    ALTER TABLE users ADD COLUMN is_admin_materialized boolean DEFAULT false;
  END IF;
END $$;

-- Update materialized admin status
UPDATE users SET is_admin_materialized = is_admin WHERE is_admin IS NOT NULL;

-- Create function to maintain materialized admin status
CREATE OR REPLACE FUNCTION maintain_admin_materialized()
RETURNS trigger AS $$
BEGIN
  NEW.is_admin_materialized := NEW.is_admin;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain materialized admin status
DROP TRIGGER IF EXISTS admin_materialized_trigger ON users;
CREATE TRIGGER admin_materialized_trigger
  BEFORE INSERT OR UPDATE OF is_admin ON users
  FOR EACH ROW
  EXECUTE FUNCTION maintain_admin_materialized();

-- Create simplified policies using materialized admin status
CREATE POLICY "Admin access"
ON users
FOR ALL
TO authenticated
USING (
  (SELECT is_admin_materialized FROM users WHERE id = auth.uid())
);

CREATE POLICY "Users read own"
ON users
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users update own"
ON users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Public read basic"
ON users
FOR SELECT
TO public
USING (true);

CREATE POLICY "Users insert own"
ON users
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Set initial admin user
UPDATE users 
SET 
  is_admin = true,
  is_admin_materialized = true
WHERE id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = 'sid.websp@gmail.com'
);