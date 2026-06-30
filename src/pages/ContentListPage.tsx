import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase, type Article } from '../lib/supabase'
import Seo from '../components/Seo'
import { useSiteSettings } from '../components/useSiteSettings'

export default function ContentListPage() {
  const site = useSiteSettings()

  const articlesQuery = useQuery({
    queryKey: ['content_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('id,slug,title,excerpt,image,date,is_exclusive,category_id,categories(name)')
        .eq('type', 'other')
        .order('date', { ascending: false })

      if (error) throw error

      return ((data ?? []) as unknown as Article[]).map(a => ({
        ...a,
        category: Array.isArray(a.categories) ? (a.categories[0] as { name: string })?.name || '' : (a.categories as { name: string })?.name || '',
        categoryId: a.category_id,
      }))
    },
    staleTime: 60_000,
    gcTime: 30 * 60_000,
  })

  const list = articlesQuery.data ?? []

  if (articlesQuery.isLoading) {
    return (
      <div className="container py-8 space-y-4">
        <Seo title="المحتوى" description={`جميع المحتويات في ${site.site_name}`} canonicalPath="/content" ogType="website" />
        <div className="h-8 w-32 rounded bg-muted/40 animate-pulse" />
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="space-y-2">
              <div className="h-48 w-full rounded-xl bg-muted/40 animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-muted/50 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-muted/40 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (articlesQuery.isError) {
    return (
      <div className="container flex flex-col items-center justify-center py-20 text-center">
        <Seo title="خطأ في تحميل المحتوى" description="حدث خطأ أثناء تحميل المحتوى" robots="noindex,follow" />
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 max-w-lg">
          <h2 className="mb-2 text-xl font-bold text-destructive">حدث خطأ أثناء تحميل المحتوى</h2>
          <p className="mb-6 text-sm text-muted-foreground">يرجى المحاولة مرة أخرى</p>
          <button onClick={() => articlesQuery.refetch()} className="rounded-xl bg-primary px-6 py-2.5 text-sm text-primary-foreground hover:bg-primary/90">
            إعادة المحاولة
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-6">
      <Seo
        title="المحتوى"
        description={`جميع المحتويات في ${site.site_name}`}
        canonicalPath="/content"
        ogType="website"
        jsonLd={[{ '@type': 'CollectionPage', name: 'المحتوى', inLanguage: 'ar' }]}
      />

      <h1 className="text-2xl font-bold text-foreground border-r-4 border-primary pr-4">
        المحتوى
      </h1>

      {list.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">لا توجد محتويات بعد</div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {list.map((item) => (
          <Link
            key={item.id}
            to={item.slug ? `/post/${encodeURIComponent(item.slug)}` : `/post/${item.id}`}
            className="group flex flex-col rounded-xl border border-border/40 bg-card overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all"
          >
            <div className="relative aspect-[16/9] overflow-hidden">
              <img
                src={item.image}
                alt={item.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              {item.is_exclusive && (
                <div className="absolute right-3 top-3 rounded-md bg-red-600/90 px-2 py-0.5 text-xs text-white font-bold">
                  حصرياً
                </div>
              )}
            </div>
            <div className="flex-1 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-medium">
                  {item.category || 'غير مصنف'}
                </span>
                <span>{new Date(item.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </div>
              <h3 className="font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                {item.title}
              </h3>
              {item.excerpt && (
                <p className="text-sm text-muted-foreground line-clamp-2">{item.excerpt}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
