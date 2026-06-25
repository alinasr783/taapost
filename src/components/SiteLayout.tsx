import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  BrainCircuit, Home, LayoutGrid, Moon, Sun, FileText,
  Menu, X, PenTool,
  BarChart3, Cpu, Languages, Landmark, FolderOpen,
  BookOpen, Heart, TrendingUp, FlaskConical, Palette, Trophy,
  type LucideIcon,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase, type Category, type LogoSetting } from '../lib/supabase'
import Footer from './Footer'
import { SiteSettingsProvider } from './SiteSettingsProvider'
import { defaultSiteSettings } from './siteSettingsModel'
import DynamicIcon from './DynamicIcon'

const categoryIconMap: Record<string, LucideIcon> = {
  'تحليلات': BarChart3,
  'تكنولوجيا': Cpu,
  'تقنية': Cpu,
  'ترجمة': Languages,
  'سياسة': Landmark,
  'تقارير': FileText,
  'اقتصاد': TrendingUp,
  'رياضة': Trophy,
  'صحة': Heart,
  'ثقافة': BookOpen,
  'فن': Palette,
  'علوم': FlaskConical,
}

function getCategoryIcon(name: string): LucideIcon {
  if (categoryIconMap[name]) return categoryIconMap[name]
  for (const [key, icon] of Object.entries(categoryIconMap)) {
    if (name.includes(key) || key.includes(name)) return icon
  }
  return FolderOpen
}

function CategoryIcon({ cat }: { cat: Category }) {
  if (cat.icon) {
    return <DynamicIcon name={cat.icon} size={20} />
  }
  const Icon = getCategoryIcon(cat.name)
  return <Icon size={20} />
}

type Props = { children: ReactNode }

function hexToHsl(hex: string) {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt("0x" + hex[1] + hex[1]);
    g = parseInt("0x" + hex[2] + hex[2]);
    b = parseInt("0x" + hex[3] + hex[3]);
  } else if (hex.length === 7) {
    r = parseInt("0x" + hex[1] + hex[2]);
    g = parseInt("0x" + hex[3] + hex[4]);
    b = parseInt("0x" + hex[5] + hex[6]);
  }
  r /= 255; g /= 255; b /= 255;
  const cmin = Math.min(r,g,b), cmax = Math.max(r,g,b), delta = cmax - cmin;
  let h = 0, s = 0, l = 0;
  if (delta === 0) h = 0;
  else if (cmax === r) h = ((g - b) / delta) % 6;
  else if (cmax === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  l = (cmax + cmin) / 2;
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);
  return `${h} ${s}% ${l}%`;
}

export default function SiteLayout({ children }: Props) {
  const [theme, setTheme] = useState(
    localStorage.getItem('theme') || 'light'
  )
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('order_index', { ascending: true })

      if (error) throw error
      return (data ?? []) as Category[]
    },
    staleTime: 5 * 60_000,
  })

  const siteSettingsQuery = useQuery({
    queryKey: ['site_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_settings').select('*').single()
      if (error) throw error
      return data as typeof defaultSiteSettings
    },
    staleTime: 5 * 60_000,
  })

  const activeLogoQuery = useQuery({
    queryKey: ['logo_settings_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logo_settings')
        .select('*')
        .eq('is_active', true)
        .maybeSingle()
      if (error && error.code !== 'PGRST116') throw error
      return (data as LogoSetting | null) ?? null
    },
    staleTime: 5 * 60_000,
  })

  const categories = categoriesQuery.data ?? []
  const siteSettings = siteSettingsQuery.data ?? defaultSiteSettings
  const activeLogo = activeLogoQuery.data

  const mergedSettings = {
    ...(siteSettingsQuery.data ?? defaultSiteSettings),
    logo_url: activeLogo?.logo_url?.trim() || siteSettings.logo_url?.trim() || null,
    active_logo: activeLogo
      ? {
          id: activeLogo.id,
          logo_url: activeLogo.logo_url,
          logo_url_dark: activeLogo.logo_url_dark,
          logo_name: activeLogo.logo_name,
          logo_width: activeLogo.logo_width,
          logo_max_width: activeLogo.logo_max_width,
          logo_height: activeLogo.logo_height,
          position_x: activeLogo.position_x,
          position_y: activeLogo.position_y,
          alignment: activeLogo.alignment,
        }
      : null,
  }

  const getActiveLogoUrl = () => {
    if (!activeLogo) return siteSettings.logo_url?.trim() || null
    if (theme === 'dark' && activeLogo.logo_url_dark?.trim()) return activeLogo.logo_url_dark.trim()
    return activeLogo.logo_url?.trim() || null
  }

  useEffect(() => {
    if (siteSettings.site_name) {
      document.title = siteSettings.site_name
    }
    if (siteSettings.primary_color) {
      const primaryHsl = hexToHsl(siteSettings.primary_color)
      document.documentElement.style.setProperty('--primary', primaryHsl)
      document.documentElement.style.setProperty('--ring', primaryHsl)
    }
  }, [siteSettings.site_name, siteSettings.primary_color])

  useEffect(() => {
    const head = document.head
    const themeMeta =
      (head.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null) ??
      (head.appendChild(document.createElement('meta')) as HTMLMetaElement)
    themeMeta.setAttribute('name', 'theme-color')
    themeMeta.setAttribute('content', siteSettings.primary_color || '#000000')

    const iconHref = getActiveLogoUrl() || '/favicon.svg'
    const icon =
      (head.querySelector('link[rel="icon"]') as HTMLLinkElement | null) ??
      (head.appendChild(document.createElement('link')) as HTMLLinkElement)
    icon.setAttribute('rel', 'icon')
    icon.setAttribute('href', iconHref)

    const apple =
      (head.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null) ??
      (head.appendChild(document.createElement('link')) as HTMLLinkElement)
    apple.setAttribute('rel', 'apple-touch-icon')
    apple.setAttribute('href', iconHref)
  }, [])

  const toggle = () => {
    const t = theme === 'dark' ? 'light' : 'dark'
    setTheme(t)
    if (t === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', t)
  }

  return (
    <SiteSettingsProvider value={mergedSettings}>
      <div className="min-h-dvh bg-background text-foreground flex flex-col">
        <header className="border-b border-border/60 bg-background/80 backdrop-blur">
          <div className="container flex items-center justify-between gap-3 py-4">
            <Link
              to="/"
              className="flex items-center gap-3 min-w-0 flex-shrink"
            >
              {(() => {
                const displayLogoUrl = getActiveLogoUrl()
                if (displayLogoUrl) {
                  return (
                    <img
                      src={displayLogoUrl}
                      alt={siteSettings.site_name}
                      style={{
                        objectFit: 'contain',
                        width: activeLogo?.logo_width === 'auto' ? 'auto' : (activeLogo?.logo_width ?? 'auto'),
                        maxWidth: activeLogo?.logo_max_width && activeLogo.logo_max_width !== 'none'
                          ? activeLogo.logo_max_width
                          : undefined,
                        height: activeLogo?.logo_height === 'auto' ? 'auto' : (activeLogo?.logo_height ?? 'auto'),
                        maxHeight: '44px',
                      }}
                      className="flex-shrink-0"
                      decoding="async"
                    />
                  )
                }
                return <BrainCircuit className="h-6 w-6 text-primary flex-shrink-0" />
              })()}
              <div className="flex flex-col min-w-0">
                <span className="text-lg font-bold leading-tight truncate">{siteSettings.site_name}</span>
                <span className="text-xs text-muted-foreground leading-tight truncate hidden sm:block">
                  {siteSettings.site_description}
                </span>
              </div>
            </Link>
            <div className="flex flex-1 items-center justify-end gap-2 min-w-[180px]">
              <form
                onSubmit={(e: FormEvent) => {
                  e.preventDefault()
                  const qp = new URLSearchParams()
                  if (q) qp.set('q', q)
                  navigate(`/posts?${qp.toString()}`)
                }}
                className="flex flex-1 items-center justify-end gap-2 max-w-[380px]"
              >
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="ابحث عن ما يهمك"
                  enterKeyHint="search"
                  className="flex-1 max-w-[180px] sm:max-w-[200px] md:max-w-[280px] rounded-[5px] border border-border bg-background/70 px-3 py-2 backdrop-blur focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  aria-label="تبديل الثيم"
                  onClick={toggle}
                  className="inline-flex items-center justify-center rounded-[5px] border border-border/70 bg-background/60 px-3 py-2 backdrop-blur hover:bg-background/80 transition"
                >
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              </form>
              <button
                type="button"
                aria-label="فتح القائمة"
                onClick={() => setMenuOpen(true)}
                className="inline-flex items-center justify-center rounded-[5px] border border-border/70 bg-background/60 px-3 py-2 backdrop-blur hover:bg-background/80 transition flex-shrink-0"
              >
                <Menu size={18} />
              </button>
            </div>
          </div>
          <div className="border-t border-border/70 bg-background/90">
            <div className="container overflow-x-auto">
              <div className="flex gap-6 py-3 text-sm font-medium text-foreground/90">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      navigate(cat.slug ? `/قسم/${encodeURIComponent(cat.slug)}` : `/category/${cat.id}`)
                    }
                    className="whitespace-nowrap rounded-[5px] px-2 py-1 hover:bg-muted/40 hover:text-primary"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Sidebar overlay */}
        <div className={`fixed inset-0 z-50 ${menuOpen ? '' : 'pointer-events-none'}`}>
          <div
            className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${menuOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setMenuOpen(false)}
          />
          <aside
            className={`absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-card border-r border-border shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
              menuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex items-center gap-3 border-b border-border p-4">
              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 min-w-0 flex-1"
              >
                {(() => {
                  const displayLogoUrl = getActiveLogoUrl()
                  if (displayLogoUrl) {
                    return (
                      <img
                        src={displayLogoUrl}
                        alt={siteSettings.site_name}
                        className="h-8 w-8 object-contain flex-shrink-0"
                      />
                    )
                  }
                  return <BrainCircuit className="h-6 w-6 text-primary flex-shrink-0" />
                })()}
                <div className="flex flex-col min-w-0">
                  <span className="text-base font-bold leading-tight truncate">{siteSettings.site_name}</span>
                  <span className="text-xs text-muted-foreground leading-tight truncate">{siteSettings.site_description}</span>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="inline-flex items-center justify-center rounded-[5px] border border-border bg-background/60 p-2 hover:bg-muted/40 transition flex-shrink-0"
                aria-label="إغلاق القائمة"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-[5px] px-3 py-2.5 transition-colors ${
                  location.pathname === '/' ? 'bg-primary/10 text-primary font-medium' : 'text-foreground/80 hover:bg-muted/50 hover:text-primary'
                }`}
              >
                <Home size={20} className={location.pathname === '/' ? 'text-primary' : ''} />
                <span className="text-sm">الرئيسية</span>
              </Link>

              <Link
                to="/posts"
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-[5px] px-3 py-2.5 transition-colors ${
                  location.pathname.includes('/posts') || location.pathname.includes('/post') || location.pathname.includes('/مقال') ? 'bg-primary/10 text-primary font-medium' : 'text-foreground/80 hover:bg-muted/50 hover:text-primary'
                }`}
              >
                <FileText size={20} />
                <span className="text-sm">اخر المقالات</span>
              </Link>

              <div className="my-2 border-t border-border/60" />

              <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground tracking-wider">
                الأقسام
              </div>

              <Link
                to="/categories"
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-[5px] px-3 py-2.5 transition-colors ${
                  location.pathname === '/categories' || location.pathname === '/الأقسام' ? 'bg-primary/10 text-primary font-medium' : 'text-foreground/80 hover:bg-muted/50 hover:text-primary'
                }`}
              >
                <LayoutGrid size={20} />
                <span className="text-sm">جميع الأقسام</span>
              </Link>

              {categories.map((cat) => {
                const catPath = cat.slug ? `/قسم/${encodeURIComponent(cat.slug)}` : `/category/${cat.id}`
                const isActive =
                  location.pathname.includes(`/category/${cat.id}`) ||
                  (cat.slug && location.pathname.includes(`/قسم/${encodeURIComponent(cat.slug)}`))
                return (
                  <Link
                    key={cat.id}
                    to={catPath}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-[5px] px-3 py-2.5 transition-colors ${
                      isActive ? 'bg-primary/10 text-primary font-medium' : 'text-foreground/80 hover:bg-muted/50 hover:text-primary'
                    }`}
                  >
                    <CategoryIcon cat={cat} />
                    <span className="text-sm">{cat.name}</span>
                  </Link>
                )
              })}

              <div className="my-2 border-t border-border/60" />

              <Link
                to="/authors"
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-[5px] px-3 py-2.5 transition-colors ${
                  location.pathname.includes('/authors') || location.pathname.includes('/author') || location.pathname.includes('/الكتاب') || location.pathname.includes('/كاتب') ? 'bg-primary/10 text-primary font-medium' : 'text-foreground/80 hover:bg-muted/50 hover:text-primary'
                }`}
              >
                <PenTool size={20} />
                <span className="text-sm">الكتاب</span>
              </Link>
            </nav>
          </aside>
        </div>
        <main className="flex-1">{children}</main>
        <Footer siteSettings={siteSettings} />
      </div>
    </SiteSettingsProvider>
  )
}
