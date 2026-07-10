import { describe, it, expect } from 'vitest'

function extractYoutubeEmbedUrl(url) {
  const trimmed = url.trim()
  if (!trimmed) return null

  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
  ]

  for (const pattern of patterns) {
    const match = trimmed.match(pattern)
    if (match?.[1]) {
      return `https://www.youtube.com/embed/${match[1]}`
    }
  }

  return null
}

function createVideoMarker(videoUrl, videoCaption) {
  const embedUrl = extractYoutubeEmbedUrl(videoUrl)
  if (!embedUrl) return null
  const videoId = embedUrl.split('/').pop() || ''
  return videoCaption.trim()
    ? `{{youtube:${videoId}|${videoCaption.trim()}}}`
    : `{{youtube:${videoId}}}`
}

describe('Video Marker Creation Logic', () => {
  describe('extractYoutubeEmbedUrl', () => {
    it('extracts video ID from standard YouTube URL', () => {
      const result = extractYoutubeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      expect(result).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
    })

    it('extracts video ID from short YouTube URL', () => {
      const result = extractYoutubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ')
      expect(result).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
    })

    it('extracts video ID from embed URL', () => {
      const result = extractYoutubeEmbedUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')
      expect(result).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
    })

    it('extracts video ID from shorts URL', () => {
      const result = extractYoutubeEmbedUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')
      expect(result).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
    })

    it('extracts video ID from mobile URL', () => {
      const result = extractYoutubeEmbedUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ')
      expect(result).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
    })

    it('extracts video ID from live URL', () => {
      const result = extractYoutubeEmbedUrl('https://www.youtube.com/live/dQw4w9WgXcQ')
      expect(result).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
    })

    it('returns null for invalid URL', () => {
      const result = extractYoutubeEmbedUrl('https://example.com/video')
      expect(result).toBeNull()
    })

    it('returns null for empty URL', () => {
      const result = extractYoutubeEmbedUrl('')
      expect(result).toBeNull()
    })

    it('handles URLs with extra parameters', () => {
      const result = extractYoutubeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf')
      expect(result).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
    })

    it('handles URLs with timestamps', () => {
      const result = extractYoutubeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120')
      expect(result).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
    })
  })

  describe('createVideoMarker', () => {
    it('creates marker without caption', () => {
      const result = createVideoMarker('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '')
      expect(result).toBe('{{youtube:dQw4w9WgXcQ}}')
    })

    it('creates marker with caption', () => {
      const result = createVideoMarker('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Video Caption')
      expect(result).toBe('{{youtube:dQw4w9WgXcQ|Video Caption}}')
    })

    it('creates marker with arabic caption', () => {
      const result = createVideoMarker('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'فيديو تعليمي')
      expect(result).toBe('{{youtube:dQw4w9WgXcQ|فيديو تعليمي}}')
    })

    it('creates marker with mixed arabic-english caption', () => {
      const result = createVideoMarker('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'فيديو Tutorial part 1')
      expect(result).toBe('{{youtube:dQw4w9WgXcQ|فيديو Tutorial part 1}}')
    })

    it('trims whitespace from caption', () => {
      const result = createVideoMarker('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '  Caption  ')
      expect(result).toBe('{{youtube:dQw4w9WgXcQ|Caption}}')
    })

    it('creates marker without caption when caption is whitespace only', () => {
      const result = createVideoMarker('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '   ')
      expect(result).toBe('{{youtube:dQw4w9WgXcQ}}')
    })

    it('returns null for invalid URL', () => {
      const result = createVideoMarker('https://example.com/video', 'Caption')
      expect(result).toBeNull()
    })

    it('works with short URL format', () => {
      const result = createVideoMarker('https://youtu.be/dQw4w9WgXcQ', 'Short URL Caption')
      expect(result).toBe('{{youtube:dQw4w9WgXcQ|Short URL Caption}}')
    })

    it('works with embed URL format', () => {
      const result = createVideoMarker('https://www.youtube.com/embed/dQw4w9WgXcQ', 'Embed Caption')
      expect(result).toBe('{{youtube:dQw4w9WgXcQ|Embed Caption}}')
    })

    it('works with shorts URL format', () => {
      const result = createVideoMarker('https://www.youtube.com/shorts/dQw4w9WgXcQ', 'Shorts Caption')
      expect(result).toBe('{{youtube:dQw4w9WgXcQ|Shorts Caption}}')
    })

    it('marker can be parsed back correctly', () => {
      const marker = createVideoMarker('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Test Caption')
      const regex = /\{\{youtube:([a-zA-Z0-9_-]{11})(?:\|([^}]*))?\}\}/g
      const match = regex.exec(marker)
      expect(match).not.toBeNull()
      expect(match[1]).toBe('dQw4w9WgXcQ')
      expect(match[2]).toBe('Test Caption')
    })
  })

  describe('marker round-trip (create -> parse -> verify)', () => {
    const testCases = [
      { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', caption: '' },
      { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', caption: 'Simple Caption' },
      { url: 'https://youtu.be/dQw4w9WgXcQ', caption: 'Short URL Caption' },
      { url: 'https://www.youtube.com/watch?v=9bZkp7q19f0', caption: 'فيديو عربي' },
      { url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ', caption: 'Caption with "quotes" & symbols!' },
    ]

    testCases.forEach(({ url, caption }) => {
      it(`round-trips correctly for: ${caption || '(no caption)'}`, () => {
        const marker = createVideoMarker(url, caption)

        const regex = /\{\{youtube:([a-zA-Z0-9_-]{11})(?:\|([^}]*))?\}\}/g
        const match = regex.exec(marker)

        expect(match).not.toBeNull()
        const extractedVideoId = match[1]
        const extractedCaption = match[2]

        const embedUrl = extractYoutubeEmbedUrl(url)
        const expectedVideoId = embedUrl.split('/').pop()

        expect(extractedVideoId).toBe(expectedVideoId)
        expect(extractedCaption || '').toBe(caption.trim() || '')
      })
    })
  })
})
