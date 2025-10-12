-- =====================================================
-- FMS Demo Database Schema - Complete Setup
-- =====================================================
-- This script creates the complete database schema for the File Management System
-- Run this in your new Supabase project's SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. CORE TABLES
-- =====================================================

-- Helper function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Workspaces table (top-level organizational containers)
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Projects table (sub-organizations within workspaces)
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text DEFAULT '#3B82F6',
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, name)
);

-- Folders table (hierarchical folder structure within projects)
CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES folders(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  path text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, parent_id, name)
);

-- Files table (core file records with metadata)
CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  original_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_category text NOT NULL DEFAULT 'other' CHECK (file_category IN ('document', 'image', 'video', 'audio', 'archive', 'other')),
  file_size bigint NOT NULL DEFAULT 0,
  file_url text, -- For n8n automation integration
  thumbnail_url text,
  tags text[] DEFAULT '{}',
  is_favorite boolean DEFAULT false,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  folder_id uuid REFERENCES folders(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  deleted_at timestamptz, -- Soft delete
  deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  original_project_id uuid REFERENCES projects(id) ON DELETE SET NULL, -- For restoration
  original_folder_id uuid REFERENCES folders(id) ON DELETE SET NULL, -- For restoration
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Users table (user profiles with role-based access)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  name text,
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  project_access uuid[], -- Array of project IDs for employee permissions
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 2. INDEXES FOR PERFORMANCE
-- =====================================================

-- Workspaces indexes
CREATE INDEX IF NOT EXISTS workspaces_name_idx ON workspaces(name);

-- Projects indexes
CREATE INDEX IF NOT EXISTS projects_workspace_id_idx ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS projects_workspace_name_idx ON projects(workspace_id, name);

-- Folders indexes
CREATE INDEX IF NOT EXISTS folders_project_id_idx ON folders(project_id);
CREATE INDEX IF NOT EXISTS folders_parent_id_idx ON folders(parent_id);
CREATE INDEX IF NOT EXISTS folders_path_idx ON folders(path);
CREATE INDEX IF NOT EXISTS folders_project_parent_idx ON folders(project_id, parent_id);

-- Files indexes
CREATE INDEX IF NOT EXISTS files_workspace_id_idx ON files(workspace_id);
CREATE INDEX IF NOT EXISTS files_project_id_idx ON files(project_id);
CREATE INDEX IF NOT EXISTS files_folder_id_idx ON files(folder_id);
CREATE INDEX IF NOT EXISTS files_user_id_idx ON files(user_id);
CREATE INDEX IF NOT EXISTS files_created_at_idx ON files(created_at DESC);
CREATE INDEX IF NOT EXISTS files_file_category_idx ON files(file_category);
CREATE INDEX IF NOT EXISTS files_is_favorite_idx ON files(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS files_deleted_at_idx ON files(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS files_tags_gin_idx ON files USING GIN(tags);
CREATE INDEX IF NOT EXISTS files_workspace_created_at_idx ON files(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS files_workspace_category_idx ON files(workspace_id, file_category);
CREATE INDEX IF NOT EXISTS files_workspace_favorite_idx ON files(workspace_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS files_project_folder_idx ON files(project_id, folder_id);

-- Users indexes
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_workspace_id_idx ON users(workspace_id);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
CREATE INDEX IF NOT EXISTS users_workspace_role_idx ON users(workspace_id, role);
CREATE INDEX IF NOT EXISTS users_project_access_gin_idx ON users USING gin(project_access) WHERE project_access IS NOT NULL;

-- =====================================================
-- 3. TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update triggers for updated_at columns
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_folders_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. FOLDER PATH MANAGEMENT
-- =====================================================

-- Function to update folder paths when parent changes
CREATE OR REPLACE FUNCTION update_folder_path()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the path for the current folder
  IF NEW.parent_id IS NULL THEN
    NEW.path = NEW.name;
  ELSE
    SELECT path || '/' || NEW.name INTO NEW.path
    FROM folders
    WHERE id = NEW.parent_id;
  END IF;
  
  -- Update paths for all child folders recursively
  WITH RECURSIVE folder_tree AS (
    SELECT id, name, parent_id, path
    FROM folders
    WHERE parent_id = NEW.id
    
    UNION ALL
    
    SELECT f.id, f.name, f.parent_id, ft.path || '/' || f.name
    FROM folders f
    JOIN folder_tree ft ON f.parent_id = ft.id
  )
  UPDATE folders
  SET path = folder_tree.path
  FROM folder_tree
  WHERE folders.id = folder_tree.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for path updates
CREATE TRIGGER update_folder_path_trigger
  BEFORE INSERT OR UPDATE OF parent_id, name ON folders
  FOR EACH ROW
  EXECUTE FUNCTION update_folder_path();

-- =====================================================
-- 5. USER MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to handle new user signup
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

-- Trigger for automatic user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_signup();

-- Function to check if user has project access
CREATE OR REPLACE FUNCTION user_has_project_access(user_id uuid, project_id uuid)
RETURNS boolean AS $$
DECLARE
  user_role text;
  user_project_access uuid[];
BEGIN
  -- Get user role and project access
  SELECT role, project_access INTO user_role, user_project_access
  FROM users
  WHERE id = user_id;
  
  -- Admins have access to all projects
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Employees only have access to assigned projects
  IF user_role = 'employee' AND user_project_access IS NOT NULL THEN
    RETURN project_id = ANY(user_project_access);
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create user account (admin only)
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

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Workspaces policies (public access for demo)
CREATE POLICY "Allow public workspace access"
  ON workspaces
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Projects policies (public access for demo)
CREATE POLICY "Allow public project access"
  ON projects
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Folders policies (public access for demo)
CREATE POLICY "Allow public folder access"
  ON folders
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Files policies (public access for demo)
CREATE POLICY "Allow public file access"
  ON files
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Users policies (authenticated access)
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read workspace users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'admin' 
      AND admin_user.workspace_id = users.workspace_id
    )
  );

CREATE POLICY "Admins can manage workspace users"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'admin' 
      AND admin_user.workspace_id = users.workspace_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'admin' 
      AND admin_user.workspace_id = workspace_id
    )
  );

-- =====================================================
-- 7. STORAGE SETUP
-- =====================================================

-- Create storage bucket for files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('files', 'files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (public access for demo)
CREATE POLICY "Allow public file uploads"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'files');

CREATE POLICY "Allow public file access"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'files');

CREATE POLICY "Allow public file updates"
  ON storage.objects
  FOR UPDATE
  TO public
  USING (bucket_id = 'files')
  WITH CHECK (bucket_id = 'files');

CREATE POLICY "Allow public file deletion"
  ON storage.objects
  FOR DELETE
  TO public
  USING (bucket_id = 'files');

-- =====================================================
-- 8. SAMPLE DATA FOR DEMO
-- =====================================================

-- Insert sample workspaces
INSERT INTO workspaces (name, description, color) VALUES
  ('Marketing', 'Marketing materials and campaigns', '#10B981'),
  ('Finance', 'Financial documents and reports', '#F59E0B'),
  ('Design', 'Design assets and creative files', '#8B5CF6'),
  ('General', 'General files and documents', '#3B82F6')
ON CONFLICT DO NOTHING;

-- Insert sample projects for each workspace
DO $$
DECLARE
  workspace_rec RECORD;
BEGIN
  FOR workspace_rec IN SELECT id, name FROM workspaces LOOP
    INSERT INTO projects (name, description, color, workspace_id) VALUES
      ('Design Projects', 'UI/UX designs and creative assets', '#8B5CF6', workspace_rec.id),
      ('Documents', 'Important documents and files', '#10B981', workspace_rec.id),
      ('Media Assets', 'Images, videos, and multimedia', '#F59E0B', workspace_rec.id),
      ('Development', 'Code and development resources', '#EF4444', workspace_rec.id)
    ON CONFLICT (workspace_id, name) DO NOTHING;
  END LOOP;
END $$;

-- Insert sample folders for each project
DO $$
DECLARE
  project_rec RECORD;
BEGIN
  FOR project_rec IN SELECT id, name FROM projects LOOP
    CASE project_rec.name
      WHEN 'Design Projects' THEN
        INSERT INTO folders (name, project_id, path) VALUES
          ('Mockups', project_rec.id, 'Mockups'),
          ('Icons', project_rec.id, 'Icons'),
          ('Branding', project_rec.id, 'Branding')
        ON CONFLICT DO NOTHING;
        
      WHEN 'Documents' THEN
        INSERT INTO folders (name, project_id, path) VALUES
          ('Contracts', project_rec.id, 'Contracts'),
          ('Reports', project_rec.id, 'Reports'),
          ('Presentations', project_rec.id, 'Presentations')
        ON CONFLICT DO NOTHING;
        
      WHEN 'Media Assets' THEN
        INSERT INTO folders (name, project_id, path) VALUES
          ('Photos', project_rec.id, 'Photos'),
          ('Videos', project_rec.id, 'Videos'),
          ('Audio', project_rec.id, 'Audio')
        ON CONFLICT DO NOTHING;
        
      WHEN 'Development' THEN
        INSERT INTO folders (name, project_id, path) VALUES
          ('Source Code', project_rec.id, 'Source Code'),
          ('Documentation', project_rec.id, 'Documentation'),
          ('Assets', project_rec.id, 'Assets')
        ON CONFLICT DO NOTHING;
    END CASE;
  END LOOP;
END $$;

-- =====================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE workspaces IS 'Top-level organizational containers for grouping projects and files';
COMMENT ON TABLE projects IS 'Sub-organizations within workspaces for better file organization';
COMMENT ON TABLE folders IS 'Hierarchical folder structure within projects for detailed organization';
COMMENT ON TABLE files IS 'Core file records with metadata, relationships, and soft delete support';
COMMENT ON TABLE users IS 'User profiles with role-based access control and project permissions';

COMMENT ON COLUMN files.file_category IS 'Categorizes files: document, image, video, audio, archive, other';
COMMENT ON COLUMN files.deleted_at IS 'Soft delete timestamp - NULL means file is active';
COMMENT ON COLUMN files.original_project_id IS 'Stores original project for restoration after soft delete';
COMMENT ON COLUMN users.project_access IS 'Array of project IDs that employee users have access to';
COMMENT ON COLUMN users.role IS 'User role: admin (full access) or employee (limited access)';

COMMENT ON FUNCTION user_has_project_access(uuid, uuid) IS 'Check if user has access to a specific project';
COMMENT ON FUNCTION create_user_account(text, text, text, text, uuid) IS 'Create new user account with proper workspace assignment (admin only)';
COMMENT ON FUNCTION handle_new_user_signup() IS 'Automatically create user profile when auth user is created';

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Display summary
DO $$
BEGIN
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'FMS Demo Database Schema Setup Complete!';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'Tables created: workspaces, projects, folders, files, users';
  RAISE NOTICE 'Sample data inserted: 4 workspaces, 16 projects, 48 folders';
  RAISE NOTICE 'RLS policies enabled for security';
  RAISE NOTICE 'Storage bucket "files" created';
  RAISE NOTICE 'Triggers and functions installed';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update your .env.local with Supabase credentials';
  RAISE NOTICE '2. Create admin user: admin@gmail.com or gianluca@njordgear.com';
  RAISE NOTICE '3. Add sample files through the application';
  RAISE NOTICE '=====================================================';
END $$;







