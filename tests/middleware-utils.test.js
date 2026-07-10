import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isBot,
  resolveImage,
  esc,
  buildOGHtml,
  getArticleParam,
} from '../middleware-utils.js'

describe('isBot', () => {
  it('returns false for null/undefined', () => {
    expect(isBot(null)).toBe(false)
    expect(isBot(undefined)).toBe(false)
    expect(isBot('')).toBe(false)
  })

  it('detects facebookexternalhit', () => {
    expect(isBot('facebookexternalhit/1.1')).toBe(true)
  })

  it('detects WhatsApp (via facebookexternalhit)', () => {
    expect(isBot('WhatsApp/2.23.24.82')).toBe(true)
  })

  it('detects Twitterbot', () => {
    expect(isBot('Twitterbot/1.0')).toBe(true)
  })

  it('detects TelegramBot', () => {
    expect(isBot('TelegramBot (like TwitterBot)')).toBe(true)
  })

  it('detects LinkedInBot', () => {
    expect(isBot('LinkedInBot/1.0')).toBe(true)
  })

  it('detects Discordbot', () => {
    expect(isBot('Discordbot/2.0')).toBe(true)
  })

  it('detects RedditBot', () => {
    expect(isBot('RedditBot/1.0')).toBe(true)
  })

  it('detects Slackbot', () => {
    expect(isBot('Slackbot-LinkExpanding 1.0')).toBe(true)
  })

  it('detects SkypeUriPreview', () => {
    expect(isBot('SkypeUriPreview')).toBe(true)
  })

  it('detects Viber', () => {
    expect(isBot('Viber')).toBe(true)
  })

  it('detects ia_archiver (Wayback Machine)', () => {
    expect(isBot('ia_archiver')).toBe(true)
  })

  it('returns false for regular browsers', () => {
    expect(isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')).toBe(false)
    expect(isBot('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)')).toBe(false)
    expect(isBot('Chrome/120.0.0.0')).toBe(false)
  })

  it('is case-insensitive', () => {
    expect(isBot('FACEBOOKEXTERNALHIT/1.1')).toBe(true)
    expect(isBot('whatsapp/2.23.24.82')).toBe(true)
    expect(isBot('TWITTERBOT/1.0')).toBe(true)
  })
})

describe('resolveImage', () => {
  const origin = 'https://www.taapost.com'

  it('returns default image when input is null/undefined/empty', () => {
    expect(resolveImage(null, origin)).toBe(`${origin}/og-default.svg`)
    expect(resolveImage(undefined, origin)).toBe(`${origin}/og-default.svg`)
    expect(resolveImage('', origin)).toBe(`${origin}/og-default.svg`)
    expect(resolveImage('   ', origin)).toBe(`${origin}/og-default.svg`)
  })

  it('returns absolute HTTPS URLs as-is', () => {
    const url = 'https://example.com/image.png'
    expect(resolveImage(url, origin)).toBe(url)
  })

  it('returns absolute HTTP URLs as-is', () => {
    const url = 'http://example.com/image.png'
    expect(resolveImage(url, origin)).toBe(url)
  })

  it('returns data: URIs as-is', () => {
    const url = 'data:image/png;base64,abc'
    expect(resolveImage(url, origin)).toBe(url)
  })

  it('transforms Supabase Storage URLs for OG optimization', () => {
    const supabaseUrl = 'https://test.supabase.co/storage/v1/object/public/media/test.png'
    const result = resolveImage(supabaseUrl, origin)
    expect(result).toContain('/storage/v1/render/image/')
    expect(result).toContain('width=1200')
    expect(result).toContain('height=630')
    expect(result).toContain('resize=cover')
    expect(result).toContain('format=png')
  })

  it('prepends origin for relative paths starting with /', () => {
    expect(resolveImage('/images/photo.jpg', origin)).toBe(`${origin}/images/photo.jpg`)
  })

  it('prepends origin for relative paths without /', () => {
    expect(resolveImage('images/photo.jpg', origin)).toBe(`${origin}/images/photo.jpg`)
  })

  it('handles paths starting with / (multiple slashes preserved)', () => {
    expect(resolveImage('///images/photo.jpg', origin)).toBe(`${origin}///images/photo.jpg`)
  })

  it('returns just default when origin is empty', () => {
    expect(resolveImage('', '')).toBe('/og-default.svg')
  })
})

describe('esc', () => {
  it('escapes ampersands', () => {
    expect(esc('a & b')).toBe('a &amp; b')
  })

  it('escapes angle brackets', () => {
    expect(esc('<script>')).toBe('&lt;script&gt;')
  })

  it('escapes double quotes', () => {
    expect(esc('say "hello"')).toBe('say &quot;hello&quot;')
  })

  it('escapes single quotes', () => {
    expect(esc("it's")).toBe('it&#39;s')
  })

  it('escapes multiple characters', () => {
    expect(esc('<b>"test" & \'val\'</b>')).toBe('&lt;b&gt;&quot;test&quot; &amp; &#39;val&#39;&lt;/b&gt;')
  })

  it('handles non-string input', () => {
    expect(esc(123)).toBe('123')
    expect(esc(null)).toBe('null')
  })

  it('handles empty string', () => {
    expect(esc('')).toBe('')
  })
})

describe('buildOGHtml', () => {
  const siteName = 'تاء بوست'
  const baseUrl = 'https://www.taapost.com'

  it('builds basic article OG HTML', () => {
    const html = buildOGHtml(
      'عنوان المقال',
      'وصف المقال',
      'https://example.com/image.png',
      `${baseUrl}/article/1`,
      siteName,
      'article'
    )

    expect(html).toContain('<!doctype html>')
    expect(html).toContain('lang="ar"')
    expect(html).toContain('dir="rtl"')
    expect(html).toContain('og:type" content="article"')
    expect(html).toContain('og:title" content="عنوان المقال | تاء بوست"')
    expect(html).toContain('og:description" content="وصف المقال"')
    expect(html).toContain(`og:url" content="${baseUrl}/article/1"`)
    expect(html).toContain('og:image" content="https://example.com/image.png"')
    expect(html).toContain('og:image:width" content="1200"')
    expect(html).toContain('og:image:height" content="630"')
    expect(html).toContain('twitter:card" content="summary_large_image"')
    expect(html).toContain('twitter:title" content="عنوان المقال | تاء بوست"')
    expect(html).toContain('twitter:image" content="https://example.com/image.png"')
    expect(html).toContain(`canonical" href="${baseUrl}/article/1"`)
    expect(html).toContain('meta http-equiv="refresh"')
  })

  it('builds homepage OG HTML with website type', () => {
    const html = buildOGHtml('', 'وصف الموقع', 'https://example.com/logo.png', baseUrl, siteName, 'website')

    expect(html).toContain('og:type" content="website"')
    expect(html).toContain('og:title" content="تاء بوست"')
  })

  it('escapes special characters in title and description', () => {
    const html = buildOGHtml(
      'Article "Special" <Chars>',
      'Description with <b>bold</b> & ampersand',
      'https://example.com/img.png',
      `${baseUrl}/article/1`,
      siteName
    )

    expect(html).toContain('og:title" content="Article &quot;Special&quot; &lt;Chars&gt; | تاء بوست"')
    expect(html).toContain('og:description" content="Description with &lt;b&gt;bold&lt;/b&gt; &amp; ampersand"')
  })

  it('includes extra tags when provided', () => {
    const extra = '<meta property="article:published_time" content="2024-01-15">'
    const html = buildOGHtml('Title', 'Desc', 'img.png', `${baseUrl}/article/1`, siteName, 'article', extra)

    expect(html).toContain(extra)
  })

  it('generates valid HTML structure', () => {
    const html = buildOGHtml('Title', 'Desc', 'img.png', `${baseUrl}/article/1`, siteName)

    expect(html).toContain('<head>')
    expect(html).toContain('</head>')
    expect(html).toContain('<body>')
    expect(html).toContain('</body>')
    expect(html).toContain('<title>Title | تاء بوست</title>')
  })

  it('includes meta description', () => {
    const html = buildOGHtml('Title', 'My Description', 'img.png', `${baseUrl}/article/1`, siteName)
    expect(html).toContain('name="description" content="My Description"')
  })

  it('uses fallback title when title is empty', () => {
    const html = buildOGHtml('', 'Desc', 'img.png', `${baseUrl}/article/1`, siteName)
    expect(html).toContain('<title>تاء بوست</title>')
  })
})

describe('getArticleParam', () => {
  it('extracts article ID from numeric path', () => {
    const result = getArticleParam('/article/25')
    expect(result).toEqual({ param: '25', type: 'article' })
  })

  it('extracts article slug from non-numeric path', () => {
    const result = getArticleParam('/article/my-article-slug')
    expect(result).toEqual({ param: 'my-article-slug', type: 'article' })
  })

  it('extracts post ID from numeric path', () => {
    const result = getArticleParam('/post/15')
    expect(result).toEqual({ param: '15', type: 'post' })
  })

  it('extracts post slug from non-numeric path', () => {
    const result = getArticleParam('/post/my-post-slug')
    expect(result).toEqual({ param: 'my-post-slug', type: 'post' })
  })

  it('URL-decodes the parameter', () => {
    const result = getArticleParam('/article/%D8%AA%D9%82%D8%B1%D9%8A%D8%B1')
    expect(result).toEqual({ param: 'تقرير', type: 'article' })
  })

  it('returns null for non-article/post paths', () => {
    expect(getArticleParam('/')).toBe(null)
    expect(getArticleParam('/categories')).toBe(null)
    expect(getArticleParam('/dashboard')).toBe(null)
    expect(getArticleParam('/author/5')).toBe(null)
  })

  it('returns null for empty/undefined input', () => {
    expect(getArticleParam('')).toBe(null)
  })

  it('handles article path with extra segments', () => {
    const result = getArticleParam('/article/25/extra')
    expect(result).toEqual({ param: '25', type: 'article' })
  })
})
