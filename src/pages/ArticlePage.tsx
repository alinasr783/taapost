import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowRight, Calendar, Folder } from 'lucide-react'
import { supabase, type Article } from '../lib/supabase'
import { useTrackView } from '../hooks/useTrackView'

type ArticleSummary = {
  lead: string
  key_points: string[]
  background: string[]
  implications: string[]
  suggested_questions: string[]
}

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  citations?: string[]
  suggested_questions?: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
}

export default function ArticlePage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [article, setArticle] = useState<Article | null>(null)
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [toc, setToc] = useState<{ id: string, text: string }[]>([])
  const [summary, setSummary] = useState<ArticleSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const articleId = article?.id ?? null

  useTrackView(article?.id || 0)

  useEffect(() => {
    async function fetchArticle() {
      if (!slug) return
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('articles')
          .select('*, categories(name), authors(name, image, bio, role)')
          .eq('slug', slug)
          .single()
        
        if (error) {
          console.error('Error fetching article:', error)
        }
        
        if (data) {
          // Process content to extract H2s and add IDs
          const parser = new DOMParser()
          const doc = parser.parseFromString(data.content || '', 'text/html')
          const h2s = doc.querySelectorAll('h2')
          const newToc: { id: string, text: string }[] = []
          
          h2s.forEach((h2, index) => {
            const id = `section-${index}`
            h2.id = id
            newToc.push({ id, text: h2.textContent || '' })
          })

          // Handle authors (could be array or object depending on relation)
          const authorData = Array.isArray(data.authors) 
            ? (data.authors.length > 0 ? data.authors[0] : null)
            : data.authors

          setArticle({
            ...data,
            category: (Array.isArray(data.categories) ? data.categories[0]?.name : data.categories?.name) || '',
            authors: authorData,
            contentHtml: doc.body.innerHTML
          } as Article)
          setToc(newToc)
          setSummary(null)
          setSummaryError(null)
          setChatMessages([])
          setChatInput('')
          setChatError(null)

          // Fetch related articles
          const { data: relatedData } = await supabase
            .from('articles')
            .select('id, slug, title, image, date, category_id, excerpt, is_exclusive')
            .eq('category_id', data.category_id)
            .neq('id', data.id)
            .limit(5)
            .order('date', { ascending: false })
            
          if (relatedData) {
             setRelatedArticles(relatedData as Article[])
          }
        } else {
          setArticle(null)
        }
      } catch (error) {
        console.error('Error:', error)
        setArticle(null)
      } finally {
        setLoading(false)
      }
    }
    fetchArticle()
  }, [slug])

  useEffect(() => {
    async function fetchSummary() {
      if (!articleId) return
      setSummaryLoading(true)
      setSummaryError(null)
      try {
        const { data, error } = await supabase.functions.invoke('article-ai', {
          body: { task: 'summarize', articleId }
        })
        if (error) {
          throw error
        }
        if (!isRecord(data) || !isRecord(data.summary)) {
          throw new Error('Missing summary')
        }
        const s = data.summary
        setSummary({
          lead: typeof s.lead === 'string' ? s.lead : '',
          key_points: toStringArray(s.key_points),
          background: toStringArray(s.background),
          implications: toStringArray(s.implications),
          suggested_questions: toStringArray(s.suggested_questions),
        })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'تعذر تحميل ملخص المقال'
        setSummaryError(message)
      } finally {
        setSummaryLoading(false)
      }
    }
    fetchSummary()
  }, [articleId])

  const handleScrollTo = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const headerOffset = 100
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.scrollY - headerOffset
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  // Calculate reading time
  const calculateReadingTime = (content: string) => {
    const text = content.replace(/<[^>]*>/g, '')
    const wordsPerMinute = 200
    const words = text.trim().split(/\s+/).length
    const minutes = Math.ceil(words / wordsPerMinute)
    return `${minutes} دقيقة قراءة`
  }

  const sendChat = async (text?: string) => {
    if (!articleId) return
    const content = (text ?? chatInput).trim()
    if (!content) return

    setChatError(null)
    setChatLoading(true)

    setChatMessages((prev) => [...prev, { role: 'user', content }])
    if (!text) setChatInput('')

    try {
      const payloadMessages = [...chatMessages, { role: 'user' as const, content }].slice(-10)
      const { data, error } = await supabase.functions.invoke('article-ai', {
        body: {
          task: 'chat',
          articleId,
          messages: payloadMessages.map((m) => ({ role: m.role, content: m.content })),
        }
      })
      if (error) throw error

      if (!isRecord(data)) {
        throw new Error('Invalid response')
      }

      const answer = typeof data.answer === 'string' ? data.answer : ''
      const citations = Array.isArray(data.citations)
        ? data.citations
            .filter(isRecord)
            .map((c) => (typeof c.quote === 'string' ? c.quote : ''))
            .filter((q) => q.trim().length > 0)
            .slice(0, 4)
        : []
      const suggested = toStringArray(data.suggested_questions).slice(0, 4)

      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: answer || 'تعذر توليد إجابة مفهومة حاليًا.', citations, suggested_questions: suggested }
      ])
    } catch (e) {
      const message = e instanceof Error ? e.message : 'تعذر إرسال سؤالك'
      setChatError(message)
    } finally {
      setChatLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container flex items-center justify-center py-20 text-center min-h-[50vh]">
        <div className="text-lg text-muted-foreground">جاري التحميل...</div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="container flex flex-col items-center justify-center py-20 text-center">
        <h2 className="mb-4 text-2xl font-bold text-foreground">عذراً، المقال غير موجود</h2>
        <button 
          onClick={() => navigate('/')}
          className="rounded-[5px] bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90"
        >
          العودة للرئيسية
        </button>
      </div>
    )
  }

  return (
    <div className="container max-w-7xl py-8 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {/* Breadcrumb / Back button */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="h-4 w-4" />
          <span>عودة</span>
        </button>

        {/* Meta Info (Date, Category, Reading Time) */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1 rounded-[5px] bg-primary text-primary-foreground px-3 py-1 font-medium shadow-sm">
            <Folder className="h-4 w-4" />
            {article.category}
          </span>
          {article.is_exclusive ? (
            <span className="flex items-center gap-1 rounded-[5px] bg-red-600/10 px-3 py-1 text-red-600 font-bold border border-red-600/20">
              حصرياً
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(article.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          )}
          <span className="flex items-center gap-1">
            <span className="i-lucide-clock h-4 w-4" />
            {calculateReadingTime(article.content || '')}
          </span>
        </div>
      </div>

      {/* Title */}
      <div className="space-y-4 text-center md:text-right mb-8">
        <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl lg:text-5xl text-foreground">
          {article.title}
        </h1>
      </div>

      {/* Featured Image (Full Width) */}
      <div className="relative overflow-hidden rounded-[5px] shadow-lg mb-8">
        <img 
          src={article.image} 
          alt={article.title} 
          className="w-full object-cover max-h-[600px]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Table of Contents (Sidebar) */}
        {toc.length > 0 && (
          <aside className="lg:col-span-3 lg:order-2">
            <div className="lg:sticky lg:top-24 space-y-4 rounded-[5px] border border-border/40 bg-card/30 p-4 backdrop-blur-sm mb-8 lg:mb-0">
              <h3 className="font-bold text-lg text-foreground border-b border-border pb-2">محتويات المقال</h3>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => handleScrollTo('article-summary')}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors text-right w-full block truncate"
                    title="ملخص المقال"
                  >
                    <span className="font-bold ml-1">★</span> ملخص المقال
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleScrollTo('article-chat')}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors text-right w-full block truncate"
                    title="اسأل عن المقال"
                  >
                    <span className="font-bold ml-1">؟</span> اسأل عن المقال
                  </button>
                </li>
                {toc.map((item, index) => (
                  <li key={item.id}>
                    <button 
                      onClick={() => handleScrollTo(item.id)}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors text-right w-full block truncate"
                      title={item.text}
                    >
                      <span className="font-bold ml-1">{index + 1}.</span> {item.text}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <article className={`space-y-8 min-w-0 ${toc.length > 0 ? 'lg:col-span-9 lg:order-1' : 'lg:col-span-12'}`}>
          {/* Summary */}
          <section id="article-summary" className="rounded-[5px] border border-border/40 bg-card/30 p-6 backdrop-blur-sm md:p-8">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">ملخص المقال</h2>
                <p className="text-sm text-muted-foreground">تلخيص ذكي ومنظم يعتمد على نص المقال نفسه</p>
              </div>
              <button
                onClick={() => {
                  if (!summaryLoading) {
                    setSummary(null)
                    setSummaryError(null)
                    if (articleId) {
                      void (async () => {
                        setSummaryLoading(true)
                        try {
                          const { data, error } = await supabase.functions.invoke('article-ai', {
                            body: { task: 'summarize', articleId }
                          })
                          if (error) throw error
                          if (!isRecord(data) || !isRecord(data.summary)) throw new Error('Missing summary')
                          const s = data.summary
                          setSummary({
                            lead: typeof s.lead === 'string' ? s.lead : '',
                            key_points: toStringArray(s.key_points),
                            background: toStringArray(s.background),
                            implications: toStringArray(s.implications),
                            suggested_questions: toStringArray(s.suggested_questions),
                          })
                        } catch (e) {
                          const message = e instanceof Error ? e.message : 'تعذر تحميل ملخص المقال'
                          setSummaryError(message)
                        } finally {
                          setSummaryLoading(false)
                        }
                      })()
                    }
                  }
                }}
                className="rounded-[5px] bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={summaryLoading}
              >
                {summaryLoading ? 'جاري التلخيص…' : 'تحديث الملخص'}
              </button>
            </div>

            {summaryError && (
              <div className="mt-4 rounded-[5px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                تعذر إظهار الملخص حاليًا: {summaryError}
              </div>
            )}

            {!summaryError && !summary && summaryLoading && (
              <div className="mt-5 text-sm text-muted-foreground">جاري إعداد ملخص المقال…</div>
            )}

            {summary && (
              <div className="mt-6 space-y-6">
                {summary.lead && (
                  <p className="text-foreground/90 leading-relaxed">{summary.lead}</p>
                )}

                {summary.key_points?.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-bold text-foreground">أهم النقاط</h3>
                    <ul className="list-disc pr-6 space-y-1 text-foreground/90">
                      {summary.key_points.slice(0, 8).map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {(summary.background?.length > 0 || summary.implications?.length > 0) && (
                  <div className="grid gap-6 md:grid-cols-2">
                    {summary.background?.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-bold text-foreground">الخلفية والسياق</h3>
                        <ul className="list-disc pr-6 space-y-1 text-foreground/90">
                          {summary.background.slice(0, 8).map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {summary.implications?.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-bold text-foreground">لماذا يهم؟</h3>
                        <ul className="list-disc pr-6 space-y-1 text-foreground/90">
                          {summary.implications.slice(0, 8).map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {summary.suggested_questions?.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-foreground">أسئلة ذكية عن المقال</h3>
                    <div className="flex flex-wrap gap-2">
                      {summary.suggested_questions.slice(0, 6).map((q, i) => (
                        <button
                          key={i}
                          onClick={() => void sendChat(q)}
                          className="rounded-[5px] border border-border/60 bg-card/60 px-3 py-2 text-sm text-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Content */}
          <div className="w-full overflow-hidden break-normal rounded-[5px] border border-border/40 bg-card/30 p-6 backdrop-blur-sm md:p-10">
            <div 
              className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-bold prose-headings:text-primary prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-[5px] prose-p:text-foreground/90 prose-strong:text-foreground prose-li:text-foreground/90 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:py-1 prose-blockquote:pr-4 prose-blockquote:rounded-r-sm prose-h2:text-xl md:prose-h2:text-3xl [&_a]:break-all"
              dangerouslySetInnerHTML={{ __html: article.contentHtml || '' }}
            />
          </div>

          {/* Live Chat */}
          <section id="article-chat" className="rounded-[5px] border border-border/40 bg-card/30 p-6 backdrop-blur-sm md:p-8">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">اسأل عن المقال</h2>
                <p className="text-sm text-muted-foreground">سؤال وجواب ضمن نطاق المقال فقط</p>
              </div>
              {chatMessages.length > 0 && (
                <button
                  onClick={() => {
                    setChatMessages([])
                    setChatError(null)
                  }}
                  className="rounded-[5px] border border-border/60 bg-card/60 px-3 py-2 text-sm text-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  مسح المحادثة
                </button>
              )}
            </div>

            {chatError && (
              <div className="mt-4 rounded-[5px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                تعذر إكمال المحادثة: {chatError}
              </div>
            )}

            <div className="mt-6 space-y-3">
              {chatMessages.length === 0 && (
                <div className="rounded-[5px] border border-border/50 bg-card/50 px-4 py-4 text-sm text-muted-foreground">
                  اكتب سؤالك عن هذا المقال، وسأجيبك بالاعتماد على محتواه.
                </div>
              )}

              {chatMessages.map((m, idx) => (
                <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[92%] rounded-[5px] px-4 py-3 text-sm leading-relaxed border ${
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground border-primary/20'
                        : 'bg-card/70 text-foreground border-border/50'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>
                    {m.role === 'assistant' && m.citations && m.citations.length > 0 && (
                      <div className="mt-3 border-t border-border/40 pt-3">
                        <div className="text-xs text-muted-foreground mb-2">استشهادات من المقال</div>
                        <ul className="space-y-1">
                          {m.citations.map((q, i) => (
                            <li key={i} className="text-xs text-foreground/90">
                              “{q}”
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {m.role === 'assistant' && m.suggested_questions && m.suggested_questions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {m.suggested_questions.map((q, i) => (
                          <button
                            key={i}
                            onClick={() => void sendChat(q)}
                            className="rounded-[5px] border border-border/60 bg-card/60 px-3 py-1.5 text-xs text-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex flex-col gap-2 md:flex-row md:items-end">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="اكتب سؤالك هنا…"
                  className="min-h-[90px] w-full resize-none rounded-[5px] border border-border/60 bg-background/60 px-4 py-3 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                  disabled={chatLoading}
                />
                <button
                  onClick={() => void sendChat()}
                  className="rounded-[5px] bg-primary px-5 py-3 text-primary-foreground hover:bg-primary/90 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={chatLoading || !chatInput.trim()}
                >
                  {chatLoading ? 'جاري الإرسال…' : 'إرسال'}
                </button>
              </div>
            </div>
          </section>

          {article.authors && article.authors.name && (
            <div className="mt-8 rounded-[5px] border border-border/40 bg-card/50 p-6 backdrop-blur-sm flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-right">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/20 shrink-0">
                {article.authors.image ? (
                  <img src={article.authors.image} alt={article.authors.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                    {article.authors.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-col md:flex-row items-center md:items-end gap-2 justify-center md:justify-start">
                  <h3 className="text-xl font-bold text-foreground">{article.authors.name}</h3>
                  {article.authors.role && <span className="text-sm text-primary bg-primary/10 px-2 py-0.5 rounded-full">{article.authors.role}</span>}
                </div>
                <p className="text-muted-foreground">{article.authors.bio}</p>
              </div>
            </div>
          )}
        </article>
      </div>

      {/* Related Articles Section */}
      {relatedArticles.length > 0 && (
        <section className="mt-16 border-t border-border/40 pt-10">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <span className="w-1 h-8 bg-primary rounded-full"/>
            اقرأ أيضاً
          </h2>
          <div className="overflow-x-auto">
            <div className="flex gap-7 pb-4">
              {relatedArticles.map((related) => (
                <Link 
                  key={related.id} 
                  to={`/مقال/${encodeURIComponent(related.slug)}`}
                  className="relative flex min-w-[360px] max-w-[480px] flex-col overflow-hidden rounded-[5px] border border-white/10 bg-black/30 text-right shadow-sm backdrop-blur-md group"
                >
                  <div className="relative h-56 w-full">
                    <img 
                      src={related.image} 
                      alt={related.title} 
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
                    {related.is_exclusive && (
                      <div className="absolute right-2 top-2 rounded-[5px] border border-white/30 bg-red-600/80 px-2 py-1 text-[11px] text-white/90 backdrop-blur font-bold">
                        حصرياً
                      </div>
                    )}
                    <div className="absolute inset-x-2 bottom-2">
                      <div className="space-y-1 rounded-[5px] border border-white/20 bg-black/50 px-3 py-2 text-white backdrop-blur-md">
                        <div className="line-clamp-2 text-sm font-semibold">
                          {related.title}
                        </div>
                        <div className="line-clamp-2 text-[11px] text-white/85">
                          {related.excerpt}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
