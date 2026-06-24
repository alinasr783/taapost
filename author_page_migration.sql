-- Author Page Enhancement Migration
-- Adds banner/cover image support for author pages

-- Add banner column to authors table
ALTER TABLE authors ADD COLUMN IF NOT EXISTS banner TEXT;

-- Add social_links JSONB column for author social media profiles
ALTER TABLE authors ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;

-- Add website column for author's personal website
ALTER TABLE authors ADD COLUMN IF NOT EXISTS website TEXT;

-- Add slug column for clean author URLs (Arabic-friendly)
ALTER TABLE authors ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE authors ADD CONSTRAINT authors_slug_unique UNIQUE (slug);
