import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Save, Video, Check, AlertCircle, Loader2 } from 'lucide-react'
import { supabase, type Category, type User, type UserPermission, type Author } from '../../lib/supabase'
import { hasPermission } from '../utils'
import ImageUpload from '../components/ImageUpload'
import Switch from '../components/Switch'
import { useToast } from '../components/Toast'
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

const decodeHtml = (html: string) => {
  const txt = document.createElement('textarea')
  txt.innerHTML = html
  return txt.value
}

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/
const SLUG_MAX = 100

function validateSlug(value: string): string | null {
  if (!value.trim()) return 'الرابط مطلوب'
  if (value.length > SLUG_MAX) return `الرابط يجب ألا يتجاوز ${SLUG_MAX} حرفاً`
  if (/\s/.test(value)) return 'الرابط لا يجب أن يحتوي على مسافات'
  if (/[A-Z]/.test(value)) return 'استخدم الحروف الإنجليزية الصغيرة فقط'
  if (/[^a-z0-9-]/.test(value)) return 'الرابط يقبل فقط الحروف الإنجليزية والأرقام والشرطات (-)'
  if (value.startsWith('-') || value.endsWith('-')) return 'الرابط لا يبدأ أو ينتهي بشرطة'
  if (value.includes('--')) return 'الرابط لا يحتوي على شرطتين متتاليتين'
  if (!SLUG_REGEX.test(value)) return 'صيغة الرابط غير صالحة - مثال: my-article-slug'
  return null
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

export default function DashboardArticleEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const isEditing = Boolean(id)

  const [loading, setLoading] = useState(false)
  const [fetchingArticle, setFetchingArticle] = useState(isEditing)
  const [authors, setAuthors] = useState<Author[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [permissions, setPermissions] = useState<UserPermission[]>([])
  const [videoModalOpen, setVideoModalOpen] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quillRef = useRef<any>(null)
  const [slug, setSlug] = useState('')
  const [slugError, setSlugError] = useState<string | null>(null)
  const [slugChecking, setSlugChecking] = useState(false)
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const slugCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [user] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('dashboard_user')
    if (!storedUser) return null
    try {
      const parsed: unknown = JSON.parse(storedUser)
      if (typeof parsed !== 'object' || parsed === null) return null
      const u = parsed as Partial<User>
      if (typeof u.id !== 'number') return null
      if (typeof u.username !== 'string') return null
      if (typeof u.is_superadmin !== 'boolean') return null
      if (typeof u.created_at !== 'string') return null
      return u as User
    } catch {
      return null
    }
  })

  const [formData, setFormData] = useState({
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
  })

  const checkSlugUnique = useCallback(async (value: string) => {
    if (!value.trim()) return
    setSlugChecking(true)
    try {
      const { data } = await supabase
        .from('articles')
        .select('id')
        .eq('slug', value.trim())
        .maybeSingle()
      const exists = data && (!isEditing || data.id !== Number(id))
      setSlugAvailable(!exists)
    } catch {
      setSlugAvailable(null)
    } finally {
      setSlugChecking(false)
    }
  }, [isEditing, id])

  const handleSlugChange = useCallback((value: string) => {
    const sanitized = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    setSlug(sanitized)
    const err = validateSlug(sanitized)
    setSlugError(err)
    if (err) {
      setSlugAvailable(null)
      return
    }
    if (slugCheckTimeout.current) clearTimeout(slugCheckTimeout.current)
    slugCheckTimeout.current = setTimeout(() => checkSlugUnique(sanitized), 600)
  }, [checkSlugUnique])

  useEffect(() => {
    const loadData = async () => {
      const [authorsRes, categoriesRes] = await Promise.all([
        supabase.from('authors').select('*').order('name'),
        supabase.from('categories').select('*')
      ])
      if (authorsRes.data) setAuthors(authorsRes.data)
      if (categoriesRes.data) setCategories(categoriesRes.data)

      if (user) {
        const { data: perms } = await supabase.from('user_permissions').select('*').eq('user_id', user.id)
        if (perms) setPermissions(perms)
      }

      if (isEditing && id) {
        setFetchingArticle(true)
        const { data: article } = await supabase
          .from('articles')
          .select('*')
          .eq('id', Number(id))
          .single()

        if (article) {
          setFormData({
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
          })
          setSlug(article.slug || '')
        }
        setFetchingArticle(false)
      }
    }
    loadData()
  }, [user, isEditing, id])

  useEffect(() => {
    if (!isEditing && categories.length > 0 && formData.category_id === 0 && user) {
      const available = categories.filter(c =>
        user.is_superadmin || permissions.some(p => p.category_id === c.id && p.can_add)
      )
      if (available.length > 0) {
        setFormData(prev => ({ ...prev, category_id: available[0].id }))
      }
    }
  }, [categories, user, permissions, isEditing, formData.category_id])

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

    const action = isEditing ? 'edit' : 'add'
    if (!hasPermission(user, permissions, formData.category_id, action)) {
      showToast('ليس لديك صلاحية للقيام بهذا الإجراء في هذا القسم', 'error')
      return
    }

    const err = validateSlug(slug)
    if (err) {
      setSlugError(err)
      return
    }

    setLoading(true)
    try {
      const dataToSave = {
        ...formData,
        author_id: formData.author_id === 0 ? null : formData.author_id,
        content_source: formData.content_source || null,
        slug: slug.trim() || null,
      }

      let error
      if (isEditing && id) {
        const { error: updateError } = await supabase
          .from('articles')
          .update(dataToSave)
          .eq('id', Number(id))
        error = updateError
      } else {
        const { error: insertError } = await supabase
          .from('articles')
          .insert([dataToSave])
        error = insertError
      }

      if (error) throw error
      navigate('/dashboard/articles')
    } catch (err: unknown) {
      console.error('Error saving article:', err)
      const message = err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ المقال'
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const availableCategories = categories.filter(c => {
    if (user?.is_superadmin) return true
    return permissions.some(p => p.category_id === c.id)
  })

  const isOtherType = formData.type !== 'article'

  if (fetchingArticle) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mr-3 text-muted-foreground">جاري تحميل المقال...</span>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/articles')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            <span>عودة</span>
          </button>
          <h1 className="text-2xl font-bold text-foreground">
            {isEditing ? 'تعديل المقال' : 'إضافة مقال جديد'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Title */}
        <div className="bg-card rounded-lg border border-border p-6">
          <label className="block text-sm font-medium text-foreground mb-2">العنوان</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full p-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring outline-none text-foreground text-lg"
            placeholder="أدخل عنوان المقال"
          />
        </div>

        {/* Slug */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-foreground">الرابط (Slug)</label>
            <div className="flex items-center gap-2 text-xs">
              {slugChecking && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  جاري التحقق...
                </span>
              )}
              {!slugChecking && slugAvailable === true && !slugError && slug.trim() && (
                <span className="flex items-center gap-1 text-green-600">
                  <Check className="h-3 w-3" />
                  الرابط متاح
                </span>
              )}
              {!slugChecking && slugAvailable === false && !slugError && (
                <span className="flex items-center gap-1 text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  الرابط مستخدم من قبل
                </span>
              )}
            </div>
          </div>
          <input
            type="text"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="مثال: my-article-slug"
            dir="ltr"
            className={`w-full p-3 bg-background border rounded-lg focus:ring-2 focus:ring-ring outline-none text-foreground ${slugError ? 'border-destructive' : slugAvailable === false ? 'border-destructive' : slugAvailable === true ? 'border-green-500' : 'border-input'}`}
          />
          {slugError && (
            <p className="mt-2 text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {slugError}
            </p>
          )}
          {!slugError && slug.trim() && (
            <p className="mt-2 text-xs text-muted-foreground" dir="ltr">
              رابط {formData.type === 'article' ? 'المقال' : 'المحتوى'}: /{formData.type === 'article' ? 'article' : 'post'}/<span className="font-mono text-primary">{slug.trim()}</span>
            </p>
          )}
        </div>

        {/* Category, Type, Exclusive, Date */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">القسم</label>
              <select
                required
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: Number(e.target.value) })}
                className="w-full p-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring outline-none text-foreground"
              >
                <option value={0} disabled>اختر القسم</option>
                {availableCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">نوع المحتوى</label>
              <select
                required
                value={formData.type}
                onChange={(e) => {
                  const newType = e.target.value
                  setFormData({
                    ...formData,
                    type: newType,
                    author_id: newType !== 'article' ? 0 : formData.author_id
                  })
                }}
                className="w-full p-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring outline-none text-foreground"
              >
                <option value="article">مقال</option>
                <option value="other">نوع آخر</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">التاريخ</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full p-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring outline-none text-foreground"
              />
            </div>

            <div className="flex items-end">
              <div className="flex items-center justify-between gap-2 bg-muted/30 p-3 rounded-lg border border-input w-full">
                <span className="text-sm font-medium text-foreground">مقال حصري</span>
                <Switch checked={Boolean(formData.is_exclusive)} onCheckedChange={(checked) => setFormData({ ...formData, is_exclusive: checked })} />
              </div>
            </div>
          </div>
        </div>

        {/* Author & Content Source */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {!isOtherType && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  الكاتب (اختياري)
                </label>
                <select
                  value={formData.author_id}
                  onChange={(e) => setFormData({ ...formData, author_id: Number(e.target.value) })}
                  className="w-full p-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring outline-none text-foreground"
                >
                  <option value={0}>بدون كاتب</option>
                  {authors.map(author => (
                    <option key={author.id} value={author.id}>{author.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className={isOtherType ? 'md:col-span-2' : ''}>
              <label className="block text-sm font-medium text-foreground mb-2">مصدر المحتوى (اختياري)</label>
              <input
                type="text"
                value={formData.content_source}
                onChange={(e) => setFormData({ ...formData, content_source: e.target.value })}
                placeholder="مثال: المراسل: أحمد من القاهرة"
                className="w-full p-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring outline-none text-foreground"
              />
            </div>
          </div>
        </div>

        {/* Image */}
        <div className="bg-card rounded-lg border border-border p-6">
          <ImageUpload
            value={formData.image}
            onChange={(url) => setFormData({ ...formData, image: url })}
            label="صورة المقال"
          />
        </div>

        {/* Excerpt */}
        <div className="bg-card rounded-lg border border-border p-6">
          <label className="block text-sm font-medium text-foreground mb-2">مقتطف (Excerpt)</label>
          <textarea
            rows={3}
            value={formData.excerpt}
            onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
            className="w-full p-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring outline-none text-foreground"
            placeholder="ملخص مختصر للمقال"
          />
        </div>

        {/* Content Editor */}
        <div className="bg-card rounded-lg border border-border p-6">
          <label className="block text-sm font-medium text-foreground mb-2">المحتوى</label>
          <div className="bg-background text-foreground rounded-lg overflow-hidden">
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={formData.content}
              onChange={(value: string) => setFormData({ ...formData, content: value })}
              className="h-96 mb-12"
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

        {/* Actions */}
        <div className="flex justify-end gap-4 pb-8">
          <button
            type="button"
            onClick={() => navigate('/dashboard/articles')}
            className="px-6 py-3 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50 transition-colors font-medium"
          >
            <Save size={18} />
            {loading ? 'جاري الحفظ...' : 'حفظ المقال'}
          </button>
        </div>
      </form>

      {/* Video Modal */}
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
              className="w-full p-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring outline-none text-foreground mb-4"
              autoFocus
              dir="ltr"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setVideoModalOpen(false); setVideoUrl(''); }}
                className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleVideoInsert}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Video size={16} />
                إدراج الفيديو
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
