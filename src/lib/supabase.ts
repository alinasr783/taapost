import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check .env file.')
  console.error('VITE_SUPABASE_URL:', supabaseUrl)
  // Don't log the full key for security, just presence
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing')
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Category = {
  id: number
  slug: string
  name: string
  description: string
  topics: string[]
  image: string
  order_index?: number
  display_order?: number
}

export type Article = {
  id: number
  slug: string
  title: string
  excerpt: string
  content: string
  image: string
  category_id: number
  type: string
  date: string
  categories?: Category
  author_id?: number
  authors?: Author
  is_exclusive?: boolean
  // Helper for frontend compatibility
  category?: string
  categoryId?: number
  contentHtml?: string
  created_at?: string
}

export type User = {
  id: number
  username: string
  password?: string // only for auth check, not always returned
  is_superadmin: boolean
  created_at: string
}

export type UserPermission = {
  id: number
  user_id: number
  category_id: number
  can_add: boolean
  can_edit: boolean
  can_delete: boolean
}

export type ArticleView = {
  id: number
  article_id: number
  viewed_at: string
  country: string
  city: string
  device_type?: string
}

export type SocialLink = {
  id: number
  platform: string
  url: string
  icon: string
  is_active: boolean
  sort_order: number
}

export type Author = {
  id: number
  name: string
  image: string
  bio: string
  role?: string
}

export type HomepageSection = {
  id: number
  type: 'carousel' | 'category_grid' | 'category_list' | 'custom' | 'latest_grid' | 'category_section'
  title: string
  category_id?: number
  display_order: number
  is_active: boolean
  settings?: Record<string, any>
  categories?: Category // For joined data
}
