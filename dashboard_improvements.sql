-- Dashboard Improvements Migration
-- Run this SQL in Supabase SQL Editor

-- 1. Add sidebar_order column to categories table for sidebar ordering
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS sidebar_order integer DEFAULT 0;

-- 2. Initialize sidebar_order values from existing order_index
UPDATE public.categories 
SET sidebar_order = COALESCE(order_index, 0);
