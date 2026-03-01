
-- 1. Create social_links table
CREATE TABLE IF NOT EXISTS public.social_links (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  platform text NOT NULL,
  url text NOT NULL,
  icon text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create authors table
CREATE TABLE IF NOT EXISTS public.authors (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  image text,
  bio text,
  role text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Add author_id to articles table
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS author_id bigint REFERENCES public.authors(id) ON DELETE SET NULL;

-- 4. Create homepage_sections table
CREATE TABLE IF NOT EXISTS public.homepage_sections (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type text NOT NULL, -- 'carousel', 'category_grid', 'category_list', 'custom', 'latest_grid'
  title text,
  category_id bigint REFERENCES public.categories(id) ON DELETE SET NULL,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies
-- Helper function to avoid error if policy exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'social_links' AND policyname = 'Allow public read access on social_links'
    ) THEN
        CREATE POLICY "Allow public read access on social_links" ON public.social_links FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'social_links' AND policyname = 'Allow all access on social_links for admins'
    ) THEN
        CREATE POLICY "Allow all access on social_links for admins" ON public.social_links FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'authors' AND policyname = 'Allow public read access on authors'
    ) THEN
        CREATE POLICY "Allow public read access on authors" ON public.authors FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'authors' AND policyname = 'Allow all access on authors for admins'
    ) THEN
        CREATE POLICY "Allow all access on authors for admins" ON public.authors FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'homepage_sections' AND policyname = 'Allow public read access on homepage_sections'
    ) THEN
        CREATE POLICY "Allow public read access on homepage_sections" ON public.homepage_sections FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'homepage_sections' AND policyname = 'Allow all access on homepage_sections for admins'
    ) THEN
        CREATE POLICY "Allow all access on homepage_sections for admins" ON public.homepage_sections FOR ALL USING (true) WITH CHECK (true);
    END IF;
END
$$;

-- 7. Insert Initial Data (Optional - remove if tables are already populated)
INSERT INTO public.social_links (platform, url, icon, sort_order)
SELECT 'Facebook', 'https://facebook.com', 'Facebook', 1
WHERE NOT EXISTS (SELECT 1 FROM public.social_links WHERE platform = 'Facebook');

INSERT INTO public.social_links (platform, url, icon, sort_order)
SELECT 'Twitter', 'https://twitter.com', 'Twitter', 2
WHERE NOT EXISTS (SELECT 1 FROM public.social_links WHERE platform = 'Twitter');

INSERT INTO public.homepage_sections (type, title, display_order, settings)
SELECT 'carousel', 'أحدث الأخبار', 1, '{"count": 5}'
WHERE NOT EXISTS (SELECT 1 FROM public.homepage_sections WHERE type = 'carousel');

INSERT INTO public.homepage_sections (type, title, display_order, settings)
SELECT 'latest_grid', 'آخر المقالات', 2, '{"count": 6}'
WHERE NOT EXISTS (SELECT 1 FROM public.homepage_sections WHERE type = 'latest_grid');
