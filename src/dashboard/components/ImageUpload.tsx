import { useState } from 'react'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { v4 as uuidv4 } from 'uuid'

type Props = {
  value: string
  onChange: (url: string) => void
  label?: string
  className?: string
}

export default function ImageUpload({ value, onChange, label = 'صورة', className = '' }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      setError(null)

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('يجب اختيار صورة للرفع.')
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${uuidv4()}.${fileExt}`
      const filePath = `${fileName}`

      // Upload to 'media' bucket
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data } = supabase.storage
        .from('media')
        .getPublicUrl(filePath)

      onChange(data.publicUrl)
    } catch (error: any) {
      console.error('Error uploading image:', error)
      setError(error.message || 'حدث خطأ أثناء رفع الصورة')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    onChange('')
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
      
      {value ? (
        <div className="relative aspect-video w-full max-w-sm rounded-lg overflow-hidden border border-border bg-muted/50">
          <img
            src={value}
            alt="Uploaded preview"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-destructive"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center w-full">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-input rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {uploading ? (
                <Loader2 className="w-8 h-8 mb-2 text-muted-foreground animate-spin" />
              ) : (
                <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
              )}
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">اضغط للرفع</span> أو اسحب الصورة هنا
              </p>
              <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
            </div>
            <input 
              type="file" 
              className="hidden" 
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
      )}
      
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
    </div>
  )
}
