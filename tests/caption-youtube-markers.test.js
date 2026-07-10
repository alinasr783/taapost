import { describe, it, expect } from 'vitest'

const youTubeMarkerRegex = /\{\{youtube:([a-zA-Z0-9_-]{11})(?:\|([^}]*))?\}\}/g

function processYouTubeMarkers(html) {
  return html.replace(youTubeMarkerRegex, (_match, videoId, caption) => {
    const embedUrl = `https://www.youtube.com/embed/${videoId}`
    const captionHtml = caption
      ? `<figcaption style="font-size:0.875rem;opacity:0.7;margin-top:0.5em;text-align:center;color:hsl(var(--foreground));">${caption}</figcaption>`
      : ''
    return `<figure style="max-width:100%;margin:1.5em 0;"><div class="ql-video-wrapper" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;"><iframe class="ql-video" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>${captionHtml}</figure>`
  })
}

describe('YouTube Caption Marker Regex', () => {
  describe('pattern matching', () => {
    it('matches basic youtube marker without caption', () => {
      const match = '{{youtube:dQw4w9WgXcQ}}'.match(youTubeMarkerRegex)
      expect(match).not.toBeNull()
      expect(match[0]).toBe('{{youtube:dQw4w9WgXcQ}}')
    })

    it('matches youtube marker with caption', () => {
      const match = '{{youtube:dQw4w9WgXcQ|فيديو تعليمي}}'.match(youTubeMarkerRegex)
      expect(match).not.toBeNull()
      expect(match[0]).toBe('{{youtube:dQw4w9WgXcQ|فيديو تعليمي}}')
    })

    it('matches youtube marker with empty caption', () => {
      const match = '{{youtube:dQw4w9WgXcQ|}}'.match(youTubeMarkerRegex)
      expect(match).not.toBeNull()
      expect(match[0]).toBe('{{youtube:dQw4w9WgXcQ|}}')
    })

    it('does not match invalid video ID (too short)', () => {
      const match = '{{youtube:abc123}}'.match(youTubeMarkerRegex)
      expect(match).toBeNull()
    })

    it('does not match invalid video ID (too long)', () => {
      const match = '{{youtube:abc123456789}}'.match(youTubeMarkerRegex)
      expect(match).toBeNull()
    })

    it('does not match invalid characters in video ID', () => {
      const match = '{{youtube:dQw4w9W@XcQ}}'.match(youTubeMarkerRegex)
      expect(match).toBeNull()
    })

    it('matches video ID with hyphens and underscores', () => {
      const match = '{{youtube:dQw4w9W_-cQ}}'.match(youTubeMarkerRegex)
      expect(match).not.toBeNull()
    })

    it('does not match empty video ID', () => {
      const match = '{{youtube:}}'.match(youTubeMarkerRegex)
      expect(match).toBeNull()
    })

    it('does not match missing closing braces', () => {
      const match = '{{youtube:dQw4w9WgXcQ'.match(youTubeMarkerRegex)
      expect(match).toBeNull()
    })

    it('does not match missing opening braces', () => {
      const match = 'youtube:dQw4w9WgXcQ}}'.match(youTubeMarkerRegex)
      expect(match).toBeNull()
    })
  })

  describe('caption content extraction', () => {
    it('extracts caption text after pipe', () => {
      const regex = /\{\{youtube:([a-zA-Z0-9_-]{11})(?:\|([^}]*))?\}\}/g
      const input = '{{youtube:dQw4w9WgXcQ|Caption Text}}'
      const match = regex.exec(input)
      expect(match).not.toBeNull()
      expect(match[1]).toBe('dQw4w9WgXcQ')
      expect(match[2]).toBe('Caption Text')
    })

    it('extracts arabic caption text', () => {
      const regex = /\{\{youtube:([a-zA-Z0-9_-]{11})(?:\|([^}]*))?\}\}/g
      const input = '{{youtube:dQw4w9WgXcQ|فيديو تعليمي بالعربية}}'
      const match = regex.exec(input)
      expect(match).not.toBeNull()
      expect(match[1]).toBe('dQw4w9WgXcQ')
      expect(match[2]).toBe('فيديو تعليمي بالعربية')
    })

    it('extracts caption with special characters', () => {
      const regex = /\{\{youtube:([a-zA-Z0-9_-]{11})(?:\|([^}]*))?\}\}/g
      const input = '{{youtube:dQw4w9WgXcQ|Caption: "Hello World" & more!}}'
      const match = regex.exec(input)
      expect(match).not.toBeNull()
      expect(match[2]).toBe('Caption: "Hello World" & more!')
    })

    it('returns undefined for no caption', () => {
      const regex = /\{\{youtube:([a-zA-Z0-9_-]{11})(?:\|([^}]*))?\}\}/g
      const input = '{{youtube:dQw4w9WgXcQ}}'
      const match = regex.exec(input)
      expect(match).not.toBeNull()
      expect(match[1]).toBe('dQw4w9WgXcQ')
      expect(match[2]).toBeUndefined()
    })

    it('returns empty string for empty caption', () => {
      const regex = /\{\{youtube:([a-zA-Z0-9_-]{11})(?:\|([^}]*))?\}\}/g
      const input = '{{youtube:dQw4w9WgXcQ|}}'
      const match = regex.exec(input)
      expect(match).not.toBeNull()
      expect(match[2]).toBe('')
    })
  })

  describe('processYouTubeMarkers function', () => {
    it('replaces basic youtube marker with iframe', () => {
      const result = processYouTubeMarkers('{{youtube:dQw4w9WgXcQ}}')
      expect(result).toContain('<iframe')
      expect(result).toContain('https://www.youtube.com/embed/dQw4w9WgXcQ')
      expect(result).toContain('ql-video-wrapper')
      expect(result).not.toContain('<figcaption')
    })

    it('replaces youtube marker with caption and figcaption', () => {
      const result = processYouTubeMarkers('{{youtube:dQw4w9WgXcQ|Caption Text}}')
      expect(result).toContain('<iframe')
      expect(result).toContain('https://www.youtube.com/embed/dQw4w9WgXcQ')
      expect(result).toContain('<figcaption')
      expect(result).toContain('Caption Text')
      expect(result).toContain('</figcaption>')
    })

    it('wraps video in figure element', () => {
      const result = processYouTubeMarkers('{{youtube:dQw4w9WgXcQ}}')
      expect(result).toContain('<figure')
      expect(result).toContain('</figure>')
    })

    it('handles multiple youtube markers in one string', () => {
      const input = 'First: {{youtube:dQw4w9WgXcQ|First Caption}} and Second: {{youtube:9bZkp7q19f0|Second Caption}}'
      const result = processYouTubeMarkers(input)
      const figcaptionCount = (result.match(/<figcaption/g) || []).length
      expect(figcaptionCount).toBe(2)
      expect(result).toContain('First Caption')
      expect(result).toContain('Second Caption')
    })

    it('handles mixed markers with and without captions', () => {
      const input = 'With: {{youtube:dQw4w9WgXcQ|Has Caption}} and Without: {{youtube:9bZkp7q19f0}}'
      const result = processYouTubeMarkers(input)
      const figcaptionCount = (result.match(/<figcaption/g) || []).length
      expect(figcaptionCount).toBe(1)
      expect(result).toContain('Has Caption')
    })

    it('does not modify text without youtube markers', () => {
      const input = '<p>Normal paragraph with no videos.</p>'
      const result = processYouTubeMarkers(input)
      expect(result).toBe(input)
    })

    it('preserves surrounding text', () => {
      const input = 'Before {{youtube:dQw4w9WgXcQ|Caption}} After'
      const result = processYouTubeMarkers(input)
      expect(result).toContain('Before')
      expect(result).toContain('After')
      expect(result).toContain('Caption')
    })

    it('handles empty string', () => {
      const result = processYouTubeMarkers('')
      expect(result).toBe('')
    })

    it('handles content with only text and no markers', () => {
      const input = '<h2>Title</h2><p>Some content</p>'
      const result = processYouTubeMarkers(input)
      expect(result).toBe(input)
    })

    it('handles arabic caption text correctly', () => {
      const result = processYouTubeMarkers('{{youtube:dQw4w9WgXcQ|فيديو تعليمي}}')
      expect(result).toContain('فيديو تعليمي')
    })

    it('handles caption with HTML-like characters safely', () => {
      const result = processYouTubeMarkers('{{youtube:dQw4w9WgXcQ|Caption with <script>alert(1)</script>}}')
      expect(result).toContain('Caption with <script>alert(1)</script>')
      expect(result).toContain('<figcaption')
    })
  })

  describe('backward compatibility', () => {
    it('still works with old format (no caption)', () => {
      const result = processYouTubeMarkers('{{youtube:dQw4w9WgXcQ}}')
      expect(result).toContain('https://www.youtube.com/embed/dQw4w9WgXcQ')
    })

    it('old format produces valid iframe', () => {
      const result = processYouTubeMarkers('{{youtube:dQw4w9WgXcQ}}')
      expect(result).toContain('<iframe')
      expect(result).toContain('allowfullscreen')
    })

    it('old format wrapped in figure', () => {
      const result = processYouTubeMarkers('{{youtube:dQw4w9WgXcQ}}')
      expect(result).toContain('<figure')
    })
  })
})
