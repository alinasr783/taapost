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
}

export const defaultSiteSettings: SiteSettings = {
  site_name: 'تاء بوست',
  site_description: 'منصة إعلامية رقمية',
  logo_url: null,
  primary_color: '#8B4513',
  secondary_color: '#000000',
  show_article_summary: true,
  active_logo: null,
}
