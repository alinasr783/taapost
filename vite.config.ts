import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'

function groqProxyDevPlugin(groqApiKey: string): Plugin {
  return {
    name: 'taapost-groq-proxy-dev',
    configureServer(server) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) => {
        if (!req.url) return next()
        const pathname = req.url.split('?')[0]
        if (pathname !== '/api/groq-chat') return next()

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
          res.end()
          return
        }

        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        const apiKey = groqApiKey || process.env.GROQ_API_KEY || ''
        if (!apiKey) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: 'Missing GROQ_API_KEY' }))
          return
        }

        let rawBody = ''
        req.on('data', (chunk) => {
          rawBody += String(chunk)
        })
        req.on('end', async () => {
          try {
            const body = rawBody ? (JSON.parse(rawBody) as unknown) : null
            if (!body || typeof body !== 'object') {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ error: 'Invalid JSON body' }))
              return
            }

            const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(body),
            })

            const text = await upstream.text().catch(() => '')
            res.statusCode = upstream.status
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(text)
          } catch (e) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }))
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const groqApiKey = env.GROQ_API_KEY || process.env.GROQ_API_KEY || ''
  return {
    plugins: [react(), groqProxyDevPlugin(groqApiKey)],
  }
})
