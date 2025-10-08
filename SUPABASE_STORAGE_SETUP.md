# Supabase Storage Configuration for 100MB File Uploads

## Problem
Supabase Storage has default file size limits that need to be increased to allow 100MB uploads.

## Solution: Update Storage Bucket Settings

### Step 1: Go to Supabase Dashboard
1. Navigate to: https://supabase.com/dashboard
2. Select your project
3. Go to **Storage** in the left sidebar

### Step 2: Update the 'files' Bucket
1. Find the **'files'** bucket in the list
2. Click the **three dots (⋮)** menu next to it
3. Click **Edit bucket**

### Step 3: Configure File Size Limit
In the bucket settings, update:

- **File size limit**: Set to **100 MB** (or `104857600` bytes)
- **Allowed MIME types**: Leave as `*/*` (allows all file types)
- **Public bucket**: Should be **enabled** ✅

Click **Save**

---

## Alternative: SQL Configuration

If you prefer SQL, run this in the Supabase SQL Editor:

```sql
-- Update the storage bucket size limit to 100MB
UPDATE storage.buckets
SET file_size_limit = 104857600  -- 100MB in bytes
WHERE id = 'files';

-- Verify the change
SELECT id, name, file_size_limit, public
FROM storage.buckets
WHERE id = 'files';
```

Expected result:
```
id    | name  | file_size_limit | public
------|-------|----------------|--------
files | files | 104857600      | true
```

---

## Step 4: Verify Upload Works

After updating:
1. Try uploading a file between 50-100MB
2. Check console for: `📊 File size check: [size]MB (limit: 100MB) ✅`
3. Upload should complete successfully

---

## For Even Larger Files (Pro/Team Plans)

If you need files larger than 100MB:

### 1. Upgrade to Supabase Pro
- Pro plan: Up to 5GB per file (with resumable uploads)
- Team plan: Up to 50GB per file

### 2. Update Client-Side Limit
In `project/src/hooks/useOptimisticFileUpload.ts`, change:

```typescript
// Line 361 and 509
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
// or
const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB
```

### 3. Enable Resumable Uploads (for files > 100MB)
For very large files, use Supabase's resumable upload feature:

```typescript
const { data, error } = await supabase.storage
  .from('files')
  .upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
    resumable: true  // ← Enable for large files
  });
```

---

## Troubleshooting

### Still Getting "Payload too large" Error?

1. **Check your Supabase plan**:
   - Free: 1GB total storage, 50MB per file (default)
   - Pro: 100GB storage, 5GB per file
   - Check at: Settings → Billing

2. **Verify bucket settings**:
   ```sql
   SELECT * FROM storage.buckets WHERE id = 'files';
   ```

3. **Check total storage usage**:
   - Go to Dashboard → Storage → Usage
   - Ensure you haven't hit storage quota

4. **Clear browser cache** and try again

### Error: "Row Level Security policy violation"?

Run this SQL to check/update RLS policies:

```sql
-- Check current policies
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- If needed, update insert policy to allow larger files
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;

CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'files'
);
```

---

## Current Configuration

After running the updates:
- ✅ Client-side limit: **100MB** for all files
- ✅ Bucket limit: **100MB** (needs to be set in Supabase)
- ✅ File validation: Happens before upload (saves bandwidth)
- ✅ User-friendly errors: Shows exact file size and limit

---

## Quick Setup Checklist

- [ ] Go to Supabase Dashboard → Storage
- [ ] Edit 'files' bucket
- [ ] Set file size limit to 100MB
- [ ] Save changes
- [ ] Test upload with 50-100MB file
- [ ] Verify success in console: `📊 File size check: ✅`

