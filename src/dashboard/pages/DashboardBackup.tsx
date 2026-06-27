import { Shield, Eye, RefreshCw } from 'lucide-react'

export default function DashboardBackup() {
  return (
    <div className="space-y-8 pb-10">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">إدارة النسخ الاحتياطي والحماية</h1>
        <p className="text-muted-foreground mt-1">
          من هنا يمكنك مراقبة حالة الموقع وحماية بياناتك والاطلاع على آخر الإجراءات الاحتياطية
        </p>
      </div>

      {/* Hero */}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-transparent p-8 md:p-12">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Shield size={40} className="text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 leading-tight">
              حماية بيانات موقعك واستمراريته
            </h2>
            <p className="text-muted-foreground max-w-3xl leading-relaxed text-lg">
              يوفر هذا القسم النسخ الاحتياطي الدوري لبيانات الموقع والمراقبة المستمرة للأداء،
              للتأكد من استمرار العمل دون توقف وأمان البيانات من أي فقدان محتمل.
            </p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-xl border border-border p-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Shield size={28} className="text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">نسخ احتياطي تلقائي</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            نسخ منتظم لجميع بيانات الموقع شاملاً المقالات والصور وقاعدة البيانات بشكل آلي.
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Eye size={28} className="text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">مراقبة مستمرة للأداء</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            التحقق من حالة الموقع بشكل دوري للكشف عن أي مشكلة والتعامل معها بسرعة.
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <RefreshCw size={28} className="text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">تحديثات أمنية دورية</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            تطبيق أحدث التحديثات الأمنية وسد الثغرات للحفاظ على أمان الموقع وأدائه.
          </p>
        </div>
      </div>

      {/* What We Do */}
      <div className="bg-card rounded-xl border border-border p-6 md:p-8">
        <h3 className="text-lg font-bold text-foreground mb-6">ما الذي نقدمه تحديداً؟</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-sm font-bold text-primary">١</span>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">نسخ احتياطي شامل ومنتظم</h4>
              <p className="text-sm text-muted-foreground">
                نسخ كامل لجميع مكونات الموقع من مقالات وصور وقاعدة بيانات وإعدادات بشكل دوري ومؤمن.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-sm font-bold text-primary">٢</span>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">مراقبة حالة الموقع</h4>
              <p className="text-sm text-muted-foreground">
                نظام يتحقق من عمل الموقع بشكل دوري ويُبلغ عن أي توقف أو بطء لاتخاذ الإجراء المناسب.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-sm font-bold text-primary">٣</span>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">تحديثات أمنية وتقنية</h4>
              <p className="text-sm text-muted-foreground">
                تحديث مكونات الموقع وإضافاته بانتظام لضمان الأداء الأمثل وسد أي ثغرات أمنية.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="flex justify-center">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
          </span>
          قريباً
        </div>
      </div>
    </div>
  )
}
