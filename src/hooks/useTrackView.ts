import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useTrackView(articleId: number) {
  const trackedRef = useRef(false)

  useEffect(() => {
    if (!articleId || trackedRef.current) return
    trackedRef.current = true

    const viewedKey = `viewed_article_${articleId}`
    if (sessionStorage.getItem(viewedKey)) return

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

    const trackView = async () => {
      let country = 'Unknown'
      let city = 'Unknown'

      try {
        const res = await fetch('https://ipapi.co/json/', { signal: controller.signal })
        if (res.ok) {
          const data = await res.json()
          country = data.country_name || 'Unknown'
          city = data.city || 'Unknown'
        }
      } catch {
        // Location fetch failed silently - continue with Unknown
      } finally {
        clearTimeout(timeoutId)
      }

      try {
        await supabase.from('article_views').insert({
          article_id: articleId,
          country,
          city,
          viewed_at: new Date().toISOString()
        })
        sessionStorage.setItem(viewedKey, 'true')
      } catch {
        // View tracking failed silently
      }
    }

    trackView()
  }, [articleId])
}
