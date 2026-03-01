
-- 1. Create 'media' bucket if it doesn't exist (re-run to be safe)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies to avoid conflicts or incorrect configurations
DROP POLICY IF EXISTS "Give public access to media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

-- 3. Create permissive policies for 'media' bucket
-- Allow public read access (anyone can view images)
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'media');

-- Allow uploads for authenticated users (dashboard users)
CREATE POLICY "Authenticated Upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'media' 
  AND auth.role() = 'authenticated'
);

-- Allow updates for authenticated users
CREATE POLICY "Authenticated Update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'media' 
  AND auth.role() = 'authenticated'
);

-- Allow deletes for authenticated users
CREATE POLICY "Authenticated Delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'media' 
  AND auth.role() = 'authenticated'
);

-- 4. Ensure RLS is enabled on storage.objects (usually is by default, but good to check)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
