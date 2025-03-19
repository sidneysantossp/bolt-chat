/*
  # Set admin user privileges

  1. Changes
    - Update existing user to have admin privileges
    - Handle case where user doesn't exist yet
    
  2. Security
    - Maintain RLS policies
    - Ensure proper admin access
*/

DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- First try to get existing user ID
  SELECT id INTO admin_id
  FROM auth.users
  WHERE email = 'admin132@test.com';

  -- If user doesn't exist, create new auth user
  IF admin_id IS NULL THEN
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
      crypt('admin123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"is_admin":true}'
    )
    RETURNING id INTO admin_id;
  END IF;

  -- Update or insert user profile
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
  )
  ON CONFLICT (id) DO UPDATE SET
    is_admin = true,
    status = 'active',
    updated_at = NOW();

END $$;