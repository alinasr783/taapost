import { readFileSync } from 'fs'
import { join } from 'path'

function getOrigin(req) {
  const configured = process.env.VITE_SITE_URL || process.env.SITE_URL || ''
  if (configured) return configured.replace(/\/+$/, '')
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0]
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0]
  return `${proto}://${host}`.replace(/\/+$/, '')
}

function sendDefault(res) {
  try {
    const def = readFileSync(join(process.cwd(), 'public', 'og-default.png'))
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800')
    return res.status(200).send(def)
  } catch {
    return res.status(200).send(Buffer.alloc(0))
  }
}

async function tryResize(buf) {
  // `sharp` is intentionally NOT a hard dependency (it 500s on Vercel when the
  // native binary is missing and broke og:image for all new articles).
  // Resize only when sharp happens to be installed; otherwise passthrough.
  try {
    const mod = await import('sharp').catch(() => null)
    const sharp = mod?.default || mod
    if (typeof sharp !== 'function') return null
    return await sharp(buf)
      .resize(1200, 630, { fit: 'cover', position: 'center' })
      .webp({ quality: 80 })
      .toBuffer()
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  try {
    const urlObj = new URL(req.url, `https://${req.headers.host || 'localhost'}`)
    let target = urlObj.searchParams.get('url')
    if (!target) return sendDefault(res)
    try { target = decodeURIComponent(target) } catch {}

    // Security: only proxy http(s) images, preferably ours (avoid open SSRF).
    // Allow supabase + our own domain; anything else gets the default image.
    if (!/^https?:\/\//i.test(target)) return sendDefault(res)
    const lower = target.toLowerCase()
    const allowed = lower.includes('supabase.co') || lower.includes('taapost.com')
    if (!allowed) return sendDefault(res)

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 9000)
    let imgRes
    try {
      imgRes = await fetch(target, { redirect: 'follow', signal: ctrl.signal })
    } finally {
      clearTimeout(timer)
    }
    if (!imgRes.ok) {
      // Origin gone but crawlers still request the old proxied URL:
      // redirect them to the original so they can retry/cache directly.
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600')
      return res.redirect(302, target)
    }

    const buf = Buffer.from(await imgRes.arrayBuffer())
    if (!buf.length) return sendDefault(res)

    const resized = await tryResize(buf)
    if (resized) {
      res.setHeader('Content-Type', 'image/webp')
    } else {
      res.setHeader('Content-Type', imgRes.headers.get('content-type') || 'image/jpeg')
    }
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800')
    return res.status(200).send(resized || buf)
  } catch {
    return sendDefault(res)
  }
}
