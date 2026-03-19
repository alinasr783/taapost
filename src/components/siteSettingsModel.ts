export type SiteSettings = {
  site_name: string
  site_description: string
  logo_url: string | null
  primary_color?: string
  secondary_color?: string
  show_article_summary?: boolean
}

export const defaultSiteSettings: SiteSettings = {
  site_name: 'تاء بوست',
  site_description: 'منصة إعلامية رقمية',
  logo_url: null,
  primary_color: '#8B4513',
  secondary_color: '#000000',
  show_article_summary: true,
}
