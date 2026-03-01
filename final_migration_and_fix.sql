-- 1. Create 'media' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Reset and Create RLS Policies for Media Bucket (Fixes Upload Error)
-- First, drop existing policies to ensure clean slate
DROP POLICY IF EXISTS "Give public access to media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

-- Create new simple policies
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'media');

CREATE POLICY "Authenticated Upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'media' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated Update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'media' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated Delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'media' 
  AND auth.role() = 'authenticated'
);

-- 3. Create Site Settings Table
CREATE TABLE IF NOT EXISTS public.site_settings (
  id BIGINT PRIMARY KEY DEFAULT 1,
  site_name TEXT,
  site_description TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#8B4513',
  secondary_color TEXT DEFAULT '#000000',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Insert default settings
INSERT INTO public.site_settings (id, site_name, site_description)
VALUES (1, 'TaaPost', 'منصة إخبارية عربية')
ON CONFLICT (id) DO NOTHING;

-- RLS for site_settings
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Settings" ON public.site_settings;
CREATE POLICY "Public Read Settings" ON public.site_settings
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin Update Settings" ON public.site_settings;
CREATE POLICY "Admin Update Settings" ON public.site_settings
FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin Insert Settings" ON public.site_settings;
CREATE POLICY "Admin Insert Settings" ON public.site_settings
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4. Ensure homepage_sections has settings column
ALTER TABLE public.homepage_sections 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
