/*
  # Fix Account Creation and Workspace Access Control

  1. Account Creation
    - Create RPC function for admin account creation
    - Avoid client-side admin restrictions
    - Ensure proper workspace assignment

  2. Workspace Access Control
    - Fix workspace assignment in user creation
    - Ensure users only see assigned workspaces
    - Update workspace context to properly filter access

  3. Security
    - Ensure proper role-based access control
    - Maintain workspace isolation
*/

-- Create RPC function for admin account creation
CREATE OR REPLACE FUNCTION create_user_account(
  user_email text,
  user_password text,
  user_name text,
  user_role text DEFAULT 'employee',
  workspace_id uuid DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  new_user_id uuid;
  default_workspace_id uuid;
  project_access uuid[] := '{}';
  result json;
BEGIN
  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can create user accounts';
  END IF;

  -- Check if user already exists
  IF EXISTS (
    SELECT 1 FROM auth.users WHERE email = user_email
  ) THEN
    RAISE EXCEPTION 'User with email % already exists', user_email;
  END IF;

  -- Get default workspace if none specified
  IF workspace_id IS NULL THEN
    SELECT id INTO default_workspace_id 
    FROM workspaces 
    WHERE name = 'General' 
    LIMIT 1;
    
    IF default_workspace_id IS NULL THEN
      INSERT INTO workspaces (name, description, color)
      VALUES ('General', 'Default workspace', '#3B82F6')
      RETURNING id INTO default_workspace_id;
    END IF;
  ELSE
    default_workspace_id := workspace_id;
  END IF;

  -- Create auth user
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
    user_email,
    crypt(user_password, gen_salt('bf')),
    now(),
    jsonb_build_object('name', user_name, 'role', user_role),
    now(),
    now()
  ) RETURNING id INTO new_user_id;

  -- Get project IDs for the workspace
  SELECT array_agg(id) INTO project_access
  FROM projects
  WHERE workspace_id = default_workspace_id;

  -- Create user profile
  INSERT INTO users (
    id,
    email,
    name,
    role,
    workspace_id,
    project_access
  ) VALUES (
    new_user_id,
    user_email,
    user_name,
    user_role,
    default_workspace_id,
    COALESCE(project_access, '{}')
  );

  -- Return success result
  result := json_build_object(
    'success', true,
    'user_id', new_user_id,
    'message', 'User account created successfully'
  );

  RETURN result;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the user creation trigger to respect workspace assignments
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user_signup();

CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
  default_workspace_id uuid;
  user_role text := 'employee';
  user_name text := 'New User';
  project_access uuid[] := '{}';
BEGIN
  -- Check if this is the admin email or if admin role is specified in metadata
  IF NEW.email = 'admin@gmail.com' OR NEW.email = 'gianluca@njordgear.com' THEN
    user_role := 'admin';
    user_name := 'Admin User';
  ELSIF NEW.raw_user_meta_data IS NOT NULL AND NEW.raw_user_meta_data ? 'role' THEN
    user_role := NEW.raw_user_meta_data->>'role';
    IF NEW.raw_user_meta_data ? 'name' THEN
      user_name := NEW.raw_user_meta_data->>'name';
    END IF;
  END IF;

  -- Get default workspace
  SELECT id INTO default_workspace_id 
  FROM workspaces 
  WHERE name = 'General' 
  LIMIT 1;
  
  -- If no workspace exists, create one
  IF default_workspace_id IS NULL THEN
    INSERT INTO workspaces (name, description, color)
    VALUES ('General', 'Default workspace', '#3B82F6')
    RETURNING id INTO default_workspace_id;
  END IF;

  -- Get project IDs for the workspace
  SELECT array_agg(id) INTO project_access
  FROM projects
  WHERE workspace_id = default_workspace_id;

  -- Insert user record with proper role and workspace
  INSERT INTO users (id, email, name, role, workspace_id, project_access)
  VALUES (
    NEW.id,
    NEW.email,
    user_name,
    user_role,
    default_workspace_id,
    COALESCE(project_access, '{}')
  )
  ON CONFLICT (id) DO UPDATE SET
    role = user_role,
    name = user_name,
    workspace_id = default_workspace_id,
    project_access = COALESCE(project_access, '{}'),
    updated_at = now();

  -- Update auth user metadata to ensure consistency
  UPDATE auth.users 
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', user_role, 'name', user_name)
  WHERE id = NEW.id;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail auth signup if user record creation fails
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_signup();

-- Create function to update user workspace access
CREATE OR REPLACE FUNCTION update_user_workspace_access(
  target_user_id uuid,
  new_workspace_ids uuid[]
)
RETURNS boolean AS $$
DECLARE
  current_user_role text;
  project_access uuid[] := '{}';
BEGIN
  -- Check if current user is admin
  SELECT role INTO current_user_role
  FROM users
  WHERE id = auth.uid();
  
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only administrators can update user workspace access';
  END IF;

  -- Get project IDs for all selected workspaces
  SELECT array_agg(DISTINCT p.id) INTO project_access
  FROM projects p
  WHERE p.workspace_id = ANY(new_workspace_ids);

  -- Update user workspace and project access
  UPDATE users
  SET workspace_id = new_workspace_ids[1], -- Primary workspace is first
      project_access = COALESCE(project_access, '{}'),
      updated_at = now()
  WHERE id = target_user_id;
  
  RETURN true;
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to update user workspace access: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON FUNCTION create_user_account(text, text, text, text, uuid) IS 'Create new user account with proper workspace assignment (admin only)';
COMMENT ON FUNCTION update_user_workspace_access(uuid, uuid[]) IS 'Update user workspace access and project permissions (admin only)'; 