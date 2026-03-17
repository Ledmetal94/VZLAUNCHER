-- Create storage bucket for game assets (thumbnails)
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to assets bucket
CREATE POLICY "Public read access on assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'assets');

-- Allow authenticated uploads (service key handles this server-side)
CREATE POLICY "Service key upload on assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'assets');
