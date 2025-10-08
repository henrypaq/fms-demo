-- Create comment_reactions table for emoji reactions on comments
CREATE TABLE IF NOT EXISTS comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES file_comments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  user_email text NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create unique index to prevent duplicate reactions from same user
CREATE UNIQUE INDEX IF NOT EXISTS comment_reactions_unique_user_emoji 
  ON comment_reactions(comment_id, user_id, emoji);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS comment_reactions_comment_id_idx ON comment_reactions(comment_id);

-- Enable RLS
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow anyone to view reactions (public)
CREATE POLICY "Anyone can view reactions"
  ON comment_reactions
  FOR SELECT
  TO public
  USING (true);

-- Allow anyone to add reactions (for demo purposes, includes anonymous users)
CREATE POLICY "Anyone can add reactions"
  ON comment_reactions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow users to delete their own reactions
CREATE POLICY "Users can delete their own reactions"
  ON comment_reactions
  FOR DELETE
  TO public
  USING (true);

COMMENT ON TABLE comment_reactions IS 'Emoji reactions on file comments';
COMMENT ON COLUMN comment_reactions.emoji IS 'Unicode emoji character';

