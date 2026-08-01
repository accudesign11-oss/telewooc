import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, Workflow, Megaphone, Code2, ShieldCheck, Zap,
  Bot, Wand2, Brain, Target, ArrowUpRight, Globe, Terminal, Cpu,
  HardDrive, Link as LinkIcon, Palette, ImageIcon, Sliders
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AboutToolPage() {
  const navigate = useNavigate();
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);

  const features = [
    {
      id: "image-converter",
      title: "🖼️ محول الصور المحلي والسحابي (Local & Store Formats Converter)",
      shortDesc: "تحويل الصور محلياً وبالمتجر وبأجهزة الزوار لأي صيغة خفيفة WebP/WebGL",
      icon: ImageIcon,
      color: "from-blue-600 to-cyan-500",
      badge: "تحويل وتسريع الصور",
      targetPath: "/image-converter",
      fullDetails: `محول صور ذكي وشامل يعمل محلياً في المتصفح أو على سيرفر المتجر:
• تحويل صيغ الصور (PNG, JPG, HEIC, WebGL) فوراً إلى صيغة WebP الفائقة السرعة.
• تحويل وتنسيق صور المنتجات محلياً قبل الرفع أو داخل مكتبة ميديا متجرك مباشرة.
• خفض أحجام الصور بنسبة تصل إلى 80% دون المساس بالجودة البصرية للمنتج.`,
      stats: "تسريع تحميل صور المتجر بنسبة 300%"
    },
    {
      id: "auto-accelerator",
      title: "⚡ محرك الحقن والتسريع وتوليد الشارات (Auto Injector & Badges)",
      shortDesc: "توليد بلاجنز، زرع كود، أو حقن مباشر لتسريع المتجر وإضافة الشارات والأيقونات",
      icon: Sliders,
      color: "from-amber-500 to-yellow-600",
      badge: "حقن وتطوير تلقائي",
      targetPath: "/wordpress-studio",
      fullDetails: `توليد الإضافات وتطبيق التعديلات على موقعك بضغطة زر مفردة:
• إنشاء كود مخصص، توليد بلاجن متكامل، أو الحقن المباشر في المتجر لتسريع الصفحات.
• إضافة شارات وبادجات الضمان، الشحن المجاني، وأيقونات الثقة التلقائية على المنتجات.
• مرونة اختيار الطريقة المناسبة لتطبيق الميزات عبر الوسائل الأربعة للتكامل دون تعديل ملفات القالب.`,
      stats: "تطوير زرع مباشر بضغطة زر مفردة"
    },
    {
      id: "url-import",
      title: "🔗 استيراد المنتجات بالرابط (Product URL Import)",
      shortDesc: "استيراد وتفريغ أي منتج برابط مباشر وتحويله فوراً لمنتج كامل بموقعك",
      icon: LinkIcon,
      color: "from-sky-500 to-blue-600",
      badge: "جلب آلي بالرابط",
      targetPath: "/import",
      fullDetails: `تتيح لك هذه الميزة إدخال رابط أي منتج من أي موقع أو منصة. يقوم الذكاء الاصطناعي بقراءة الرابط، استخراج الصور عالية الجودة، الأوصاف، والأسعار، ثم إعادة صياغتها ونشرها كمنتج جاهز في متجرك بضغطة زر مفردة!`,
      stats: "تفريغ وجلب المنتجات بلمحة عين"
    },
    {
      id: "branding-studio",
      title: "🎨 استوديو البراندنج والهوية التجارية (Brand Kit)",
      shortDesc: "توليد البرومبتس للهوية الخاصة وتوجيهك لأفضل منصات تصميم اللوجو والهوية",
      icon: Palette,
      color: "from-pink-500 to-rose-600",
      badge: "هوية بصرية شاملة",
      targetPath: "/branding-studio",
      fullDetails: `مركز متكامل لبناء وتوجيه البراند الهويتي لمتجرك:
• إنشاء البرومبتس الهندسية المخصصة للذكاء الاصطناعي لتصميم اللوجو والهوية التجارية الفريدة.
• توجيهك المباشر لأفضل وأقوى المنصات والأدوات العالمية لتوليد اللوجو والشعارات الاحترافية.
• بناء Brand Kit متناسق يحدد ألوان متجرك، الخطوط، ونبرة الصوت التسويقية (Brand Voice).`,
      stats: "بناء هوية بصرية تنافسية كاملة"
    },
    {
      id: "auto-pipeline",
      title: "🚀 أوتو بايبلاين متعدد المنتجات (Auto Pipeline)",
      shortDesc: "رفع صور متعددة دفعة واحدة، تحويل لـ WebP، تحليل AI ونشر فوري",
      icon: Workflow,
      color: "from-amber-500 to-orange-600",
      badge: "معالجة أوتوماتيكية 100%",
      targetPath: "/pipeline",
      fullDetails: `تتيح لك ميزة الأوتو بايبلاين رفع عشرات الصور دفعة واحدة للمنتجات. يقوم النظام أوتوماتيكياً بما يلي:
• تحويل جميع الصور إلى صيغة WebP الخفيفة وسريعة التحميل.
• تحليل الصور بواسطة الذكاء الاصطناعي AI Vision لاستخراج تفاصيل المنتج.
• توليد وصف مبهرج وتصميم كروت المميزات وضمانات الجودة.
• حفظ المسودة وتخصيص أسعارها ونشرها مباشرة على ووكومرس بضغطة زر مفردة!`,
      stats: "توفير أكثر من 95% من وقت إدخال المنتجات"
    },
    {
      id: "telegram-sync",
      title: "📱 تحويل التليجرام لمنتجات ووكومرس",
      shortDesc: "تحويل أي منشور أو مجرد صورة منتج في تليجرام إلى منتج كامل على موقعك",
      icon: Bot,
      color: "from-indigo-500 to-blue-600",
      badge: "مزامنة لحظية",
      targetPath: "/import",
      fullDetails: `بمجرد استلام منشور في قناة التليجرام المربوطة، تقوم الأداة بقراءة النص والصور، وفصل التفاصيل وتوليد العنوان والأسعار والألوان والمقاسات بالذكاء الاصطناعي، ثم نشر المنتج تلقائياً في متجرك بدون أي تدخل يدوي!`,
      stats: "قراءة ومزامنة فورية على مدار 24 ساعة"
    },
    {
      id: "wp-studio",
      title: "💻 ووردبريس ستوديو وتوليد الإضافات (Plugin Generator)",
      shortDesc: "توليد كود CSS/JS ناتيف وإضافات ووردبريس المخصصة بزرع مباشر",
      icon: Code2,
      color: "from-purple-500 to-violet-600",
      badge: "أكواد وإضافات",
      targetPath: "/wordpress-studio",
      fullDetails: `مركز هندسي كامل لتطوير متجر ووردبريس:
• توليد إضافات ووردبريس (Plugins) مخصصة قابلة للتحميل والزرع.
• توليد كود الـ Additional CSS المبهرج بأسلوب النيون والذهبي والألوان التفاعلية.
• زرع الأكواد بـ 4 طرق متطورة تناسب كافة أنواع الاستضافات والمواقع.
• تسريع الأداء وحجب الثغرات وتفعيل شراء الواتساب وتجاوز السلة.`,
      stats: "تخصيص كامل بدون الحاجة لمبرمج"
    },
    {
      id: "gdrive-cloud",
      title: "☁️ ربط وتصفح جوجل درايف (Google Drive Integration)",
      shortDesc: "عرض وتضمين مجلدات جوجل درايف وربط الصور بمنتجاتك مباشرة",
      icon: HardDrive,
      color: "from-cyan-500 to-teal-600",
      badge: "تكامل سحابي",
      targetPath: "/google-drive",
      fullDetails: `ربط مباشر مع حسابك في Google Drive لتصفح المجلدات وتعيين صور المنتجات وتضمين الملفات مباشرة داخل الوصف مع إمكانية التحويل التلقائي لصيغ الصور وتحسين أداء المعرض.`,
      stats: "وصول سحابي مباشر لملفات المنتجات"
    },
    {
      id: "ai-editing",
      title: "✍️ تعديل حقول المنتجات بالذكاء الاصطناعي",
      shortDesc: "التحكم والتعديل التلقائي في أي حقل (اسم، سعر، وصف، وسوم) بالـ AI",
      icon: Wand2,
      color: "from-emerald-500 to-green-600",
      badge: "تحرير ذكي",
      targetPath: "/products",
      fullDetails: `تعديل وتوليد البيانات لكل حقل من حقول المنتج بشكل منفرد أو جماعي بواسطة الذكاء الاصطناعي. يمكنك إعادة كتابة العناوين والأوصاف وترجمة الخصائص وتوليد كلمات مفتاحية (SEO Tags) بنقرة زر.`,
      stats: "دقة تحرير فائقة وتوافق مع محركات البحث"
    },
    {
      id: "social-engine",
      title: "📣 محرك السوشيال ميديا وجدولة المنشورات",
      shortDesc: "تحويل المنتج لمنشور تسويقي وجدولة النشر الآلي على منصات التواصل",
      icon: Megaphone,
      color: "from-rose-500 to-red-600",
      badge: "تسويق آلي",
      targetPath: "/social-engine",
      fullDetails: `تحويل المنتجات فوراً إلى منشورات جذابة للسوشيال ميديا مع هاشتاجات مخصصة. يتيح لك النظام جدولة المنشورات للتلقائية على الحسابات المربوطة وضبط أوقات الذروة التنافسية.`,
      stats: "إدارة وتسويق شامل للحسابات بضغطة زر"
    },
    {
      id: "content-brain",
      title: "🧠 مخ الذكاء الاصطناعي لخطط المحتوى والريلز",
      shortDesc: "خطة محتوى متكاملة بالريلز، الأفكار، والسيناريوهات والبرومبتس",
      icon: Brain,
      color: "from-violet-500 to-purple-600",
      badge: "تخطيط استراتيجي",
      targetPath: "/content-brain",
      fullDetails: `يبني لك مخ الذكاء الاصطناعي خطة تسويقية محترفة تشمل:
• تحديد عدد الريلز ومواضيع الفيديوهات المطلوبة.
• كود وسيناريو كل ريلز بدقة (Hook, Body, Call to Action).
• البرومبت المخصص لتوليد كل فيديو بواسطة أجهزة توليد الذكاء الاصطناعي.
• جدول زمني مرن ومصمم لتحقيق أعلى معدلات الانتشار (Virality).`,
      stats: "جدول محتوى متكامل يرفع المبيعات"
    },
    {
      id: "winning-ads",
      title: "📊 ترشيحات المنتجات الرابحة والإعلانات المُمولة",
      shortDesc: "تحليل ذكي لترشيح المنتجات الأكثر مبيعاً وأنسب منتج لإعلان ممول",
      icon: Target,
      color: "from-amber-500 to-yellow-600",
      badge: "تحليل واستثمار",
      targetPath: "/products",
      fullDetails: `خوارزمية ذكية تقوم بتحليل منتجات متجرك وترشيح المنتجات ذات العائد الأعلى (Winning Products)، وتحديد المنتج المثالي الذي يحقق أعلى استجابة عند إطلاق حملة إعلانية ممولة له.`,
      stats: "أقصى عائد على الاستثمار الإعلاني (ROAS)"
    }
  ];

  return (
    <AppLayout title="عن الأداة والتطبيق والمهندس البرمجي">
      <div className="p-3 sm:p-6 max-w-6xl mx-auto space-y-8 text-right overflow-hidden dir-rtl">

        {/* Hero Header Banner */}
        <div className="relative rounded-3xl p-6 sm:p-10 overflow-hidden bg-slate-950 border border-amber-500/30 shadow-2xl text-right">
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 6, repeat: Infinity }}
            className="absolute -top-20 -right-20 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"
          />
          <motion.div 
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 7, repeat: Infinity }}
            className="absolute -bottom-20 -left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"
          />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl text-right">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold px-3.5 py-1 text-xs shadow-lg">
                  ⚡ المنظومة الأذكى والأقوى لتطوير المتاجر
                </Badge>
                <Badge variant="outline" className="border-amber-500/40 text-amber-400 font-bold text-xs">
                  TeleWoo Suite v1.0
                </Badge>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
                منصة <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500">TeleWoo Flow</span> المتكاملة
              </h1>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                حل مهندسي متكامل ومصمم خصيصاً لتطوير وأتمتة المتاجر الإلكترونية. تقوم بالعمليات من ألف إلى ياء: تحويل الصور محلياً وفي المتجر، زرع البلاجنز والتسريع وحقن البادجات، استيراد المنتجات بالروابط والتليجرام، توليد الهوية والـ CSS، إدارة Google Drive، وتوفير مخ الذكاء الاصطناعي للخطط التسويقية والريلز والمنتجات الرابحة.
              </p>

              {/* Developer Attribution Header */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 rounded-2xl border border-amber-500/40 text-amber-400 shrink-0">
                  <Sparkles className="h-6 w-6 text-amber-400 animate-pulse" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium">تمت البرمجة والتطوير بواسطة:</div>
                  <div className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500">
                    م / أحمد عبدالعظيم
                  </div>
                  <div className="text-[11px] text-amber-500/80 font-bold">خبير تطوير المتاجر الإلكترونية وحلول ووكومرس والذكاء الاصطناعي</div>
                </div>
              </div>
            </div>

            {/* Floating Logo Badge */}
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="relative group shrink-0"
            >
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-amber-500 via-purple-500 to-amber-400 opacity-75 blur-xl group-hover:opacity-100 transition duration-500"></div>
              <div className="relative w-44 h-44 sm:w-56 sm:h-56 bg-slate-950 rounded-3xl border border-white/20 p-4 shadow-2xl flex flex-col items-center justify-center gap-3">
                <img 
                  src="/telewoo-logo.png" 
                  alt="TeleWoo Logo" 
                  className="w-28 h-28 sm:w-36 sm:h-36 object-contain rounded-2xl drop-shadow-[0_10px_20px_rgba(245,158,11,0.5)]" 
                />
                <Badge variant="outline" className="text-[11px] font-bold border-amber-500/40 text-amber-400 bg-amber-500/10">
                  TeleWoo All-In-One
                </Badge>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Dynamic Feature Explorer Grid */}
        <div className="space-y-4 text-right">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
              قدرات ومزايا المنظومة الشاملة (All-In-One Engine)
            </h2>
            <Badge variant="outline" className="text-xs font-bold text-muted-foreground">
              اضغط على أي ميزة لاستعراض التفاصيل والتجربة المباشرة 👈
            </Badge>
          </div>

          {/* Cards Grid Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {features.map((feat, index) => {
              const Icon = feat.icon;
              const isSelected = activeFeatureIndex === index;
              return (
                <motion.div
                  key={feat.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveFeatureIndex(index)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all text-right space-y-2 relative overflow-hidden ${
                    isSelected 
                      ? "bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/10" 
                      : "bg-card hover:bg-muted/50 border-border"
                  }`}
                >
                  {isSelected && (
                    <motion.div 
                      layoutId="activeGlow" 
                      className="absolute inset-0 bg-amber-500/5 pointer-events-none" 
                    />
                  )}
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-xl text-white bg-gradient-to-r ${feat.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {feat.badge}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-sm text-foreground">{feat.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{feat.shortDesc}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Active Card Details View */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFeatureIndex}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-amber-500/30 bg-gradient-to-r from-card via-muted/30 to-card shadow-xl overflow-hidden">
                <CardHeader className="pb-3 border-b text-right">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-2xl text-white bg-gradient-to-r ${features[activeFeatureIndex].color}`}>
                        {(() => {
                          const Icon = features[activeFeatureIndex].icon;
                          return <Icon className="h-6 w-6" />;
                        })()}
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-foreground">
                          {features[activeFeatureIndex].title}
                        </CardTitle>
                        <CardDescription className="text-xs text-amber-600 font-bold mt-0.5">
                          {features[activeFeatureIndex].stats}
                        </CardDescription>
                      </div>
                    </div>

                    <Button 
                      size="sm"
                      onClick={() => navigate(features[activeFeatureIndex].targetPath)}
                      className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs gap-1.5 shadow-sm"
                    >
                      تجربة واستخدام الميزة الآن 🚀
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-5 text-right space-y-3">
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line font-medium">
                    {features[activeFeatureIndex].fullDetails}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Technology Architecture Section */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3 text-right">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Cpu className="h-5 w-5 text-amber-500" />
              بنية النظام والحلول التقنية المتقدمة (Architecture & Security)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-right">
            <div className="p-4 bg-muted/40 rounded-xl border space-y-1.5 text-right">
              <div className="font-bold text-xs text-amber-500 flex items-center gap-1.5">
                <Globe className="h-4 w-4" />
                Frontend React 18 & WebP
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                واجهة فائقة السرعة مع تحويل لصور WebP خفيفة الحجم وضغط تلقائي للأدوات على المتجر.
              </p>
            </div>

            <div className="p-4 bg-muted/40 rounded-xl border space-y-1.5 text-right">
              <div className="font-bold text-xs text-purple-400 flex items-center gap-1.5">
                <Terminal className="h-4 w-4" />
                56 Supabase Edge Serverless Functions
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                سيرفرات سحابية فائقة السرعة تتيح معالجة الصور والتوليد وقراءة التليجرام 24/7 دون أي بطء.
              </p>
            </div>

            <div className="p-4 bg-muted/40 rounded-xl border space-y-1.5 text-right">
              <div className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                تكامل ووردبريس المزدوج (4-Methods)
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                ربط عبر مفاتيح الـ Injector، الإضافات المخصصة، أو التطبيقات الرسمية لمنح أعلى درجات الأمان والسرعة.
              </p>
            </div>
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
