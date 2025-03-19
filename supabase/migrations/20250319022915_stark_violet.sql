/*
  # Fix Authentication and User Management
  
  1. Changes
    - Drop existing policies to start fresh
    - Create simplified policies for public access and user management
    - Grant proper permissions to anon and authenticated roles
    - Fix foreign key constraint
    
  2. Security
    - Enable RLS
    - Allow public registration
    - Allow users to manage their own data
    - Allow admins to manage all users
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
WITH CHECK (true);

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

-- Create test user for verification
DO $$
DECLARE
  test_user_id uuid;
BEGIN
  -- Create auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'test@example.com',
    crypt('test123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}'
  )
  RETURNING id INTO test_user_id;

  -- Create user profile
  INSERT INTO public.users (
    id,
    username,
    is_admin,
    status,
    created_at
  ) VALUES (
    test_user_id,
    'test_user',
    false,
    'active',
    NOW()
  );
END $$;