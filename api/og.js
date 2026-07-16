function getOrigin(req) {
  const configured = process.env.VITE_SITE_URL || process.env.SITE_URL || ''
  if (configured) return configured.replace(/\/+$/, '')
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0]
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0]
  return `${proto}://${host}`.replace(/\/+$/, '')
}

export default async function handler(req, res) {
  try {
    const origin = getOrigin(req)
    const urlObj = new URL(req.url, `https://${req.headers.host || 'localhost'}`)
    const fromQuery = urlObj.searchParams.get('path') || urlObj.searchParams.get('p')
    let path = fromQuery || urlObj.pathname.replace(/^\/og/, '') || '/'
    if (path && !path.startsWith('/')) path = '/' + path
    if (path === '' || path === '/') path = '/'
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400')
    return res.redirect(307, origin + path)
  } catch {
    return res.redirect(307, '/')
  }
}
