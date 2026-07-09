import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Props = {
  type: 'article' | 'post' | 'category' | 'author'
}

export default function LegacyRedirect({ type }: Props) {
  const { slug } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    if (!slug) {
      navigate('/', { replace: true })
      return
    }

    const decoded = decodeURIComponent(slug)

    const redirect = async () => {
      try {
        if (type === 'article') {
          const { data } = await supabase
            .from('articles')
            .select('id')
            .eq('slug', decoded)
            .eq('type', 'article')
            .single()
          if (data) {
            navigate(`/article/${data.id}`, { replace: true })
            return
          }
        } else if (type === 'post') {
          const { data } = await supabase
            .from('articles')
            .select('id, type')
            .eq('slug', decoded)
            .single()
          if (data) {
            if (data.type === 'article') {
              navigate(`/article/${data.id}`, { replace: true })
            } else {
              navigate(`/post/${data.id}`, { replace: true })
            }
            return
          }
        } else if (type === 'category') {
          const { data } = await supabase
            .from('categories')
            .select('id')
            .eq('slug', decoded)
            .single()
          if (data) {
            navigate(`/category/${data.id}`, { replace: true })
            return
          }
        } else if (type === 'author') {
          const { data } = await supabase
            .from('authors')
            .select('id')
            .eq('slug', decoded)
            .single()
          if (data) {
            navigate(`/author/${data.id}`, { replace: true })
            return
          }
        }

        navigate('/', { replace: true })
      } catch {
        navigate('/', { replace: true })
      }
    }

    redirect()
  }, [slug, type, navigate])

  return (
    <div className="container flex min-h-[50dvh] items-center justify-center py-10 text-muted-foreground">
      جاري التحويل...
    </div>
  )
}
