import { Bell, Zap, Target, TrendingUp } from 'lucide-react'

export default function DashboardNotifications() {
  return (
    <div className="space-y-8 pb-10">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">إدارة الإشعارات الفورية</h1>
        <p className="text-muted-foreground mt-1">
          من هنا يمكنك إعداد نظام الإشعارات الفورية وإدارته للتفاعل مع زوار الموقع
        </p>
      </div>

      {/* Hero */}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-transparent p-8 md:p-12">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Bell size={40} className="text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 leading-tight">
              تواصل مباشر مع زوار موقعك
            </h2>
            <p className="text-muted-foreground max-w-3xl leading-relaxed text-lg">
              يتيح نظام الإشعارات الفورية إرسال أخبار موقعك مباشرة إلى أجهزة زوارك فور نشرها،
              مما يتيح عودتهم إلى الموقع بسرعة دون الاعتماد على خوارزميات منصات التواصل الاجتماعي.
            </p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-xl border border-border p-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Zap size={28} className="text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">زيادة حركة المرور</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            استعادة زوار موقعك بانتظام من خلال إشعارات فورية تصلهم مباشرة دون تكلفة إضافية.
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Target size={28} className="text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">تواصل غير مُقنَّن</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            اتصال مباشر مع جمهورك المستهدف دون تدخل خوارزميات المنصات في تحديد من يرى محتواك.
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <TrendingUp size={28} className="text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">نمو المشاهدات</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            زيادة عدد قراءات المقالات بشكل تدريجي من خلال إشعارات تصل إلى مهتمين بمحتواك فعلاً.
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-card rounded-xl border border-border p-6 md:p-8">
        <h3 className="text-lg font-bold text-foreground mb-6">آلية عمل نظام الإشعارات</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-sm font-bold text-primary">١</span>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">تفعيل الزائر للإشعارات</h4>
              <p className="text-sm text-muted-foreground">
                عند زيارة الموقع، يُعرض على الزائر طلب تفعيل استقبال الإشعارات بنقرة واحدة.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-sm font-bold text-primary">٢</span>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">إرسال الإشعار عند النشر</h4>
              <p className="text-sm text-muted-foreground">
                عند نشر مقال أو خبر من لوحة التحكم، يُرسل إشعار فوري لجميع الزوار الذين فعّلوا هذه الميزة.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-sm font-bold text-primary">٣</span>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">عودة الزائر إلى المقال</h4>
              <p className="text-sm text-muted-foreground">
                ينقر الزائر على الإشعار ليصل مباشرة إلى المقال، مما يزيد من المشاهدات والتفاعل.
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
