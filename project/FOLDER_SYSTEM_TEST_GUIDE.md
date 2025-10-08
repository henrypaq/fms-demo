# Folder System Quick Test Guide

## 🚀 Dev Server Running
**URL:** http://localhost:5173/ (or check terminal for actual port)

---

## ✅ Quick Test Steps

### Test 1: Folder Creation (30 seconds)

1. Open http://localhost:5173/
2. Click **"Projects"** in left sidebar
3. Click any **project card** to open it
4. Look for the **folder sidebar** on the left side (should show "Folders" header)
5. Click the **"+"** button in the folder sidebar
6. **CreateFolderModal** should appear
7. Type a folder name: `Test Folder`
8. Click **"Create Folder"**
9. ✅ **PASS:** New folder appears in sidebar immediately
10. ❌ **FAIL:** If modal doesn't open, or folder doesn't appear, check console

### Test 2: Folder Navigation (15 seconds)

1. Click the folder you just created in the sidebar
2. Folder should highlight with **blue background**
3. Main content area should show **"No files or folders"** message
4. ✅ **PASS:** Folder selects and file grid updates
5. ❌ **FAIL:** If folder doesn't highlight or file grid doesn't update

### Test 3: Nested Folders (45 seconds)

1. With a folder selected (highlighted in blue)
2. Click the **"+"** button again
3. Type a subfolder name: `Subfolder 1`
4. Click **"Create Folder"**
5. New folder should appear **indented** under the parent
6. Parent folder should now have a **chevron** (▼) icon
7. Click the **chevron** to collapse
8. Subfolder should **hide**
9. Click the **chevron** again to expand
10. Subfolder should **show** again
11. ✅ **PASS:** Nested folders work with expand/collapse
12. ❌ **FAIL:** If subfolder doesn't indent or expand/collapse doesn't work

### Test 4: File Upload to Folder (30 seconds)

1. Select a folder in the sidebar (click on it)
2. Click **"Upload"** button in top-right header
3. Select a file from your computer
4. Upload the file
5. File should appear in the **main file grid**
6. Click **"Project Root"** in sidebar
7. File should **not** appear in Project Root (it's in the folder)
8. Click back to the **folder** you uploaded to
9. File should **appear** again
10. ✅ **PASS:** Files are filtered correctly by folder
11. ❌ **FAIL:** If file appears in wrong location or doesn't filter

### Test 5: Drag & Drop (Optional - 30 seconds)

1. Create or select a file in the file grid
2. **Drag** the file card
3. **Drop** it on a different folder in the sidebar
4. File should move to that folder
5. Click the target folder to verify
6. File should now be in the new folder
7. ✅ **PASS:** Drag & drop works
8. ❌ **FAIL:** If file doesn't move or errors occur

---

## 🔍 Console Debugging

If anything fails, open **Browser Console** (F12 or Cmd+Opt+I) and look for:

### Expected Log Messages (Good ✅)
```
Create folder button clicked
Project selected: [Project Name]
Back to projects from ProjectWorkspaceView
```

### Error Messages (Bad ❌)
```
Error loading folders: [error]
Error creating folder: [error]
Supabase error: [error]
Failed to create folder: [error message]
```

---

## 🗄️ Database Verification

If folders are created but not appearing:

### Check Supabase
1. Open Supabase dashboard
2. Go to **Table Editor** → `folders` table
3. Look for rows with:
   - `project_id` = [your project ID]
   - `deleted_at` = NULL
   - `path` = folder name or parent/folder

### Check Supabase Credentials
1. Open `.env.local`
2. Verify:
   ```
   VITE_SUPABASE_URL=https://[your-project].supabase.co
   VITE_SUPABASE_ANON_KEY=[your-key]
   ```
3. Restart dev server if credentials were changed

---

## 🎯 Success Criteria

✅ **ALL PASS:** System is working perfectly!  
⚠️ **SOME FAIL:** Specific feature broken, check console and network tab  
❌ **ALL FAIL:** Supabase connection or database schema issue  

---

## 📊 System Architecture (Quick Reference)

```
User clicks "+ Folder"
  ↓
CreateFolderModal opens
  ↓
User enters name → "Create Folder"
  ↓
createFolder() function
  ↓
Calculate path (parent.path/name)
  ↓
Insert into Supabase
  ↓
loadFolders() refetches all folders
  ↓
folderTree rebuilds hierarchy
  ↓
onSidebarDataChange() exports to App.tsx
  ↓
ProjectFolderSidebar receives updated data
  ↓
✅ New folder appears in sidebar
```

---

## 🚀 Quick Fixes

### Folder not appearing after creation?
- Check browser console for errors
- Check Network tab for failed Supabase requests
- Verify Supabase credentials in `.env.local`
- Check `folders` table in Supabase for the record

### Sidebar not showing?
- Verify you're inside a project (not on Projects list)
- Check if `sidebarData` is being passed (console log)
- Verify `selectedProject` is not null

### Files not filtering by folder?
- Check console for `loadFiles()` errors
- Verify `currentFolder` state updates
- Check useEffect dependency array

---

## 📝 Test Results Template

```
Test 1 - Folder Creation: [✅ PASS / ❌ FAIL]
Test 2 - Folder Navigation: [✅ PASS / ❌ FAIL]
Test 3 - Nested Folders: [✅ PASS / ❌ FAIL]
Test 4 - File Upload to Folder: [✅ PASS / ❌ FAIL]
Test 5 - Drag & Drop: [✅ PASS / ❌ FAIL]

Overall Status: [✅ OPERATIONAL / ⚠️ PARTIAL / ❌ BROKEN]

Notes:
[Any specific issues or observations]
```

---

**Ready to test?** Open http://localhost:5173/ and follow Test 1! 🎯

