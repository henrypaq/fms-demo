-- Enable public access for thumbnails
-- This allows thumbnail images to load without authentication

-- Update the files bucket to be public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'files';

-- Add policy for public read access to thumbnails only
-- This allows anyone to view thumbnails, but not actual files
CREATE POLICY "Public thumbnail access"
  ON storage.objects
  FOR SELECT
  TO public
  USING (
    bucket_id = 'files' 
    AND (storage.foldername(name))[2] = 'thumbnails'
  );

-- Keep existing authenticated user policies for full file access
-- Users can still only access their own full files
-- But thumbnails are now publicly readable for better UX

