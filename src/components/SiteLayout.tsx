import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BrainCircuit, Home, LayoutGrid, Moon, Sun, FileText } from 'lucide-react'
import { supabase, type Category } from '../lib/supabase'

type Props = { children: ReactNode }

export default function SiteLayout({ children }: Props) {
  const [theme, setTheme] = useState(
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  )
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    async function fetchCategories() {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('order_index', { ascending: true })
        if (error) {
          console.error('Error fetching categories:', error)
        } else if (data) {
          setCategories(data)
        }
      } catch (err) {
        console.error('Unexpected error:', err)
      }
    }
    fetchCategories()
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
            <BrainCircuit className="h-6 w-6 text-primary" />
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-tight">تاء بوست</span>
              <span className="text-xs text-muted-foreground leading-tight">
                منصة إعلامية رقمية
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
              className="flex flex-1 flex-col items-center gap-1 rounded-[5px] px-2 py-1 hover:bg-white/5 hover:text-primary"
            >
              <Home className="h-4 w-4" />
              <span>رئيسية</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/الأقسام')}
              className="flex flex-1 flex-col items-center gap-1 rounded-[5px] px-2 py-1 hover:bg-white/5 hover:text-primary"
            >
              <LayoutGrid className="h-4 w-4" />
              <span>أقسام</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/المقالات')}
              className="flex flex-1 flex-col items-center gap-1 rounded-[5px] px-2 py-1 hover:bg-white/5 hover:text-primary"
            >
              <FileText className="h-4 w-4" />
              <span>مقالات</span>
            </button>
          </div>
        </div>
      </nav>
      <footer className="border-t border-border mt-10">
        <div className="container py-6 text-xs text-muted-foreground flex items-center justify-between">
          <div>© {new Date().getFullYear()} تاء بوست</div>
          <div>منصة إعلامية عربية</div>
        </div>
      </footer>
    </div>
  )
}
