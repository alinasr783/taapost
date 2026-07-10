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

const mockPostWithoutImage = {
  id: 30,
  slug: 'no-image-post',
  title: 'منشور بدون صورة',
  excerpt: 'ملخص بدون صورة',
  image: null,
  date: '2024-02-01',
  type: 'post',
}

function createRequest(path, ua = 'Mozilla/5.0') {
  return new Request(`https://www.taapost.com${path}`, {
    headers: { 'user-agent': ua },
  })
}

function mockFetch(data) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(Array.isArray(data) ? data : [data]),
  })
}

beforeEach(() => {
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
  process.env.VITE_SUPABASE_ANON_KEY = 'test-key'
  process.env.VITE_SITE_URL = 'https://www.taapost.com'
})

afterEach(() => {
  vi.restoreAllMocks()
  delete process.env.VITE_SUPABASE_URL
  delete process.env.VITE_SUPABASE_ANON_KEY
  delete process.env.VITE_SITE_URL
})

describe('Share URL → Crawler Response flow', () => {
  let middleware

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('../middleware.js')
    middleware = mod.default
  })

  describe('article share links', () => {
    it('returns correct OG when bot crawls /article/25', async () => {
      mockFetch(mockArticle)
      const req = createRequest('/article/25', 'facebookexternalhit/1.1')
      const res = await middleware(req)

      expect(res.status).toBe(200)
      const html = await res.text()
      expect(html).toContain('og:image" content="')
      expect(html).toContain('storage/v1/render/image/')
      expect(html).toContain('og:title" content="عنوان المقال | تاء بوست"')
      expect(html).toContain(`og:url" content="https://www.taapost.com/article/25"`)
    })

    it('returns correct OG when bot crawls /article/my-article (slug)', async () => {
      mockFetch(mockArticle)
      const req = createRequest('/article/my-article', 'Twitterbot/1.0')
      const res = await middleware(req)

      expect(res.status).toBe(200)
      const html = await res.text()
      expect(html).toContain('og:image" content=')
      expect(html).toContain(`og:url" content="https://www.taapost.com/article/25"`)
    })

    it('article with slug "article" still gets numeric og:url', async () => {
      const badSlugArticle = { ...mockArticle, slug: 'article' }
      mockFetch(badSlugArticle)
      const req = createRequest('/article/25', 'WhatsApp/2.23.24.82')
      const res = await middleware(req)

      const html = await res.text()
      expect(html).toContain(`og:url" content="https://www.taapost.com/article/25"`)
      expect(html).not.toContain('/article/article')
    })

    it('article with empty slug gets numeric og:url', async () => {
      const noSlugArticle = { ...mockArticle, slug: '' }
      mockFetch(noSlugArticle)
      const req = createRequest('/article/25', 'facebookexternalhit/1.1')
      const res = await middleware(req)

      const html = await res.text()
      expect(html).toContain(`og:url" content="https://www.taapost.com/article/25"`)
    })

    it('article with null slug gets numeric og:url', async () => {
      const nullSlugArticle = { ...mockArticle, slug: null }
      mockFetch(nullSlugArticle)
      const req = createRequest('/article/25', 'Discordbot/2.0')
      const res = await middleware(req)

      const html = await res.text()
      expect(html).toContain(`og:url" content="https://www.taapost.com/article/25"`)
    })
  })

  describe('post share links', () => {
    it('returns correct OG when bot crawls /post/15', async () => {
      mockFetch(mockPost)
      const req = createRequest('/post/15', 'facebookexternalhit/1.1')
      const res = await middleware(req)

      expect(res.status).toBe(200)
      const html = await res.text()
      expect(html).toContain('og:image" content="https://example.com/post-image.jpg"')
      expect(html).toContain(`og:url" content="https://www.taapost.com/post/15"`)
    })

    it('post without image uses default fallback', async () => {
      mockFetch(mockPostWithoutImage)
      const req = createRequest('/post/30', 'facebookexternalhit/1.1')
      const res = await middleware(req)

      const html = await res.text()
      expect(html).toContain('og:image" content="https://www.taapost.com/og-default.svg"')
    })
  })

  describe('human user flow', () => {
    it('human visiting /article/25 gets SPA (no middleware response)', async () => {
      const req = createRequest('/article/25', 'Mozilla/5.0 (Windows)')
      const res = await middleware(req)
      expect(res).toBeUndefined()
    })

    it('human visiting /article/slug gets 301 redirect to numeric ID', async () => {
      mockFetch(mockArticle)
      const req = createRequest('/article/my-article', 'Mozilla/5.0 (Windows)')
      const res = await middleware(req)

      expect(res.status).toBe(301)
      expect(res.headers.get('location')).toBe('https://www.taapost.com/article/25')
    })

    it('human visiting /post/slug gets 301 redirect to numeric ID', async () => {
      mockFetch(mockPost)
      const req = createRequest('/post/my-post', 'Mozilla/5.0 (Windows)')
      const res = await middleware(req)

      expect(res.status).toBe(301)
      expect(res.headers.get('location')).toBe('https://www.taapost.com/post/15')
    })
  })

  describe('OG tag completeness for all platforms', () => {
    it('contains all required tags for WhatsApp', async () => {
      mockFetch(mockArticle)
      const req = createRequest('/article/25', 'facebookexternalhit/1.1')
      const res = await middleware(req)
      const html = await res.text()

      const requiredTags = [
        'og:title',
        'og:description',
        'og:image',
        'og:url',
        'og:type',
        'og:site_name',
        'og:locale',
        'twitter:card',
        'twitter:title',
        'twitter:description',
        'twitter:image',
        'canonical',
      ]

      for (const tag of requiredTags) {
        expect(html).toContain(tag)
      }
    })

    it('image URL is absolute (required by all platforms)', async () => {
      mockFetch(mockArticle)
      const req = createRequest('/article/25', 'facebookexternalhit/1.1')
      const res = await middleware(req)
      const html = await res.text()

      const imageUrl = html.match(/og:image" content="([^"]+)"/)?.[1]
      expect(imageUrl).toMatch(/^https?:\/\//)
    })

    it('og:image:width and og:image:height are set', async () => {
      mockFetch(mockArticle)
      const req = createRequest('/article/25', 'facebookexternalhit/1.1')
      const res = await middleware(req)
      const html = await res.text()

      expect(html).toContain('og:image:width" content="1200"')
      expect(html).toContain('og:image:height" content="630"')
    })

    it('article:published_time is included when date exists', async () => {
      mockFetch(mockArticle)
      const req = createRequest('/article/25', 'facebookexternalhit/1.1')
      const res = await middleware(req)
      const html = await res.text()

      expect(html).toContain('article:published_time" content="2024-01-15"')
    })

    it('article:published_time is NOT included when date is null', async () => {
      mockFetch({ ...mockArticle, date: null })
      const req = createRequest('/article/25', 'facebookexternalhit/1.1')
      const res = await middleware(req)
      const html = await res.text()

      expect(html).not.toContain('article:published_time')
    })
  })
})
