import { useState, useCallback } from 'react'
import {
  FacebookShareButton,
  TwitterShareButton,
  WhatsappShareButton,
  LinkedinShareButton,
  TelegramShareButton,
  RedditShareButton,
  FacebookIcon,
  XIcon,
  WhatsappIcon,
  LinkedinIcon,
  TelegramIcon,
  RedditIcon,
} from 'react-share'
import { Link, Check, Share2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

type Props = {
  url: string
  title: string
  description?: string
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = url
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [url])

  return (
    <button
      onClick={handleCopy}
      className="flex flex-col items-center gap-1.5 group"
      title="نسخ الرابط"
    >
      <div className={`w-11 h-11 rounded-[5px] flex items-center justify-center transition-all duration-200 border shadow-sm ${copied ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700' : 'bg-background border-border/60 group-hover:border-primary/40 group-hover:shadow-md group-hover:-translate-y-0.5'}`}>
        {copied ? (
          <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
        ) : (
          <Link className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        )}
      </div>
      <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
        {copied ? 'تم النسخ' : 'نسخ الرابط'}
      </span>
    </button>
  )
}

function applyTemplate(template: string, url: string, title: string): string {
  return template
    .replace(/\{url\}/g, url)
    .replace(/\{title\}/g, title)
}

export default function ShareButton({ url, title }: Props) {
  const { data: shareMessages = {} } = useQuery<Record<string, string>>({
    queryKey: ['share_messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('share_messages')
        .select('platform, message_template, is_active')
      if (error) throw error
      const map: Record<string, string> = {}
      if (data) {
        data.forEach((msg: { platform: string; message_template: string; is_active: boolean }) => {
          if (msg.is_active) {
            map[msg.platform] = msg.message_template
          }
        })
      }
      return map
    },
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
  })

  const getShareMessage = (platform: string) => {
    const template = shareMessages[platform]
    if (template) {
      return applyTemplate(template, url, title)
    }
    return url
  }

  const shareButtons = [
    {
      Button: FacebookShareButton,
      Icon: FacebookIcon,
      label: 'فيسبوك',
      color: '#1877F2',
      platform: 'facebook',
    },
    {
      Button: TwitterShareButton,
      Icon: XIcon,
      label: 'تويتر',
      color: '#000000',
      platform: 'twitter',
    },
    {
      Button: WhatsappShareButton,
      Icon: WhatsappIcon,
      label: 'واتساب',
      color: '#25D366',
      platform: 'whatsapp',
    },
    {
      Button: LinkedinShareButton,
      Icon: LinkedinIcon,
      label: 'لينكد إن',
      color: '#0A66C2',
      platform: 'linkedin',
    },
    {
      Button: TelegramShareButton,
      Icon: TelegramIcon,
      label: 'تيليجرام',
      color: '#26A5E4',
      platform: 'telegram',
    },
    {
      Button: RedditShareButton,
      Icon: RedditIcon,
      label: 'ريديت',
      color: '#FF4500',
      platform: 'reddit',
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Share2 className="h-4 w-4 text-primary" />
        <span className="text-sm font-bold text-foreground">مشاركة المقال</span>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {shareButtons.map(({ Button, Icon, label, platform }) => (
          <Button
            key={label}
            url={url}
            title={getShareMessage(platform)}
          >
            <div className="flex flex-col items-center gap-1.5 group">
              <div className="w-11 h-11 rounded-[5px] flex items-center justify-center transition-all duration-200 border border-border/40 shadow-sm bg-background group-hover:-translate-y-0.5 group-hover:shadow-md">
                <Icon size={36} round />
              </div>
              <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
                {label}
              </span>
            </div>
          </Button>
        ))}
        <CopyButton url={url} />
      </div>
    </div>
  )
}
