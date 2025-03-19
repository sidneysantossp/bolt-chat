/*
  # Remove Authentication

  1. Changes
    - Drop all auth-related policies
    - Create simple public access policies
    - Remove auth checks from existing policies
    
  2. Security
    - Allow public access to all operations
    - Remove auth dependency
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

-- Create simplified public access policies
CREATE POLICY "allow_all_access"
ON users
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO public;
GRANT ALL ON ALL TABLES IN SCHEMA public TO public;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO public;