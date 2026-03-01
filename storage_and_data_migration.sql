
-- 1. Create 'media' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up storage policies for 'media' bucket
-- Allow public read access
CREATE POLICY "Give public access to media" ON storage.objects FOR SELECT USING (bucket_id = 'media');

-- Allow authenticated uploads
CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

-- Allow authenticated updates
CREATE POLICY "Allow authenticated updates" ON storage.objects FOR UPDATE USING (bucket_id = 'media' AND auth.role() = 'authenticated');

-- Allow authenticated deletes
CREATE POLICY "Allow authenticated deletes" ON storage.objects FOR DELETE USING (bucket_id = 'media' AND auth.role() = 'authenticated');

-- 3. Migrate existing categories to homepage_sections
-- This ensures all current categories appear in the customization page
INSERT INTO public.homepage_sections (type, title, category_id, display_order, settings)
SELECT 
  'category_grid', 
  name, 
  id, 
  (row_number() over (order by id)) + 2, -- Start after carousel (1) and latest (2)
  '{"count": 4}'::jsonb
FROM public.categories
WHERE id NOT IN (SELECT category_id FROM public.homepage_sections WHERE category_id IS NOT NULL);

-- Ensure default sections exist
INSERT INTO public.homepage_sections (type, title, display_order, settings)
SELECT 'carousel', 'أحدث الأخبار', 1, '{"count": 5}'
WHERE NOT EXISTS (SELECT 1 FROM public.homepage_sections WHERE type = 'carousel');

INSERT INTO public.homepage_sections (type, title, display_order, settings)
SELECT 'latest_grid', 'آخر المقالات', 2, '{"count": 6}'
WHERE NOT EXISTS (SELECT 1 FROM public.homepage_sections WHERE type = 'latest_grid');
