import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, User as UserIcon, FileText, ArrowLeft as ArrowRight } from 'lucide-react'
import { supabase, type Author } from '../lib/supabase'
import Seo from '../components/Seo'
import { useSiteSettings } from '../components/useSiteSettings'

export default function AuthorsList() {
  const navigate = useNavigate()
  const site = useSiteSettings()

  const authorsQuery = useQuery({
    queryKey: ['authors_list'],
    queryFn: async () => {
      const { data: authorsData, error } = await supabase
        .from('authors')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error

      const authors = (authorsData ?? []) as Author[]

      // Get article counts per author
      const { data: countsData } = await supabase.rpc('get_author_article_counts').maybeSingle()
      let counts: Record<number, number> = {}
      if (countsData) {
        // Fallback: query counts manually
        const { data: articles } = await supabase
          .from('articles')
          .select('author_id')
          .not('author_id', 'is', null)
        if (articles) {
          for (const a of articles as { author_id: number }[]) {
            counts[a.author_id] = (counts[a.author_id] || 0) + 1
          }
        }
      } else {
        const { data: articles } = await supabase
          .from('articles')
          .select('author_id')
          .not('author_id', 'is', null)
        if (articles) {
          for (const a of articles as { author_id: number }[]) {
            counts[a.author_id] = (counts[a.author_id] || 0) + 1
          }
        }
      }

      return authors.map((author) => ({
        ...author,
        article_count: counts[author.id] || 0,
      })) as (Author & { article_count: number })[]
    },
    staleTime: 5 * 60_000,
  })

  const authors = authorsQuery.data ?? []

  if (authorsQuery.isLoading) {
    return (
      <div className="container max-w-7xl py-8 md:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-[5px] border border-border/40 overflow-hidden">
              <div className="h-32 bg-muted/40 animate-pulse" />
              <div className="p-6 space-y-3">
                <div className="w-20 h-20 rounded-full bg-muted/50 animate-pulse -mt-12 mx-auto border-4 border-background" />
                <div className="h-5 w-28 rounded bg-muted/50 animate-pulse mx-auto" />
                <div className="h-4 w-20 rounded bg-muted/40 animate-pulse mx-auto" />
              </div>
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
            <p className="text-muted-foreground mt-2">تعرف على فريق الكتّاب ومقالاتهم</p>
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
            <p className="text-lg">لا يوجد كتّاب حالياً</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {authors.map((author) => (
              <button
                key={author.id}
                type="button"
                onClick={() => navigate(`/author/${author.id}`)}
                className="group relative flex flex-col rounded-[5px] border border-border/30 bg-card/40 backdrop-blur-sm overflow-hidden hover:border-primary/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-right"
              >
                {/* Banner / Cover Image */}
                <div className="relative h-36 md:h-44 overflow-hidden">
                  {author.banner ? (
                    <img
                      src={author.banner}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/10 to-card" />
                  )}
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                  {/* Article count badge */}
                  <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1 text-[11px] text-white/90">
                    <FileText className="h-3 w-3" />
                    <span>{author.article_count} مقال</span>
                  </div>
                </div>

                {/* Avatar - overlapping */}
                <div className="relative flex justify-center -mt-12 md:-mt-14 z-10">
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-[3px] border-background shadow-xl bg-card ring-1 ring-border/40 group-hover:ring-primary/30 transition-all duration-300">
                    {author.image ? (
                      <img
                        src={author.image}
                        alt={author.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-primary/5 flex items-center justify-center text-primary text-3xl font-bold">
                        {author.name.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="px-5 pb-5 pt-3 text-center space-y-3 flex-1 flex flex-col">
                  <div>
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                      {author.name}
                    </h3>
                    {author.role && (
                      <span className="inline-block mt-1.5 text-[11px] tracking-wide text-primary bg-primary/5 border border-primary/10 px-3 py-0.5 rounded-full font-medium">
                        {author.role}
                      </span>
                    )}
                  </div>

                  {author.bio && (
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {author.bio}
                    </p>
                  )}

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* View Profile CTA */}
                  <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-primary/70 group-hover:text-primary transition-colors pt-2 border-t border-border/20">
                    <span>عرض الملف الشخصي</span>
                    <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
