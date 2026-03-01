
-- Fix Storage RLS completely for 'media' bucket
BEGIN;

-- 1. Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Enable RLS on objects (standard procedure)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Drop ALL existing policies for this bucket to avoid conflicts
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
DROP POLICY IF EXISTS "Media Public Select" ON storage.objects;
DROP POLICY IF EXISTS "Media Auth Insert" ON storage.objects;
DROP POLICY IF EXISTS "Media Auth Update" ON storage.objects;
DROP POLICY IF EXISTS "Media Auth Delete" ON storage.objects;
DROP POLICY IF EXISTS "Give me access" ON storage.objects;

-- 4. Create NEW, CLEAR policies
-- Policy 1: Everyone can view (SELECT) files in 'media' bucket
CREATE POLICY "Media Public Select"
ON storage.objects FOR SELECT
USING ( bucket_id = 'media' );

-- Policy 2: Authenticated users can INSERT into 'media' bucket
-- We use 'auth.role() = 'authenticated'' which is the standard check
CREATE POLICY "Media Auth Insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'media' 
  AND auth.role() = 'authenticated'
);

-- Policy 3: Authenticated users can UPDATE their own files (or any file in media if we want to be permissive)
-- For a CMS, usually admins edit any file. Let's allow authenticated users to update any file in media.
CREATE POLICY "Media Auth Update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'media' 
  AND auth.role() = 'authenticated'
);

-- Policy 4: Authenticated users can DELETE files
CREATE POLICY "Media Auth Delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'media' 
  AND auth.role() = 'authenticated'
);

COMMIT;
