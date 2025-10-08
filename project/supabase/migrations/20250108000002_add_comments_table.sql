-- Create comments table for file comments
CREATE TABLE IF NOT EXISTS file_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  user_email text NOT NULL,
  comment_text text NOT NULL,
  timestamp_seconds numeric, -- For video timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS file_comments_file_id_idx ON file_comments(file_id);
CREATE INDEX IF NOT EXISTS file_comments_created_at_idx ON file_comments(created_at);

-- Enable RLS
ALTER TABLE file_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow anyone to read comments (public)
CREATE POLICY "Anyone can view comments"
  ON file_comments
  FOR SELECT
  TO public
  USING (true);

-- Allow anyone to insert comments (for demo purposes, includes anonymous users)
CREATE POLICY "Anyone can insert comments"
  ON file_comments
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow users to update their own comments (authenticated only)
CREATE POLICY "Users can update their own comments"
  ON file_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to delete their own comments (authenticated only)
CREATE POLICY "Users can delete their own comments"
  ON file_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_file_comments_updated_at
  BEFORE UPDATE ON file_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE file_comments IS 'Comments on files, with optional video timestamps';
COMMENT ON COLUMN file_comments.timestamp_seconds IS 'Optional video timestamp in seconds for time-stamped comments';

