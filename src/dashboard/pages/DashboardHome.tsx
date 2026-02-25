import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts'
import { Loader2 } from 'lucide-react'

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export default function DashboardHome() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    topArticles: [],
    topLocations: [],
    topTimes: [],
    topCategories: []
  })

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)

      // 1. Top 5 Articles
      // We need to join with articles table to get titles. 
      // Supabase JS doesn't support complex aggregation + join easily in one go without views or RPC.
      // We will fetch raw views and aggregate in JS for now, or use a view if performance is key.
      // Given the likely small scale for now, JS aggregation is fine.
      // Actually, let's try to be smart.
      
      const { data: views } = await supabase
        .from('article_views')
        .select(`
          *,
          article:articles (title, category_id, categories(name))
        `)
      
      if (!views) return

      // Process Data
      
      // 1. Top 5 Articles
      const articleCounts: Record<string, number> = {}
      const articleTitles: Record<string, string> = {}
      
      views.forEach((view: any) => {
        if (!view.article) return
        const id = view.article_id
        articleCounts[id] = (articleCounts[id] || 0) + 1
        articleTitles[id] = view.article.title
      })

      const topArticles = Object.entries(articleCounts)
        .map(([id, count]) => ({
          name: articleTitles[id]?.substring(0, 20) + '...', // Truncate for display
          fullTitle: articleTitles[id],
          count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // 2. Top 5 Locations (Country)
      const locationCounts: Record<string, number> = {}
      views.forEach((view: any) => {
        const loc = view.country || 'Unknown'
        locationCounts[loc] = (locationCounts[loc] || 0) + 1
      })

      const topLocations = Object.entries(locationCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)

      // 3. Top 5 Times (Hour of day)
      const timeCounts: Record<string, number> = {}
      views.forEach((view: any) => {
        const hour = new Date(view.viewed_at).getHours()
        const timeLabel = `${hour}:00`
        timeCounts[timeLabel] = (timeCounts[timeLabel] || 0) + 1
      })

      // Ensure all hours are sorted chronologically if we want a line chart, 
      // but user asked for "Top 5 times", which implies ranking by volume.
      // Let's interpret "Top 5 times" as the 5 busiest hours.
      const topTimes = Object.entries(timeCounts)
        .map(([name, views]) => ({ name, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 5)
        .sort((a, b) => parseInt(a.name) - parseInt(b.name)) // Sort by time for the line chart x-axis logic? 
        // Actually line chart usually implies time progression. 
        // If we want "Top 5 busiest times", a bar chart might be better, but user asked for Line.
        // Let's just show the top 5 busiest hours, sorted by hour index for the line chart to make sense visually?
        // Or just the top 5 sorted by views? 
        // Line chart usually shows trends. Let's show the trend over the top 5 busiest hours?
        // Let's just stick to "Top 5 times with highest views".

      // 4. Top 5 Categories
      const categoryCounts: Record<string, number> = {}
      views.forEach((view: any) => {
        if (!view.article?.categories) return
        const catName = view.article.categories.name
        categoryCounts[catName] = (categoryCounts[catName] || 0) + 1
      })

      const topCategories = Object.entries(categoryCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      setData({
        topArticles,
        topLocations,
        topTimes,
        topCategories
      })

    } catch (err) {
      console.error('Error fetching analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin" size={48} /></div>

  return (
    <div className="space-y-8 pb-10">
      <h1 className="text-2xl font-bold mb-6 text-foreground">لوحة المعلومات والإحصائيات</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Top 5 Articles - Bar Chart */}
        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
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
        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
          <h2 className="text-lg font-semibold mb-4 text-center text-card-foreground">أعلى 5 دول مشاهدة</h2>
          <div className="h-80" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.topLocations}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.topLocations.map((entry, index) => (
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
        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
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
        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
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
