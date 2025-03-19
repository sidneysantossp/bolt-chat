/*
  # Fix Authentication Schema and Permissions

  1. Changes
    - Drop existing policies
    - Create simplified auth policies
    - Grant necessary schema permissions
    - Fix foreign key constraints
    
  2. Security
    - Enable RLS
    - Add policies for public read
    - Add policies for user self-management
    - Add policies for admin access
*/

-- Drop existing policies
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

CREATE POLICY "allow_admin_all"
ON users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
    AND u.is_admin = true
  )
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO public;
GRANT USAGE ON SCHEMA public TO public;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO public;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO public;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO public;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Ensure proper foreign key constraint
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_id_fkey,
ADD CONSTRAINT users_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Grant additional permissions needed for auth
GRANT SELECT ON auth.users TO public;
GRANT SELECT ON auth.refresh_tokens TO public;
GRANT EXECUTE ON FUNCTION auth.role() TO public;
GRANT EXECUTE ON FUNCTION auth.uid() TO public;

-- Grant additional permissions for user management
GRANT INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;