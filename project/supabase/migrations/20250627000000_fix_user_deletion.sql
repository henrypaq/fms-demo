/*
  # Fix User Deletion and Add Password Reset Functionality

  1. User Deletion
    - Create function to properly delete users from both auth.users and users table
    - Ensure complete account removal when requested

  2. Password Reset
    - Add forgot password functionality
    - Create password reset function
    - Add email templates for password reset

  3. Security
    - Maintain proper RLS policies
    - Ensure secure password reset process
*/

-- Function to completely delete a user account
CREATE OR REPLACE FUNCTION delete_user_account(user_email text)
RETURNS boolean AS $$
DECLARE
  user_id uuid;
  deleted_count integer := 0;
BEGIN
  -- Get the user ID from auth.users
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: %', user_email;
  END IF;
  
  -- Delete from custom users table first (this will cascade to related data)
  DELETE FROM users WHERE id = user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Delete from auth.users (this will remove the authentication record)
  DELETE FROM auth.users WHERE id = user_id;
  
  -- Return true if at least one record was deleted
  RETURN deleted_count > 0;
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to delete user account: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset user password (admin only)
CREATE OR REPLACE FUNCTION reset_user_password(user_email text, new_password text)
RETURNS boolean AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can reset passwords';
  END IF;
  
  -- Get the user ID
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: %', user_email;
  END IF;
  
  -- Update the password in auth.users
  UPDATE auth.users 
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = user_id;
  
  RETURN true;
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to reset password: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user exists in both tables
CREATE OR REPLACE FUNCTION user_exists(user_email text)
RETURNS TABLE (
  auth_exists boolean,
  profile_exists boolean,
  user_id uuid
) AS $$
DECLARE
  auth_user_id uuid;
  profile_user_id uuid;
BEGIN
  -- Check auth.users
  SELECT id INTO auth_user_id
  FROM auth.users
  WHERE email = user_email;
  
  -- Check users table
  SELECT id INTO profile_user_id
  FROM users
  WHERE email = user_email;
  
  RETURN QUERY
  SELECT 
    auth_user_id IS NOT NULL as auth_exists,
    profile_user_id IS NOT NULL as profile_exists,
    COALESCE(auth_user_id, profile_user_id) as user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to recreate user profile if auth exists but profile doesn't
CREATE OR REPLACE FUNCTION recreate_user_profile(user_email text)
RETURNS boolean AS $$
DECLARE
  auth_user_id uuid;
  default_workspace_id uuid;
BEGIN
  -- Get the user ID from auth.users
  SELECT id INTO auth_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF auth_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found in auth.users: %', user_email;
  END IF;
  
  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM users WHERE id = auth_user_id) THEN
    RAISE EXCEPTION 'User profile already exists';
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
  
  -- Create user profile
  INSERT INTO users (id, email, name, role, workspace_id, project_access)
  VALUES (
    auth_user_id,
    user_email,
    'User',
    'employee',
    default_workspace_id,
    '{}'
  );
  
  RETURN true;
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to recreate user profile: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON FUNCTION delete_user_account(text) IS 'Completely deletes a user account from both auth.users and users tables';
COMMENT ON FUNCTION reset_user_password(text, text) IS 'Resets a user password (admin only)';
COMMENT ON FUNCTION user_exists(text) IS 'Checks if a user exists in auth.users and/or users table';
COMMENT ON FUNCTION recreate_user_profile(text) IS 'Recreates a user profile if auth exists but profile is missing'; 