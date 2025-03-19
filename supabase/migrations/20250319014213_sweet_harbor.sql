/*
  # Add new admin user

  1. Changes
    - Create new admin user with specified email
    - Set admin privileges
    
  2. Security
    - Properly hash password
    - Set admin flag
*/

DO $$
DECLARE
  admin_id uuid;
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
    raw_app_meta_data,
    raw_user_meta_data
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin132@test.com',
    crypt('admin123', gen_salt('bf')), -- Default password: admin123
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"is_admin":true}'
  )
  RETURNING id INTO admin_id;

  -- Create user profile with admin privileges
  INSERT INTO public.users (
    id,
    username,
    is_admin,
    status,
    created_at
  ) VALUES (
    admin_id,
    'admin132',
    true,
    'active',
    NOW()
  );

END $$;