import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { BrainCircuit, Home, LayoutGrid, Moon, Sun, FileText } from 'lucide-react'
import { supabase, type Category } from '../lib/supabase'
import Footer from './Footer'

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
  let cmin = Math.min(r,g,b), cmax = Math.max(r,g,b), delta = cmax - cmin;
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
  const [categories, setCategories] = useState<Category[]>([])
  const [siteSettings, setSiteSettings] = useState({
    site_name: 'تاء بوست',
    site_description: 'منصة إعلامية رقمية',
    logo_url: null as string | null,
    primary_color: '#8B4513',
    secondary_color: '#000000'
  })
  const location = useLocation()

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  useEffect(() => {
    async function fetchData() {
      try {
        const [categoriesRes, settingsRes] = await Promise.all([
          supabase.from('categories').select('*').order('order_index', { ascending: true }),
          supabase.from('site_settings').select('*').single()
        ])

        if (categoriesRes.data) {
          setCategories(categoriesRes.data)
        }

        if (settingsRes.data) {
          setSiteSettings(settingsRes.data)
          // Update title
          if (settingsRes.data.site_name) {
            document.title = settingsRes.data.site_name
          }
          // Apply colors
          if (settingsRes.data.primary_color) {
            const primaryHsl = hexToHsl(settingsRes.data.primary_color)
            document.documentElement.style.setProperty('--primary', primaryHsl)
            // Also update the ring color for focus states
            document.documentElement.style.setProperty('--ring', primaryHsl)
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err)
      }
    }
    fetchData()
  }, [])

  const toggle = () => {
    const t = theme === 'dark' ? 'light' : 'dark'
    setTheme(t)
    if (t === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', t)
  }

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="container flex flex-wrap items-center justify-between gap-3 py-4">
          <Link to="/" className="flex items-center gap-3">
            {siteSettings.logo_url ? (
              <img src={siteSettings.logo_url} alt={siteSettings.site_name} className="h-10 w-auto object-contain" />
            ) : (
              <BrainCircuit className="h-6 w-6 text-primary" />
            )}
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-tight">{siteSettings.site_name}</span>
              <span className="text-xs text-muted-foreground leading-tight">
                {siteSettings.site_description}
              </span>
            </div>
          </Link>
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              const qp = new URLSearchParams()
              if (q) qp.set('q', q)
              navigate(`/المقالات?${qp.toString()}`)
            }}
            className="flex flex-1 items-center justify-end gap-2 min-w-[180px] max-w-[380px]"
          >
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث عن ما يهمك"
              enterKeyHint="search"
              className="flex-1 max-w-[180px] sm:max-w-[260px] md:max-w-[340px] rounded-[5px] border border-border bg-background/70 px-3 py-2 backdrop-blur focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              aria-label="تبديل الثيم"
              onClick={toggle}
              className="inline-flex items-center justify-center rounded-[5px] border border-border/70 bg-background/60 px-3 py-2 shadow-sm backdrop-blur hover:bg-background/80 transition"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </form>
        </div>
        <div className="border-t border-border/70 bg-background/90">
          <div className="container overflow-x-auto">
            <div className="flex gap-6 py-3 text-sm font-medium text-foreground/90">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => navigate(`/قسم/${encodeURIComponent(cat.slug)}`)}
                  className="whitespace-nowrap rounded-[5px] px-2 py-1 hover:bg-muted/40 hover:text-primary"
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <nav className="sticky bottom-0 z-40 pb-3 pt-1">
        <div className="container flex justify-center">
          <div className="flex w-full max-w-xs items-center justify-between rounded-[50px] border border-border/60 bg-background/70 px-4 py-2 text-[10px] text-muted-foreground shadow-lg backdrop-blur-sm md:text-xs">
            <button
              type="button"
              onClick={() => navigate('/')}
              className={`flex flex-1 flex-col items-center gap-1 rounded-[5px] px-2 py-1 transition-colors ${location.pathname === '/' ? 'text-primary font-bold' : 'hover:bg-white/5 hover:text-primary'}`}
            >
              <Home className={`h-4 w-4 ${location.pathname === '/' ? 'fill-primary/20' : ''}`} />
              <span>رئيسية</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/الأقسام')}
              className={`flex flex-1 flex-col items-center gap-1 rounded-[5px] px-2 py-1 transition-colors ${location.pathname.includes('/الأقسام') || location.pathname.includes('/قسم') ? 'text-primary font-bold' : 'hover:bg-white/5 hover:text-primary'}`}
            >
              <LayoutGrid className={`h-4 w-4 ${location.pathname.includes('/الأقسام') || location.pathname.includes('/قسم') ? 'fill-primary/20' : ''}`} />
              <span>أقسام</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/المقالات')}
              className={`flex flex-1 flex-col items-center gap-1 rounded-[5px] px-2 py-1 transition-colors ${location.pathname.includes('/المقالات') || location.pathname.includes('/مقال') ? 'text-primary font-bold' : 'hover:bg-white/5 hover:text-primary'}`}
            >
              <FileText className={`h-4 w-4 ${location.pathname.includes('/المقالات') || location.pathname.includes('/مقال') ? 'fill-primary/20' : ''}`} />
              <span>مقالات</span>
            </button>
          </div>
        </div>
      </nav>
      <Footer siteSettings={siteSettings} />
    </div>
  )
}
