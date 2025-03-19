/*
  # Create Test Admin User

  1. Changes
    - Create test admin user in auth.users
    - Create corresponding user profile in users table
    - Set admin privileges
    
  2. Security
    - Password is hashed by Supabase Auth
    - Admin status is properly set
*/

-- Create test admin user in auth.users
DO $$
DECLARE
  test_admin_id uuid;
BEGIN
  -- Insert into auth.users
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
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmed_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@test.com',
    crypt('admin123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    '',
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"is_admin":true}',
    FALSE,
    NOW()
  )
  RETURNING id INTO test_admin_id;

  -- Insert into public.users
  INSERT INTO public.users (
    id,
    username,
    is_admin,
    status,
    created_at
  ) VALUES (
    test_admin_id,
    'test_admin',
    true,
    'active',
    NOW()
  );

END $$;