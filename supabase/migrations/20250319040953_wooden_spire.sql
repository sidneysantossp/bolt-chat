-- Drop existing policies
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON users;', E'\n')
    FROM pg_policies 
    WHERE tablename = 'users'
  );
END $$;

-- Create simplified public access policy
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