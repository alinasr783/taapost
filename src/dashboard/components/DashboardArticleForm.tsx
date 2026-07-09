import { useState, useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { X, Save, Video } from 'lucide-react'
import { supabase, type Article, type Category, type User, type UserPermission, type Author } from '../../lib/supabase'
import { hasPermission } from '../utils'
import ImageUpload from './ImageUpload'
import Switch from './Switch'
import { useToast } from './Toast'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import Quill from 'quill'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.min.css'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DirectionStyle = Quill.import('attributors/style/direction') as any
DirectionStyle.whitelist = ['ltr', 'rtl']
Quill.register(DirectionStyle, true)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AlignStyle = Quill.import('attributors/style/align') as any
AlignStyle.whitelist = ['right', 'center', 'justify']
Quill.register(AlignStyle, true)

type Props = {
  article: Article | null
  categories: Category[]
  user: User | null
  permissions: UserPermission[]
  onClose: () => void
  onSuccess: () => void
}

const decodeHtml = (html: string) => {
  const txt = document.createElement('textarea')
  txt.innerHTML = html
  return txt.value
}

function extractYoutubeEmbedUrl(url: string): string | null {
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

export default function DashboardArticleForm({ article, categories, user, permissions, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [authors, setAuthors] = useState<Author[]>([])
  const [videoModalOpen, setVideoModalOpen] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quillRef = useRef<any>(null)

  const [formData, setFormData] = useState(() => {
    if (article) {
      return {
        title: article.title || '',
        excerpt: article.excerpt || '',
        content: decodeHtml(article.content || ''),
        category_id: article.category_id || 0,
        author_id: article.author_id || 0,
        image: article.image || '',
        type: article.type || 'article',
        is_exclusive: article.is_exclusive || false,
        date: article.date ? article.date.split('T')[0] : new Date().toISOString().split('T')[0],
        content_source: article.content_source || ''
      }
    }
    return {
      title: '',
      excerpt: '',
      content: '',
      category_id: 0,
      author_id: 0,
      image: '',
      type: 'article',
      is_exclusive: false,
      date: new Date().toISOString().split('T')[0],
      content_source: ''
    }
  })

  useEffect(() => {
    supabase.from('authors').select('*').order('name').then(({ data }) => {
      if (data) setAuthors(data)
    })

    if (!article) {
      // Set default category if available
      const availableCategories = categories.filter(c => 
        user?.is_superadmin || permissions.some(p => p.category_id === c.id && p.can_add)
      )
      if (availableCategories.length > 0 && formData.category_id === 0) {
        setFormData(prev => ({ ...prev, category_id: availableCategories[0].id }))
      }
    }
  }, [article, categories, user, permissions, formData.category_id])

  // Auto-assign articles to the dedicated "Articles" category
  useEffect(() => {
    if (formData.type === 'article' && categories.length > 0) {
      const articlesCategory = categories.find(c => c.slug === 'articles')
      if (articlesCategory && formData.category_id !== articlesCategory.id) {
        setFormData(prev => ({ ...prev, category_id: articlesCategory.id }))
      }
    }
  }, [formData.type, categories, formData.category_id])

  const handleVideoToolbarClick = useCallback(() => {
    setVideoModalOpen(true)
  }, [])

  const handleVideoInsert = useCallback(() => {
    const embedUrl = extractYoutubeEmbedUrl(videoUrl)
    if (!embedUrl) {
      showToast('رابط يوتيوب غير صالح', 'error')
      return
    }

    const editor = quillRef.current?.getEditor()
    if (!editor) return

    const range = editor.getSelection(true)

    const videoId = embedUrl.split('/').pop() || ''
    const marker = `{{youtube:${videoId}}}`

    editor.insertText(range.index, marker, 'user')
    editor.setSelection(range.index + marker.length, 0, 'silent')

    setVideoModalOpen(false)
    setVideoUrl('')
  }, [videoUrl, showToast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const action = article ? 'edit' : 'add'
    if (!hasPermission(user, permissions, formData.category_id, action)) {
      showToast('ليس لديك صلاحية للقيام بهذا الإجراء في هذا القسم', 'error')
      return
    }

    setLoading(true)
    try {
      const dataToSave = {
        ...formData,
        author_id: formData.author_id === 0 ? null : formData.author_id,
        content_source: formData.content_source || null,
        slug: null,
      }

      let error
      if (article) {
        const { error: updateError } = await supabase
          .from('articles')
          .update(dataToSave)
          .eq('id', article.id)
        error = updateError
      } else {
        const { error: insertError } = await supabase
          .from('articles')
          .insert([dataToSave])
        error = insertError
      }

      if (error) throw error

      queryClient.invalidateQueries({ queryKey: ['home_data'] })
      onSuccess()
    } catch (err: unknown) {
      console.error('Error saving article:', err)
      const message = err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ المقال'
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Filter categories for dropdown based on permission
  const availableCategories = categories.filter(c => {
    if (user?.is_superadmin) return true
    // For editing, allow current category even if permission lost (edge case)
    // But generally check 'add' permission for new, 'edit' for existing
    // Actually, when editing, you might want to change category. 
    // You should only be able to move it to a category you have 'add' permission for?
    // Let's simplify: show all categories user has 'add' permission for (if new) or 'edit' (if existing)
    // Actually, user needs 'edit' on the current article's category to open this form.
    // To change category, they need 'add' on the new category.
    // This is getting complex. Let's just list categories they have ANY permission on.
    return permissions.some(p => p.category_id === c.id)
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col border border-border" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border flex justify-between items-center sticky top-0 bg-card z-10">
          <h2 className="text-xl font-bold text-foreground">{article ? 'تعديل مقال' : 'إضافة مقال جديد'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">العنوان</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring outline-none text-foreground"
              />
            </div>
            <div />
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-3 gap-6`}>
            {formData.type !== 'article' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">القسم</label>
                <select
                  required
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: Number(e.target.value) })}
                  className="w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring outline-none text-foreground"
                >
                  <option value={0} disabled>اختر القسم</option>
                  {availableCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">نوع المحتوى</label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring outline-none text-foreground"
              >
                <option value="article">مقال</option>
                <option value="other">محتوى آخر</option>
              </select>
            </div>
            <div className="flex items-end mb-1">
              <div className="flex items-center justify-between gap-2 bg-muted/30 p-2 rounded-md border border-input w-full">
                <span className="text-sm font-medium text-foreground">مقال حصري</span>
                <Switch checked={Boolean(formData.is_exclusive)} onCheckedChange={(checked) => setFormData({ ...formData, is_exclusive: checked })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">التاريخ</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring outline-none text-foreground"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">الكاتب (اختياري)</label>
            <select
              value={formData.author_id}
              onChange={(e) => setFormData({ ...formData, author_id: Number(e.target.value) })}
              className="w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring outline-none text-foreground"
            >
              <option value={0}>بدون كاتب</option>
              {authors.map(author => (
                <option key={author.id} value={author.id}>{author.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">مصدر المحتوى (اختياري)</label>
            <input
              type="text"
              value={formData.content_source}
              onChange={(e) => setFormData({ ...formData, content_source: e.target.value })}
              placeholder="مثال: المراسل: أحمد من القاهرة"
              className="w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring outline-none text-foreground"
            />
          </div>

          <div>
            <ImageUpload
              value={formData.image}
              onChange={(url) => setFormData({ ...formData, image: url })}
              label="صورة المقال"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">مقتطف (Excerpt)</label>
            <textarea
              rows={3}
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              className="w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring outline-none text-foreground"
            />
          </div>

          <div className="min-h-[300px]">
            <label className="block text-sm font-medium text-foreground mb-1">المحتوى</label>
            <div className="bg-background text-foreground">
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={formData.content}
                onChange={(value: string) => setFormData({ ...formData, content: value })}
                className="h-64 mb-12"
                placeholder="اكتب محتوى المقال هنا..."
                modules={{
                  syntax: { hljs },
                  toolbar: {
                    container: [
                      [{ font: [] }],
                      [{ size: ['small', false, 'large', 'huge'] }],
                      [{ header: [1, 2, 3, 4, 5, 6, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ script: 'sub' }, { script: 'super' }],
                      [{ color: [] }],
                      [{ background: [] }],
                      [{ list: 'ordered' }, { list: 'bullet' }],
                      [{ indent: '-1' }, { indent: '+1' }],
                      [{ direction: 'rtl' }],
                      [{ align: [] }],
                      ['blockquote', 'code-block'],
                      ['link', 'image', 'video'],
                      ['clean']
                    ],
                    handlers: {
                      video: handleVideoToolbarClick
                    }
                  }
                }}
                formats={[
                  'font', 'size',
                  'header',
                  'bold', 'italic', 'underline', 'strike',
                  'script',
                  'color', 'background',
                  'list', 'bullet', 'indent',
                  'direction', 'align',
                  'blockquote', 'code-block', 'code-token',
                  'link', 'image', 'video'
                ]}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground hover:bg-muted rounded transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              <Save size={18} />
              {loading ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        </form>

        {videoModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70]" onClick={() => { setVideoModalOpen(false); setVideoUrl(''); }}>
            <div className="bg-card rounded-lg shadow-xl w-full max-w-md p-6 border border-border mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Video size={20} className="text-primary" />
                إضافة فيديو يوتيوب
              </h3>
              <input
                type="text"
                placeholder="https://www.youtube.com/watch?v=... أو https://youtu.be/..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVideoInsert()}
                className="w-full p-3 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring outline-none text-foreground mb-4"
                autoFocus
                dir="ltr"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setVideoModalOpen(false); setVideoUrl(''); }}
                  className="px-4 py-2 text-muted-foreground hover:bg-muted rounded transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleVideoInsert}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  <Video size={16} />
                  إدراج الفيديو
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
