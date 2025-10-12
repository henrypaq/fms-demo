-- Create Demo Users - Fixed Version
-- This script creates users properly in Supabase

-- First, clean up any existing users
DELETE FROM users WHERE email IN ('admin@demo.com', 'employee@demo.com');
DELETE FROM auth.users WHERE email IN ('admin@demo.com', 'employee@demo.com');

-- Ensure General workspace exists
INSERT INTO workspaces (name, description, color) 
VALUES ('General', 'Default workspace', '#3B82F6')
ON CONFLICT DO NOTHING;

-- Create users using the proper method
DO $$
DECLARE
  general_workspace_id uuid;
  admin_user_id uuid;
  employee_user_id uuid;
  project_access uuid[];
BEGIN
  -- Get General workspace ID
  SELECT id INTO general_workspace_id FROM workspaces WHERE name = 'General' LIMIT 1;
  
  -- Get project IDs for the workspace
  SELECT array_agg(id) INTO project_access FROM projects WHERE workspace_id = general_workspace_id;
  
  -- Create admin user in auth.users
  admin_user_id := gen_random_uuid();
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at
  ) VALUES (
    admin_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@demo.com',
    crypt('DemoAdmin123!', gen_salt('bf')),
    now(),
    now(),
    '',
    now(),
    '',
    null,
    '',
    '',
    null,
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Demo Admin", "role": "admin"}',
    false,
    now(),
    now(),
    null,
    null,
    '',
    '',
    null,
    '',
    0,
    null,
    '',
    null
  );
  
  -- Create employee user in auth.users
  employee_user_id := gen_random_uuid();
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at
  ) VALUES (
    employee_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'employee@demo.com',
    crypt('DemoEmployee123!', gen_salt('bf')),
    now(),
    now(),
    '',
    now(),
    '',
    null,
    '',
    '',
    null,
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Demo Employee", "role": "employee"}',
    false,
    now(),
    now(),
    null,
    null,
    '',
    '',
    null,
    '',
    0,
    null,
    '',
    null
  );
  
  -- Create user profiles in users table
  INSERT INTO users (id, email, name, role, workspace_id, project_access) VALUES
    (admin_user_id, 'admin@demo.com', 'Demo Admin', 'admin', general_workspace_id, NULL),
    (employee_user_id, 'employee@demo.com', 'Demo Employee', 'employee', general_workspace_id, COALESCE(project_access, '{}'));
  
  RAISE NOTICE 'Demo users created successfully!';
  RAISE NOTICE 'Admin: admin@demo.com / DemoAdmin123!';
  RAISE NOTICE 'Employee: employee@demo.com / DemoEmployee123!';
  
END $$;

-- Verify the users were created
SELECT 'Verification - auth.users:' as info;
SELECT id, email, email_confirmed_at, created_at FROM auth.users WHERE email IN ('admin@demo.com', 'employee@demo.com');

SELECT 'Verification - users table:' as info;
SELECT id, email, name, role, workspace_id FROM users WHERE email IN ('admin@demo.com', 'employee@demo.com');







