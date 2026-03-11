import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.97.0'

type Role = 'system' | 'user' | 'assistant'

type ChatMessage = {
  role: Role
  content: string
}

type VisitorChatMessage = {
  role: 'user' | 'assistant'
  content: string
  citations?: string[]
  suggested_questions?: string[]
}

type SummaryJson = {
  lead: string
  key_points: string[]
  background: string[]
  implications: string[]
  suggested_questions: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
}

function getRecord(value: unknown) {
  return isRecord(value) ? value : null
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
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

function extractFirstJsonObject(text: string) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  const candidate = text.slice(start, end + 1)
  try {
    return JSON.parse(candidate)
  } catch {
    return null
  }
}

async function groqChatCompletion(args: {
  apiKey: string
  model: string
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
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
      temperature: args.temperature ?? 0.3,
      max_tokens: args.maxTokens ?? 900,
      top_p: 0.9,
      stream: false,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Groq request failed: ${res.status} ${text}`)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Groq response missing content')
  }
  return content.trim()
}

async function getArticleById(admin: ReturnType<typeof createClient>, articleId: number) {
  const { data, error } = await admin
    .from('articles')
    .select('id, slug, title, content')
    .eq('id', articleId)
    .single()

  if (error || !data) throw new Error('Article not found')
  return data as {
    id: number
    slug: string
    title: string
    content: string | null
  }
}

async function getCachedSummary(args: {
  admin: ReturnType<typeof createClient>
  articleId: number
  model: string
  contentHash: string
}) {
  const { data, error } = await args.admin
    .from('article_ai_summaries')
    .select('summary_json, content_hash')
    .eq('article_id', args.articleId)
    .eq('model', args.model)
    .maybeSingle()

  if (error || !data) return null
  if (data.content_hash !== args.contentHash) return null
  return data.summary_json as SummaryJson
}

async function upsertSummary(args: {
  admin: ReturnType<typeof createClient>
  articleId: number
  model: string
  contentHash: string
  summaryJson: SummaryJson
}) {
  const { error } = await args.admin.from('article_ai_summaries').upsert(
    {
      article_id: args.articleId,
      model: args.model,
      content_hash: args.contentHash,
      summary_json: args.summaryJson,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'article_id,model' },
  )
  if (error) return
}

function normalizeVisitorId(input: unknown) {
  if (typeof input !== 'string') return null
  const v = input.trim()
  if (!v) return null
  if (v.length > 128) return null
  return v
}

async function loadChatHistory(args: {
  admin: ReturnType<typeof createClient>
  articleId: number
  visitorId: string
}) {
  const { data, error } = await args.admin
    .from('article_ai_chat_logs')
    .select('role, content, response_json, created_at')
    .eq('article_id', args.articleId)
    .eq('visitor_id', args.visitorId)
    .order('created_at', { ascending: true })
    .limit(60)

  if (error || !data) return []

  const out: VisitorChatMessage[] = []
  for (const row of data as unknown[]) {
    const r = getRecord(row)
    if (!r) continue
    const role = r.role === 'user' ? 'user' : r.role === 'assistant' ? 'assistant' : null
    const content = typeof r.content === 'string' ? r.content : ''
    if (!role || !content.trim()) continue

    const m: VisitorChatMessage = { role, content }
    if (role === 'assistant' && isRecord(r.response_json)) {
      const resp = r.response_json
      const citations = Array.isArray(resp.citations)
        ? resp.citations
            .map(getRecord)
            .filter((c): c is Record<string, unknown> => !!c)
            .map((c) => (typeof c.quote === 'string' ? c.quote : ''))
            .filter((q) => q.trim().length > 0)
            .slice(0, 4)
        : []
      if (citations.length > 0) m.citations = citations
      const suggested = toStringArray(resp.suggested_questions).slice(0, 4)
      if (suggested.length > 0) m.suggested_questions = suggested
    }
    out.push(m)
  }

  return out.slice(-30)
}

async function insertChatLog(args: {
  admin: ReturnType<typeof createClient>
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
  await args.admin.from('article_ai_chat_logs').insert(payload)
}

async function handleSummarize(
  reqBody: unknown,
  admin: ReturnType<typeof createClient>,
  model: string,
  apiKey: string,
) {
  const body = getRecord(reqBody)
  const articleId = Number(body?.articleId)
  const force = body?.force === true
  if (!Number.isFinite(articleId) || articleId <= 0) {
    return jsonResponse({ error: 'Invalid articleId' }, { status: 400 })
  }

  const article = await getArticleById(admin, articleId)
  const plain = stripHtml(article.content ?? '')
  const source = clampText(plain, 14_000)
  const contentHash = await sha256Hex(`${article.title}\n${source}`)

  if (!force) {
    const cached = await getCachedSummary({ admin, articleId: article.id, model, contentHash })
    if (cached) {
      return jsonResponse({ summary: cached, cached: true, model })
    }
  }

  const system: ChatMessage = {
    role: 'system',
    content:
      'أنت مساعد تحرير عربي محترف. تلخّص المقالات ببلاغة عربية فصيحة، بأسلوب واضح ومقنع ومنظم، دون مبالغة أو ادّعاءات غير موجودة في النص. لا تذكر أنك نموذج ذكاء اصطناعي.',
  }

  const user: ChatMessage = {
    role: 'user',
    content: [
      'لخّص المقال التالي اعتمادًا على النص فقط.',
      'أخرج الإجابة كـ JSON صالح 100% بدون Markdown وبدون أي نص إضافي.',
      'الشكل المطلوب:',
      '{',
      '  "lead": "فقرة افتتاحية موجزة (2-3 جمل)",',
      '  "key_points": ["5-7 نقاط مركزة"],',
      '  "background": ["3-6 نقاط سياق/خلفية من داخل المقال"],',
      '  "implications": ["3-6 نقاط: ماذا يعني هذا/لماذا يهم"],',
      '  "suggested_questions": ["4-6 أسئلة ذكية يمكن للقارئ طرحها عن المقال"]',
      '}',
      '',
      `عنوان المقال: ${article.title}`,
      '',
      `نص المقال (مقتطف منسّق): ${source}`,
    ].join('\n'),
  }

  const raw = await groqChatCompletion({
    apiKey,
    model,
    messages: [system, user],
    temperature: 0.25,
    maxTokens: 900,
  })

  let parsed: unknown = null
  try {
    parsed = JSON.parse(raw)
  } catch {
    parsed = extractFirstJsonObject(raw)
  }

  if (!parsed) {
    return jsonResponse(
      {
        error: 'Failed to parse model output as JSON',
        model,
      },
      { status: 502 },
    )
  }

  const p = getRecord(parsed)
  if (!p) {
    return jsonResponse(
      {
        error: 'Failed to parse model output as JSON',
        model,
      },
      { status: 502 },
    )
  }

  const summaryJson: SummaryJson = {
    lead: typeof p.lead === 'string' ? p.lead : '',
    key_points: toStringArray(p.key_points),
    background: toStringArray(p.background),
    implications: toStringArray(p.implications),
    suggested_questions: toStringArray(p.suggested_questions),
  }

  await upsertSummary({ admin, articleId: article.id, model, contentHash, summaryJson })
  return jsonResponse({ summary: summaryJson, cached: false, model })
}

async function handleChatHistory(reqBody: unknown, admin: ReturnType<typeof createClient>) {
  const body = getRecord(reqBody)
  const articleId = Number(body?.articleId)
  const visitorId = normalizeVisitorId(body?.visitorId)

  if (!Number.isFinite(articleId) || articleId <= 0) {
    return jsonResponse({ error: 'Invalid articleId' }, { status: 400 })
  }
  if (!visitorId) {
    return jsonResponse({ error: 'Invalid visitorId' }, { status: 400 })
  }

  const messages = await loadChatHistory({ admin, articleId, visitorId })
  return jsonResponse({ messages })
}

async function handleChat(reqBody: unknown, admin: ReturnType<typeof createClient>, model: string, apiKey: string) {
  const body = getRecord(reqBody)
  const articleId = Number(body?.articleId)
  const visitorId = normalizeVisitorId(body?.visitorId)
  const messages = Array.isArray(body?.messages) ? body?.messages : []

  if (!Number.isFinite(articleId) || articleId <= 0) {
    return jsonResponse({ error: 'Invalid articleId' }, { status: 400 })
  }
  if (!visitorId) {
    return jsonResponse({ error: 'Invalid visitorId' }, { status: 400 })
  }

  const normalized: ChatMessage[] = messages
    .filter((m) => {
      const r = getRecord(m)
      return (
        !!r &&
        (r.role === 'user' || r.role === 'assistant') &&
        typeof r.content === 'string' &&
        r.content.trim().length > 0
      )
    })
    .map((m) => {
      const r = m as Record<string, unknown>
      return { role: r.role as Role, content: String(r.content).slice(0, 1200) }
    })
    .slice(-10)

  const lastUser = [...normalized].reverse().find((m) => m.role === 'user')?.content?.trim()
  if (!lastUser) {
    return jsonResponse({ error: 'Missing user message' }, { status: 400 })
  }

  const article = await getArticleById(admin, articleId)
  const plain = stripHtml(article.content ?? '')
  const source = clampText(plain, 18_000)

  const system: ChatMessage = {
    role: 'system',
    content:
      'أنت مساعد يجيب عن أسئلة القارئ ضمن نطاق هذا المقال فقط. ممنوع إدخال معلومات من خارج النص. إذا لم تجد الإجابة داخل النص، قل بوضوح إن المقال لا يقدّم ما يكفي للإجابة. اكتب بالعربية الفصيحة وبأسلوب صحفي رصين.',
  }

  const instructions: ChatMessage = {
    role: 'user',
    content: [
      'ستتلقى نص المقال ثم سؤال القارئ. أجب إجابة دقيقة ومقنعة مع الاستشهاد بعبارتين قصيرتين من النص.',
      'أخرج JSON صالح 100% بدون Markdown وبدون أي نص إضافي بالشكل:',
      '{',
      '  "answer": "إجابة مفصلة مختصرة",',
      '  "citations": [{"quote": "اقتباس قصير حرفيًا من النص"}, {"quote": "اقتباس قصير آخر"}],',
      '  "suggested_questions": ["3 أسئلة متابعة"]',
      '}',
      '',
      `عنوان المقال: ${article.title}`,
      '',
      `نص المقال (مقتطف): ${source}`,
      '',
      `سؤال القارئ: ${lastUser}`,
    ].join('\n'),
  }

  const raw = await groqChatCompletion({
    apiKey,
    model,
    messages: [system, ...normalized, instructions],
    temperature: 0.35,
    maxTokens: 900,
  })

  let parsed: unknown = null
  try {
    parsed = JSON.parse(raw)
  } catch {
    parsed = extractFirstJsonObject(raw)
  }

  if (!parsed) {
    return jsonResponse(
      {
        error: 'Failed to parse model output as JSON',
        model,
      },
      { status: 502 },
    )
  }

  const p = getRecord(parsed)
  if (!p) {
    return jsonResponse(
      {
        error: 'Failed to parse model output as JSON',
        model,
      },
      { status: 502 },
    )
  }

  const answer = typeof p.answer === 'string' ? p.answer : ''
  const citations = Array.isArray(p.citations)
    ? p.citations
        .map(getRecord)
        .filter((c): c is Record<string, unknown> => !!c)
        .map((c) => ({ quote: typeof c.quote === 'string' ? c.quote : '' }))
        .filter((c) => c.quote.trim().length > 0)
        .slice(0, 4)
    : []
  const suggestedQuestions = toStringArray(p.suggested_questions).slice(0, 4)

  const responseJson = {
    answer,
    citations,
    suggested_questions: suggestedQuestions,
  }

  try {
    await insertChatLog({
      admin,
      articleId: article.id,
      visitorId,
      role: 'user',
      content: lastUser,
      model,
    })
    await insertChatLog({
      admin,
      articleId: article.id,
      visitorId,
      role: 'assistant',
      content: answer,
      responseJson,
      model,
    })
  } catch {
    void 0
  }

  return jsonResponse({ answer, citations, suggested_questions: suggestedQuestions, model })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    // Handle CORS preflight
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const groqApiKey = Deno.env.get('GROQ_API_KEY') ?? ''
  const model = Deno.env.get('AI_MODEL') ?? 'openai/gpt-oss-120b'

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse({ error: 'Missing Supabase service credentials' }, { status: 500 })
  }
  if (!groqApiKey) {
    return jsonResponse({ error: 'Missing GROQ_API_KEY' }, { status: 500 })
  }

  const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  })

  let body: unknown = null
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const task = isRecord(body) ? body.task : null
  try {
    if (task === 'summarize') {
      return await handleSummarize(body, admin, model, groqApiKey)
    }
    if (task === 'chat') {
      return await handleChat(body, admin, model, groqApiKey)
    }
    if (task === 'chat_history') {
      return await handleChatHistory(body, admin)
    }
    return jsonResponse({ error: 'Unknown task' }, { status: 400 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return jsonResponse({ error: message }, { status: 500 })
  }
})
