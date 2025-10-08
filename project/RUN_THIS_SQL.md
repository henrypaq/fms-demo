# 🔧 **URGENT: Run This SQL in Supabase**

## ❌ **Problem Found**
The `folders` table is missing the `deleted_at` column that the code expects!

This is why you're getting the 400 error:
```
Failed to load resource: the server responded with a status of 400
```

## ✅ **Solution**
Run this SQL in your Supabase SQL Editor:

```sql
-- Add deleted_at column to folders table
ALTER TABLE folders 
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS folders_deleted_at_idx 
ON folders(deleted_at) 
WHERE deleted_at IS NOT NULL;

-- Update unique constraint to exclude deleted folders
ALTER TABLE folders 
DROP CONSTRAINT IF EXISTS folders_project_id_parent_id_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS folders_project_parent_name_active_key 
ON folders(project_id, parent_id, name) 
WHERE deleted_at IS NULL;
```

## 📋 **How to Run**

1. Go to https://supabase.com/dashboard
2. Open your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"**
5. Paste the SQL above
6. Click **"Run"** (or press Cmd+Enter)
7. You should see "Success. No rows returned"

## ✅ **Verify**

After running, go to **Table Editor** → **folders** table and confirm:
- New column `deleted_at` appears (should be NULL for all rows)
- You can now create folders and they'll appear in the UI

## 🚀 **Then Test**

1. Refresh your app (http://localhost:5173/)
2. Open any project
3. Try creating a folder
4. **Folders should now display!**

---

**File also saved to:** `supabase/migrations/20250108000001_add_folders_deleted_at.sql`

This SQL will be included in future deployments automatically.
