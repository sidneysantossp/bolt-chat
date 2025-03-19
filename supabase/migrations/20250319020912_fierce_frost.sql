/*
  # Create Test User

  1. Changes
    - Create a regular (non-admin) test user
    - Set up user profile with basic information
    
  2. Security
    - Password is hashed
    - User has normal privileges (not admin)
*/

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
    'user@test.com',
    crypt('user123', gen_salt('bf')), -- Password: user123
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