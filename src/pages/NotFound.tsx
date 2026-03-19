import { Link } from 'react-router-dom'
import Seo from '../components/Seo'

export default function NotFound() {
  return (
    <div className="container flex min-h-[60dvh] flex-col items-center justify-center gap-4 py-14 text-center">
      <Seo title="الصفحة غير موجودة" description="عذراً، الصفحة المطلوبة غير موجودة" robots="noindex,follow" ogType="website" />
      <h1 className="text-3xl font-bold">الصفحة غير موجودة</h1>
      <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
        الرابط الذي فتحته غير صحيح أو تم نقل الصفحة. يمكنك الرجوع للرئيسية أو تصفح الأقسام.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="rounded-[6px] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
        >
          الرئيسية
        </Link>
        <Link
          to="/categories"
          className="rounded-[6px] border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/40 transition"
        >
          الأقسام
        </Link>
      </div>
    </div>
  )
}
