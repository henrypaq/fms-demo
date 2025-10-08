-- Add deleted_at column to folders table for soft deletes
-- This allows folders to be marked as deleted without removing them from the database

ALTER TABLE folders 
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Create index for better query performance on deleted_at
CREATE INDEX IF NOT EXISTS folders_deleted_at_idx ON folders(deleted_at) WHERE deleted_at IS NOT NULL;

-- Update the unique constraint to exclude deleted folders
-- Drop old constraint and create new one
ALTER TABLE folders 
DROP CONSTRAINT IF EXISTS folders_project_id_parent_id_name_key;

-- Create new unique constraint that excludes deleted folders
CREATE UNIQUE INDEX IF NOT EXISTS folders_project_parent_name_active_key 
ON folders(project_id, parent_id, name) 
WHERE deleted_at IS NULL;

COMMENT ON COLUMN folders.deleted_at IS 'Timestamp when the folder was soft-deleted. NULL means active.';

