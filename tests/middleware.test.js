import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockArticle = {
  id: 25,
  slug: 'my-article',
  title: 'عنوان المقال',
  excerpt: 'ملخص المقال',
  image: 'https://vqhqczgumuganbefodqo.supabase.co/storage/v1/object/public/media/test.png',
  date: '2024-01-15',
  type: 'article',
}

const mockPost = {
  id: 15,
  slug: 'my-post',
  title: 'عنوان المنشور',
  excerpt: 'ملخص المنشور',
  image: 'https://example.com/post-image.jpg',
  date: '2024-01-10',
  type: 'post',
}

function createRequest(path, ua = 'Mozilla/5.0') {
  return new Request(`https://www.taapost.com${path}`, {
    headers: { 'user-agent': ua },
  })
}

function mockFetch(articles = [mockArticle]) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(articles),
  })
}

beforeEach(() => {
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
  process.env.VITE_SUPABASE_ANON_KEY = 'test-key'
  process.env.VITE_SITE_URL = 'https://www.taapost.com'
  mockFetch()
})

afterEach(() => {
  vi.restoreAllMocks()
  delete process.env.VITE_SUPABASE_URL
  delete process.env.VITE_SUPABASE_ANON_KEY
  delete process.env.VITE_SITE_URL
})

describe('middleware (integration)', () => {
  let middleware, config

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('../middleware.js')
    middleware = mod.default
    config = mod.config
  })

  describe('config', () => {
    it('matches article routes', () => {
      expect(config.matcher).toContain('/article/:path*')
    })

    it('matches post routes', () => {
      expect(config.matcher).toContain('/post/:path*')
    })

    it('matches homepage', () => {
      expect(config.matcher).toContain('/')
    })
  })

  describe('homepage', () => {
    it('returns OG HTML for bots', async () => {
      const req = createRequest('/', 'facebookexternalhit/1.1')
      const res = await middleware(req)

      expect(res).toBeInstanceOf(Response)
      expect(res.status).toBe(200)
      const html = await res.text()
      expect(html).toContain('og:image')
      expect(html).toContain('og:type" content="website"')
    })

    it('returns undefined for human users', async () => {
      const req = createRequest('/', 'Mozilla/5.0 (Windows)')
      const res = await middleware(req)

      expect(res).toBeUndefined()
    })
  })

  describe('article routes', () => {
    it('returns OG HTML for bots on /article/:id', async () => {
      mockFetch([mockArticle])
      const req = createRequest('/article/25', 'facebookexternalhit/1.1')
      const res = await middleware(req)

      expect(res).toBeInstanceOf(Response)
      expect(res.status).toBe(200)
      const html = await res.text()
      expect(html).toContain('og:image" content="')
      expect(html).toContain('storage/v1/render/image/')
      expect(html).toContain('width=1200')
      expect(html).toContain('height=630')
      expect(html).toContain('og:title" content="عنوان المقال | تاء بوست"')
      expect(html).toContain('og:type" content="article"')
      expect(html).toContain('article:published_time')
    })

    it('uses numeric ID in og:url (not slug)', async () => {
      mockFetch([mockArticle])
      const req = createRequest('/article/25', 'Twitterbot/1.0')
      const res = await middleware(req)

      const html = await res.text()
      expect(html).toContain('og:url" content="https://www.taapost.com/article/25"')
      expect(html).not.toContain('/article/my-article')
    })

    it('returns OG HTML for bots on /post/:id', async () => {
      mockFetch([mockPost])
      const req = createRequest('/post/15', 'Twitterbot/1.0')
      const res = await middleware(req)

      expect(res).toBeInstanceOf(Response)
      expect(res.status).toBe(200)
      const html = await res.text()
      expect(html).toContain('og:image" content=')
      expect(html).toContain(`og:url" content="https://www.taapost.com/post/15"`)
    })

    it('redirects slug URLs to numeric ID for humans', async () => {
      mockFetch([{ ...mockArticle, type: 'article' }])
      const req = createRequest('/article/my-article', 'Mozilla/5.0')
      const res = await middleware(req)

      expect(res).toBeInstanceOf(Response)
      expect(res.status).toBe(301)
      expect(res.headers.get('location')).toBe('https://www.taapost.com/article/25')
    })

    it('redirects post slug URLs to numeric ID for humans', async () => {
      mockFetch([{ ...mockPost, type: 'post' }])
      const req = createRequest('/post/my-post', 'Mozilla/5.0')
      const res = await middleware(req)

      expect(res).toBeInstanceOf(Response)
      expect(res.status).toBe(301)
      expect(res.headers.get('location')).toBe('https://www.taapost.com/post/15')
    })

    it('returns undefined for human on numeric article URL', async () => {
      const req = createRequest('/article/25', 'Mozilla/5.0')
      const res = await middleware(req)

      expect(res).toBeUndefined()
    })

    it('returns undefined for human on numeric post URL', async () => {
      const req = createRequest('/post/15', 'Mozilla/5.0')
      const res = await middleware(req)

      expect(res).toBeUndefined()
    })

    it('returns undefined when article not found (bot)', async () => {
      mockFetch([])
      const req = createRequest('/article/999', 'facebookexternalhit/1.1')
      const res = await middleware(req)

      expect(res).toBeUndefined()
    })
  })

  describe('og:image fallback', () => {
    it('uses default image when article has no image', async () => {
      mockFetch([{ ...mockArticle, image: null }])
      const req = createRequest('/article/25', 'facebookexternalhit/1.1')
      const res = await middleware(req)

      const html = await res.text()
      expect(html).toContain('og:image" content="https://www.taapost.com/og-default.png"')
    })

    it('uses absolute image URL when article has one', async () => {
      mockFetch([mockArticle])
      const req = createRequest('/article/25', 'facebookexternalhit/1.1')
      const res = await middleware(req)

      const html = await res.text()
      expect(html).toContain('og:image" content=')
      expect(html).toContain('storage/v1/render/image/')
    })
  })

  describe('response headers', () => {
    it('sets correct content-type', async () => {
      mockFetch([mockArticle])
      const req = createRequest('/article/25', 'facebookexternalhit/1.1')
      const res = await middleware(req)

      expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8')
    })

    it('sets cache-control headers', async () => {
      mockFetch([mockArticle])
      const req = createRequest('/article/25', 'facebookexternalhit/1.1')
      const res = await middleware(req)

      expect(res.headers.get('cache-control')).toContain('s-maxage=3600')
      expect(res.headers.get('cache-control')).toContain('stale-while-revalidate=86400')
    })

    it('sets location header for redirects', async () => {
      mockFetch([{ ...mockArticle, type: 'article' }])
      const req = createRequest('/article/my-article', 'Mozilla/5.0')
      const res = await middleware(req)

      expect(res.headers.get('location')).toBeTruthy()
    })
  })

  describe('all social media bots', () => {
    const bots = [
      { name: 'Facebook', ua: 'facebookexternalhit/1.1' },
      { name: 'Twitter/X', ua: 'Twitterbot/1.0' },
      { name: 'WhatsApp', ua: 'WhatsApp/2.23.24.82' },
      { name: 'Telegram', ua: 'TelegramBot (like TwitterBot)' },
      { name: 'LinkedIn', ua: 'LinkedInBot/1.0' },
      { name: 'Discord', ua: 'Discordbot/2.0' },
      { name: 'Reddit', ua: 'RedditBot/1.0' },
      { name: 'Slack', ua: 'Slackbot-LinkExpanding 1.0' },
    ]

    for (const bot of bots) {
      it(`returns OG image for ${bot.name}`, async () => {
        mockFetch([mockArticle])
        const req = createRequest('/article/25', bot.ua)
        const res = await middleware(req)

        expect(res).toBeInstanceOf(Response)
        const html = await res.text()
        expect(html).toContain('og:image" content="')
        expect(html).toContain('og:title" content=')
        expect(html).toContain('og:description" content=')
      })
    }
  })
})
