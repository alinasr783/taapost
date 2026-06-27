import { useState } from 'react'
import {
  BookOpen, LayoutDashboard, FileText, FolderTree, PenTool, Users,
  Settings, LayoutTemplate, Eye, Plus, Edit, Trash2, Search, Save,
  ChevronDown, ChevronUp, GripVertical, Image, Share2, Globe, Shield,
  Lock, Palette, ListOrdered, BarChart3,
  PieChart, LineChart, Calendar, AlertTriangle,
  CheckCircle2, Info, Lightbulb, Zap, Download
} from 'lucide-react'

type SectionId =
  | 'intro'
  | 'login'
  | 'dashboard-home'
  | 'articles'
  | 'categories'
  | 'authors'
  | 'home-customization'
  | 'settings'
  | 'users'
  | 'tips'

interface NavItem {
  id: SectionId
  label: string
  icon: typeof BookOpen
}

const NAV_ITEMS: NavItem[] = [
  { id: 'intro', label: 'مقدمة عامة', icon: BookOpen },
  { id: 'login', label: 'تسجيل الدخول والخروج', icon: Lock },
  { id: 'dashboard-home', label: 'لوحة المعلومات والإحصائيات', icon: LayoutDashboard },
  { id: 'articles', label: 'إدارة المقالات', icon: FileText },
  { id: 'categories', label: 'إدارة الأقسام', icon: FolderTree },
  { id: 'authors', label: 'إدارة الكتّاب', icon: PenTool },
  { id: 'home-customization', label: 'تخصيص الصفحة الرئيسية', icon: LayoutTemplate },
  { id: 'settings', label: 'إعدادات الموقع', icon: Settings },
  { id: 'users', label: 'إدارة المستخدمين', icon: Users },
  { id: 'tips', label: 'نصائح وتلميحات', icon: Lightbulb },
]

function SectionTitle({ children, icon: Icon }: { children: React.ReactNode; icon: typeof BookOpen }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2.5 rounded-xl bg-primary/10">
        <Icon size={24} className="text-primary" />
      </div>
      <h2 className="text-2xl font-bold text-foreground">{children}</h2>
    </div>
  )
}

function StepCard({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-muted/30 rounded-xl border border-border p-5 mb-4">
      <div className="flex items-start gap-3 mb-3">
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
          {number}
        </span>
        <h4 className="text-lg font-bold text-foreground pt-1">{title}</h4>
      </div>
      <div className="pr-11 text-muted-foreground leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  )
}

function InfoBox({ type, children }: { type: 'info' | 'warning' | 'tip' | 'danger' | 'example'; children: React.ReactNode }) {
  const styles = {
    info: { bg: 'bg-blue-500/5', border: 'border-blue-500/20', icon: Info, color: 'text-blue-500', label: 'معلومات' },
    warning: { bg: 'bg-amber-500/5', border: 'border-amber-500/20', icon: AlertTriangle, color: 'text-amber-500', label: 'تنبيه' },
    tip: { bg: 'bg-green-500/5', border: 'border-green-500/20', icon: Lightbulb, color: 'text-green-600', label: 'نصيحة' },
    danger: { bg: 'bg-red-500/5', border: 'border-red-500/20', icon: AlertTriangle, color: 'text-red-500', label: 'تحذير' },
    example: { bg: 'bg-purple-500/5', border: 'border-purple-500/20', icon: Info, color: 'text-purple-500', label: 'مثال' },
  }
  const s = styles[type]
  const Icon = s.icon

  return (
    <div className={`${s.bg} border ${s.border} rounded-xl p-4 my-4`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={s.color} />
        <span className={`text-sm font-bold ${s.color}`}>{s.label}</span>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  )
}

function FieldTable({ fields }: { fields: { name: string; required: boolean; description: string }[] }) {
  return (
    <div className="overflow-x-auto my-4 rounded-lg border border-border">
      <table className="w-full text-right text-sm">
        <thead className="bg-muted/50 text-muted-foreground font-medium">
          <tr>
            <th className="p-3">الحقل</th>
            <th className="p-3 text-center">مطلوب</th>
            <th className="p-3">الوصف</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {fields.map((field) => (
            <tr key={field.name} className="hover:bg-muted/20">
              <td className="p-3 font-mono text-primary font-medium">{field.name}</td>
              <td className="p-3 text-center">
                {field.required ? (
                  <span className="text-xs bg-red-500/10 text-red-600 px-2 py-0.5 rounded-full font-medium">مطلوب</span>
                ) : (
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">اختياري</span>
                )}
              </td>
              <td className="p-3 text-muted-foreground">{field.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function DashboardGuide() {
  const [activeSection, setActiveSection] = useState<SectionId>('intro')
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const scrollToSection = (id: SectionId) => {
    setActiveSection(id)
    const el = document.getElementById(`guide-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-2xl bg-primary/10">
            <BookOpen size={32} className="text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">دليل لوحة التحكم</h1>
            <p className="text-muted-foreground mt-1">دليل شامل ومفصل لاستخدام جميع أدوات ولوحة التحكم</p>
          </div>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="bg-card rounded-xl border border-border p-4 mb-8 shadow-sm">
        <h3 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
          <Zap size={14} />
          انتقل مباشرة إلى:
        </h3>
        <div className="flex flex-wrap gap-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                activeSection === item.id
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <item.icon size={14} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-12">

        {/* ==================== 1. المقدمة العامة ==================== */}
        <section id="guide-intro">
          <SectionTitle icon={BookOpen}>مقدمة عامة عن لوحة التحكم</SectionTitle>

          <div className="bg-card rounded-xl border border-border p-6 mb-6">
            <p className="text-muted-foreground leading-relaxed mb-4">
              لوحة التحكم هي البوابة الإدارية لموقعك، ومن خلالها يمكنك إدارة جميع محتويات الموقع بدءاً من المقالات والأقسام وصولاً إلى الكتّاب والإعدادات والمستخدمين. هذا الدليل سيأخذك في جولة شاملة لشرح كل جزء في لوحة التحكم خطوة بخطوة.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="bg-muted/30 rounded-xl p-4 border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <LayoutDashboard size={20} className="text-blue-500" />
                  </div>
                  <h4 className="font-bold text-foreground">لوحة المعلومات</h4>
                </div>
                <p className="text-sm text-muted-foreground">عرض الإحصائيات والرسوم البيانية للمشاهدات والمقالات والكتّاب والأقسام.</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-4 border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <FileText size={20} className="text-green-500" />
                  </div>
                  <h4 className="font-bold text-foreground">إدارة المقالات</h4>
                </div>
                <p className="text-sm text-muted-foreground">إضافة وتعديل وحذف المقالات مع محرر نصوص متقدم يدعم الصور والفيديوهات.</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-4 border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <FolderTree size={20} className="text-orange-500" />
                  </div>
                  <h4 className="font-bold text-foreground">إدارة الأقسام</h4>
                </div>
                <p className="text-sm text-muted-foreground">إنشاء أقسام جديدة وتنظيم ترتيبها في القوائم والصفحة الرئيسية.</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-4 border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <PenTool size={20} className="text-purple-500" />
                  </div>
                  <h4 className="font-bold text-foreground">إدارة الكتّاب</h4>
                </div>
                <p className="text-sm text-muted-foreground">إضافة وتعديل بيانات الكتّاب وصورهم ونبذهم التعريفية.</p>
              </div>
            </div>
          </div>

          <InfoBox type="info">
            جميع الأزرار والعناصر لها أيقونات ملونة تسهّل التعرف عليها. الأزرار الرئيسية بلون الموقع الأساسي (بني)، وأزرار التعديل بلون أخضر، وأزرار الحذف بلون أحمر.
          </InfoBox>
        </section>

        {/* ==================== 2. تسجيل الدخول والخروج ==================== */}
        <section id="guide-login">
          <SectionTitle icon={Lock}>تسجيل الدخول والخروج</SectionTitle>

          <StepCard number={1} title="الوصول إلى صفحة تسجيل الدخول">
            <p>انتقل إلى رابط موقعك متبوعاً بـ <code className="bg-muted px-1.5 py-0.5 rounded text-primary font-mono text-xs">/dashboard/login</code></p>
            <p>مثال: <code className="bg-muted px-1.5 py-0.5 rounded text-primary font-mono text-xs">https://mysite.com/dashboard/login</code></p>
          </StepCard>

          <StepCard number={2} title="إدخال بيانات الدخول">
            <p>أدخل اسم المستخدم (البريد الإلكتروني) وكلمة المرور في الحقول المخصصة، ثم اضغط على زر <strong className="text-foreground">"دخول"</strong>.</p>
          </StepCard>

          <StepCard number={3} title="تسجيل الخروج">
            <p>عند الانتهاء من العمل في لوحة التحكم، اضغط على أيقونة <Lock size={14} className="inline" /> في أعلى الشريط الجانبي (أو في الشريط العلوي على الجوال) لتسجيل الخروج.</p>
          </StepCard>

          <InfoBox type="warning">
            لا تنسَ تسجيل الخروج عند الانتهاء من العمل، خاصة إذا كنت تستخدم جهاز عام أو مشترك.
          </InfoBox>
        </section>

        {/* ==================== 3. لوحة المعلومات والإحصائيات ==================== */}
        <section id="guide-dashboard-home">
          <SectionTitle icon={LayoutDashboard}>لوحة المعلومات والإحصائيات</SectionTitle>

          <p className="text-muted-foreground mb-6 leading-relaxed">
            هذه هي الصفحة الأولى التي تظهر بعد تسجيل الدخول. تعرض ملخصاً شاملاً لحالة موقعك من خلال بطاقات إحصائية ورسوم بيانية تفاعلية.
          </p>

          {/* Stats Cards */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-primary" />
            البطاقات الإحصائية
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { icon: Eye, label: 'المشاهدات', desc: 'عدد مرات مشاهدة المقالات من الزوار', color: 'blue' },
              { icon: FileText, label: 'المقالات', desc: 'إجمالي المقالات المنشورة في الموقع', color: 'green' },
              { icon: FolderTree, label: 'الأقسام', desc: 'عدد الأقسام المتاحة في الموقع', color: 'orange' },
              { icon: PenTool, label: 'الكتّاب', desc: 'عدد الكتّاب المسجلين في الموقع', color: 'purple' },
            ].map((card) => (
              <div key={card.label} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-${card.color}-500/10`}>
                    <card.icon size={22} className={`text-${card.color}-500`} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">--</div>
                    <div className="text-sm text-muted-foreground">{card.label}</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{card.desc}</p>
              </div>
            ))}
          </div>

          {/* Date Filter */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-primary" />
            الفلتر الزمني
          </h3>
          <div className="bg-muted/30 rounded-xl border border-border p-5 mb-6">
            <p className="text-muted-foreground mb-4">يتيح لك تصفية البيانات والإحصائيات حسب الفترة الزمنية المطلوبة:</p>
            <div className="space-y-3">
              {[
                { label: 'اليوم', desc: 'يعرض إحصائيات اليوم الحالي فقط' },
                { label: 'آخر 7 أيام', desc: 'يعرض إحصائيات آخر أسبوع كامل' },
                { label: 'آخر 30 يوم', desc: 'يعرض إحصائيات آخر شهر' },
                { label: 'هذا العام', desc: 'يعرض إحصائيات من بداية السنة الحالية' },
                { label: 'الكل', desc: 'يعرض جميع البيانات بدون تقييد زمني' },
                { label: 'نطاق مخصص', desc: 'يمكنك تحديد تاريخ Beginning ونهاية يدوياً' },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <span className="flex-shrink-0 mt-1 w-2 h-2 rounded-full bg-primary" />
                  <div>
                    <span className="font-bold text-foreground">{item.label}:</span>
                    <span className="text-muted-foreground mr-2">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <PieChart size={20} className="text-primary" />
            الرسوم البيانية
          </h3>
          <div className="space-y-4 mb-6">
            {[
              { icon: BarChart3, title: 'أعلى 5 مقالات مشاهدة', desc: 'رسم بياني شريطي يعرض أكثر المقالات مشاهدة من الزوار. يساعدك على معرفة المحتوى الأكثر تفاعلاً.' },
              { icon: PieChart, title: 'أعلى 5 دول مشاهدة', desc: 'رسم بياني دائري يوزّع المشاهدات على الدول. يعطيك فكرة عن جمهورك الجغرافي.' },
              { icon: LineChart, title: 'أوقات الذروة', desc: 'رسم بياني خطي يوضح أكثر الساعات نشاطاً. يمكنك استخدامه لتحديد أفضل وقت لنشر المقالات.' },
              { icon: BarChart3, title: 'الأقسام الأكثر نشاطاً', desc: 'رسم بياني أفقي يقارن عدد المشاهدات بين الأقسام المختلفة.' },
            ].map((chart) => (
              <div key={chart.title} className="bg-muted/30 rounded-xl border border-border p-4 flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                  <chart.icon size={20} className="text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground mb-1">{chart.title}</h4>
                  <p className="text-sm text-muted-foreground">{chart.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ==================== 4. إدارة المقالات ==================== */}
        <section id="guide-articles">
          <SectionTitle icon={FileText}>إدارة المقالات</SectionTitle>

          <p className="text-muted-foreground mb-6 leading-relaxed">
            من هنا يمكنك إدارة جميع مقالات الموقع: العرض، الإضافة، التعديل، الحذف، والبحث والفلترة.
          </p>

          {/* View Articles */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Eye size={20} className="text-primary" />
            عرض المقالات
          </h3>
          <div className="bg-muted/30 rounded-xl border border-border p-5 mb-6">
            <p className="text-muted-foreground mb-3">عند الدخول إلى صفحة المقالات، سترى:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-green-500 mt-1 flex-shrink-0" />
                <span><strong className="text-foreground">جدول المقالات:</strong> يعرض عنوان المقال، الكاتب، القسم، التاريخ، وأزرار الإجراءات.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-green-500 mt-1 flex-shrink-0" />
                <span><strong className="text-foreground">شريط البحث:</strong> اكتب جزءاً من عنوان المقال للبحث عنه.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-green-500 mt-1 flex-shrink-0" />
                <span><strong className="text-foreground">الفلاتر:</strong> تصفية حسب التاريخ (من/إلى)، القسم، أو الكاتب.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-green-500 mt-1 flex-shrink-0" />
                <span><strong className="text-foreground">أزرار الإجراءات:</strong> عرض (عين)، تعديل (قلم)، حذف (سلة مهملات).</span>
              </li>
            </ul>
          </div>

          {/* Add Article */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Plus size={20} className="text-green-500" />
            إضافة مقال جديد
          </h3>

          <StepCard number={1} title="الضغط على زر 'إضافة مقال'">
            <p>في صفحة إدارة المقالات، اضغط على الزر الأخضر <strong className="text-foreground">"إضافة مقال"</strong> الموجود في أعلى الصفحة.</p>
          </StepCard>

          <StepCard number={2} title="إدخال العنوان">
            <p>أدخل عنوان المقال في حقل <strong className="text-foreground">"العنوان"</strong>. يجب أن يكون العنوان واضحاً وجذاباً.</p>
          </StepCard>

          <StepCard number={3} title="تحديد الرابط (Slug)">
            <p>أدخل رابط المقال بالحروف الإنجليزية الصغيرة والأرقام والشرطات فقط. مثال: <code className="bg-muted px-1.5 py-0.5 rounded text-primary font-mono text-xs">my-article-slug</code></p>
            <InfoBox type="tip">
              الرابط يجب أن يكون فريداً. النظام يتحقق من توفر الرابط تلقائياً. يُفضّل استخدام كلمات مفيدة وواضحة تعكس محتوى المقال.
            </InfoBox>
          </StepCard>

          <StepCard number={4} title="تحديد القسم ونوع المحتوى">
            <p>اختر القسم المناسب من القائمة المنسدلة. يمكنك أيضاً تحديد نوع المحتوى (مقال أو نوع آخر) والتحقق مما إذا كان المقال حصرياً.</p>
          </StepCard>

          <StepCard number={5} title="اختيار الكاتب ومصدر المحتوى">
            <p>اختر الكاتب من القائمة (اختياري). يمكنك أيضاً إدخال مصدر المحتوى مثل "المراسل: أحمد من القاهرة".</p>
          </StepCard>

          <StepCard number={6} title="رفع صورة المقال">
            <p>اضغط على منطقة رفع الصورة واختر صورة من جهازك. الصورة تكون هي الصورة الظاهرة في البطاقة والصفحة الرئيسية.</p>
            <InfoBox type="tip">
              يُفضّل استخدام صورة بأبعاد 1200×630 بكسل للحصول على أفضل عرض عند المشاركة على وسائل التواصل.
            </InfoBox>
          </StepCard>

          <StepCard number={7} title="كتابة المقتطف (Excerpt)">
            <p>اكتب ملخصاً مختصراً للمقال في حقل <strong className="text-foreground">"مقتطف"</strong>. هذا الملخص يظهر في بطاقة المقال而在 الصفحة الرئيسية.</p>
          </StepCard>

          <StepCard number={8} title="كتابة المحتوى">
            <p>استخدم محرر النصوص المتقدم لكتابة محتوى المقال. يدعم المحرر:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>العناوين (H1 - H6) والنصوص العريضة والمائلة والمشطوبة</li>
              <li>القوائم المرقمة وغير المرقمة</li>
              <li>إدراج الصور والروابط</li>
              <li>إدراج فيديو يوتيوب عبر زر الفيديو في شريط الأدوات</li>
              <li>كود البرمجة والاقتباسات</li>
              <li>تغيير اتجاه النص (RTL/LTR) والمحاذاة</li>
              <li>ألوان النص والخلفية</li>
            </ul>
          </StepCard>

          <StepCard number={9} title="حفظ المقال">
            <p>بعد الانتهاء من جميع الحقول، اضغط على زر <strong className="text-foreground">"حفظ المقال"</strong>. سيتم حفظ المقال والعودة إلى صفحة قائمة المقالات.</p>
          </StepCard>

          <FieldTable fields={[
            { name: 'العنوان', required: true, description: 'عنوان المقال الذي يظهر للقراء' },
            { name: 'Slug', required: true, description: 'الرابط المختصر بالإنجليزية - يجب أن يكون فريداً' },
            { name: 'القسم', required: true, description: 'القسم الذي ينتمي إليه المقال' },
            { name: 'نوع المحتوى', required: true, description: 'مقال أو نوع آخر' },
            { name: 'التاريخ', required: true, description: 'تاريخ نشر المقال' },
            { name: 'الكاتب', required: false, description: 'اسم الكاتب (من الكتّاب المُسجّلين)' },
            { name: 'صورة المقال', required: false, description: 'الصورة الظاهرة في البطاقة' },
            { name: 'المقتطف', required: false, description: 'ملخص مختصر للمقال' },
            { name: 'المحتوى', required: false, description: 'نص المقال الكامل بالمحرر المتقدم' },
            { name: 'مصدر المحتوى', required: false, description: 'مصدر الخبر أو المقال' },
            { name: 'مقال حصري', required: false, description: 'تحديد المقال كحصري' },
          ]} />

          {/* Edit Article */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Edit size={20} className="text-green-500" />
            تعديل مقال موجود
          </h3>
          <div className="bg-muted/30 rounded-xl border border-border p-5 mb-6">
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center text-xs font-bold">1</span>
                <span>في صفحة إدارة المقالات، اضغط على أيقونة <Edit size={14} className="inline text-green-500" /> بجانب المقال المراد تعديله.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center text-xs font-bold">2</span>
                <span>سيفتح محرر المقال مع جميع البيانات الحالية. قم بإجراء التعديلات المطلوبة.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center text-xs font-bold">3</span>
                <span>اضغط على زر <strong className="text-foreground">"حفظ المقال"</strong> لحفظ التعديلات.</span>
              </li>
            </ol>
          </div>

          {/* Delete Article */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Trash2 size={20} className="text-red-500" />
            حذف مقال
          </h3>
          <div className="bg-muted/30 rounded-xl border border-border p-5 mb-6">
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center text-xs font-bold">1</span>
                <span>اضغط على أيقونة <Trash2 size={14} className="inline text-red-500" /> بجانب المقال المراد حذفه.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center text-xs font-bold">2</span>
                <span>ستظهر نافذة تأكيد تطلب منك التأكيد على الحذف. اضغط على <strong className="text-foreground">"حذف"</strong> للتأكيد أو <strong className="text-foreground">"إلغاء"</strong> للتراجع.</span>
              </li>
            </ol>
            <InfoBox type="danger">
              لا يمكن التراجع عن الحذف! تأكد من أنك تريد حذف المقال قبل التأكيد.
            </InfoBox>
          </div>

          {/* View Article */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Eye size={20} className="text-primary" />
            عرض المقال على الموقع
          </h3>
          <div className="bg-muted/30 rounded-xl border border-border p-5">
            <p className="text-muted-foreground">اضغط على أيقونة <Eye size={14} className="inline text-primary" /> لفتح المقال في صفحة جديدة ومشاهدته كما يراه الزوار.</p>
          </div>
        </section>

        {/* ==================== 5. إدارة الأقسام ==================== */}
        <section id="guide-categories">
          <SectionTitle icon={FolderTree}>إدارة الأقسام</SectionTitle>

          <p className="text-muted-foreground mb-6 leading-relaxed">
            الأقسام هي الفئات الرئيسية التي تُصنف فيها المقالات. من هنا يمكنك إنشاء أقسام جديدة وتعديلها وحذفها وترتيبها في أماكن مختلفة من الموقع.
          </p>

          {/* Categories List */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <ListOrdered size={20} className="text-primary" />
            عرض الأقسام
          </h3>
          <div className="bg-muted/30 rounded-xl border border-border p-5 mb-6">
            <p className="text-muted-foreground mb-3">صفحة الأقسام تتكون من أربعة تبويبات:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span><strong className="text-foreground">قائمة الأقسام:</strong> عرض جميع الأقسام مع اسمها ووصفها وعدد المواضيع وأزرار التعديل والحذف.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span><strong className="text-foreground">ترتيب القائمة (يمين لليسار):</strong> ترتيب الأقسام كما تظهر في شريط التنقل العلوي بالسحب والإفلات.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span><strong className="text-foreground">ترتيب الرئيسية (أعلى لأسفل):</strong> ترتيب الأقسام كما تظهر في الصفحة الرئيسية بالسحب والإفلات.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span><strong className="text-foreground">ترتيب القائمة الجانبية:</strong> ترتيب الأقسام كما تظهر في القائمة الجانبية للمستخدمين بالسحب والإفلات.</span>
              </li>
            </ul>
          </div>

          {/* Add Category */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Plus size={20} className="text-green-500" />
            إضافة قسم جديد
          </h3>

          <StepCard number={1} title="الضغط على زر 'إضافة قسم'">
            <p>اضغط على الزر الأخضر <strong className="text-foreground">"إضافة قسم"</strong> في أعلى الصفحة.</p>
          </StepCard>

          <StepCard number={2} title="ملء نموذج القسم">
            <p>ستظهر نافذة منبثقة تحتوي على الحقول التالية:</p>
          </StepCard>

          <FieldTable fields={[
            { name: 'اسم القسم', required: true, description: 'اسم القسم الذي يظهر في القوائم والصفحة الرئيسية' },
            { name: 'الوصف', required: false, description: 'وصف مختصر للقسم (يظهر أحياناً للمستخدمين)' },
            { name: 'المواضيع', required: false, description: 'قائمة مواضيع فرعية مفصولة بفاصلة مثل: سياسة, اقتصاد, رياضة' },
            { name: 'ترتيب القائمة', required: false, description: 'رقم يحدد ترتيب القسم في شريط التنقل العلوي' },
            { name: 'ترتيب الرئيسية', required: false, description: 'رقم يحدد ترتيب القسم في الصفحة الرئيسية' },
            { name: 'صورة القسم', required: false, description: 'صورة تمثل القسم (اختيارية)' },
            { name: 'الأيقونة', required: false, description: 'أيقونة تمثل القسم من مكتبة الأيقونات' },
          ]} />

          <StepCard number={3} title="حفظ القسم">
            <p>اضغط على زر <strong className="text-foreground">"حفظ"</strong> لإنشاء القسم. سيتم إغلاق النافذة وتحديث القائمة تلقائياً.</p>
          </StepCard>

          {/* Edit Category */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Edit size={20} className="text-green-500" />
            تعديل قسم
          </h3>
          <div className="bg-muted/30 rounded-xl border border-border p-5 mb-6">
            <p className="text-muted-foreground">اضغط على أيقونة <Edit size={14} className="inline text-green-500" /> بجانب القسم المراد تعديله. ستظهر نفس النموذج مع البيانات الحالية. قم بالتعديلات ثم اضغط <strong className="text-foreground">"حفظ"</strong>.</p>
          </div>

          {/* Delete Category */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Trash2 size={20} className="text-red-500" />
            حذف قسم
          </h3>
          <div className="bg-muted/30 rounded-xl border border-border p-5 mb-6">
            <p className="text-muted-foreground">اضغط على أيقونة <Trash2 size={14} className="inline text-red-500" /> بجانب القسم. ستظهر نافذة تأكيد.</p>
            <InfoBox type="danger">
              تحذير: حذف القسم سيؤدي أيضاً إلى حذف جميع المقالات المرتبطة به! تأكد من نقل المقالات إلى قسم آخر قبل الحذف.
            </InfoBox>
          </div>

          {/* Drag & Drop Ordering */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <GripVertical size={20} className="text-primary" />
            ترتيب الأقسام بالسحب والإفلات
          </h3>
          <div className="bg-muted/30 rounded-xl border border-border p-5">
            <p className="text-muted-foreground mb-3">لإعادة ترتيب الأقسام:</p>
            <ol className="space-y-2">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
                <span>انتقل إلى التبويب المناسب (ترتيب القائمة، ترتيب الرئيسية، أو ترتيب القائمة الجانبية).</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
                <span>اضغط مع الاستمرار على القسم المراد تغيير مكانه واسحبه إلى المكان الجديد.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</span>
                <span>اضغط على زر <strong className="text-foreground">"حفظ الترتيب"</strong> لحفظ التغييرات.</span>
              </li>
            </ol>
          </div>
        </section>

        {/* ==================== 6. إدارة الكتّاب ==================== */}
        <section id="guide-authors">
          <SectionTitle icon={PenTool}>إدارة الكتّاب</SectionTitle>

          <p className="text-muted-foreground mb-6 leading-relaxed">
            الكتّاب هم الأشخاص الذين يكتبون المقالات في موقعك. من هنا يمكنك إضافتهم وتعديل بياناتهم وحذفهم.
          </p>

          {/* View Authors */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Eye size={20} className="text-primary" />
            عرض الكتّاب
          </h3>
          <div className="bg-muted/30 rounded-xl border border-border p-5 mb-6">
            <p className="text-muted-foreground">يعرض الصفحة شبكة من البطاقات، كل بطاقة تمثل كاتباً وتحتوي على: الصورة الدائرية، الاسم، المسمى الوظيفي، النبذة التعريفية، وأزرار التعديل والحذف.</p>
            <p className="text-muted-foreground mt-2">يمكنك البحث بالاسم أو المسمى الوظيفي أو النبذة التعريفية.</p>
          </div>

          {/* Add Author */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Plus size={20} className="text-green-500" />
            إضافة كاتب جديد
          </h3>

          <StepCard number={1} title="الضغط على زر 'إضافة كاتب'">
            <p>اضغط على الزر الأخضر <strong className="text-foreground">"إضافة كاتب"</strong> في أعلى الصفحة.</p>
          </StepCard>

          <StepCard number={2} title="ملء البيانات">
            <p>أدخل بيانات الكاتب في النموذج المطلوب.</p>
          </StepCard>

          <FieldTable fields={[
            { name: 'الاسم', required: true, description: 'اسم الكاتب الكامل كما يظهر في المقالات' },
            { name: 'المسمى الوظيفي', required: false, description: 'مثال: محرر سياسي، كاتب رأي، مراسل' },
            { name: 'صورة الكاتب', required: false, description: 'الصورة الدائرية التي تمثل الكاتب' },
            { name: 'صورة الغلاف', required: false, description: 'صورة بانر تظهر في صفحة الكاتب' },
            { name: 'النبذة التعريفية', required: false, description: 'معلومات مختصرة عن الكاتب وخبراته' },
          ]} />

          <StepCard number={3} title="حفظ الكاتب">
            <p>اضغط على زر <strong className="text-foreground">"حفظ"</strong> لإضافة الكاتب.</p>
          </StepCard>

          {/* Edit Author */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Edit size={20} className="text-green-500" />
            تعديل كاتب
          </h3>
          <div className="bg-muted/30 rounded-xl border border-border p-5 mb-6">
            <p className="text-muted-foreground">اضغط على أيقونة <Edit size={14} className="inline text-green-500" /> بجانب الكاتب. قم بالتعديلات ثم اضغط <strong className="text-foreground">"حفظ"</strong>.</p>
          </div>

          {/* Delete Author */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Trash2 size={20} className="text-red-500" />
            حذف كاتب
          </h3>
          <div className="bg-muted/30 rounded-xl border border-border p-5">
            <p className="text-muted-foreground">اضغط على أيقونة <Trash2 size={14} className="inline text-red-500" /> بجانب الكاتب المراد حذفه.</p>
            <InfoBox type="info">
              حذف الكاتب لن يحذف المقالات المرتبطة به، لكن سيتم فك ارتباط المقالات بالكاتب (ستظهر المقالات بدون كاتب).
            </InfoBox>
          </div>
        </section>

        {/* ==================== 7. تخصيص الصفحة الرئيسية ==================== */}
        <section id="guide-home-customization">
          <SectionTitle icon={LayoutTemplate}>تخصيص الصفحة الرئيسية</SectionTitle>

          <p className="text-muted-foreground mb-6 leading-relaxed">
            من هنا يمكنك التحكم في محتوى الصفحة الرئيسية وترتيب الأقسام الظاهرة فيها.
          </p>

          {/* Section Types */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <LayoutTemplate size={20} className="text-primary" />
            أنواع الأقسام المتاحة
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {[
              { icon: LayoutTemplate, title: 'شبكة مقالات (Grid)', desc: 'يعرض المقالات بشكل شبكة من البطاقات، مثالي لعرض أحدث المقالات من قسم معين.' },
              { icon: ListOrdered, title: 'قائمة مقالات (List)', desc: 'يعرض المقالات بشكل قائمة عمودية، مناسب لعرض تفاصيل أكثر لكل مقال.' },
              { icon: BarChart3, title: 'شريط متحرك (Carousel)', desc: 'شريط متحرك يعرض المقالات بالتنقل التلقائي أو اليدوي. يدعم مصدر واحد أو عدة أقسام.' },
              { icon: FileText, title: 'آخر المقالات', desc: 'شبكة تلقائية تعرض أحدث المقالات المنشورة في الموقع.' },
            ].map((type) => (
              <div key={type.title} className="bg-muted/30 rounded-xl border border-border p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <type.icon size={18} className="text-primary" />
                  </div>
                  <h4 className="font-bold text-foreground">{type.title}</h4>
                </div>
                <p className="text-sm text-muted-foreground">{type.desc}</p>
              </div>
            ))}
          </div>

          {/* Add Section */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Plus size={20} className="text-green-500" />
            إضافة قسم جديد للصفحة الرئيسية
          </h3>

          <StepCard number={1} title="الضغط على زر 'إضافة قسم'">
            <p>اضغط على الزر الأخضر <strong className="text-foreground">"إضافة قسم"</strong> في أعلى الصفحة.</p>
          </StepCard>

          <StepCard number={2} title="اختيار نوع القسم">
            <p>اختر النوع المناسب من القائمة المنسدلة: شبكة مقالات، قائمة مقالات، شريط متحرك، أو آخر المقالات.</p>
          </StepCard>

          <StepCard number={3} title="تحديد المصدر (للشريط المتحرك)">
            <p>إذا اخترت شريط متحرك، يمكنك تحديدgetSource:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong className="text-foreground">آخر المقالات:</strong> يعرض أحدث المقالات تلقائياً</li>
              <li><strong className="text-foreground">قسم محدد:</strong> يعرض مقالات قسم واحد مختار</li>
              <li><strong className="text-foreground">أقسام متعددة:</strong> يعرض مقالات من عدة أقسام مختارة</li>
            </ul>
          </StepCard>

          <StepCard number={4} title="اختيار القسم (للشبكة والقائمة)">
            <p>إذا اخترت شبكة أو قائمة، اختر القسم المراد عرض مقالاته.</p>
          </StepCard>

          <StepCard number={5} title="تحديد العنوان وعدد المقالات">
            <p>أدخل عنواناً للقسم (اختياري - اتركه فارغاً لاستخدام اسم القسم تلقائياً) وحدد عدد المقالات التي تريدها.</p>
          </StepCard>

          <StepCard number={6} title="إضافة القسم">
            <p>اضغط على زر <strong className="text-foreground">"إضافة"</strong> لحفظ القسم الجديد.</p>
          </StepCard>

          {/* Manage Sections */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Settings size={20} className="text-primary" />
            إدارة الأقسام
          </h3>
          <div className="bg-muted/30 rounded-xl border border-border p-5">
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <GripVertical size={16} className="text-muted-foreground mt-1 flex-shrink-0" />
                <span><strong className="text-foreground">إعادة الترتيب:</strong> اضغط مع الاستمرار وأفلت أي قسم لتغيير ترتيبه في الصفحة الرئيسية.</span>
              </li>
              <li className="flex items-start gap-3">
                <Eye size={16} className="text-green-500 mt-1 flex-shrink-0" />
                <span><strong className="text-foreground">إظهار/إخفاء:</strong> اضغط على أيقونة العين لتبديل حالة ظهور القسم (مرئي أو مخفي).</span>
              </li>
              <li className="flex items-start gap-3">
                <Trash2 size={16} className="text-red-500 mt-1 flex-shrink-0" />
                <span><strong className="text-foreground">حذف:</strong> اضغط على أيقونة سلة المهملات لحذف القسم من الصفحة الرئيسية.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* ==================== 8. إعدادات الموقع ==================== */}
        <section id="guide-settings">
          <SectionTitle icon={Settings}>إعدادات الموقع</SectionTitle>

          <p className="text-muted-foreground mb-6 leading-relaxed">
            صفحة الإعدادات تحتوي على خمسة تبويبات رئيسيةتحكم في جميع جوانب الموقع.
          </p>

          {/* General Settings */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Settings size={20} className="text-primary" />
            الإعدادات العامة
          </h3>
          <div className="bg-muted/30 rounded-xl border border-border p-5 mb-6">
            <p className="text-muted-foreground mb-3">التبويب الأول يحتوي على:</p>
            <FieldTable fields={[
              { name: 'اسم الموقع', required: true, description: 'الاسم الرسمي للموقع الذي يظهر في الشريط العلوي ومحركات البحث' },
              { name: 'وصف الموقع', required: false, description: 'وصف مختصر يظهر في تذييل الصفحة ومحركات البحث' },
              { name: 'إظهار ملخص المقال', required: false, description: 'تفعيل/تعطيل عرض الملخص أسفل صفحة المقال' },
              { name: 'اللون الأساسي', required: true, description: 'اللون الرئيسي للموقع (يؤثر على الأزرار والعناوين)' },
              { name: 'اللون الثانوي', required: false, description: 'اللون الثانوي المستخدم في بعض العناصر' },
            ]} />
            <InfoBox type="tip">
              بعد تغيير أي إعداد، لا تنسَ الضغط على زر <strong>"حفظ الإعدادات"</strong> لتطبيق التغييرات.
            </InfoBox>
          </div>

          {/* Logo Settings */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Image size={20} className="text-primary" />
            التحكم باللوجو
          </h3>
          <div className="bg-muted/30 rounded-xl border border-border p-5 mb-6">
            <p className="text-muted-foreground mb-3">التبويب الثاني يتيح لك:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-green-500 mt-1 flex-shrink-0" />
                <span>إضافة لوجوهات متعددة مع تحميل صور من جهازك مباشرة</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-green-500 mt-1 flex-shrink-0" />
                <span>تحديد لوجو خاص للوضع الفاتح وآخر للوضع الداكن</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-green-500 mt-1 flex-shrink-0" />
                <span>التحكم في الأبعاد (العرض، الارتفاع، أقصى عرض)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-green-500 mt-1 flex-shrink-0" />
                <span>ضبط الموضع الأفقي والعمودي والمحاذاة</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-green-500 mt-1 flex-shrink-0" />
                <span>تفعيل/تعطيل كل لوجو على حدة</span>
              </li>
            </ul>
          </div>

          {/* SEO Settings */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Search size={20} className="text-primary" />
            تحسين محركات البحث (SEO)
          </h3>
          <div className="bg-muted/30 rounded-xl border border-border p-5 mb-6">
            <p className="text-muted-foreground mb-3">التبويب الثالث يتحكم في ظهور موقعك في محركات البحث:</p>

            <div className="space-y-4">
              <div className="bg-background rounded-lg p-4 border border-border">
                <h4 className="font-bold text-foreground mb-2">Meta Title (عنوان SEO)</h4>
                <p className="text-sm text-muted-foreground">العنوان الذي يظهر في نتائج البحث وفي تبويب المتصفح. يُفضّل أن يكون 50-60 حرف.</p>
              </div>
              <div className="bg-background rounded-lg p-4 border border-border">
                <h4 className="font-bold text-foreground mb-2">Meta Description (وصف SEO)</h4>
                <p className="text-sm text-muted-foreground">الوصف الذي يظهر تحت العنوان في نتائج البحث. يُفضّل أن يكون 150-160 حرف.</p>
              </div>
              <div className="bg-background rounded-lg p-4 border border-border">
                <h4 className="font-bold text-foreground mb-2">الكلمات المفتاحية</h4>
                <p className="text-sm text-muted-foreground">قائمة بالكلمات relacionadas بموقعك مفصولة بفاصلة.</p>
              </div>
              <div className="bg-background rounded-lg p-4 border border-border">
                <h4 className="font-bold text-foreground mb-2">Open Graph (مشاركة وسائل التواصل)</h4>
                <p className="text-sm text-muted-foreground">التحكم في شكل البطاقة عند مشاركة روابط الموقع على فيسبوك ولينكد إن (العنوان، الوصف، الصورة).</p>
              </div>
              <div className="bg-background rounded-lg p-4 border border-border">
                <h4 className="font-bold text-foreground mb-2">Twitter Card</h4>
                <p className="text-sm text-muted-foreground">تحديد حساب Twitter/X الرسمي للموقع.</p>
              </div>
            </div>
          </div>

          {/* Social Links */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Globe size={20} className="text-primary" />
            حسابات التواصل الاجتماعي
          </h3>
          <div className="bg-muted/30 rounded-xl border border-border p-5 mb-6">
            <p className="text-muted-foreground mb-3">التبويب الرابع لإدارة روابط التواصل الاجتماعي:</p>

            <StepCard number={1} title="إضافة رابط جديد">
              <p>اضغط على <strong className="text-foreground">"إضافة رابط"</strong> وأدخل: اسم المنصة، الرابط، الأيقونة، الترتيب، وحالة التفعيل.</p>
            </StepCard>

            <StepCard number={2} title="تعديل رابط">
              <p>اضغط على زر <strong className="text-foreground">"تعديل"</strong> بجانب الرابط وقم بالتغييرات ثم اضغط <strong className="text-foreground">"حفظ"</strong>.</p>
            </StepCard>

            <StepCard number={3} title="حذف رابط">
              <p>اضغط على أيقونة <Trash2 size={14} className="inline text-red-500" /> وأكّد الحذف.</p>
            </StepCard>
          </div>

          {/* Share Messages */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Share2 size={20} className="text-primary" />
            رسائل المشاركة
          </h3>
          <div className="bg-muted/30 rounded-xl border border-border p-5">
            <p className="text-muted-foreground mb-3">التبويب الخامس لخصيص رسائل المشاركة لكل منصة:</p>
            <ul className="space-y-2 mb-4">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-green-500 mt-1 flex-shrink-0" />
                <span>supports فيسبوك، تويتر، واتساب، تيليجرام، لينكد إن، ريديت</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-green-500 mt-1 flex-shrink-0" />
                <span>يمكنك استخدام المتغيرات: <code className="bg-muted px-1 rounded text-primary font-mono text-xs">{'{url}'}</code> لرابط المقال و <code className="bg-muted px-1 rounded text-primary font-mono text-xs">{'{title}'}</code> لعنوانه</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-green-500 mt-1 flex-shrink-0" />
                <span>يمكنك تفعيل/تعطيل كل منصة على حدة</span>
              </li>
            </ul>
            <InfoBox type="example">
              مثال: تابعوا "{`{title}`}" على موقعنا {`{url}`}
            </InfoBox>
          </div>
        </section>

        {/* ==================== 9. إدارة المستخدمين ==================== */}
        <section id="guide-users">
          <SectionTitle icon={Users}>إدارة المستخدمين</SectionTitle>

          <InfoBox type="info">
            هذا القسم متاح فقط للمدير العام (Super Admin). المستخدمون العاديون لا يستطيعون الوصول إليه.
          </InfoBox>

          <p className="text-muted-foreground mb-6 leading-relaxed">
            من هنا يمكنك إدارة حسابات المستخدمين الذين يمكنهم الوصول إلى لوحة التحكم وتحديد صلاحياتهم بدقة.
          </p>

          {/* User Types */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Shield size={20} className="text-primary" />
            أنواع المستخدمين
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-muted/30 rounded-xl border border-border p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Shield size={20} className="text-purple-500" />
                </div>
                <h4 className="font-bold text-foreground">مدير عام (Super Admin)</h4>
              </div>
              <p className="text-sm text-muted-foreground">صلاحيات كاملة: إدارة جميع المقالات في جميع الأقسام، إدارة المستخدمين، وإعدادات الموقع بالكامل.</p>
            </div>
            <div className="bg-muted/30 rounded-xl border border-border p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Users size={20} className="text-muted-foreground" />
                </div>
                <h4 className="font-bold text-foreground">مستخدم عادي</h4>
              </div>
              <p className="text-sm text-muted-foreground">صلاحيات محددة: يمكن تحديد صلاحياته لكل قسم على حدة (إضافة/تعديل/حذف).</p>
            </div>
          </div>

          {/* Add User */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Plus size={20} className="text-green-500" />
            إضافة مستخدم جديد
          </h3>

          <StepCard number={1} title="الضغط على زر 'إضافة مستخدم'">
            <p>اضغط على الزر الأخضر <strong className="text-foreground">"إضافة مستخدم"</strong>.</p>
          </StepCard>

          <StepCard number={2} title="ملء البيانات">
            <p>أدخل بيانات المستخدم في النموذج.</p>
          </StepCard>

          <FieldTable fields={[
            { name: 'اسم المستخدم', required: true, description: 'البريد الإلكتروني الذي سيستخدمه للمستخدم للدخول' },
            { name: 'كلمة المرور', required: true, description: 'كلمة المرور للمستخدم الجديد' },
            { name: 'مدير عام', required: false, description: 'تفعيل هذا الخيار يمنح المستخدم صلاحيات كاملة' },
          ]} />

          <StepCard number={3} title="تحديد الصلاحيات (للمستخدم العادي)">
            <p>إذا لم تفعّل خيار "مدير عام"، يمكنك تحديد صلاحيات المستخدم لكل قسم على حدة من نافذة الصلاحيات.</p>
          </StepCard>

          <StepCard number={4} title="حفظ المستخدم">
            <p>اضغط على زر <strong className="text-foreground">"حفظ"</strong> لإنشاء الحساب.</p>
          </StepCard>

          {/* Edit User */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Edit size={20} className="text-green-500" />
            تعديل مستخدم
          </h3>
          <div className="bg-muted/30 rounded-xl border border-border p-5 mb-6">
            <p className="text-muted-foreground">اضغط على أيقونة <Edit size={14} className="inline text-green-500" /> بجانب المستخدم. يمكنك تعديل اسم المستخدم و/أو كلمة المرور. اترك حقل كلمة المرور فارغاً للإبقاء على الحالية.</p>
          </div>

          {/* Permissions */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Shield size={20} className="text-blue-500" />
            تحديد الصلاحيات
          </h3>
          <div className="bg-muted/30 rounded-xl border border-border p-5 mb-6">
            <p className="text-muted-foreground mb-3">اضغط على أيقونة <Shield size={14} className="inline text-blue-500" /> بجانب المستخدم لفتح نافذة الصلاحيات:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                <span><strong className="text-foreground">إضافة مقال:</strong> السماح للمستخدم بإنشاء مقالات جديدة في القسم المحدد.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                <span><strong className="text-foreground">تعديل مقال:</strong> السماح بتعديل المقالات الموجودة في القسم المحدد.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                <span><strong className="text-foreground">حذف مقال:</strong> السماح بحذف المقالات من القسم المحدد.</span>
              </li>
            </ul>
            <InfoBox type="tip">
              كل صلاحية يمكن تفعيلها أو تعطيلها لكل قسم على حدة باستخدام أزرار التبديل (Toggle). بعد التغيير، اضغط "حفظ التغييرات".
            </InfoBox>
          </div>

          {/* Delete User */}
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Trash2 size={20} className="text-red-500" />
            حذف مستخدم
          </h3>
          <div className="bg-muted/30 rounded-xl border border-border p-5">
            <p className="text-muted-foreground">اضغط على أيقونة <Trash2 size={14} className="inline text-red-500" /> وأكّد الحذف في النافذة المنبثقة.</p>
            <InfoBox type="danger">
              لا يمكن التراجع عن حذف المستخدم! تأكد من قرارك قبل التأكيد.
            </InfoBox>
          </div>
        </section>

        {/* ==================== 10. نصائح وتلميحات ==================== */}
        <section id="guide-tips">
          <SectionTitle icon={Lightbulb}>نصائح وتلميحات</SectionTitle>

          <div className="space-y-4">
            {[
              { icon: Save, title: 'احفظ دائماً', desc: 'بعد أي تعديل على الإعدادات أو المقالات، تأكد من الضغط على زر الحفظ قبل الانتقال صفحة أخرى.' },
              { icon: Eye, title: 'راجع قبل النشر', desc: 'استخدم زر العرض (العين) لمشاهدة المقال كما يراه الزوار قبل النشر أو بعده.' },
              { icon: Search, title: 'استخدم البحث', desc: 'استخدم شريط البحث للعثور السريع على مقال أو كاتب أو قسم محدد.' },
              { icon: Image, title: 'صور عالية الجودة', desc: 'استخدم صوراً واضحة وعالية الدقة، خاصة صورة المقال التي تظهر في البطاقة.' },
              { icon: Globe, title: 'حسّن SEO', desc: 'املأ حقول SEO في كل مقال (العنوان، الوصف، الصورة) لتحسين ظهورك في محركات البحث.' },
              { icon: Lock, title: 'أمان الحساب', desc: 'لا تشارك بيانات الدخول مع أي شخص، وتأكد من تسجيل الخروج عند الانتهاء.' },
              { icon: Palette, title: 'توحيد الهوية', desc: 'حافظ على ألوان وأيقونات متناسقة لجميع الأقسام ل создание هوية بصرية موحدة.' },
              { icon: Shield, title: 'الصلاحيات', desc: 'لا تمنح صلاحيات مدير عام إلا لمن يحتاجها فعلياً. استخدم الصلاحيات المخصصة لكل قسم.' },
              { icon: Calendar, title: 'النشر في الوقت المناسب', desc: 'استخدم رسم أوقات الذروة لتحديد أفضل وقت لنشر المقالات.' },
              { icon: Download, title: 'المتابعة المستمرة', desc: 'راجع الإحصائيات بانتظام لمعرفة المحتوى الأكثر تفاعلاً والعمل على تحسينه.' },
            ].map((tip) => (
              <div key={tip.title} className="bg-muted/30 rounded-xl border border-border p-4 flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                  <tip.icon size={20} className="text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground mb-1">{tip.title}</h4>
                  <p className="text-sm text-muted-foreground">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <h3 className="text-lg font-bold text-foreground mb-4 mt-8 flex items-center gap-2">
            <Info size={20} className="text-primary" />
            الأسئلة الشائعة
          </h3>
          <div className="space-y-3">
            {[
              { q: 'ماذا أفعل إذا نسيت كلمة المرور؟', a: 'تواصل مع المدير العام لإعادة تعيين كلمة المرور من صفحة إدارة المستخدمين.' },
              { q: 'لماذا لا أرى زر إضافة مقال؟', a: 'ربما لا تملك صلاحية الإضافة في أي قسم. تواصل مع المدير العام لتحديد الصلاحيات المناسبة.' },
              { q: 'كيف أغير لون الموقع؟', a: 'انتقل إلى الإعدادات > الإعدادات العامة وغيّر اللون الأساسي أو الثانوي من منتقي الألوان.' },
              { q: 'هل يمكنني حذف قسم يحتوي مقالات؟', a: 'نعم، لكن سيتم حذف جميع المقالات المرتبطة به أيضاً. يُفضّل نقل المقالات إلى قسم آخر أولاً.' },
              { q: 'كيف أضيف كاتب لمقال موجود؟', a: 'افتح المقال للتعديل من صفحة إدارة المقالات، ثم اختر الكاتب من القائمة المنسدلة.' },
              { q: 'ما الفرق بين الوضع الفاتح والداكن؟', a: 'الوضع الفاتح يستخدم خلفية بيضاء مع نصوص داكنة، والداكن يستخدم خلفية داكنة مع نصوص فاتحة. يمكنك التبديل بينهما من أيقونة الشمس/القمر في الشريط الجانبي.' },
            ].map((faq, i) => (
              <div key={i} className="bg-muted/30 rounded-xl border border-border overflow-hidden">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-right hover:bg-muted/30 transition-colors"
                >
                  <span className="font-bold text-foreground">{faq.q}</span>
                  {expandedFaq === i ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                </button>
                {expandedFaq === i && (
                  <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Footer */}
      <div className="mt-12 mb-8 text-center text-sm text-muted-foreground border-t border-border pt-8">
        <p>دليل لوحة التحكم - تاء بوست</p>
        <p className="mt-1">آخر تحديث: {new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
    </div>
  )
}
