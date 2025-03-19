/*
  # Fix Login Authentication Issues

  1. Changes
    - Drop existing policies
    - Create new simplified policies for authentication
    - Add proper permissions for public and authenticated roles
    - Fix foreign key constraint
    
  2. Security
    - Enable RLS
    - Add policies for public access
    - Add policies for user management
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
CREATE POLICY "public_read_access"
ON users
FOR SELECT
TO public
USING (true);

CREATE POLICY "public_registration"
ON users
FOR INSERT
TO public
WITH CHECK (
  auth.uid() IS NULL OR auth.uid() = id
);

CREATE POLICY "user_manage_own"
ON users
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "admin_manage_all"
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

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Ensure proper foreign key constraint
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_id_fkey,
ADD CONSTRAINT users_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO public;
GRANT USAGE ON SCHEMA public TO public;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO public;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO public;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO public;

-- Grant additional permissions needed for auth
GRANT SELECT ON auth.users TO public;
GRANT SELECT ON auth.refresh_tokens TO public;
GRANT EXECUTE ON FUNCTION auth.role() TO public;
GRANT EXECUTE ON FUNCTION auth.uid() TO public;

-- Grant additional permissions for user management
GRANT INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant insert permission to public for registration
GRANT INSERT ON users TO public;