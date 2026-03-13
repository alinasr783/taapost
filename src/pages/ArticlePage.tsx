import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  Folder,
  Image as ImageIcon,
  Info,
  Link2,
  PieChart as PieChartIcon,
  Send,
  Sparkles,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase, type Article } from '../lib/supabase'
import { useTrackView } from '../hooks/useTrackView'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type AiBlock =
  | { type: 'html'; html: string }
  | {
      type: 'chart'
      chartType: 'bar' | 'line' | 'pie'
      title?: string
      data: Record<string, unknown>[]
      xKey?: string
      yKey?: string
      nameKey?: string
      valueKey?: string
    }
  | { type: 'image'; src: string; alt?: string; caption?: string }
  | {
      type: 'articles'
      title?: string
      items: { id: number; title?: string; slug?: string; image?: string; reason?: string }[]
    }
  | { type: 'icons'; title?: string; items: { name: string; label?: string }[] }
  | { type: 'divider'; label?: string }

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  citations?: string[]
  blocks?: AiBlock[]
  suggestedQuestions?: string[]
}

const CHART_COLORS = ['#7c2d12', '#a16207', '#0f766e', '#1d4ed8', '#6d28d9', '#c2410c']

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

function resolveImageSrc(input: string) {
  const src = input.trim()
  if (!src) return ''
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith('blob:')) {
    return src
  }
  if (src.startsWith('/') && typeof window !== 'undefined') {
    return `${window.location.origin}${src}`
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/${src.replace(/^\/+/, '')}`
  }
  return src
}

async function searchArticlesInSupabase(args: { query: string; limit?: number; excludeId?: number | null }) {
  const q = args.query.trim()
  if (!q) return []
  const limit = Math.max(1, Math.min(10, args.limit ?? 6))
  const like = `%${q}%`

  let query = supabase
    .from('articles')
    .select('id, slug, title, excerpt, image, date')
    .or(`title.ilike.${like},excerpt.ilike.${like}`)
    .order('date', { ascending: false })
    .limit(limit)

  if (args.excludeId) query = query.neq('id', args.excludeId)

  const { data, error } = await query
  if (error || !data) return []
  return (data as unknown[]).filter(isRecord).map((r) => ({
    id: Number(r.id),
    slug: typeof r.slug === 'string' ? r.slug : '',
    title: typeof r.title === 'string' ? r.title : '',
    excerpt: typeof r.excerpt === 'string' ? r.excerpt : '',
    image: typeof r.image === 'string' ? r.image : '',
    date: typeof r.date === 'string' ? r.date : '',
  }))
}

async function getArticleFromSupabase(args: { id?: number; slug?: string }) {
  if (typeof args.id === 'number' && Number.isFinite(args.id) && args.id > 0) {
    const { data, error } = await supabase.from('articles').select('id, slug, title, content, excerpt, image, date').eq('id', args.id).single()
    if (error || !data) return null
    const r = isRecord(data) ? data : null
    if (!r) return null
    return {
      id: Number(r.id),
      slug: typeof r.slug === 'string' ? r.slug : '',
      title: typeof r.title === 'string' ? r.title : '',
      excerpt: typeof r.excerpt === 'string' ? r.excerpt : '',
      image: typeof r.image === 'string' ? r.image : '',
      date: typeof r.date === 'string' ? r.date : '',
      content: typeof r.content === 'string' ? r.content : '',
    }
  }
  const slug = typeof args.slug === 'string' ? args.slug.trim() : ''
  if (!slug) return null
  const { data, error } = await supabase.from('articles').select('id, slug, title, content, excerpt, image, date').eq('slug', slug).single()
  if (error || !data) return null
  const r = isRecord(data) ? data : null
  if (!r) return null
  return {
    id: Number(r.id),
    slug: typeof r.slug === 'string' ? r.slug : '',
    title: typeof r.title === 'string' ? r.title : '',
    excerpt: typeof r.excerpt === 'string' ? r.excerpt : '',
    image: typeof r.image === 'string' ? r.image : '',
    date: typeof r.date === 'string' ? r.date : '',
    content: typeof r.content === 'string' ? r.content : '',
  }
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

async function* readGroqSseContent(res: Response) {
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Groq stream failed: ${res.status} ${text}`)
  }
  const body = res.body
  if (!body) throw new Error('Groq stream missing body')

  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''
  let yielded = false

  const tryExtractJsonContent = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) return ''
    try {
      const parsed: unknown = JSON.parse(trimmed)
      const r = isRecord(parsed) ? parsed : null
      const choices = r && Array.isArray(r.choices) ? r.choices : null
      const first = choices && choices[0] && isRecord(choices[0]) ? choices[0] : null
      const msg = first && isRecord(first.message) ? first.message : null
      const content = msg && typeof msg.content === 'string' ? msg.content : ''
      return content || ''
    } catch {
      return ''
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    const chunkText = decoder.decode(value, { stream: true })
    fullText += chunkText
    buffer += chunkText

    while (true) {
      const sep = buffer.indexOf('\n')
      if (sep === -1) break
      const line = buffer.slice(0, sep).trimEnd()
      buffer = buffer.slice(sep + 1)

      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (!data) continue
      if (data === '[DONE]') return
      let parsed: unknown = null
      try {
        parsed = JSON.parse(data)
      } catch {
        continue
      }
      const r = isRecord(parsed) ? parsed : null
      const choices = r && Array.isArray(r.choices) ? r.choices : null
      const first = choices && choices[0] && isRecord(choices[0]) ? choices[0] : null
      const delta = first && isRecord(first.delta) ? first.delta : null
      const content = delta && typeof delta.content === 'string' ? delta.content : ''
      const altText = delta && typeof (delta as Record<string, unknown>).text === 'string' ? String((delta as Record<string, unknown>).text) : ''
      const deltaContentValue = delta ? (delta as Record<string, unknown>).content : null
      const contentParts =
        Array.isArray(deltaContentValue)
          ? deltaContentValue
              .filter(isRecord)
              .map((p: Record<string, unknown>) => (typeof p.text === 'string' ? p.text : ''))
              .join('')
          : ''
      const message = first && isRecord(first.message) ? first.message : null
      const messageContent = message && typeof message.content === 'string' ? message.content : ''
      const out = content || contentParts || altText || messageContent
      if (out) {
        yielded = true
        yield out
      }
    }
  }

  if (buffer.trim()) {
    fullText += buffer
    buffer += '\n'
    while (true) {
      const sep = buffer.indexOf('\n')
      if (sep === -1) break
      const line = buffer.slice(0, sep).trimEnd()
      buffer = buffer.slice(sep + 1)
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (!data || data === '[DONE]') continue
      try {
        const parsed: unknown = JSON.parse(data)
        const r = isRecord(parsed) ? parsed : null
        const choices = r && Array.isArray(r.choices) ? r.choices : null
        const first = choices && choices[0] && isRecord(choices[0]) ? choices[0] : null
        const delta = first && isRecord(first.delta) ? first.delta : null
        const content = delta && typeof delta.content === 'string' ? delta.content : ''
        if (content) {
          yielded = true
          yield content
        }
      } catch {
        continue
      }
    }
  }

  if (!yielded) {
    const extracted = tryExtractJsonContent(fullText)
    if (extracted) yield extracted
  }
}

async function groqChatCompletionStreamDirect(args: {
  apiKey: string
  model: string
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
  temperature?: number
  maxCompletionTokens?: number
  topP?: number
  reasoningEffort?: 'low' | 'medium' | 'high'
  signal?: AbortSignal
}) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    signal: args.signal,
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
      stream: true,
      stop: null,
    }),
  })
  return readGroqSseContent(res)
}

async function groqChatCompletionStreamProxy(args: {
  model: string
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
  temperature?: number
  maxCompletionTokens?: number
  topP?: number
  reasoningEffort?: 'low' | 'medium' | 'high'
  signal?: AbortSignal
}) {
  const isDev = Boolean((import.meta as unknown as { env?: Record<string, unknown> }).env?.DEV)
  const url = '/api/groq-chat'
  const res = await fetch(url, {
    method: 'POST',
    signal: args.signal,
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({
      model: args.model,
      messages: args.messages,
      temperature: args.temperature ?? 0.35,
      max_completion_tokens: args.maxCompletionTokens ?? 900,
      top_p: args.topP ?? 1,
      reasoning_effort: args.reasoningEffort ?? 'medium',
      stream: true,
    }),
  })

  if (res.status === 404 && isDev) {
    throw new Error(
      'Groq proxy غير متاح أثناء npm run dev. حدّث dev server ثم أعد تشغيله، أو جرّب بوضع المفتاح في localStorage باسم taapost_groq_api_key.',
    )
  }

  return readGroqSseContent(res)
}

async function groqChatCompletionStreamAuto(args: {
  apiKey: string
  model: string
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
  temperature?: number
  maxCompletionTokens?: number
  topP?: number
  reasoningEffort?: 'low' | 'medium' | 'high'
  signal?: AbortSignal
}) {
  if (args.apiKey) {
    return groqChatCompletionStreamDirect(args)
  }
  return groqChatCompletionStreamProxy(args)
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
    if (!role) continue
    if (role === 'user' && content.trim() === '[AUTO] smart_summary') continue
    if (role === 'user' && !content.trim()) continue
    const message: ChatMessage = { role, content }
    if (role === 'assistant' && isRecord(r.response_json)) {
      const resp = r.response_json
      const blocks =
        Array.isArray(resp.blocks) ? resp.blocks.filter(isRecord).map((b) => b as unknown as AiBlock).slice(0, 40) : []
      if (blocks.length > 0) message.blocks = blocks

      const citationsStrings = toStringArray(resp.citations).slice(0, 4)
      const citationsObjects = Array.isArray(resp.citations)
        ? resp.citations
            .filter(isRecord)
            .map((c) => (typeof c.quote === 'string' ? c.quote : ''))
            .filter((q) => q.trim().length > 0)
            .slice(0, 4)
        : []
      const citations = citationsStrings.length > 0 ? citationsStrings : citationsObjects
      if (citations.length > 0) message.citations = citations

      const suggested = toStringArray(resp.suggestedQuestions ?? resp.suggested_questions).slice(0, 4)
      if (suggested.length > 0) message.suggestedQuestions = suggested
    }

    if (!message.content.trim() && (!message.blocks || message.blocks.length === 0)) continue
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

void 0

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
      if (!role) continue
      if (role === 'user' && content.trim() === '[AUTO] smart_summary') continue
      const message: ChatMessage = { role, content }
      if (!content.trim()) {
        const blocks = Array.isArray(item.blocks)
          ? item.blocks.filter(isRecord).map((b) => b as unknown as AiBlock)
          : []
        if (blocks.length > 0) message.blocks = blocks
      } else {
        const blocks = Array.isArray(item.blocks)
          ? item.blocks.filter(isRecord).map((b) => b as unknown as AiBlock)
          : []
        if (blocks.length > 0) message.blocks = blocks
      }
      const citations =
        Array.isArray(item.citations) &&
        item.citations.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, 4)
      if (citations && citations.length > 0) message.citations = citations
      const suggestedQuestions =
        Array.isArray(item.suggestedQuestions) &&
        item.suggestedQuestions.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, 4)
      if (suggestedQuestions && suggestedQuestions.length > 0) message.suggestedQuestions = suggestedQuestions
      if (!message.content.trim() && (!message.blocks || message.blocks.length === 0)) continue
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

export default function ArticlePage() {
  const { id, slug } = useParams()
  const navigate = useNavigate()
  const routeArticleId = id && /^\d+$/.test(id) ? Number(id) : null
  const routeSlug = slug ? decodeURIComponent(slug) : ''
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const visitorId = getOrCreateVisitorId()
  const aiModel = 'openai/gpt-oss-120b'
  const [aiPlainSource, setAiPlainSource] = useState<string>('')
  const autoSmartSummaryDoneRef = useRef(false)
  const activeStreamAbortRef = useRef<AbortController | null>(null)
const iconWhitelist: Record<string, (props: { className?: string }) => ReactNode> = {
    Sparkles,
    TrendingUp,
    Info,
    AlertTriangle,
    BarChart3,
    PieChart: PieChartIcon,
    Link2,
    Image: ImageIcon,
  }

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

  const clearChat = () => {
    setChatMessages([])
    setChatError(null)
    if (articleId) localStorage.removeItem(`taapost:${visitorId}:ai_chat:${articleId}`)
    autoSmartSummaryDoneRef.current = false
  }

  useTrackView(article?.id || 0)

  useEffect(() => {
    if (!articleId || !article) return
    if (!showArticleSummary) {
      setChatMessages([])
      setChatInput('')
      setChatError(null)
      setAiPlainSource('')
      autoSmartSummaryDoneRef.current = false
      activeStreamAbortRef.current?.abort()
      activeStreamAbortRef.current = null
      return
    }
    let cancelled = false

    setChatMessages([])
    setChatInput('')
    setChatError(null)
    autoSmartSummaryDoneRef.current = false
    activeStreamAbortRef.current?.abort()
    activeStreamAbortRef.current = null

    void (async () => {
      const plain = stripHtml(article.content || '')
      const source = clampText(plain, 18_000)
      if (cancelled) return
      setAiPlainSource(source)

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
      console.log('localChatMessages', cachedChat.length)
      console.groupEnd()

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
      activeStreamAbortRef.current?.abort()
      activeStreamAbortRef.current = null
    }
  }, [articleId, article, visitorId, showArticleSummary])

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

  const sendChat = async (
    text?: string,
    opts?: {
      silentUser?: boolean
      preset?: 'smart_summary'
    },
  ) => {
    if (!articleId || !article) return
    activeStreamAbortRef.current?.abort()
    activeStreamAbortRef.current = null
    const userContent =
      opts?.preset === 'smart_summary'
        ? 'قدّم ملخص المقال الذكي كواجهة تفاعلية: فقرة افتتاحية مركزة، ثم نقاط أساسية، ثم سياق، ثم لماذا يهم. قدّم أيضًا سؤالين يقترحهما القارئ، واقترح مقالين من باقي المنصة للقراءة (إن وجدت).'
        : (text ?? chatInput).trim()

    const content = userContent.trim()
    if (!content) return

    if (!aiPlainSource.trim()) {
      setChatError('تعذر تجهيز نص المقال للمحادثة')
      return
    }

    setChatError(null)
    setChatLoading(true)

    const baseMessages = opts?.silentUser ? chatMessages : [...chatMessages, { role: 'user' as const, content }]
    const withUser = baseMessages.slice(-30)
    setChatMessages(withUser)
    cacheChat(visitorId, articleId, withUser)
    if (!opts?.silentUser && !text) setChatInput('')

    const assistantIndex = withUser.length
    const placeholder: ChatMessage = {
      role: 'assistant',
      content: '',
      blocks: [
        {
          type: 'html',
          html:
            opts?.preset === 'smart_summary'
              ? '<p><strong>جاري إعداد ملخص المقال الذكي…</strong></p>'
              : '<p><strong>جاري التفكير…</strong></p>',
        },
      ],
    }
    setChatMessages((prev) => [...prev.slice(0, assistantIndex), placeholder].slice(-30))

    const updateAssistant = (patch: Partial<ChatMessage>) => {
      setChatMessages((prev) => {
        const next = [...prev]
        const idx = Math.min(assistantIndex, next.length - 1)
        const existing = next[idx]
        if (!existing || existing.role !== 'assistant') return prev
        next[idx] = { ...existing, ...patch }
        cacheChat(visitorId, articleId, next)
        return next
      })
    }

    const buildSystemPrompt = (extraContext?: string) =>
      [
        'أنت مساعد صحفي عربي ذكي داخل منصة "TaaPost".',
        'لا تذكر أنك نموذج ذكاء اصطناعي.',
        'اجعل الإجابة Mobile-First: فقرات قصيرة، قوائم واضحة، بلا ازدحام.',
        '',
        'مهم: لديك نص المقال داخل هذا الـSystem Prompt، فاعتمد عليه أولًا عند التحليل والشرح.',
        `قد يكون النص مقتطعًا بسبب قيود الطول؛ إن احتجت كامل المقال اطلب: {"type":"tool","name":"get_article","args":{"id":${articleId}}}.`,
        '',
        `معرّف المقال الحالي: ${articleId}`,
        '',
        `عنوان المقال: ${article.title}`,
        '',
        `نص المقال (مقتطف منسّق): ${aiPlainSource}`,
        '',
        'إضافات المنصة:',
        '- يمكنك الاستعانة بمقالات أخرى داخل المنصة كمرجع أو اقتراح قراءة.',
        '- ممنوع اختراع مقالات أو IDs أو روابط غير موجودة. عند إنشاء Block من نوع articles يجب أن تعتمد فقط على نتائج أدوات المنصة (search_articles / get_article).',
        '- إذا لم تصلك نتائج أدوات، لا تُخرج Block من نوع articles.',
        '- لا تضع روابط داخل html لمقالات داخلية إلا إذا كان الـid/slug جاء من نتائج الأدوات.',
        '',
        'التنقل (Navigation) داخل الموقع:',
        '- صفحة المقال: /post/:id (مثال: /post/123).',
        '- صفحة الأقسام: /categories و /category/:id.',
        '- قائمة المقالات: /posts.',
        '- يوجد مسارات عربية مكافئة: /المقالات و /الأقسام و /مقال/:slug و /قسم/:slug.',
        '',
        'قاعدة البيانات (Supabase) الحالية (للسياق فقط، لا تطلب مفاتيح ولا تعرضها):',
        '- articles: id, slug, title, excerpt, content, image, category_id, type, date, author_id, is_exclusive.',
        '- categories: id, slug, name, description, topics, image, order_index, display_order.',
        '- authors: id, name, image, bio, role.',
        '- article_ai_chat_logs: article_id, visitor_id, role, content, response_json, model, created_at.',
        '- article_ai_summaries: article_id, model, content_hash, summary_json, updated_at.',
        '- article_views: article_id, viewed_at, country, city, device_type, ip_hash.',
        '- للوصول إلى قاعدة المقالات: اطلب أداة من الواجهة بإخراج سطر واحد فقط (JSON) بالشكل:',
        '{"type":"tool","name":"search_articles","args":{"query":"كلمة","limit":6}}',
        '{"type":"tool","name":"get_article","args":{"id":123}}',
        '{"type":"tool","name":"get_article","args":{"slug":"..."} }',
        'بعدها ستتلقى نتيجة الأداة ثم تُكمل الإجابة.',
        '',
        'صيغة الإخراج (Streaming NDJSON):',
        '- اكتب كل Block في سطر JSON مستقل بدون Markdown.',
        '- الأنواع المسموحة: html, chart, image, articles, icons, divider, meta, done.',
        '- مثال html:',
        '{"type":"html","html":"<p>نص</p>"}',
        '- مثال chart (استخدم Recharts ضمنيًا):',
        '{"type":"chart","chartType":"bar","title":"عنوان","data":[{"name":"X","value":10}],"xKey":"name","yKey":"value"}',
        '- مثال articles:',
        '{"type":"articles","title":"اقرأ أيضًا","items":[{"id":1,"title":"...","reason":"...","image":"..."}]}',
        '- مثال icons:',
        '{"type":"icons","title":"ملخص سريع","items":[{"name":"Sparkles","label":"..."}]}',
        '- في النهاية أرسل meta ثم done:',
        '{"type":"meta","citations":["اقتباس حرفي"],"suggestedQuestions":["سؤال"],"safeHtml":true}',
        '{"type":"done"}',
        '',
        extraContext ? `سياق إضافي من أدوات المنصة:\n${extraContext}` : '',
      ]
        .filter((x) => x !== '')
        .join('\n')

    const toLlmMessages = (messages: ChatMessage[]) =>
      messages
        .filter((m) => m.content.trim().length > 0 || (m.blocks && m.blocks.length > 0))
        .slice(-12)
        .map((m) => {
          if (m.role === 'user') return { role: 'user' as const, content: m.content }
          const html =
            m.blocks && m.blocks.length > 0
              ? m.blocks
                  .filter((b) => b.type === 'html')
                  .map((b) => (b.type === 'html' ? b.html : ''))
                  .join('\n')
              : m.content
          return { role: 'assistant' as const, content: clampText(stripHtml(html), 900) }
        })

    const parseJsonLine = (line: string) => {
      const trimmed = line.trim()
      if (!trimmed) return null
      try {
        const parsed: unknown = JSON.parse(trimmed)
        return isRecord(parsed) ? parsed : null
      } catch {
        return null
      }
    }

    const renderBlockPreviewHtml = (blocks: AiBlock[]) => {
      const html = blocks
        .filter((b) => b.type === 'html')
        .map((b) => (b.type === 'html' ? b.html : ''))
        .join('\n')
      return html.trim() ? html : '<p>…</p>'
    }

    let allowedArticles = new Map<number, { id: number; slug: string; title: string; excerpt: string; image: string; date: string; content?: string }>()

    const sanitizeBlocks = (input: AiBlock[]) => {
      const out: AiBlock[] = []
      for (const b of input) {
        if (b.type !== 'articles') {
          out.push(b)
          continue
        }

        if (allowedArticles.size === 0) continue
        const items = b.items.flatMap((it) => {
          const known = allowedArticles.get(it.id)
          if (!known) return []
          const title = known.title || it.title
          const slug = known.slug || it.slug
          const image = known.image || it.image
          const reason = it.reason
          return [
            {
              id: known.id,
              ...(title ? { title } : {}),
              ...(slug ? { slug } : {}),
              ...(image ? { image } : {}),
              ...(reason ? { reason } : {}),
            },
          ]
        })
        if (items.length > 0) out.push({ ...b, items: items.slice(0, 6) })
      }
      return out
    }

    const runOnce = async (extraContext?: string) => {
      const apiKey = getGroqApiKey()
      const abort = new AbortController()
      activeStreamAbortRef.current = abort

      const llmMessages = [
        { role: 'system' as const, content: buildSystemPrompt(extraContext) },
        ...toLlmMessages(withUser),
        { role: 'user' as const, content },
      ]

      const stream = await groqChatCompletionStreamAuto({
        apiKey,
        model: aiModel,
        messages: llmMessages,
        temperature: opts?.preset === 'smart_summary' ? 0.2 : 0.35,
        maxCompletionTokens: 1200,
        topP: 1,
        reasoningEffort: 'medium',
        signal: abort.signal,
      })

      let ndjsonBuffer = ''
      let rawText = ''
      const blocks: AiBlock[] = []
      let citations: string[] = []
      let suggestedQuestions: string[] = []
      let toolRequest: { name: string; args: Record<string, unknown> } | null = null

      for await (const chunk of stream) {
        rawText += chunk
        ndjsonBuffer += chunk
        while (true) {
          const nl = ndjsonBuffer.indexOf('\n')
          if (nl === -1) break
          const line = ndjsonBuffer.slice(0, nl)
          ndjsonBuffer = ndjsonBuffer.slice(nl + 1)
          const obj = parseJsonLine(line)
          if (!obj) continue

          const type = typeof obj.type === 'string' ? obj.type : ''
          if (type === 'tool') {
            const name = typeof obj.name === 'string' ? obj.name : ''
            const args = isRecord(obj.args) ? obj.args : {}
            if (name) {
              toolRequest = { name, args }
              abort.abort()
              break
            }
            continue
          }
          if (type === 'meta') {
            citations = toStringArray(obj.citations).slice(0, 4)
            suggestedQuestions = toStringArray(obj.suggestedQuestions).slice(0, 4)
            continue
          }
          if (type === 'done') {
            continue
          }

          if (type === 'html') {
            const html = typeof obj.html === 'string' ? obj.html : ''
            blocks.push({ type: 'html', html: enforceNoApologyOrRejection(html) })
          } else if (type === 'divider') {
            blocks.push({ type: 'divider', label: typeof obj.label === 'string' ? obj.label : undefined })
          } else if (type === 'image') {
            const src = typeof obj.src === 'string' ? obj.src : ''
            if (src) {
              blocks.push({
                type: 'image',
                src,
                alt: typeof obj.alt === 'string' ? obj.alt : undefined,
                caption: typeof obj.caption === 'string' ? obj.caption : undefined,
              })
            }
          } else if (type === 'chart') {
            const chartType = obj.chartType === 'bar' || obj.chartType === 'line' || obj.chartType === 'pie' ? obj.chartType : null
            const data = Array.isArray(obj.data) ? obj.data.filter(isRecord).slice(0, 20) : []
            if (chartType && data.length > 0) {
              blocks.push({
                type: 'chart',
                chartType,
                title: typeof obj.title === 'string' ? obj.title : undefined,
                data,
                xKey: typeof obj.xKey === 'string' ? obj.xKey : undefined,
                yKey: typeof obj.yKey === 'string' ? obj.yKey : undefined,
                nameKey: typeof obj.nameKey === 'string' ? obj.nameKey : undefined,
                valueKey: typeof obj.valueKey === 'string' ? obj.valueKey : undefined,
              })
            }
          } else if (type === 'articles') {
            const rawItems = Array.isArray(obj.items)
              ? obj.items
                  .filter(isRecord)
                  .map((it) => ({
                    id: Number(it.id),
                    title: typeof it.title === 'string' ? it.title : undefined,
                    slug: typeof it.slug === 'string' ? it.slug : undefined,
                    image: typeof it.image === 'string' ? it.image : undefined,
                    reason: typeof it.reason === 'string' ? it.reason : undefined,
                  }))
                  .filter((it) => Number.isFinite(it.id) && it.id > 0)
                  .slice(0, 6)
              : []
            if (allowedArticles.size > 0) {
              const items = rawItems.flatMap((it) => {
                const known = allowedArticles.get(it.id)
                if (!known) return []
                const title = known.title || it.title
                const slug = known.slug || it.slug
                const image = known.image || it.image
                const reason = it.reason
                return [
                  {
                    id: known.id,
                    ...(title ? { title } : {}),
                    ...(slug ? { slug } : {}),
                    ...(image ? { image } : {}),
                    ...(reason ? { reason } : {}),
                  },
                ]
              })
              if (items.length > 0) {
                blocks.push({
                  type: 'articles',
                  title: typeof obj.title === 'string' ? obj.title : undefined,
                  items: items.slice(0, 6),
                })
              }
            }
          } else if (type === 'icons') {
            const items = Array.isArray(obj.items)
              ? obj.items
                  .filter(isRecord)
                  .map((it) => ({
                    name: typeof it.name === 'string' ? it.name : '',
                    label: typeof it.label === 'string' ? it.label : undefined,
                  }))
                  .filter((it) => it.name && it.name in iconWhitelist)
                  .slice(0, 8)
              : []
            if (items.length > 0) blocks.push({ type: 'icons', title: typeof obj.title === 'string' ? obj.title : undefined, items })
          }

          updateAssistant({
            blocks: blocks.length > 0 ? [...blocks] : undefined,
            content: renderBlockPreviewHtml(blocks),
          })
        }
        if (toolRequest) break
      }

      if (!toolRequest && blocks.length === 0 && rawText.trim()) {
        const parsed = parseJsonObjectFromText(rawText)
        if (parsed) {
          const answer = typeof parsed.answer === 'string' ? parsed.answer : ''
          const parsedBlocks = Array.isArray(parsed.blocks) ? parsed.blocks.filter(isRecord).map((b) => b as unknown as AiBlock) : []
          if (parsedBlocks.length > 0) {
            blocks.push(...sanitizeBlocks(parsedBlocks))
          } else if (answer.trim()) {
            blocks.push({ type: 'html', html: enforceNoApologyOrRejection(answer) })
          }

          const suggested = toStringArray(parsed.suggestedQuestions ?? parsed.suggested_questions).slice(0, 4)
          if (suggested.length > 0) suggestedQuestions = suggested

          const extractedCitations = Array.isArray(parsed.citations)
            ? parsed.citations
                .filter(isRecord)
                .map((c) => (typeof c.quote === 'string' ? c.quote : ''))
                .filter((q) => q.trim().length > 0)
                .slice(0, 4)
            : []
          if (extractedCitations.length > 0) citations = extractedCitations
        }

        if (blocks.length === 0) {
          blocks.push({
            type: 'html',
            html: `<p>${escapeHtml(rawText.trim()).replaceAll('\n', '<br />')}</p>`,
          })
        }

        updateAssistant({
          blocks: [...blocks],
          content: renderBlockPreviewHtml(blocks),
        })
      }

      return { blocks, citations, suggestedQuestions, toolRequest }
    }

    try {
      if (!opts?.silentUser) {
        void insertChatLogToDb({ articleId, visitorId, role: 'user', content, model: aiModel })
      }

      let extraContext = ''
      let finalBlocks: AiBlock[] = []
      let citations: string[] = []
      let suggestedQuestions: string[] = []

      for (let attempt = 0; attempt < 3; attempt++) {
        const result = await runOnce(extraContext)
        finalBlocks = sanitizeBlocks(result.blocks)
        citations = result.citations
        suggestedQuestions = result.suggestedQuestions

        if (!result.toolRequest) break

        updateAssistant({
          blocks: [
            ...(finalBlocks.length > 0 ? finalBlocks : []),
            { type: 'divider', label: 'جاري جلب معلومات من أرشيف المنصة…' },
          ],
          content: renderBlockPreviewHtml(finalBlocks),
        })

        const name = result.toolRequest.name
        const args = result.toolRequest.args
        if (name === 'search_articles') {
          const query = typeof args.query === 'string' ? args.query : ''
          const limit = typeof args.limit === 'number' ? args.limit : 6
          const rows = await searchArticlesInSupabase({ query, limit, excludeId: articleId })
          allowedArticles = new Map(rows.map((r) => [r.id, r]))
          extraContext = `نتيجة search_articles(query=${JSON.stringify(query)}):\n${JSON.stringify(rows)}`
        } else if (name === 'get_article') {
          const idArg = typeof args.id === 'number' ? args.id : Number(args.id)
          const slugArg = typeof args.slug === 'string' ? args.slug : ''
          const row = await getArticleFromSupabase({ id: Number.isFinite(idArg) ? idArg : undefined, slug: slugArg || undefined })
          if (row && typeof row.id === 'number' && Number.isFinite(row.id)) {
            allowedArticles.set(row.id, {
              id: row.id,
              slug: row.slug ?? '',
              title: row.title ?? '',
              excerpt: row.excerpt ?? '',
              image: row.image ?? '',
              date: row.date ?? '',
              content: row.content ?? '',
            })
          }
          extraContext = `نتيجة get_article:\n${JSON.stringify(row)}`
        } else {
          extraContext = `الأداة غير معروفة: ${name}`
        }
      }

      const safeBlocks: AiBlock[] =
        finalBlocks.length > 0 ? finalBlocks : ([{ type: 'html', html: '<p>تعذر توليد إجابة مفهومة حاليًا.</p>' } as AiBlock] as AiBlock[])
      updateAssistant({
        blocks: safeBlocks,
        citations: citations.length > 0 ? citations : undefined,
        suggestedQuestions: suggestedQuestions.length > 0 ? suggestedQuestions : undefined,
        content: renderBlockPreviewHtml(safeBlocks),
      })

      const dbContent = renderBlockPreviewHtml(safeBlocks)
      void insertChatLogToDb({
        articleId,
        visitorId,
        role: 'assistant',
        content: dbContent,
        responseJson: { blocks: safeBlocks, citations, suggested_questions: suggestedQuestions },
        model: aiModel,
      })
      console.groupEnd()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'تعذر إرسال سؤالك'
      updateAssistant({
        blocks: [{ type: 'html', html: `<p><strong>تعذر إكمال الرد:</strong> ${escapeHtml(message)}</p>` }],
        content: `<p><strong>تعذر إكمال الرد:</strong> ${escapeHtml(message)}</p>`,
      })
      setChatError(message)
    } finally {
      setChatLoading(false)
      activeStreamAbortRef.current = null
      if (opts?.preset === 'smart_summary') autoSmartSummaryDoneRef.current = true
    }
  }

  useEffect(() => {
    if (!articleId) return
    if (!showArticleSummary) return
    if (!aiPlainSource.trim()) return
    if (chatLoading) return
    if (autoSmartSummaryDoneRef.current) return
    autoSmartSummaryDoneRef.current = true
    void sendChat(undefined, { silentUser: true, preset: 'smart_summary' })
  }, [articleId, showArticleSummary, aiPlainSource, chatLoading, sendChat])

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
                      title="ملخص المقال الذكي"
                    >
                      <span className="font-bold ml-1">★</span> ملخص المقال الذكي
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
            <section
              id="article-summary"
              className="rounded-[6px] border border-border/40 bg-card/20 p-4 shadow-lg backdrop-blur-xl md:p-6"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-[6px] bg-primary/10 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="relative w-full">
                    {chatMessages.length > 0 && (
                      <button
                        onClick={clearChat}
                        className="absolute left-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-[6px] border border-border/60 bg-background/30 text-foreground backdrop-blur-md hover:border-primary/50 hover:bg-primary/5 transition-colors md:hidden"
                        aria-label="مسح المحادثة"
                        title="مسح المحادثة"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <h2 className="pl-11 text-xl font-bold text-foreground md:pl-0 md:text-2xl">ملخص المقال الذكي</h2>
                    <p className="text-sm text-muted-foreground">
                      واجهة دردشة زجاجية تعتمد على نص المقال وتستعين بأرشيف المنصة عند الحاجة
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {chatMessages.length > 0 && (
                    <button
                      onClick={clearChat}
                      className="hidden items-center gap-2 rounded-[6px] border border-border/60 bg-background/30 px-3 py-2 text-sm text-foreground backdrop-blur-md hover:border-primary/50 hover:bg-primary/5 transition-colors md:inline-flex"
                    >
                      <Trash2 className="h-4 w-4" />
                      مسح المحادثة
                    </button>
                  )}
                </div>
              </div>

              {chatError && (
                <div className="mt-4 rounded-[6px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  تعذر إكمال المحادثة: {chatError}
                </div>
              )}

              <div className="mt-5 rounded-[6px] border border-border/40 bg-background/20 backdrop-blur-xl">
                <div className="max-h-[65vh] overflow-y-auto px-3 py-4 md:px-4">
                  {chatMessages.length === 0 && (
                    <div className="rounded-[6px] border border-border/40 bg-background/30 px-4 py-4 text-sm text-muted-foreground">
                      جاري إعداد الملخص الذكي… يمكنك أيضًا كتابة سؤال الآن.
                    </div>
                  )}

                  <div className="space-y-3">
                    {chatMessages.map((m, idx) => {
                      if (m.role === 'user') {
                        return (
                          <div key={idx} className="flex justify-end">
                            <div className="max-w-[92%] rounded-[6px] border border-primary/20 bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground">
                              <div className="whitespace-pre-wrap">{m.content}</div>
                            </div>
                          </div>
                        )
                      }

                      const blocks: AiBlock[] =
                        m.blocks && m.blocks.length > 0 ? m.blocks : [{ type: 'html', html: m.content } as AiBlock]

                      return (
                        <div key={idx} className="w-full">
                          <div className="w-full rounded-[6px] border border-border/40 bg-background/30 px-4 py-3 backdrop-blur-xl">
                            <div className="space-y-3">
                              {blocks.map((b, bi) => {
                                if (b.type === 'divider') {
                                  return (
                                    <div key={bi} className="flex items-center gap-3 py-1">
                                      <div className="h-px flex-1 bg-border/60" />
                                      {b.label && <div className="text-xs text-muted-foreground">{b.label}</div>}
                                      <div className="h-px flex-1 bg-border/60" />
                                    </div>
                                  )
                                }

                                if (b.type === 'icons') {
                                  return (
                                    <div key={bi} className="space-y-2">
                                      {b.title && <div className="text-sm font-bold text-foreground">{b.title}</div>}
                                      <div className="flex flex-wrap gap-2">
                                        {b.items.map((it, ii) => {
                                          const Icon = (it.name in iconWhitelist ? iconWhitelist[it.name] : null) as
                                            | null
                                            | ((props: { className?: string }) => ReactNode)
                                          if (!Icon) return null
                                          return (
                                            <div
                                              key={ii}
                                              className="inline-flex items-center gap-2 rounded-[999px] border border-border/50 bg-background/40 px-3 py-2 text-xs text-foreground"
                                            >
                                              <Icon className="h-4 w-4 text-primary" />
                                              <span className="leading-none">{it.label ?? it.name}</span>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )
                                }

                                if (b.type === 'chart') {
                                  const xKey = b.xKey ?? 'name'
                                  const yKey = b.yKey ?? 'value'
                                  const nameKey = b.nameKey ?? 'name'
                                  const valueKey = b.valueKey ?? 'value'
                                  return (
                                    <div key={bi} className="rounded-[6px] border border-border/40 bg-background/30 p-3">
                                      {b.title && <div className="mb-2 text-sm font-bold text-foreground">{b.title}</div>}
                                      <div className="h-[220px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                          {b.chartType === 'bar' ? (
                                            <BarChart data={b.data}>
                                              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                                              <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
                                              <YAxis tick={{ fontSize: 12 }} />
                                              <Tooltip />
                                              <Legend />
                                              <Bar dataKey={yKey} fill={CHART_COLORS[1]} radius={[6, 6, 0, 0]} />
                                            </BarChart>
                                          ) : b.chartType === 'line' ? (
                                            <LineChart data={b.data}>
                                              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                                              <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
                                              <YAxis tick={{ fontSize: 12 }} />
                                              <Tooltip />
                                              <Legend />
                                              <Line type="monotone" dataKey={yKey} stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
                                            </LineChart>
                                          ) : (
                                            <PieChart>
                                              <Tooltip />
                                              <Legend />
                                              <Pie data={b.data} dataKey={valueKey} nameKey={nameKey} outerRadius={75}>
                                                {b.data.map((_: Record<string, unknown>, ci: number) => (
                                                  <Cell key={ci} fill={CHART_COLORS[ci % CHART_COLORS.length]} />
                                                ))}
                                              </Pie>
                                            </PieChart>
                                          )}
                                        </ResponsiveContainer>
                                      </div>
                                    </div>
                                  )
                                }

                                if (b.type === 'image') {
                                  return (
                                    <figure key={bi} className="overflow-hidden rounded-[6px] border border-border/40 bg-background/30">
                                      <img
                                        src={resolveImageSrc(b.src)}
                                        alt={b.alt ?? ''}
                                        loading="lazy"
                                        className="h-auto w-full object-cover"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none'
                                        }}
                                      />
                                      {b.caption && (
                                        <figcaption className="px-3 py-2 text-xs text-muted-foreground">{b.caption}</figcaption>
                                      )}
                                    </figure>
                                  )
                                }

                                if (b.type === 'articles') {
                                  return (
                                    <div key={bi} className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Link2 className="h-4 w-4 text-primary" />
                                        <div className="text-sm font-bold text-foreground">{b.title ?? 'اقرأ أيضًا'}</div>
                                      </div>
                                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        {b.items.map((it: { id: number; title?: string; slug?: string; image?: string; reason?: string }) => (
                                          <Link
                                            key={it.id}
                                            to={`/post/${it.id}`}
                                            className="flex overflow-hidden rounded-[6px] border border-border/50 bg-background/30 hover:border-primary/40 transition-colors"
                                          >
                                            <div className="h-20 w-24 shrink-0 bg-muted/30">
                                              {it.image ? (
                                                <img
                                                  src={resolveImageSrc(it.image)}
                                                  alt={it.title ?? ''}
                                                  loading="lazy"
                                                  className="h-full w-full object-cover"
                                                  onError={(e) => {
                                                    e.currentTarget.style.display = 'none'
                                                  }}
                                                />
                                              ) : (
                                                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                                  <ImageIcon className="h-5 w-5" />
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex-1 p-3 text-right">
                                              <div className="line-clamp-2 text-sm font-bold text-foreground">{it.title ?? 'مقال'}</div>
                                              {it.reason && <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{it.reason}</div>}
                                            </div>
                                          </Link>
                                        ))}
                                      </div>
                                    </div>
                                  )
                                }

                                if (b.type === 'html') {
                                  return (
                                    <div
                                      key={bi}
                                      className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-headings:text-primary prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-[6px] prose-p:text-foreground/90 prose-strong:text-foreground prose-li:text-foreground/90 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:py-1 prose-blockquote:pr-4 prose-blockquote:rounded-r-sm [&_a]:break-all"
                                      dangerouslySetInnerHTML={{ __html: sanitizeAiHtml(b.html) }}
                                    />
                                  )
                                }

                                return null
                              })}
                            </div>

                            {m.suggestedQuestions && m.suggestedQuestions.length > 0 && (
                              <div className="mt-3 border-t border-border/40 pt-3">
                                <div className="mb-2 text-xs text-muted-foreground">أسئلة مقترحة</div>
                                <div className="flex flex-wrap gap-2">
                                  {m.suggestedQuestions.map((q, qi) => (
                                    <button
                                      key={qi}
                                      onClick={() => void sendChat(q)}
                                      className="rounded-[999px] border border-border/50 bg-background/40 px-3 py-2 text-xs text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
                                      disabled={chatLoading}
                                    >
                                      {q}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {m.citations && m.citations.length > 0 && (
                              <div className="mt-3 border-t border-border/40 pt-3">
                                <div className="mb-2 text-xs text-muted-foreground">استشهادات من المقال</div>
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
                  </div>
                </div>

                <div className="border-t border-border/40 bg-background/10 p-3 md:p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-end">
                    <textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="اكتب رسالتك هنا…"
                      className="min-h-[88px] w-full resize-none rounded-[6px] border border-border/60 bg-background/40 px-4 py-3 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                      disabled={chatLoading}
                    />
                    <button
                      onClick={() => void sendChat()}
                      className="inline-flex items-center justify-center gap-2 rounded-[6px] bg-primary px-5 py-3 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={chatLoading || !chatInput.trim()}
                    >
                      <Send className="h-4 w-4" />
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
                      src={resolveImageSrc(related.image ?? '')} 
                      alt={related.title} 
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
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
