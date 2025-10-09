-- ============================================
-- Supabase Storage Configuration for 10GB Uploads
-- ============================================

-- Update the storage bucket size limit to 10GB (10,737,418,240 bytes)
UPDATE storage.buckets
SET file_size_limit = 10737418240
WHERE id = 'files';

-- Verify the change
SELECT 
  id, 
  name, 
  file_size_limit,
  file_size_limit / 1024 / 1024 / 1024 as size_limit_gb,
  public
FROM storage.buckets
WHERE id = 'files';

-- Expected result:
-- id    | name  | file_size_limit | size_limit_gb | public
-- ------|-------|-----------------|---------------|--------
-- files | files | 10737418240     | 10.0          | true

-- ============================================
-- IMPORTANT NOTES:
-- ============================================
-- 
-- 1. Free Tier Limitations:
--    - Supabase Free tier has 1GB total storage limit
--    - You'll need Pro plan ($25/month) for 100GB storage
--    - Or higher tiers for more storage
--
-- 2. File Size Limits by Plan:
--    - Free: 50MB per file (default)
--    - Pro: 5GB per file (can be increased)
--    - Team/Enterprise: Custom limits
--
-- 3. For 10GB Files:
--    - Requires Pro plan or higher
--    - May need to contact Supabase support for custom limits
--    - Consider chunked/resumable uploads for files > 1GB
--
-- 4. Performance Considerations:
--    - Large file uploads take time
--    - Browser may timeout on slow connections
--    - Consider implementing resumable uploads
--
-- 5. N8N Integration:
--    - Files > 100MB won't be sent to n8n for auto-tagging
--    - Platform will upload them without tags
--    - User will see notification about this
--
-- ============================================

