
-- Fix Storage RLS for Custom Auth (Public/Anon access)
-- Since the application uses a custom 'users' table and not Supabase Auth,
-- we must allow 'anon' role to upload files to the 'media' bucket.

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
DROP POLICY IF EXISTS "Media Public Insert" ON storage.objects;
DROP POLICY IF EXISTS "Media Public Update" ON storage.objects;
DROP POLICY IF EXISTS "Media Public Delete" ON storage.objects;

-- 4. Create NEW Policies for Public/Anon Access

-- Policy 1: Everyone can view (SELECT) files
CREATE POLICY "Media Public Select"
ON storage.objects FOR SELECT
USING ( bucket_id = 'media' );

-- Policy 2: Everyone (Anon) can INSERT files
-- Required because the app uses custom auth, so users are technically 'anon' to Supabase
CREATE POLICY "Media Public Insert"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'media' );

-- Policy 3: Everyone (Anon) can UPDATE files
CREATE POLICY "Media Public Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'media' );

-- Policy 4: Everyone (Anon) can DELETE files
CREATE POLICY "Media Public Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'media' );

COMMIT;
