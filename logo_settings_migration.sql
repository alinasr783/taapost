-- Logo Settings Table Migration
-- Enables full logo management with size, position, drag-drop positioning, and light/dark mode support

CREATE TABLE IF NOT EXISTS logo_settings (
  id SERIAL PRIMARY KEY,
  logo_url TEXT NOT NULL,
  logo_url_dark TEXT,
  logo_name TEXT DEFAULT 'اللوجو الرئيسي',
  is_active BOOLEAN DEFAULT false,
  logo_width TEXT DEFAULT '100%',
  logo_max_width TEXT DEFAULT 'none',
  logo_height TEXT DEFAULT 'auto',
  position_x NUMERIC DEFAULT 50,        -- percentage from left (0-100)
  position_y NUMERIC DEFAULT 50,        -- percentage from top (0-100)
  alignment TEXT DEFAULT 'center',      -- 'left', 'center', 'right'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add logo_url_dark to existing table if it already exists
DO $$ BEGIN
  ALTER TABLE logo_settings ADD COLUMN IF NOT EXISTS logo_url_dark TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE logo_settings ENABLE ROW LEVEL SECURITY;

-- Allow all operations (custom auth)
DROP POLICY IF EXISTS "Allow all on logo_settings" ON logo_settings;
CREATE POLICY "Allow all on logo_settings" ON logo_settings
  FOR ALL USING (true)
  WITH CHECK (true);
