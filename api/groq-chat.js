export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const apiKey = process.env.GROQ_API_KEY || ''
  if (!apiKey) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'Missing GROQ_API_KEY' }))
    return
  }

  const body = typeof req.body === 'object' && req.body !== null ? req.body : null
  if (!body) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'Invalid JSON body' }))
    return
  }

  const model = typeof body.model === 'string' && body.model.trim() ? body.model.trim() : null
  const messages = Array.isArray(body.messages) ? body.messages : null
  if (!model || !messages) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'Missing model/messages' }))
    return
  }

  const payload = {
    model,
    messages,
    temperature: typeof body.temperature === 'number' ? body.temperature : 0.35,
    max_completion_tokens: typeof body.max_completion_tokens === 'number' ? body.max_completion_tokens : 900,
    top_p: typeof body.top_p === 'number' ? body.top_p : 1,
    reasoning_effort: typeof body.reasoning_effort === 'string' ? body.reasoning_effort : 'medium',
    stream: false,
    stop: null,
  }

  try {
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const text = await upstream.text().catch(() => '')
    if (!upstream.ok) {
      res.statusCode = upstream.status
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(text || JSON.stringify({ error: 'Upstream error' }))
      return
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(text)
  } catch (e) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }))
  }
}

