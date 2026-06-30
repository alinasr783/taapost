import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check .env file.')
  console.error('VITE_SUPABASE_URL:', supabaseUrl)
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

export type Category = {
  id: number
  slug?: string
  name: string
  description: string
  topics: string[]
  image: string
  icon?: string
  order_index?: number
  display_order?: number
  sidebar_order?: number
}

export type ContentType = 'article' | 'other'

export type Article = {
  id: number
  slug?: string
  title: string
  excerpt: string
  content: string
  image: string
  category_id: number
  type: ContentType
  date: string
  categories?: Category
  author_id?: number
  authors?: Author
  is_exclusive?: boolean
  content_source?: string
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
  banner?: string
  social_links?: Record<string, string>
  website?: string
  slug?: string
}

export type SectionSettings = {
  count?: number
  source_type?: 'latest' | 'category' | 'categories'
  source_ids?: number[]
  content_type?: ContentType | 'all'
}

export type HomepageSection = {
  id: number
  type: 'carousel' | 'category_grid' | 'category_list' | 'custom' | 'latest_grid' | 'category_section'
  title: string
  category_id?: number
  display_order: number
  is_active: boolean
  settings?: SectionSettings
  categories?: Category // For joined data
}

export type LogoSetting = {
  id: number
  logo_url: string
  logo_url_dark: string | null
  logo_name: string
  is_active: boolean
  logo_width: string
  logo_max_width: string
  logo_height: string
  position_x: number
  position_y: number
  alignment: string
  created_at: string
  updated_at: string
}

export type ShareMessage = {
  id: number
  platform: string
  message_template: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type SiteSettingsSeo = {
  meta_title: string | null
  meta_description: string | null
  og_title: string | null
  og_description: string | null
  og_image: string | null
  twitter_handle: string | null
  keywords: string | null
}
