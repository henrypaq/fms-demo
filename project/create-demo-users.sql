-- Create Demo Users for FMS
-- Run this in your Supabase SQL Editor

-- First, let's make sure we have the General workspace
INSERT INTO workspaces (name, description, color) 
VALUES ('General', 'Default workspace', '#3B82F6')
ON CONFLICT DO NOTHING;

-- Get the General workspace ID
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
  SELECT array_agg(id) INTO project_access
  FROM projects
  WHERE workspace_id = general_workspace_id;
  
  -- Create admin user in auth.users
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    'admin@demo.com',
    crypt('DemoAdmin123!', gen_salt('bf')),
    now(),
    jsonb_build_object('name', 'Demo Admin', 'role', 'admin'),
    now(),
    now()
  ) RETURNING id INTO admin_user_id;
  
  -- Create employee user in auth.users
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    'employee@demo.com',
    crypt('DemoEmployee123!', gen_salt('bf')),
    now(),
    jsonb_build_object('name', 'Demo Employee', 'role', 'employee'),
    now(),
    now()
  ) RETURNING id INTO employee_user_id;
  
  -- Create admin user profile
  INSERT INTO users (id, email, name, role, workspace_id, project_access)
  VALUES (
    admin_user_id,
    'admin@demo.com',
    'Demo Admin',
    'admin',
    general_workspace_id,
    NULL -- Admins have access to all projects
  );
  
  -- Create employee user profile
  INSERT INTO users (id, email, name, role, workspace_id, project_access)
  VALUES (
    employee_user_id,
    'employee@demo.com',
    'Demo Employee',
    'employee',
    general_workspace_id,
    COALESCE(project_access, '{}')
  );
  
  RAISE NOTICE 'Demo users created successfully!';
  RAISE NOTICE 'Admin: admin@demo.com / DemoAdmin123!';
  RAISE NOTICE 'Employee: employee@demo.com / DemoEmployee123!';
  
END $$;





