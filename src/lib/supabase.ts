import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://vqhqczgumuganbefodqo.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxaHFjemd1bXVnYW5iZWZvZHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MTg3MTUsImV4cCI6MjA4NzM5NDcxNX0.LHHEW_0_0egk7gEIHRoB8U1vJ9FmNqjJ5lzPpNOXorU"

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
  // Helper for frontend compatibility
  category?: string
  categoryId?: number
  contentHtml?: string
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
