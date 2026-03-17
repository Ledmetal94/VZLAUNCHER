-- Restrict public read access to game-thumbnails path only
DROP POLICY IF EXISTS "Public read access on assets" ON storage.objects;
CREATE POLICY "Public read access on game thumbnails"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'assets' AND (storage.foldername(name))[1] = 'game-thumbnails');
