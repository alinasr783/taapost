import { useEffect, useState } from 'react'
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, FileText, FolderTree, Users, LogOut } from 'lucide-react'
import type { User } from '../lib/supabase'

export default function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('dashboard_user')
    if (!storedUser) {
      navigate('/dashboard/login')
      return
    }
    setUser(JSON.parse(storedUser))
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('dashboard_user')
    navigate('/dashboard/login')
  }

  if (!user) return null

  const navItems = [
    { label: 'الرئيسية', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'المقالات', icon: FileText, path: '/dashboard/articles' },
    { label: 'الأقسام', icon: FolderTree, path: '/dashboard/categories' },
  ]

  if (user.is_superadmin) {
    navItems.push({ label: 'المستخدمين', icon: Users, path: '/dashboard/users' })
  }

  const NavLink = ({ item, isMobile = false }: { item: { label: string; icon: any; path: string }; isMobile?: boolean }) => {
    const isActive = location.pathname === item.path
    
    if (isMobile) {
      return (
        <Link
          to={item.path}
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
    <div className="flex min-h-screen bg-muted/30 rtl text-right font-sans" dir="rtl">
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

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-8 md:mr-64 md:pb-8 w-full">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <NavLink key={item.path} item={item} isMobile />
          ))}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center p-2 text-xs text-destructive/80 hover:text-destructive transition-colors"
          >
            <LogOut size={24} />
            <span className="mt-1">خروج</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
