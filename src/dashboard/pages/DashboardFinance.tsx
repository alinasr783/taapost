import { DollarSign, Monitor, LayoutPanelLeft, Scale } from 'lucide-react'

export default function DashboardFinance() {
  return (
    <div className="space-y-8 pb-10">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">إدارة قنوات الأرباح</h1>
        <p className="text-muted-foreground mt-1">
          من هنا يمكنك تجهيز وإدارة مصادر الدخل من موقعك، بما في ذلك التوافق مع خدمات الإعلانات وتنظيم المساحات الإعلانية
        </p>
      </div>

      {/* Hero */}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-transparent p-8 md:p-12">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <DollarSign size={40} className="text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 leading-tight">
              تجهيز موقعك لتوليد الأرباح
            </h2>
            <p className="text-muted-foreground max-w-3xl leading-relaxed text-lg">
              يساعدك هذا القسم في تهيئة موقعك فنياً للتوافق مع متطلبات خدمات الإعلانات،
              فضلاً عن إعداد مساحات إعلانية مناسبة تحقق دخلاً ملموساً دون الإخلال بتجربة المستخدم.
            </p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-xl border border-border p-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Monitor size={28} className="text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">التوافق مع خدمات الإعلانات</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            إعداد الموقع ليتوافق مع الشروط التقنية لخدمات الإعلانات الكبرى، مما يسرع عملية القبول.
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <LayoutPanelLeft size={28} className="text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">مساحات إعلانية مدروسة</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            تحديد أماكن مناسبة للإعلانات داخل الصفحات بما يوازن بين دخل الإعلانات وتجربة القراءة.
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Scale size={28} className="text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">توازن بين الدخل والتجربة</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            توزيع ذكي للإعلانات يحقق عائداً مالياً مع الحفاظ على سرعة الموقع وجودة تجربة الزائر.
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
              <h4 className="font-semibold text-foreground">فحص الموقع للتوافق مع الإعلانات</h4>
              <p className="text-sm text-muted-foreground">
                مراجعة شاملة للموقع للتأكد من استيفائه للشروط التقنية والمحتوى المطلوبة للانضمام لخدمات الإعلانات.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-sm font-bold text-primary">٢</span>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">تحديد مواقع الإعلانات</h4>
              <p className="text-sm text-muted-foreground">
                اختيار الأماكن الأنسب للإعلانات في بنية الصفحات بما يضمن رؤية الإعلانات دون إزعاج الزائر.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-sm font-bold text-primary">٣</span>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">إعداد وحدات الإعلانات</h4>
              <p className="text-sm text-muted-foreground">
                تفعيل وتكوين وحدات الإعلانات في المواضع المحددة لبدء جني الأرباح بعد القبول.
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
