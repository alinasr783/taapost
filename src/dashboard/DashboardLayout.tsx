import { useEffect, useState } from 'react'
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, FileText, FolderTree, Users, LogOut, Settings, PenTool, LayoutTemplate, Menu, X, type LucideIcon } from 'lucide-react'
import type { User } from '../lib/supabase'

export default function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('dashboard_user')
    if (!storedUser) return null
    try {
      const parsed: unknown = JSON.parse(storedUser)
      if (typeof parsed !== 'object' || parsed === null) return null
      const u = parsed as Partial<User>
      if (typeof u.id !== 'number') return null
      if (typeof u.username !== 'string') return null
      if (typeof u.is_superadmin !== 'boolean') return null
      if (typeof u.created_at !== 'string') return null
      return u as User
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (!user) {
      navigate('/dashboard/login')
    }
  }, [user, navigate])

  const handleLogout = () => {
    localStorage.removeItem('dashboard_user')
    navigate('/dashboard/login')
  }

  if (!user) return null

  const navItems = [
    { label: 'الرئيسية', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'المقالات', icon: FileText, path: '/dashboard/articles' },
    { label: 'الأقسام', icon: FolderTree, path: '/dashboard/categories' },
    { label: 'الكتاب', icon: PenTool, path: '/dashboard/authors' },
    { label: 'تخصيص الرئيسية', icon: LayoutTemplate, path: '/dashboard/home-customization' },
    { label: 'الاعدادات', icon: Settings, path: '/dashboard/settings' },
  ]

  if (user.is_superadmin) {
    navItems.push({ label: 'المستخدمين', icon: Users, path: '/dashboard/users' })
  }

  const NavLink = ({
    item,
    isMobile = false,
    onClick,
  }: {
    item: { label: string; icon: LucideIcon; path: string }
    isMobile?: boolean
    onClick?: () => void
  }) => {
    const isActive = location.pathname === item.path
    
    if (isMobile) {
      return (
        <Link
          to={item.path}
          onClick={onClick}
          className={`flex flex-col items-center justify-center p-2 text-xs transition-colors ${
            isActive
              ? 'text-primary font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <item.icon size={24} className={isActive ? 'stroke-[2.5px]' : ''} />
          <span className="mt-1">{item.label}</span>
        </Link>
      )
    }

    return (
      <Link
        to={item.path}
        onClick={onClick}
        className={`flex items-center gap-3 rounded-md px-4 py-2 transition-colors ${
          isActive
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <item.icon size={20} />
        <span>{item.label}</span>
      </Link>
    )
  }

  return (
    <div className="flex h-dvh bg-muted/30 rtl text-right font-sans overflow-hidden" dir="rtl">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-card border-l border-border flex-col fixed h-full z-10 shadow-sm right-0 top-0">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-primary">لوحة التحكم</h2>
          <p className="text-sm text-muted-foreground mt-1">{user.username}</p>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.path} item={item} />
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-4 py-2 text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut size={20} />
            <span>تسجيل خروج</span>
          </button>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-50 border-b border-border bg-card/90 backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between px-4">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="inline-flex items-center justify-center rounded-[6px] border border-border bg-background/60 px-3 py-2 hover:bg-muted/40 transition"
            aria-label="فتح القائمة"
          >
            <Menu size={20} />
          </button>
          <div className="text-sm font-bold text-foreground">لوحة التحكم</div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center rounded-[6px] border border-border bg-background/60 px-3 py-2 text-destructive hover:bg-destructive/10 transition"
            aria-label="تسجيل الخروج"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className={`md:hidden fixed inset-0 z-50 ${mobileMenuOpen ? '' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${mobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMobileMenuOpen(false)}
        />
        <aside
          className={`absolute right-0 top-0 h-full w-72 max-w-[85vw] bg-card border-l border-border shadow-lg transition-transform ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex flex-col">
              <div className="text-base font-bold text-primary">لوحة التحكم</div>
              <div className="text-xs text-muted-foreground">{user.username}</div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex items-center justify-center rounded-[6px] border border-border bg-background/60 px-3 py-2 hover:bg-muted/40 transition"
              aria-label="إغلاق القائمة"
            >
              <X size={18} />
            </button>
          </div>
          <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100dvh-112px)]">
            {navItems.map((item) => (
              <NavLink key={item.path} item={item} onClick={() => setMobileMenuOpen(false)} />
            ))}
          </nav>
          <div className="p-4 border-t border-border">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-md px-4 py-2 text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut size={20} />
              <span>تسجيل خروج</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 pt-20 pb-8 md:p-8 md:mr-64 md:pt-8 md:pb-8 w-full">
        <Outlet />
      </main>
    </div>
  )
}
