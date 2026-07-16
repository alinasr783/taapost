import sharp from 'sharp'
import { readFileSync } from 'fs'
import { join } from 'path'

function getOrigin(req) {
  const configured = process.env.VITE_SITE_URL || process.env.SITE_URL || ''
  if (configured) return configured.replace(/\/+$/, '')
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0]
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0]
  return `${proto}://${host}`.replace(/\/+$/, '')
}

function sendDefault(res, origin) {
  try {
    const def = readFileSync(join(process.cwd(), 'public', 'og-default.png'))
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800')
    return res.status(200).send(def)
  } catch {
    return res.status(200).send(Buffer.alloc(0))
  }
}

export default async function handler(req, res) {
  try {
    const origin = getOrigin(req)
    const urlObj = new URL(req.url, `https://${req.headers.host || 'localhost'}`)
    let target = urlObj.searchParams.get('url')
    if (!target) return sendDefault(res, origin)
    try { target = decodeURIComponent(target) } catch {}

    // Security: only allow our Supabase storage images (avoid open SSRF/proxy abuse)
    if (!/^https?:\/\//i.test(target) || !target.toLowerCase().includes('supabase.co')) {
      return sendDefault(res, origin)
    }

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 9000)
    let imgRes
    try {
      imgRes = await fetch(target, { redirect: 'follow', signal: ctrl.signal })
    } finally {
      clearTimeout(timer)
    }
    if (!imgRes.ok) return sendDefault(res, origin)

    const buf = Buffer.from(await imgRes.arrayBuffer())

    let out = buf
    let type = imgRes.headers.get('content-type') || 'image/png'
    try {
      out = await sharp(buf)
        .resize(1200, 630, { fit: 'cover', position: 'center' })
        .webp({ quality: 80 })
        .toBuffer()
      type = 'image/webp'
    } catch {
      out = buf
    }

    res.setHeader('Content-Type', type)
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800')
    return res.status(200).send(out)
  } catch {
    return sendDefault(res, origin)
  }
}
