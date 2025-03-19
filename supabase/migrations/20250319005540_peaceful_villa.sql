/*
  # Fix Authentication Schema and Permissions

  1. Changes
    - Drop existing policies to start fresh
    - Create proper authentication policies
    - Grant necessary permissions to auth schema
    - Fix user table constraints
    
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
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

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
GRANT SELECT ON auth.users TO authenticated;
GRANT SELECT ON auth.refresh_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION auth.role() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;