# Test Thumbnail Generation

## Quick Test Steps

### 1. Apply Database Migration

Run the new migration to enable public thumbnail access:

```bash
# If using Supabase CLI
supabase db push

# OR manually in Supabase Dashboard
# Go to SQL Editor and run the contents of:
# supabase/migrations/20250108000000_public_thumbnails.sql
```

### 2. Upload Test Files

Use the Upload Sheet in the app to upload:
- ✅ A JPG or PNG image (should generate thumbnail)
- ✅ A short MP4 or WebM video (should generate thumbnail from frame)
- ✅ A PDF or document (will show icon, no thumbnail)

### 3. Check Browser Console

Open DevTools → Console and look for:
- ✅ **Success**: No thumbnail-related errors
- ❌ **Warning**: "Thumbnail generation failed" - check file type/size
- ❌ **Error**: 404 on thumbnail URL - check storage bucket configuration

### 4. Verify in Database

**Option A: Supabase Dashboard**
1. Go to Table Editor → `files` table
2. Find your uploaded file
3. Check `thumbnail_url` column has a full URL like:
   ```
   https://[project].supabase.co/storage/v1/object/public/files/thumbnails/[workspace-id]/thumb-[timestamp]-[id].jpg
   ```

**Option B: Browser DevTools**
1. Open Network tab
2. Upload an image
3. Look for POST to `/storage/v1/object/files/thumbnails/...`
4. Should return 200 OK
5. Then look for GET request to the thumbnail URL
6. Should return 200 OK with the image

### 5. Visual Check

After upload, the file card should show:
- ✅ **Images**: Resized thumbnail preview
- ✅ **Videos**: Captured frame from ~2 seconds
- ✅ **Other files**: Colored icon based on file type

---

## Expected Behavior

### For Images:
1. Upload starts → 0%
2. Image uploaded to storage → 40%
3. Canvas resizes to 300px max → Processing
4. Thumbnail uploaded as JPEG → 70%
5. Database record saved → 100%
6. Card shows thumbnail immediately ✨

### For Videos:
1. Upload starts → 0%
2. Video uploaded to storage → 40%
3. HTML5 video seeks to 2 seconds → Processing
4. Canvas captures frame → Processing
5. Thumbnail uploaded as JPEG → 70%
6. Database record saved → 100%
7. Card shows video frame thumbnail ✨

### For Other Files:
1. Upload starts → 0%
2. File uploaded to storage → 40%
3. Skip thumbnail generation → 70%
4. Database record saved → 100%
5. Card shows type-specific icon ✨

---

## Troubleshooting

### Thumbnails Not Showing

**Check 1: Migration Applied?**
```sql
-- Run in Supabase SQL Editor
SELECT public FROM storage.buckets WHERE id = 'files';
-- Should return: true
```

**Check 2: Storage Policy Exists?**
```sql
-- Run in Supabase SQL Editor
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname = 'Public thumbnail access';
-- Should return 1 row
```

**Check 3: Thumbnail Path Correct?**
- Open DevTools → Network tab
- Look at thumbnail URL
- Should be: `https://[project].supabase.co/storage/v1/object/public/files/thumbnails/...`
- Try accessing URL directly in browser
- Should show the thumbnail image

**Check 4: CORS Issues?**
- Check browser console for CORS errors
- If present, add CORS policy in Supabase dashboard:
  - Storage → files bucket → Configuration → CORS
  - Add allowed origin: `http://localhost:5173` (dev) and your production domain

**Check 5: File Size Too Large?**
- Large images (>10MB) may timeout during canvas processing
- Consider adding file size validation before upload
- Recommended max: 20MB for images, 100MB for videos

---

## Performance Notes

**Thumbnail Generation Speed**:
- Small image (< 1MB): ~100-200ms
- Large image (5-10MB): ~300-800ms
- Short video (< 30s): ~500-1000ms
- Long video (> 1 min): ~1-2 seconds

**Storage Impact**:
- Original image: preserved at full quality
- Thumbnail: JPEG at 0.8 quality, max 300px
- Average thumbnail size: 20-50KB
- Storage savings: ~95% vs showing full images

---

## Success Indicators ✅

When working correctly, you should see:

1. ✅ Upload progress bar completes smoothly
2. ✅ File card shows thumbnail immediately after upload
3. ✅ No console errors related to storage or thumbnails
4. ✅ Thumbnail URLs return 200 OK in Network tab
5. ✅ Database `thumbnail_url` field populated
6. ✅ Thumbnails load on page refresh
7. ✅ Thumbnails visible to all users (public access)
8. ✅ File grid loads quickly with lazy-loaded thumbnails

---

## Next Steps

If everything works:
1. ✅ Delete this test file
2. ✅ Delete `THUMBNAIL_SYSTEM_VERIFICATION.md`
3. ✅ Test with larger batch uploads (10+ files)
4. ✅ Test with different file types
5. ✅ Monitor storage usage in Supabase dashboard

If issues persist:
1. Check Supabase logs: Dashboard → Logs → Storage
2. Enable verbose logging in upload hook
3. Test with different browsers (Chrome, Firefox, Safari)
4. Check if ad blockers or extensions are interfering

