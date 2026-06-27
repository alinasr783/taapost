export type ActiveLogo = {
  id: number
  logo_url: string
  logo_url_dark: string | null
  logo_name: string
  logo_width: string
  logo_max_width: string
  logo_height: string
  position_x: number
  position_y: number
  alignment: string
}

export type SiteSettings = {
  site_name: string
  site_description: string
  logo_url: string | null
  primary_color?: string
  secondary_color?: string
  show_article_summary?: boolean
  active_logo?: ActiveLogo | null
  meta_title?: string | null
  meta_description?: string | null
  og_title?: string | null
  og_description?: string | null
  og_image?: string | null
  twitter_handle?: string | null
  keywords?: string | null
}

export const defaultSiteSettings: SiteSettings = {
  site_name: 'تاء بوست',
  site_description: 'منصة إعلامية رقمية',
  logo_url: null,
  primary_color: '#8B4513',
  secondary_color: '#000000',
  show_article_summary: true,
  active_logo: null,
  meta_title: null,
  meta_description: null,
  og_title: null,
  og_description: null,
  og_image: null,
  twitter_handle: null,
  keywords: null,
}
