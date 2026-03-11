import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowRight, Calendar, Folder } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase, type Article } from '../lib/supabase'
import { useTrackView } from '../hooks/useTrackView'

type ArticleSummary = {
  lead: string
  key_points: string[]
  background: string[]
  implications: string[]
}

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  citations?: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
}

const visitorIdKey = 'taapost_visitor_id'
function getOrCreateVisitorId() {
  try {
    const existing = localStorage.getItem(visitorIdKey)
    if (existing) return existing
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `v_${Date.now()}_${Math.random().toString(16).slice(2)}`
    localStorage.setItem(visitorIdKey, id)
    return id
  } catch {
    return 'v_anonymous'
  }
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function clampText(text: string, maxChars: number) {
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars) + '…'
}

function toHex(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return toHex(digest)
}

function maskApiKey(value: string) {
  const v = value.trim()
  if (!v) return '(empty)'
  if (v.length <= 10) return `${v.slice(0, 2)}…${v.slice(-2)}`
  return `${v.slice(0, 4)}…${v.slice(-4)}`
}

function escapeHtml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function sanitizeAiHtml(input: string) {
  const raw = input.trim()
  if (!raw) return ''
  if (typeof DOMParser === 'undefined') {
    return `<p>${escapeHtml(raw).replaceAll('\n', '<br />')}</p>`
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${raw}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  if (!root) return `<p>${escapeHtml(raw).replaceAll('\n', '<br />')}</p>`

  const blocked = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META'])
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
  const toRemove: Element[] = []

  while (walker.nextNode()) {
    const el = walker.currentNode as Element
    if (blocked.has(el.tagName)) {
      toRemove.push(el)
      continue
    }
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase()
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name)
        continue
      }
      if (el.tagName === 'A') continue
      el.removeAttribute(attr.name)
    }
    if (el.tagName === 'A') {
      const href = el.getAttribute('href') ?? ''
      const safe = href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')
      if (!safe) el.removeAttribute('href')
      el.setAttribute('rel', 'nofollow noopener noreferrer')
      el.setAttribute('target', '_blank')
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase()
        if (name === 'href' || name === 'rel' || name === 'target') continue
        el.removeAttribute(attr.name)
      }
    }
  }

  for (const el of toRemove) el.remove()

  const html = root.innerHTML.trim()
  if (!html) return `<p>${escapeHtml(raw).replaceAll('\n', '<br />')}</p>`
  return html
}

function enforceNoApologyOrRejection(html: string) {
  const raw = html.trim()
  if (!raw) return raw

  let out = raw
  out = out.replace(/(^|[\s>])(عذرًا|عذرا|أعتذر|اعتذر)(?=[:،\s<]|$)/gi, '$1')
  out = out.replace(/غير\s+متماش(?:ٍ|ي)[^<\n]{0,60}/gi, '')
  out = out.replace(/سياق\s+المقال/gi, 'المقال')

  const cleaned = out.trim()
  if (!cleaned) {
    return '<p>لنشدّ السؤال إلى خيطٍ من خيوط المقال: ما يثيره النص من معنى يفتح بابًا للإجابة العملية.</p>'
  }
  return cleaned
}

function getGroqApiKey() {
  try {
    const override = localStorage.getItem('taapost_groq_api_key')
    if (override && override.trim()) return override.trim()
  } catch {
    void 0
  }
  const envKey = (import.meta as unknown as { env?: Record<string, unknown> }).env?.VITE_GROQ_API_KEY
  return typeof envKey === 'string' ? envKey.trim() : ''
}

function extractJsonFromCodeFence(text: string) {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  return match?.[1]?.trim() ?? null
}

function extractBalancedJsonObject(text: string) {
  const start = text.indexOf('{')
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (escape) {
      escape = false
      continue
    }
    if (ch === '\\') {
      if (inString) escape = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (ch === '{') depth++
    if (ch === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

function parseJsonObjectFromText(raw: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    return isRecord(parsed) ? parsed : null
  } catch {
    void 0
  }

  const fenced = extractJsonFromCodeFence(raw)
  if (fenced) {
    try {
      const parsed: unknown = JSON.parse(fenced)
      return isRecord(parsed) ? parsed : null
    } catch {
      void 0
    }
  }

  const balanced = extractBalancedJsonObject(raw)
  if (balanced) {
    try {
      const parsed: unknown = JSON.parse(balanced)
      return isRecord(parsed) ? parsed : null
    } catch {
      return null
    }
  }
  return null
}

function extractGroqContent(data: unknown) {
  const r = isRecord(data) ? data : null
  const choices = r && Array.isArray(r.choices) ? r.choices : null
  const first = choices && choices[0] && isRecord(choices[0]) ? choices[0] : null
  const message = first && isRecord(first.message) ? first.message : null
  const content = message && typeof message.content === 'string' ? message.content : ''
  if (!content.trim()) {
    throw new Error('Groq response missing content')
  }
  return content.trim()
}

async function groqChatCompletionDirect(args: {
  apiKey: string
  model: string
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
  temperature?: number
  maxCompletionTokens?: number
  topP?: number
  reasoningEffort?: 'low' | 'medium' | 'high'
}) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: args.model,
      messages: args.messages,
      temperature: args.temperature ?? 0.35,
      max_completion_tokens: args.maxCompletionTokens ?? 900,
      top_p: args.topP ?? 1,
      reasoning_effort: args.reasoningEffort ?? 'medium',
      stream: false,
      stop: null,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Groq request failed: ${res.status} ${text}`)
  }

  const data: unknown = await res.json()
  return extractGroqContent(data)
}

async function groqChatCompletionProxy(args: {
  model: string
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
  temperature?: number
  maxCompletionTokens?: number
  topP?: number
  reasoningEffort?: 'low' | 'medium' | 'high'
}) {
  const isDev = Boolean((import.meta as unknown as { env?: Record<string, unknown> }).env?.DEV)
  const url = '/api/groq-chat'
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: args.model,
      messages: args.messages,
      temperature: args.temperature ?? 0.35,
      max_completion_tokens: args.maxCompletionTokens ?? 900,
      top_p: args.topP ?? 1,
      reasoning_effort: args.reasoningEffort ?? 'medium',
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    if (res.status === 404 && isDev) {
      throw new Error(
        'Groq proxy غير متاح أثناء npm run dev. حدّث dev server ثم أعد تشغيله، أو جرّب بوضع المفتاح في localStorage باسم taapost_groq_api_key.',
      )
    }
    throw new Error(`Groq proxy failed: ${res.status} ${text || `url=${url}`}`)
  }
  const data: unknown = await res.json()
  return extractGroqContent(data)
}

async function groqChatCompletionAuto(args: {
  apiKey: string
  model: string
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
  temperature?: number
  maxCompletionTokens?: number
  topP?: number
  reasoningEffort?: 'low' | 'medium' | 'high'
}) {
  if (args.apiKey) {
    return groqChatCompletionDirect(args)
  }
  return groqChatCompletionProxy(args)
}

async function fetchChatHistoryFromDb(args: { articleId: number; visitorId: string }) {
  console.groupCollapsed('[AI Chat][DB] load')
  console.log('articleId', args.articleId)
  console.log('visitorId', args.visitorId)
  const { data, error } = await supabase
    .from('article_ai_chat_logs')
    .select('role, content, response_json, created_at')
    .eq('article_id', args.articleId)
    .eq('visitor_id', args.visitorId)
    .order('created_at', { ascending: true })
    .limit(60)
  if (error) {
    console.log('error', error)
    console.groupEnd()
    return []
  }
  console.log('rows', Array.isArray(data) ? data.length : 0)
  console.groupEnd()

  const out: ChatMessage[] = []
  for (const row of (data ?? []) as unknown[]) {
    const r = isRecord(row) ? row : null
    if (!r) continue
    const role: ChatMessage['role'] | null = r.role === 'user' ? 'user' : r.role === 'assistant' ? 'assistant' : null
    const content = typeof r.content === 'string' ? r.content : ''
    if (!role || !content.trim()) continue
    const message: ChatMessage = { role, content }
    if (role === 'assistant' && isRecord(r.response_json)) {
      const resp = r.response_json
      const citations = Array.isArray(resp.citations)
        ? resp.citations
            .filter(isRecord)
            .map((c) => (typeof c.quote === 'string' ? c.quote : ''))
            .filter((q) => q.trim().length > 0)
            .slice(0, 4)
        : []
      if (citations.length > 0) message.citations = citations
    }
    out.push(message)
  }
  return out.slice(-30)
}

async function insertChatLogToDb(args: {
  articleId: number
  visitorId: string
  role: 'user' | 'assistant'
  content: string
  responseJson?: unknown
  model: string
}) {
  const payload: Record<string, unknown> = {
    article_id: args.articleId,
    visitor_id: args.visitorId,
    role: args.role,
    content: args.content,
    model: args.model,
  }
  if (args.responseJson !== undefined) payload.response_json = args.responseJson
  const { error } = await supabase.from('article_ai_chat_logs').insert(payload)
  if (error) {
    console.log('[AI Chat][DB] insert error', error)
  } else {
    console.log('[AI Chat][DB] insert ok', args.role)
  }
}

async function fetchSummaryFromDb(args: { articleId: number; model: string; expectedHash: string }) {
  console.groupCollapsed('[AI Summary][DB] load')
  console.log('articleId', args.articleId)
  console.log('model', args.model)
  const { data, error } = await supabase
    .from('article_ai_summaries')
    .select('summary_json, content_hash')
    .eq('article_id', args.articleId)
    .eq('model', args.model)
    .maybeSingle()
  if (error) {
    console.log('error', error)
    console.groupEnd()
    return null
  }
  const hashOk = isRecord(data) && data.content_hash === args.expectedHash
  console.log('found', Boolean(data))
  console.log('hashOk', hashOk)
  console.groupEnd()
  if (!hashOk || !isRecord(data) || !isRecord(data.summary_json)) return null
  const s = data.summary_json
  const result: ArticleSummary = {
    lead: typeof s.lead === 'string' ? s.lead : '',
    key_points: toStringArray(s.key_points),
    background: toStringArray(s.background),
    implications: toStringArray(s.implications),
  }
  if (!result.lead && result.key_points.length === 0) return null
  return result
}

async function upsertSummaryToDb(args: {
  articleId: number
  model: string
  contentHash: string
  summary: ArticleSummary
}) {
  const payload = {
    article_id: args.articleId,
    model: args.model,
    content_hash: args.contentHash,
    summary_json: args.summary,
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('article_ai_summaries').upsert(payload, { onConflict: 'article_id,model' })
  if (error) {
    console.log('[AI Summary][DB] upsert error', error)
  } else {
    console.log('[AI Summary][DB] upsert ok')
  }
}

const loadCachedChat = (visitorId: string, id: number) => {
  try {
    const raw = localStorage.getItem(`taapost:${visitorId}:ai_chat:${id}`)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const out: ChatMessage[] = []
    for (const item of parsed) {
      if (!isRecord(item)) continue
      const role: ChatMessage['role'] | null =
        item.role === 'user' ? 'user' : item.role === 'assistant' ? 'assistant' : null
      const content = typeof item.content === 'string' ? item.content : ''
      if (!role || !content.trim()) continue
      const message: ChatMessage = { role, content }
      const citations =
        Array.isArray(item.citations) &&
        item.citations.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, 4)
      if (citations && citations.length > 0) message.citations = citations
      out.push(message)
    }
    return out.slice(-30)
  } catch {
    return []
  }
}

const cacheChat = (visitorId: string, id: number, messages: ChatMessage[]) => {
  try {
    localStorage.setItem(`taapost:${visitorId}:ai_chat:${id}`, JSON.stringify(messages.slice(-30)))
  } catch {
    return
  }
}

const loadCachedSummary = (visitorId: string, model: string, id: number, expectedHash: string) => {
  try {
    const raw = localStorage.getItem(`taapost:${visitorId}:ai_summary:${id}`)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return null
    if (parsed.model !== model) return null
    if (typeof parsed.contentHash !== 'string' || parsed.contentHash !== expectedHash) return null
    if (!isRecord(parsed.summary)) return null
    const s = parsed.summary
    const result: ArticleSummary = {
      lead: typeof s.lead === 'string' ? s.lead : '',
      key_points: toStringArray(s.key_points),
      background: toStringArray(s.background),
      implications: toStringArray(s.implications),
    }
    if (!result.lead && result.key_points.length === 0) return null
    return result
  } catch {
    return null
  }
}

const cacheSummary = (visitorId: string, model: string, id: number, contentHash: string, summary: ArticleSummary) => {
  try {
    localStorage.setItem(
      `taapost:${visitorId}:ai_summary:${id}`,
      JSON.stringify({
        model,
        contentHash,
        summary,
        savedAt: new Date().toISOString(),
      }),
    )
  } catch {
    return
  }
}

export default function ArticlePage() {
  const { id, slug } = useParams()
  const navigate = useNavigate()
  const routeArticleId = id && /^\d+$/.test(id) ? Number(id) : null
  const routeSlug = slug ? decodeURIComponent(slug) : ''
  const [summary, setSummary] = useState<ArticleSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const visitorId = getOrCreateVisitorId()
  const aiModel = 'openai/gpt-oss-120b'
  const [aiPlainSource, setAiPlainSource] = useState<string>('')
  const [aiSummaryHash, setAiSummaryHash] = useState<string>('')

  const siteSettingsQuery = useQuery({
    queryKey: ['site_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_settings').select('*').single()
      if (error) return null
      return data as Record<string, unknown>
    },
    staleTime: 5 * 60_000,
  })
  const showArticleSummary = (siteSettingsQuery.data?.show_article_summary as boolean | null | undefined) !== false

  const articleQueryKey = useMemo(() => {
    if (routeArticleId) return { type: 'id' as const, value: routeArticleId }
    if (routeSlug) return { type: 'slug' as const, value: routeSlug }
    return null
  }, [routeArticleId, routeSlug])

  const articleQuery = useQuery({
    queryKey: ['article_page', articleQueryKey],
    queryFn: async () => {
      if (!articleQueryKey) return { article: null as Article | null, toc: [], related: [], redirectToId: null as number | null }

      const baseQuery = supabase
        .from('articles')
        .select('*, categories(name), authors(name, image, bio, role)')

      const { data, error } =
        articleQueryKey.type === 'id'
          ? await baseQuery.eq('id', articleQueryKey.value).single()
          : await baseQuery.eq('slug', articleQueryKey.value).single()

      if (error) throw error

      if (!data) {
        return { article: null as Article | null, toc: [], related: [], redirectToId: null as number | null }
      }

      if (articleQueryKey.type === 'slug') {
        return { article: null as Article | null, toc: [], related: [], redirectToId: Number(data.id) }
      }

      const parser = new DOMParser()
      const doc = parser.parseFromString(data.content || '', 'text/html')
      const h2s = doc.querySelectorAll('h2')
      const toc: { id: string; text: string }[] = []
      h2s.forEach((h2, index) => {
        const id = `section-${index}`
        h2.id = id
        toc.push({ id, text: h2.textContent || '' })
      })

      const authorData = Array.isArray(data.authors)
        ? (data.authors.length > 0 ? data.authors[0] : null)
        : data.authors

      const article: Article = {
        ...(data as Article),
        category: (Array.isArray(data.categories) ? data.categories[0]?.name : data.categories?.name) || '',
        authors: authorData,
        contentHtml: doc.body.innerHTML,
      } as Article

      const { data: relatedData } = await supabase
        .from('articles')
        .select('id, slug, title, image, date, category_id, excerpt, is_exclusive')
        .eq('category_id', data.category_id)
        .neq('id', data.id)
        .limit(5)
        .order('date', { ascending: false })

      return {
        article,
        toc,
        related: (relatedData ?? []) as Article[],
        redirectToId: null as number | null,
      }
    },
    enabled: Boolean(articleQueryKey),
    staleTime: 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
  })

  useEffect(() => {
    const redirectToId = articleQuery.data?.redirectToId
    if (redirectToId) {
      navigate(`/post/${redirectToId}`, { replace: true })
    }
  }, [articleQuery.data?.redirectToId, navigate])

  const article = articleQuery.data?.article ?? null
  const relatedArticles = articleQuery.data?.related ?? []
  const toc = articleQuery.data?.toc ?? []
  const articleId = article?.id ?? null
  const [autoSummaryHashAttempted, setAutoSummaryHashAttempted] = useState('')

  useTrackView(article?.id || 0)

  useEffect(() => {
    if (!articleId || !article) return
    if (!showArticleSummary) {
      setSummary(null)
      setSummaryError(null)
      setChatMessages([])
      setChatInput('')
      setChatError(null)
      setAiPlainSource('')
      setAiSummaryHash('')
      return
    }
    let cancelled = false

    setSummary(null)
    setSummaryError(null)
    setChatMessages([])
    setChatInput('')
    setChatError(null)

    void (async () => {
      const plain = stripHtml(article.content || '')
      const source = clampText(plain, 18_000)
      const summaryHash = await sha256Hex(`${article.title}\n${clampText(plain, 14_000)}`)

      if (cancelled) return
      setAiPlainSource(source)
      setAiSummaryHash(summaryHash)

      const cachedSummary = loadCachedSummary(visitorId, aiModel, articleId, summaryHash)
      if (cachedSummary) {
        setSummary(cachedSummary)
      }

      const cachedChat = loadCachedChat(visitorId, articleId)
      if (cachedChat.length > 0) {
        setChatMessages(cachedChat)
      }

      console.groupCollapsed('[AI] bootstrap')
      console.log('articleId', articleId)
      console.log('visitorId', visitorId)
      const apiKey = getGroqApiKey()
      console.log('groqKey', maskApiKey(apiKey))
      console.log('aiModel', aiModel)
      console.log('hasLocalSummary', Boolean(cachedSummary))
      console.log('localChatMessages', cachedChat.length)
      console.groupEnd()

      if (!cachedSummary) {
        void (async () => {
          const fromDb = await fetchSummaryFromDb({ articleId, model: aiModel, expectedHash: summaryHash }).catch(() => null)
          if (cancelled) return
          if (fromDb) {
            setSummary(fromDb)
            cacheSummary(visitorId, aiModel, articleId, summaryHash, fromDb)
          }
        })()
      }

      void (async () => {
        const dbChat = await fetchChatHistoryFromDb({ articleId, visitorId }).catch(() => [])
        if (cancelled) return
        if (dbChat.length > 0) {
          setChatMessages(dbChat)
          cacheChat(visitorId, articleId, dbChat)
        }
      })()
    })()

    return () => {
      cancelled = true
    }
  }, [articleId, article, visitorId, showArticleSummary])

  const generateSummary = useCallback(async (force = false) => {
    if (!articleId) return
    if (!aiPlainSource.trim() || !aiSummaryHash.trim()) {
      setSummaryError('تعذر تجهيز نص المقال للتلخيص')
      return
    }
    if (!force) {
      const cached = loadCachedSummary(visitorId, aiModel, articleId, aiSummaryHash)
      if (cached) {
        setSummary(cached)
        return
      }
    }

    setSummaryLoading(true)
    setSummaryError(null)
    try {
      console.groupCollapsed('[AI Summary] generate')
      console.log('articleId', articleId)
      console.log('force', force)
      console.log('visitorId', visitorId)
      const apiKey = getGroqApiKey()
      console.log('groqKey', maskApiKey(apiKey))
      console.log('groqMode', apiKey ? 'direct' : 'proxy')

      const system = {
        role: 'system' as const,
        content:
          [
            'أنت محرّر عربي محترف في منصة صحفية.',
            'تلخّص المقال اعتمادًا على نصّه فقط: لا تضف معلومات خارجية، ولا تُخمّن، ولا تُبالغ.',
            'اكتب بالعربية الفصحى الواضحة، بألفاظ منتقاة، وجُمَل قصيرة مكثفة.',
            'يجوز سجعٌ خفيف أو خاتمة موزونة إن جاء عفوًا بلا تكلّف وبلا إطالة.',
            'ممنوع ذكر أنك نموذج ذكاء اصطناعي أو الحديث عن السياسات أو الأدوات.',
          ].join('\n'),
      }
      const user = {
        role: 'user' as const,
        content: [
          'لخّص المقال التالي اعتمادًا على النص فقط.',
          'أخرج الإجابة كـ JSON صالح 100% بدون Markdown وبدون أي نص إضافي.',
          'الشكل المطلوب:',
          '{',
          '  "lead": "فقرة موجزة (جملتان كحد أقصى) تلخّص الخبر/الفكرة",',
          '  "key_points": ["4-6 نقاط دقيقة بلا حشو"],',
          '  "background": ["2-4 نقاط سياق من داخل المقال فقط"],',
          '  "implications": ["2-4 نقاط: لماذا يهم هذا للقارئ"],',
          '}',
          '',
          'قيود مهمة:',
          '- لا تكرر العنوان حرفيًا إلا لضرورة.',
          '- تجنّب العموميات (مثل: هذا أمر مهم) واستبدلها بمعنى محدد.',
          '- لا تذكر مصادر خارج نص المقال.',
          '',
          `عنوان المقال: ${article?.title ?? ''}`,
          '',
          `نص المقال (مقتطف منسّق): ${aiPlainSource}`,
        ].join('\n'),
      }

      console.log('request:groq', { model: aiModel, chars: aiPlainSource.length })
      const raw = await groqChatCompletionAuto({
        apiKey,
        model: aiModel,
        messages: [system, user],
        temperature: 0.15,
        maxCompletionTokens: 900,
        topP: 1,
        reasoningEffort: 'medium',
      })
      console.log('response:groq chars', raw.length)

      let parsed = parseJsonObjectFromText(raw)
      if (!parsed) {
        console.log('parse:failed sample', raw.slice(0, 1200))
        const raw2 = await groqChatCompletionAuto({
          apiKey,
          model: aiModel,
          messages: [
            system,
            {
              role: 'user' as const,
              content: `${user.content}\n\nمهم جدًا: أرسل JSON فقط (بدون أي نص خارج JSON).`,
            },
          ],
          temperature: 0,
          maxCompletionTokens: 900,
          topP: 1,
          reasoningEffort: 'low',
        })
        console.log('response:groq retry chars', raw2.length)
        parsed = parseJsonObjectFromText(raw2)
        if (!parsed) {
          console.log('parse:failed retry sample', raw2.slice(0, 1200))
          console.groupEnd()
          throw new Error('تعذر فهم مخرجات الذكاء الاصطناعي')
        }
      }

      const s: ArticleSummary = {
        lead: typeof parsed.lead === 'string' ? parsed.lead : '',
        key_points: toStringArray(parsed.key_points),
        background: toStringArray(parsed.background),
        implications: toStringArray(parsed.implications),
      }
      setSummary(s)
      cacheSummary(visitorId, aiModel, articleId, aiSummaryHash, s)
      console.log('cache:local ok')
      await upsertSummaryToDb({ articleId, model: aiModel, contentHash: aiSummaryHash, summary: s }).catch(() => void 0)
      console.groupEnd()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'تعذر تحميل ملخص المقال'
      setSummaryError(message)
    } finally {
      setSummaryLoading(false)
    }
  }, [articleId, aiPlainSource, aiSummaryHash, visitorId, aiModel, article?.title])

  useEffect(() => {
    if (!articleId) return
    if (!showArticleSummary) return
    if (!aiSummaryHash.trim() || !aiPlainSource.trim()) return
    if (summary || summaryLoading) return
    if (autoSummaryHashAttempted === aiSummaryHash) return
    setAutoSummaryHashAttempted(aiSummaryHash)
    void generateSummary(false)
  }, [articleId, aiSummaryHash, aiPlainSource, summary, summaryLoading, autoSummaryHashAttempted, generateSummary, showArticleSummary])

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

    const withUser: ChatMessage[] = [...chatMessages, { role: 'user' as const, content }].slice(-30)
    setChatMessages(withUser)
    cacheChat(visitorId, articleId, withUser)
    if (!text) setChatInput('')

    try {
      console.groupCollapsed('[AI Chat] send')
      console.log('articleId', articleId)
      console.log('visitorId', visitorId)
      console.log('inputChars', content.length)
      if (!aiPlainSource.trim()) {
        console.groupEnd()
        throw new Error('تعذر تجهيز نص المقال للمحادثة')
      }

      const apiKey = getGroqApiKey()
      console.log('groqKey', maskApiKey(apiKey))
      console.log('groqMode', apiKey ? 'direct' : 'proxy')

      void insertChatLogToDb({ articleId, visitorId, role: 'user', content, model: aiModel })

      const payloadMessages = withUser.slice(-14)
      const system = {
        role: 'system' as const,
        content:
          [
            'أنت محرّر مساعد يجيب عن أسئلة القارئ مستندًا إلى نص هذا المقال، مع ذكاء في وصل المعاني وربط الخيوط.',
            'اجعل نص المقال مرجعك الأول: استخرج منه ما يسند جوابك حرفيًا قدر الإمكان.',
            'إن كان السؤال بعيدًا عن موضوع المقال: لا ترفض ولا تعتذر ولا تقل إن السؤال غير متماشٍ مع السياق؛ بل اصنع جسرًا بلاغيًا نحو ما ورد في المقال ثم قدّم جوابًا عامًا منضبطًا.',
            'إذا احتجت لمعلومة لا يذكرها المقال صراحة: صِغ ذلك بلباقة (مثل: "لا يورد المقال تفصيلًا مباشرًا عن...") ثم قدّم إطارًا معرفيًا عامًا بدون اختلاق حقائق أو أرقام أو أسماء.',
            'اكتب بالعربية الفصحى الواضحة، بإيجاز، وبأسلوب صحفي رصين.',
            'يجوز سجع خفيف أو خاتمة موزونة في جملة واحدة إن لاقَ المقام بلا تكلّف.',
            'ممنوع ذكر أنك نموذج ذكاء اصطناعي.',
          ].join('\n'),
      }
      const instructions = {
        role: 'user' as const,
        content: [
          'ستتلقى نص المقال ثم سؤال القارئ.',
          'أجب بإيجاز واضح ودقيق. حتى لو كان السؤال بعيدًا: ابدأ بجملة تربط السؤال بالمقال، ثم قدّم جوابًا مفيدًا ومتسقًا مع زاوية المقال.',
          'اكتب الإجابة داخل answer كـ HTML منسّق (بدون Markdown). استخدم فقط: <p> <strong> <em> <ul> <ol> <li> <blockquote> <br> <a>.',
          'في كل الأحوال أخرج JSON صالح 100% بدون Markdown وبدون أي نص إضافي بالشكل:',
          '{',
          '  "answer": "HTML",',
          '  "citations": [{"quote": "اقتباس قصير حرفيًا من النص"}, {"quote": "اقتباس قصير آخر"}],',
          '}',
          '',
          'قواعد الاستشهاد:',
          '- اجعل citations من داخل نص المقال حرفيًا وباختصار متى أمكن، حتى لو كانت الاستشهادات لخدمة الربط لا لإعطاء معلومة خارج النص.',
          '- إن تعذّر استخراج أي اقتباس مناسب حرفيًا: اجعل citations = [].',
          '',
          `عنوان المقال: ${article?.title ?? ''}`,
          '',
          `نص المقال (مقتطف): ${aiPlainSource}`,
          '',
          `سؤال القارئ: ${content}`,
        ].join('\n'),
      }

      console.log('request:groq', { model: aiModel, messages: payloadMessages.length })
      const raw = await groqChatCompletionAuto({
        apiKey,
        model: aiModel,
        messages: [system, ...payloadMessages.map((m) => ({ role: m.role, content: m.content })), instructions],
        temperature: 0.35,
        maxCompletionTokens: 900,
        topP: 1,
        reasoningEffort: 'medium',
      })
      console.log('response:groq chars', raw.length)

      let parsed = parseJsonObjectFromText(raw)
      if (!parsed) {
        console.log('parse:failed sample', raw.slice(0, 1200))
        const raw2 = await groqChatCompletionAuto({
          apiKey,
          model: aiModel,
          messages: [
            system,
            ...payloadMessages.map((m) => ({ role: m.role, content: m.content })),
            {
              role: 'user' as const,
              content: `${instructions.content}\n\nمهم جدًا: أرسل JSON فقط (بدون أي نص خارج JSON).`,
            },
          ],
          temperature: 0,
          maxCompletionTokens: 900,
          topP: 1,
          reasoningEffort: 'low',
        })
        console.log('response:groq retry chars', raw2.length)
        parsed = parseJsonObjectFromText(raw2)
        if (!parsed) {
          console.log('parse:failed retry sample', raw2.slice(0, 1200))
          console.groupEnd()
          throw new Error('تعذر فهم مخرجات الذكاء الاصطناعي')
        }
      }

      const answer = typeof parsed.answer === 'string' ? enforceNoApologyOrRejection(parsed.answer) : ''
      const citations = Array.isArray(parsed.citations)
        ? parsed.citations
            .filter(isRecord)
            .map((c) => (typeof c.quote === 'string' ? c.quote : ''))
            .filter((q) => q.trim().length > 0)
            .slice(0, 4)
        : []

      const next: ChatMessage[] = [
        ...withUser,
        { role: 'assistant' as const, content: answer || '<p>تعذر توليد إجابة مفهومة حاليًا.</p>', citations },
      ].slice(-30)
      setChatMessages(next)
      cacheChat(visitorId, articleId, next)
      void insertChatLogToDb({
        articleId,
        visitorId,
        role: 'assistant',
        content: answer || '<p>تعذر توليد إجابة مفهومة حاليًا.</p>',
        responseJson: { answer, citations: citations.map((q) => ({ quote: q })) },
        model: aiModel,
      })
      console.groupEnd()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'تعذر إرسال سؤالك'
      setChatError(message)
    } finally {
      setChatLoading(false)
    }
  }

  if (articleQuery.isLoading) {
    return (
      <div className="container max-w-7xl py-8 md:py-12">
        <div className="space-y-6">
          <div className="h-8 w-40 rounded bg-muted/40 animate-pulse" />
          <div className="h-[280px] w-full rounded-lg bg-muted/40 animate-pulse" />
          <div className="space-y-3">
            <div className="h-6 w-5/6 rounded bg-muted/50 animate-pulse" />
            <div className="h-4 w-4/6 rounded bg-muted/40 animate-pulse" />
            <div className="h-4 w-3/6 rounded bg-muted/40 animate-pulse" />
          </div>
        </div>
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
                {showArticleSummary && (
                  <li>
                    <button
                      onClick={() => handleScrollTo('article-summary')}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors text-right w-full block truncate"
                      title="ملخص المقال"
                    >
                      <span className="font-bold ml-1">★</span> ملخص المقال
                    </button>
                  </li>
                )}
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
          {/* Content */}
          <div className="w-full overflow-hidden break-normal rounded-[5px] border border-border/40 bg-card/30 p-6 backdrop-blur-sm md:p-10">
            <div 
              className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-bold prose-headings:text-primary prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-[5px] prose-p:text-foreground/90 prose-strong:text-foreground prose-li:text-foreground/90 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:py-1 prose-blockquote:pr-4 prose-blockquote:rounded-r-sm prose-h2:text-xl md:prose-h2:text-3xl [&_a]:break-all"
              dangerouslySetInnerHTML={{ __html: article.contentHtml || '' }}
            />
          </div>

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

          {showArticleSummary && (
            <section id="article-summary" className="rounded-[5px] border border-border/40 bg-card/30 p-6 backdrop-blur-sm md:p-8">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">ملخص المقال</h2>
                  <p className="text-sm text-muted-foreground">تلخيص ذكي ومنظم يعتمد على نص المقال نفسه</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {chatMessages.length > 0 && (
                    <button
                      onClick={() => {
                        setChatMessages([])
                        setChatError(null)
                        if (articleId) {
                          localStorage.removeItem(`taapost:${visitorId}:ai_chat:${articleId}`)
                        }
                      }}
                      className="rounded-[5px] border border-border/60 bg-card/60 px-3 py-2 text-sm text-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors"
                    >
                      مسح المحادثة
                    </button>
                  )}
                  <button
                    onClick={() => void generateSummary(true)}
                    className="rounded-[5px] bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={summaryLoading}
                  >
                    {summaryLoading ? 'جاري التلخيص…' : 'تحديث الملخص'}
                  </button>
                </div>
              </div>

              {summaryError && (
                <div className="mt-4 rounded-[5px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  تعذر إظهار الملخص حاليًا: {summaryError}
                </div>
              )}

              {chatError && (
                <div className="mt-4 rounded-[5px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  تعذر إكمال المحادثة: {chatError}
                </div>
              )}

              {!summaryError && !summary && summaryLoading && (
                <div className="mt-5 text-sm text-muted-foreground">جاري إعداد ملخص المقال…</div>
              )}

              {summary && (
                <div className="mt-6 space-y-6">
                  {summary.lead && <p className="text-foreground/90 leading-relaxed">{summary.lead}</p>}

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
                </div>
              )}

              <div className="mt-6 rounded-[5px] border border-border/50 bg-card/40 p-4 md:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-foreground">ناقش المقال</div>
                  <div className="text-xs text-muted-foreground">محادثة على ضوء المقال وما يتصل به</div>
                </div>

                <div className="mt-4 space-y-3">
                  {chatMessages.length === 0 && (
                    <div className="rounded-[5px] border border-border/50 bg-card/50 px-4 py-4 text-sm text-muted-foreground">
                      اكتب سؤالك، وسأجيبك على ضوء المقال وما يفتحه من أبواب المعنى.
                    </div>
                  )}

                  {chatMessages.map((m, idx) => {
                    if (m.role === 'user') {
                      return (
                        <div key={idx} className="flex justify-end">
                          <div className="max-w-[92%] rounded-[5px] px-4 py-3 text-sm leading-relaxed border bg-primary text-primary-foreground border-primary/20">
                            <div className="whitespace-pre-wrap">{m.content}</div>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div key={idx} className="w-full">
                        <div className="w-full rounded-[5px] border border-border/50 bg-card/70 px-4 py-3">
                          <div
                            className="prose prose-sm md:prose-base max-w-none dark:prose-invert prose-headings:font-bold prose-headings:text-primary prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-[5px] prose-p:text-foreground/90 prose-strong:text-foreground prose-li:text-foreground/90 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:py-1 prose-blockquote:pr-4 prose-blockquote:rounded-r-sm [&_a]:break-all"
                            dangerouslySetInnerHTML={{ __html: sanitizeAiHtml(m.content) }}
                          />
                          {m.citations && m.citations.length > 0 && (
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
                        </div>
                      </div>
                    )
                  })}

                  <div className="flex flex-col gap-2 md:flex-row md:items-end">
                    <textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="اكتب رسالتك هنا…"
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
              </div>
            </section>
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
                  to={`/post/${related.id}`}
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
