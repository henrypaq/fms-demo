-- Simple Demo Users Creation
-- This creates users through Supabase's built-in functions

-- Enable the auth schema if not already enabled
CREATE SCHEMA IF NOT EXISTS auth;

-- Create users using Supabase's auth functions
-- Note: This should be run in the Supabase SQL Editor

-- First, let's create a simple test user using the auth.signup function
-- This is the recommended way to create users in Supabase

-- Create admin user
SELECT auth.signup('admin@demo.com', 'DemoAdmin123!', '{"name": "Demo Admin", "role": "admin"}');

-- Create employee user  
SELECT auth.signup('employee@demo.com', 'DemoEmployee123!', '{"name": "Demo Employee", "role": "employee"}');

-- Alternative: Create users manually in auth.users table
-- (This is more complex but gives us full control)

-- Delete any existing users first
DELETE FROM users WHERE email IN ('admin@demo.com', 'employee@demo.com');
DELETE FROM auth.users WHERE email IN ('admin@demo.com', 'employee@demo.com');

-- Get workspace ID
DO $$
DECLARE
  general_workspace_id uuid;
  admin_user_id uuid;
  employee_user_id uuid;
  project_access uuid[];
BEGIN
  -- Ensure General workspace exists
  INSERT INTO workspaces (name, description, color) 
  VALUES ('General', 'Default workspace', '#3B82F6')
  ON CONFLICT DO NOTHING;
  
  SELECT id INTO general_workspace_id FROM workspaces WHERE name = 'General' LIMIT 1;
  
  -- Get project IDs
  SELECT array_agg(id) INTO project_access FROM projects WHERE workspace_id = general_workspace_id;
  
  -- Create admin user
  admin_user_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at, 
    raw_user_meta_data, created_at, updated_at
  ) VALUES (
    admin_user_id,
    'admin@demo.com',
    crypt('DemoAdmin123!', gen_salt('bf')),
    now(),
    '{"name": "Demo Admin", "role": "admin"}'::jsonb,
    now(),
    now()
  );
  
  -- Create employee user
  employee_user_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, created_at, updated_at
  ) VALUES (
    employee_user_id,
    'employee@demo.com',
    crypt('DemoEmployee123!', gen_salt('bf')),
    now(),
    '{"name": "Demo Employee", "role": "employee"}'::jsonb,
    now(),
    now()
  );
  
  -- Create user profiles
  INSERT INTO users (id, email, name, role, workspace_id, project_access) VALUES
    (admin_user_id, 'admin@demo.com', 'Demo Admin', 'admin', general_workspace_id, NULL),
    (employee_user_id, 'employee@demo.com', 'Demo Employee', 'employee', general_workspace_id, COALESCE(project_access, '{}'));
  
  RAISE NOTICE 'Users created successfully!';
END $$;





