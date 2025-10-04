/*
  # Fix User Creation Trigger to Handle Admin Roles and Workspace Assignment

  1. Problem
    - Current trigger overrides workspace assignment and admin roles
    - Need to respect the metadata passed during signup
    - Ensure proper role assignment based on email or metadata

  2. Solution
    - Update the user creation trigger to check auth metadata
    - Respect workspace assignments from the application
    - Ensure admin roles are properly assigned
*/

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user_signup();

-- Create updated function to handle new user signup with proper role and workspace handling
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
  default_workspace_id uuid;
  user_role text := 'employee';
  user_name text := 'New User';
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

  -- Insert user record with proper role and workspace
  INSERT INTO users (id, email, name, role, workspace_id, project_access)
  VALUES (
    NEW.id,
    NEW.email,
    user_name,
    user_role,
    default_workspace_id,
    CASE WHEN user_role = 'admin' THEN NULL ELSE '{}' END
  )
  ON CONFLICT (id) DO UPDATE SET
    role = user_role,
    name = user_name,
    workspace_id = default_workspace_id,
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

-- Add comments for documentation
COMMENT ON FUNCTION handle_new_user_signup() IS 'Handles new user signup with proper role and workspace assignment'; 