
-- 1. Fix Storage RLS (Comprehensive)
-- Create 'media' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Drop all existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Give public access to media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
DROP POLICY IF EXISTS "Public Select" ON storage.objects;
DROP POLICY IF EXISTS "Auth Insert" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;

-- Create new, simple policies
-- 1. Public Read Access (Anyone can view images)
CREATE POLICY "Public Select" ON storage.objects
FOR SELECT USING ( bucket_id = 'media' );

-- 2. Authenticated Upload (Any logged in user can upload)
CREATE POLICY "Auth Insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'media' 
  AND auth.role() = 'authenticated'
);

-- 3. Authenticated Update (Any logged in user can update their own or all? Let's say all for dashboard admins)
CREATE POLICY "Auth Update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'media' 
  AND auth.role() = 'authenticated'
);

-- 4. Authenticated Delete
CREATE POLICY "Auth Delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'media' 
  AND auth.role() = 'authenticated'
);

-- Ensure RLS is enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;


-- 2. Create Site Settings Table
CREATE TABLE IF NOT EXISTS public.site_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    site_name TEXT DEFAULT 'TaaPost',
    site_description TEXT DEFAULT 'منصة إعلامية رقمية',
    logo_url TEXT,
    primary_color TEXT DEFAULT '#8B4513', -- Brown/Earth tone
    secondary_color TEXT DEFAULT '#000000',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT single_row CHECK (id = 1)
);

-- Insert default row if not exists
INSERT INTO public.site_settings (id, site_name, site_description)
VALUES (1, 'TaaPost', 'منصة إعلامية رقمية')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on site_settings
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Policies for site_settings
DROP POLICY IF EXISTS "Public Read Settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admin Update Settings" ON public.site_settings;

CREATE POLICY "Public Read Settings" ON public.site_settings
FOR SELECT USING (true);

CREATE POLICY "Admin Update Settings" ON public.site_settings
FOR UPDATE USING (auth.role() = 'authenticated');
