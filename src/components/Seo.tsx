import { useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useSiteSettings } from './useSiteSettings'

type Props = {
  title?: string
  description?: string
  canonicalPath?: string
  image?: string
  robots?: string
  ogType?: string
  jsonLd?: unknown
}

function resolveAbsoluteUrl(origin: string, input: string) {
  const v = input.trim()
  if (!v) return ''
  if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('data:') || v.startsWith('blob:')) return v
  if (v.startsWith('/')) return `${origin}${v}`
  return `${origin}/${v.replace(/^\/+/, '')}`
}

function upsertMetaByName(name: string, content: string) {
  const head = document.head
  const existing = head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
  const el = existing ?? (document.createElement('meta') as HTMLMetaElement)
  if (!existing) {
    el.setAttribute('name', name)
    head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertMetaByProperty(property: string, content: string) {
  const head = document.head
  const existing = head.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null
  const el = existing ?? (document.createElement('meta') as HTMLMetaElement)
  if (!existing) {
    el.setAttribute('property', property)
    head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  const head = document.head
  const existing = head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
  const el = existing ?? (document.createElement('link') as HTMLLinkElement)
  if (!existing) {
    el.setAttribute('rel', rel)
    head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function upsertJsonLd(value: unknown) {
  const head = document.head
  const id = 'taapost-jsonld'
  const existing = head.querySelector(`script#${id}`) as HTMLScriptElement | null
  const el = existing ?? (document.createElement('script') as HTMLScriptElement)
  if (!existing) {
    el.id = id
    el.type = 'application/ld+json'
    head.appendChild(el)
  }
  el.text = JSON.stringify(value)
}

export default function Seo(props: Props) {
  const site = useSiteSettings()
  const location = useLocation()

  const origin = useMemo(() => {
    const env = (import.meta as unknown as { env?: Record<string, unknown> }).env
    const configured = typeof env?.VITE_SITE_URL === 'string' ? String(env.VITE_SITE_URL).trim() : ''
    if (configured) return configured.replace(/\/+$/, '')
    return typeof window !== 'undefined' ? window.location.origin : ''
  }, [])

  const canonicalUrl = useMemo(() => {
    const path = (props.canonicalPath ?? location.pathname).trim() || '/'
    const normalized = path.startsWith('/') ? path : `/${path}`
    return origin ? `${origin}${normalized}` : normalized
  }, [location.pathname, origin, props.canonicalPath])

  const title = useMemo(() => {
    const t = props.title?.trim()
    if (t) return `${t} | ${site.site_name}`
    return site.site_name
  }, [props.title, site.site_name])

  const description = useMemo(() => {
    return (props.description?.trim() || site.site_description || '').trim()
  }, [props.description, site.site_description])

  const image = useMemo(() => {
    const fallback = site.logo_url?.trim() ? site.logo_url.trim() : '/og-default.svg'
    const src = props.image?.trim() ? props.image.trim() : fallback
    return origin ? resolveAbsoluteUrl(origin, src) : src
  }, [origin, props.image, site.logo_url])

  const robots = useMemo(() => {
    return (props.robots?.trim() || 'index,follow,max-image-preview:large').trim()
  }, [props.robots])

  const ogType = useMemo(() => {
    return (props.ogType?.trim() || 'website').trim()
  }, [props.ogType])

  useEffect(() => {
    if (!origin) return
    document.title = title
    upsertLink('canonical', canonicalUrl)

    if (description) upsertMetaByName('description', description)
    upsertMetaByName('robots', robots)
    upsertMetaByName('viewport', 'width=device-width, initial-scale=1.0')

    upsertMetaByProperty('og:locale', 'ar_AR')
    upsertMetaByProperty('og:site_name', site.site_name)
    upsertMetaByProperty('og:type', ogType)
    upsertMetaByProperty('og:title', title)
    if (description) upsertMetaByProperty('og:description', description)
    upsertMetaByProperty('og:url', canonicalUrl)
    if (image) upsertMetaByProperty('og:image', image)

    upsertMetaByName('twitter:card', 'summary_large_image')
    upsertMetaByName('twitter:title', title)
    if (description) upsertMetaByName('twitter:description', description)
    if (image) upsertMetaByName('twitter:image', image)

    if (props.jsonLd) {
      const v = props.jsonLd
      if (Array.isArray(v)) {
        upsertJsonLd({ '@context': 'https://schema.org', '@graph': v })
      } else {
        upsertJsonLd(v)
      }
    }
  }, [canonicalUrl, description, image, ogType, origin, props.jsonLd, robots, site.site_name, title])

  return null
}
