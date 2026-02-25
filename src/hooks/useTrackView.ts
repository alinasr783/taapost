import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useTrackView(articleId: number) {
  const trackedRef = useRef(false)

  useEffect(() => {
    const trackView = async () => {
      if (trackedRef.current) return
      trackedRef.current = true

      const viewedKey = `viewed_article_${articleId}`
      if (sessionStorage.getItem(viewedKey)) {
        return
      }

      let country = 'Unknown'
      let city = 'Unknown'

      try {
        const res = await fetch('https://ipapi.co/json/')
        if (res.ok) {
          const data = await res.json()
          country = data.country_name || 'Unknown'
          city = data.city || 'Unknown'
        }
      } catch (e) {
        console.error('Failed to fetch location', e)
      }

      try {
        await supabase.from('article_views').insert({
          article_id: articleId,
          country,
          city,
          viewed_at: new Date().toISOString()
        })

        sessionStorage.setItem(viewedKey, 'true')
      } catch (err) {
        console.error('Error tracking view:', err)
      }
    }

    if (articleId) {
      trackView()
    }
  }, [articleId])
}
