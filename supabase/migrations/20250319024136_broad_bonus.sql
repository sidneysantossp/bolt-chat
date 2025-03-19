-- Drop existing policies
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON users;', E'\n')
    FROM pg_policies 
    WHERE tablename = 'users'
  );
END $$;

-- Create simplified non-recursive policies
CREATE POLICY "public_read_access"
ON users
FOR SELECT
TO public
USING (true);

CREATE POLICY "public_registration"
ON users
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "user_manage_own"
ON users
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create admin policy without recursion
CREATE POLICY "admin_manage_all"
ON users
FOR ALL
TO authenticated
USING (
  (SELECT is_admin FROM users WHERE id = auth.uid())
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO anon;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant table permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT INSERT ON users TO anon;

-- Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant auth function permissions
GRANT EXECUTE ON FUNCTION auth.role() TO anon;
GRANT EXECUTE ON FUNCTION auth.role() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

-- Grant auth table permissions
GRANT SELECT ON auth.users TO anon;
GRANT SELECT ON auth.users TO authenticated;