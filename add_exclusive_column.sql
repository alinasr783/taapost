
-- Add is_exclusive column to articles table
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS is_exclusive BOOLEAN DEFAULT FALSE;
