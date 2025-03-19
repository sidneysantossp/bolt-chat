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
    FROM auth.users au
    JOIN users u ON u.id = au.id
    WHERE au.id = auth.uid()
    AND u.is_admin = true
  )
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant auth function permissions
GRANT EXECUTE ON FUNCTION auth.role() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

-- Grant auth table permissions
GRANT SELECT ON auth.users TO authenticated;