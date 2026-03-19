export default async function handler(req, res) {
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0]
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0]
  const base = process.env.SITE_URL || `${proto}://${host}`
  const robots = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${base.replace(/\/+$/, '')}/sitemap.xml`,
    '',
  ].join('\n')
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.statusCode = 200
  res.end(robots)
}
