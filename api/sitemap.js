import { createClient } from '@supabase/supabase-js'

function absoluteBase(req) {
  const envBase = process.env.SITE_URL || process.env.VITE_SITE_URL || ''
  if (envBase) return envBase.replace(/\/+$/, '')
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0]
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0]
  return `${proto}://${host}`.replace(/\/+$/, '')
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export default async function handler(req, res) {
  try {
    const base = absoluteBase(req)
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
    const client = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

    let articles = []
    let categories = []
    if (client) {
      const [artRes, catRes] = await Promise.all([
        client.from('articles').select('id, slug, date, updated_at').limit(1000),
        client.from('categories').select('id, slug, updated_at').limit(1000),
      ])
      if (!artRes.error && Array.isArray(artRes.data)) articles = artRes.data
      if (!catRes.error && Array.isArray(catRes.data)) categories = catRes.data
    }

    const urls = []
    const now = new Date().toISOString()

    const push = (loc, lastmod = now, changefreq = 'weekly', priority = '0.7') => {
      urls.push(
        `<url><loc>${esc(loc)}</loc><lastmod>${esc(lastmod)}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`,
      )
    }

    push(`${base}/`, now, 'daily', '1.0')
    push(`${base}/categories`, now, 'weekly', '0.8')
    push(`${base}/posts`, now, 'daily', '0.8')

    for (const c of categories) {
      const loc = c.slug ? `${base}/قسم/${encodeURIComponent(c.slug)}` : `${base}/category/${c.id}`
      push(loc, c.updated_at || now, 'weekly', '0.7')
    }

    for (const a of articles) {
      const loc = a.slug ? `${base}/مقال/${encodeURIComponent(a.slug)}` : `${base}/post/${a.id}`
      push(loc, a.updated_at || a.date || now, 'daily', '0.9')
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`

    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.statusCode = 200
    res.end(xml)
  } catch (e) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end('Failed to generate sitemap')
  }
}
