import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, User as UserIcon, FileText } from 'lucide-react'
import { supabase, type Author } from '../lib/supabase'
import Seo from '../components/Seo'
import { useSiteSettings } from '../components/useSiteSettings'

export default function AuthorsList() {
  const navigate = useNavigate()
  const site = useSiteSettings()

  const authorsQuery = useQuery({
    queryKey: ['authors_list'],
    queryFn: async () => {
      const [authorsRes, countsRes] = await Promise.all([
        supabase
          .from('authors')
          .select('id, name, image, bio, role, slug')
          .order('name', { ascending: true }),
        supabase
          .rpc('get_article_counts_by_author'),
      ])

      if (authorsRes.error) throw authorsRes.error

      const authors = (authorsRes.data ?? []) as Author[]

      const countMap: Record<number, number> = {}
      if (countsRes.data) {
        for (const row of countsRes.data as { author_id: number; count: number }[]) {
          countMap[row.author_id] = row.count
        }
      }

      return authors.map((author) => ({
        ...author,
        article_count: countMap[author.id] || 0,
      })) as (Author & { article_count: number })[]
    },
    staleTime: 5 * 60_000,
  })

  const authors = authorsQuery.data ?? []

  if (authorsQuery.isLoading) {
    return (
      <div className="container max-w-7xl py-8 md:py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center p-6 rounded-2xl bg-muted/30 animate-pulse">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-muted/50 mb-4" />
              <div className="h-5 w-24 rounded bg-muted/50 mb-2" />
              <div className="h-4 w-16 rounded bg-muted/40" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Seo
        title="الكتّاب"
        description={`تعرف على كتاب ${site.site_name} ومقالاتهم`}
        canonicalPath="/authors"
        ogType="website"
      />

      <div className="container max-w-7xl py-8 md:py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">الكتّاب</h1>
            <p className="text-muted-foreground mt-2">تعرف على فريق الكتاب ومقالاتهم</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>عودة</span>
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>

        {authors.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <UserIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">لا يوجد كتاب حالياً</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {authors.map((author) => (
              <button
                key={author.id}
                type="button"
                onClick={() => navigate(`/author/${author.id}`)}
                className="group flex flex-col items-center p-6 md:p-8 rounded-2xl bg-card/50 border border-border/30 hover:border-primary/30 hover:bg-card hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-center"
              >
                {/* Avatar */}
                <div className="relative mb-4">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-border/50 group-hover:border-primary/30 transition-colors duration-300">
                    {author.image ? (
                      <img
                        src={author.image}
                        alt={author.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary text-2xl md:text-3xl font-bold">
                        {author.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  {/* Article count badge */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-2.5 py-0.5 text-[10px] font-medium shadow-sm">
                    <FileText className="h-3 w-3" />
                    <span>{author.article_count}</span>
                  </div>
                </div>

                {/* Name */}
                <h3 className="text-sm md:text-base font-bold text-foreground group-hover:text-primary transition-colors leading-tight mb-1">
                  {author.name}
                </h3>

                {/* Role */}
                {author.role && (
                  <span className="text-[10px] md:text-xs text-primary/70 font-medium">
                    {author.role}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
