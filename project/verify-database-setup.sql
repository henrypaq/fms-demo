-- Verify Database Setup
-- Run this to check if everything is configured correctly

-- Check if tables exist
SELECT 
  'Tables Check' as check_type,
  CASE 
    WHEN COUNT(*) = 5 THEN '✅ All tables exist'
    ELSE '❌ Missing tables: ' || (5 - COUNT(*))::text
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('workspaces', 'projects', 'folders', 'files', 'users');

-- Check if workspaces exist
SELECT 
  'Workspaces Check' as check_type,
  CASE 
    WHEN COUNT(*) >= 1 THEN '✅ Workspaces exist (' || COUNT(*)::text || ' found)'
    ELSE '❌ No workspaces found'
  END as status
FROM workspaces;

-- Check if projects exist
SELECT 
  'Projects Check' as check_type,
  CASE 
    WHEN COUNT(*) >= 1 THEN '✅ Projects exist (' || COUNT(*)::text || ' found)'
    ELSE '❌ No projects found'
  END as status
FROM projects;

-- Check if folders exist
SELECT 
  'Folders Check' as check_type,
  CASE 
    WHEN COUNT(*) >= 1 THEN '✅ Folders exist (' || COUNT(*)::text || ' found)'
    ELSE '❌ No folders found'
  END as status
FROM folders;

-- Check if demo users exist
SELECT 
  'Demo Users Check' as check_type,
  CASE 
    WHEN COUNT(*) = 2 THEN '✅ Demo users exist'
    ELSE '❌ Demo users missing: ' || (2 - COUNT(*))::text
  END as status
FROM users 
WHERE email IN ('admin@demo.com', 'employee@demo.com');

-- Show user details
SELECT 
  'User Details' as check_type,
  email,
  name,
  role,
  workspace_id
FROM users 
WHERE email IN ('admin@demo.com', 'employee@demo.com')
ORDER BY role;





