import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Facebook, Twitter, Instagram, Linkedin, Youtube, MessageCircle, Send, Mail, Globe, Link as LinkIcon, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'

type SocialLink = {
  id: number
  platform: string
  url: string
  icon: string
  is_active: boolean
  sort_order: number
}

const iconMap: Record<string, any> = {
  facebook: Facebook,
  twitter: Twitter,
  x: Twitter,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
  whatsapp: MessageCircle,
  telegram: Send,
  mail: Mail,
  globe: Globe,
}

type Props = {
  siteSettings?: {
    site_name: string
    site_description: string
    logo_url: string | null
  }
}

export default function Footer({ siteSettings }: Props) {
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([])

  useEffect(() => {
    async function fetchSocialLinks() {
      const { data } = await supabase
        .from('social_links')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      
      if (data) {
        setSocialLinks(data)
      }
    }
    fetchSocialLinks()
  }, [])

  return (
    <footer className="border-t-4 border-primary mt-16 bg-primary/5 backdrop-blur-sm">
      <div className="container py-10 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand & Description */}
          <div className="space-y-4 md:col-span-2">
            <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
              <span className="w-2 h-8 bg-primary rounded-full inline-block"></span>
              {siteSettings?.site_name || 'تاء بوست'}
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed max-w-sm font-medium">
              {siteSettings?.site_description || 'منصة إعلامية عربية شاملة تهتم بتقديم محتوى متميز يواكب التطورات ويحترم عقل القارئ. نسعى لنكون المصدر الأول للمعلومة الموثوقة والتحليل العميق.'}
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3 pt-4">
              {socialLinks.map((link) => {
                const iconKey = (link.icon || link.platform).toLowerCase()
                const Icon = iconMap[iconKey] || LinkIcon
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all transform hover:scale-110"
                    aria-label={link.platform}
                  >
                    <Icon size={20} />
                  </a>
                )
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-lg mb-6 text-foreground border-b-2 border-primary/20 pb-2 inline-block">روابط سريعة</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link to="/" className="hover:text-primary transition-colors hover:translate-x-1 inline-block">الرئيسية</Link>
              </li>
              <li>
                <Link to="/الأقسام" className="hover:text-primary transition-colors hover:translate-x-1 inline-block">الأقسام</Link>
              </li>
              <li>
                <Link to="/المقالات" className="hover:text-primary transition-colors hover:translate-x-1 inline-block">أحدث المقالات</Link>
              </li>
            </ul>
          </div>

          {/* Contact / Info */}
          <div>
            <h3 className="font-bold text-lg mb-6 text-foreground border-b-2 border-primary/20 pb-2 inline-block">تواصل معنا</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <span>info@taapost.com</span>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                <span>فريق التحرير</span>
              </li>
              <li className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span>سياسة الخصوصية</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary/10 mt-10 pt-8 text-center text-sm font-medium text-muted-foreground">
          <p>© {new Date().getFullYear()} تاء بوست. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  )
}
