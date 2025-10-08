-- Add parent_comment_id column to file_comments table for nested replies
ALTER TABLE file_comments
ADD COLUMN IF NOT EXISTS parent_comment_id uuid REFERENCES file_comments(id) ON DELETE CASCADE;

-- Create index for faster queries on parent comments
CREATE INDEX IF NOT EXISTS file_comments_parent_id_idx ON file_comments(parent_comment_id);

COMMENT ON COLUMN file_comments.parent_comment_id IS 'Optional reference to parent comment for threaded replies';

