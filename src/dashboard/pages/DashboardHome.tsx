import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts'
import { Loader2, Eye, FileText, FolderOpen, PenTool, Calendar } from 'lucide-react'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

type DateFilter = 'today' | '7days' | '30days' | 'year' | 'custom' | 'all'

interface Stats {
  totalViews: number
  totalArticles: number
  totalCategories: number
  totalAuthors: number
}

interface AnalyticsData {
  topArticles: { name: string; fullTitle: string; count: number }[]
  topLocations: { name: string; value: number }[]
  topTimes: { name: string; views: number }[]
  topCategories: { name: string; count: number }[]
}

type ViewRow = {
  article_id: number
  viewed_at: string
  country: string | null
  article: {
    title: string
    categories: { name: string } | null
  } | null
}

function getDateRange(filter: DateFilter, customFrom?: string, customTo?: string): { from: string | null; to: string | null } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (filter) {
    case 'today':
      return { from: today.toISOString(), to: new Date(today.getTime() + 86400000).toISOString() }
    case '7days': {
      const d = new Date(today)
      d.setDate(d.getDate() - 7)
      return { from: d.toISOString(), to: new Date(today.getTime() + 86400000).toISOString() }
    }
    case '30days': {
      const d = new Date(today)
      d.setDate(d.getDate() - 30)
      return { from: d.toISOString(), to: new Date(today.getTime() + 86400000).toISOString() }
    }
    case 'year': {
      const d = new Date(now.getFullYear(), 0, 1)
      return { from: d.toISOString(), to: new Date(today.getTime() + 86400000).toISOString() }
    }
    case 'custom': {
      if (!customFrom || !customTo) return { from: null, to: null }
      const from = new Date(customFrom)
      const to = new Date(customTo)
      to.setDate(to.getDate() + 1)
      return { from: from.toISOString(), to: to.toISOString() }
    }
    default:
      return { from: null, to: null }
  }
}

export default function DashboardHome() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({ totalViews: 0, totalArticles: 0, totalCategories: 0, totalAuthors: 0 })
  const [data, setData] = useState<AnalyticsData>({
    topArticles: [],
    topLocations: [],
    topTimes: [],
    topCategories: []
  })

  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const fetchStats = useCallback(async () => {
    const [viewsRes, articlesRes, categoriesRes, authorsRes] = await Promise.all([
      supabase.from('article_views').select('id', { count: 'exact', head: true }),
      supabase.from('articles').select('id', { count: 'exact', head: true }),
      supabase.from('categories').select('id', { count: 'exact', head: true }),
      supabase.from('authors').select('id', { count: 'exact', head: true }),
    ])

    setStats({
      totalViews: viewsRes.count ?? 0,
      totalArticles: articlesRes.count ?? 0,
      totalCategories: categoriesRes.count ?? 0,
      totalAuthors: authorsRes.count ?? 0,
    })
  }, [])

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)

      const { from, to } = getDateRange(dateFilter, customFrom, customTo)

      let query = supabase
        .from('article_views')
        .select(`
          *,
          article:articles (title, category_id, categories(name))
        `)

      if (from && to) {
        query = query.gte('viewed_at', from).lt('viewed_at', to)
      }

      const { data: views } = await query

      if (!views) return

      // 1. Top 5 Articles
      const articleCounts: Record<string, number> = {}
      const articleTitles: Record<string, string> = {}
      
      ;(views as ViewRow[]).forEach((view) => {
        if (!view.article) return
        const id = String(view.article_id)
        articleCounts[id] = (articleCounts[id] || 0) + 1
        articleTitles[id] = view.article.title
      })

      const topArticles = Object.entries(articleCounts)
        .map(([id, count]) => ({
          name: articleTitles[id]?.substring(0, 20) + '...',
          fullTitle: articleTitles[id],
          count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // 2. Top 5 Locations
      const locationCounts: Record<string, number> = {}
      ;(views as ViewRow[]).forEach((view) => {
        const loc = view.country || 'Unknown'
        locationCounts[loc] = (locationCounts[loc] || 0) + 1
      })

      const topLocations = Object.entries(locationCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)

      // 3. Top 5 Times
      const timeCounts: Record<string, number> = {}
      ;(views as ViewRow[]).forEach((view) => {
        const hour = new Date(view.viewed_at).getHours()
        const timeLabel = `${hour}:00`
        timeCounts[timeLabel] = (timeCounts[timeLabel] || 0) + 1
      })

      const topTimes = Object.entries(timeCounts)
        .map(([name, views]) => ({ name, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 5)
        .sort((a, b) => parseInt(a.name) - parseInt(b.name))

      // 4. Top 5 Categories
      const categoryCounts: Record<string, number> = {}
      ;(views as ViewRow[]).forEach((view) => {
        if (!view.article?.categories) return
        const catName = view.article.categories.name
        categoryCounts[catName] = (categoryCounts[catName] || 0) + 1
      })

      const topCategories = Object.entries(categoryCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      setData({ topArticles, topLocations, topTimes, topCategories })

    } catch (err) {
      console.error('Error fetching analytics:', err)
    } finally {
      setLoading(false)
    }
  }, [dateFilter, customFrom, customTo])

  useEffect(() => {
    void fetchStats()
  }, [fetchStats])

  useEffect(() => {
    void fetchAnalytics()
  }, [fetchAnalytics])

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin" size={48} /></div>

  const filterButtons: { label: string; value: DateFilter }[] = [
    { label: 'اليوم', value: 'today' },
    { label: 'آخر 7 أيام', value: '7days' },
    { label: 'آخر 30 يوم', value: '30days' },
    { label: 'هذا العام', value: 'year' },
    { label: 'الكل', value: 'all' },
  ]

  const statCards = [
    { label: 'المشاهدات', value: stats.totalViews, icon: Eye, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'المقالات', value: stats.totalArticles, icon: FileText, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'الأقسام', value: stats.totalCategories, icon: FolderOpen, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: 'الكتّاب', value: stats.totalAuthors, icon: PenTool, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ]

  return (
    <div className="space-y-8 pb-10">
      <h1 className="text-2xl font-bold mb-6 text-foreground">لوحة المعلومات والإحصائيات</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-card p-5 rounded-xl shadow-sm border border-border flex items-center gap-4">
            <div className={`p-3 rounded-lg ${stat.bg}`}>
              <stat.icon size={24} className={stat.color} />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{stat.value.toLocaleString('ar-EG')}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Date Filter */}
      <div className="bg-card p-4 rounded-xl shadow-sm border border-border">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar size={18} />
            <span className="text-sm font-medium">فلتر زمني:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {filterButtons.map((btn) => (
              <button
                key={btn.value}
                onClick={() => setDateFilter(btn.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  dateFilter === btn.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-2 py-1 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring outline-none"
              />
              <span className="text-muted-foreground">إلى</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-2 py-1 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring outline-none"
              />
            </div>
          )}
          <button
            onClick={() => setDateFilter('custom')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              dateFilter === 'custom'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            نطاق مخصص
          </button>
        </div>
      </div>

      {/* Charts - Each full width */}
      <div className="space-y-8">
        
        {/* Top 5 Articles - Bar Chart */}
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
          <h2 className="text-lg font-semibold mb-4 text-center text-card-foreground">أعلى 5 مقالات مشاهدة</h2>
          <div className="h-80" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topArticles}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--card-foreground))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Bar dataKey="count" name="المشاهدات" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Locations - Pie Chart */}
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
          <h2 className="text-lg font-semibold mb-4 text-center text-card-foreground">أعلى 5 دول مشاهدة</h2>
          <div className="h-80" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.topLocations}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.topLocations.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="hsl(var(--card))" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--card-foreground))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Times - Line Chart */}
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
          <h2 className="text-lg font-semibold mb-4 text-center text-card-foreground">أوقات الذروة (الساعة)</h2>
          <div className="h-80" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.topTimes}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--card-foreground))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Line type="monotone" dataKey="views" name="المشاهدات" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Categories - Horizontal Bar Chart */}
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
          <h2 className="text-lg font-semibold mb-4 text-center text-card-foreground">أعلى الأقسام نشاطاً</h2>
          <div className="h-80" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={data.topCategories}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" width={100} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--card-foreground))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Bar dataKey="count" name="المشاهدات" fill="#ffc658" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  )
}
