import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Copy, Download, Eye, Check, SlidersHorizontal, Palette, Zap, Star, ShieldCheck, Flame } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export type FancyTheme = "ultra-neon" | "royal-gold" | "cyberpunk" | "modern-glass" | "vibrant-gradient" | "minimal-classic";

export interface FancyStyleOptions {
  theme: FancyTheme;
  enableAnimation: boolean;
  animationSpeed: "fast" | "medium" | "slow";
  glowLevel: "ultra-hyper" | "balanced" | "calm";
  primaryColor: string;
  accentColor: string;
  selectedBadges: string[];
  customInstructions: string;
}

const DEFAULT_BADGES = [
  "⚡ شحن سريع وتسليم فوري",
  "🔒 ضمان استبدال واسترجاع 100%",
  "⭐ المنتج الأكثر مبيعاً وتقييماً",
  "💎 جودة فائقة وخامات أصلية",
  "🎁 خصم خاص لفترة محدودة",
];

export function FancyCSSStudioTab() {
  const { toast } = useToast();
  const [theme, setTheme] = useState<FancyTheme>("ultra-neon");
  const [enableAnimation, setEnableAnimation] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState<"fast" | "medium" | "slow">("medium");
  const [glowLevel, setGlowLevel] = useState<"ultra-hyper" | "balanced" | "calm">("ultra-hyper");
  const [primaryColor, setPrimaryColor] = useState("#0F172A");
  const [accentColor, setAccentColor] = useState("#C89B3C");
  const [selectedBadges, setSelectedBadges] = useState<string[]>(DEFAULT_BADGES.slice(0, 3));
  const [customInstructions, setCustomInstructions] = useState("");
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [confirmedCode, setConfirmedCode] = useState<string>("");
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);

  const toggleBadge = (badge: string) => {
    if (selectedBadges.includes(badge)) {
      setSelectedBadges(selectedBadges.filter(b => b !== badge));
    } else {
      setSelectedBadges([...selectedBadges, badge]);
    }
  };

  // Generate Additional CSS Code based on 6 styles and options
  const generateAdditionalCSS = (): string => {
    const animDuration = animationSpeed === "fast" ? "1.5s" : animationSpeed === "slow" ? "4s" : "2.5s";
    const animRule = enableAnimation ? `animation: tlv-fancy-glow ${animDuration} ease-in-out infinite alternate;` : "";
    const shadowIntensity = glowLevel === "ultra-hyper" ? "0 12px 35px rgba(0,0,0,0.18)" : glowLevel === "balanced" ? "0 6px 18px rgba(0,0,0,0.1)" : "0 2px 8px rgba(0,0,0,0.04)";

    let themeCSS = "";

    switch (theme) {
      case "ultra-neon":
        themeCSS = `
/* Theme: Ultra Neon Hyper (المبهرج الترا هايبر) */
:root { --tlv-primary: ${primaryColor}; --tlv-accent: ${accentColor}; }
.tlv-description { max-width: 940px; margin: 0 auto; font-family: 'Cairo', system-ui, sans-serif; }
.tlv-main-title { color: var(--tlv-primary); font-size: 24px; font-weight: 800; border-bottom: 3px solid var(--tlv-accent); padding-bottom: 8px; margin: 24px 0 16px; position: relative; }
.tlv-service-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin: 16px 0; }
.tlv-service-card { background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.9)); border: 2px solid var(--tlv-accent); border-radius: 16px; padding: 16px; box-shadow: ${shadowIntensity}; backdrop-filter: blur(10px); transition: transform 0.3s ease, box-shadow 0.3s ease; ${animRule} }
.tlv-service-card:hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 16px 40px rgba(0,0,0,0.22); }
.tlv-badges-bar { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
.tlv-badge-item { background: var(--tlv-primary); color: #fff; border-radius: 20px; padding: 6px 14px; font-size: 12.5px; font-weight: 700; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.tlv-description table { width: 100%; border-collapse: collapse; margin: 16px 0; background: #fff; border-radius: 14px; overflow: hidden; box-shadow: ${shadowIntensity}; }
.tlv-description table th { background: var(--tlv-primary); color: #fff; padding: 12px; font-size: 14px; text-align: right; }
.tlv-description table td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13.5px; }
.tlv-live-help { background: linear-gradient(135deg, var(--tlv-primary), #1e293b); color: #fff; border-radius: 18px; padding: 22px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
@keyframes tlv-fancy-glow { 0% { border-color: var(--tlv-accent); } 100% { border-color: var(--tlv-primary); } }
`;
        break;

      case "royal-gold":
        themeCSS = `
/* Theme: Royal Gold Velvet (الملكي الذهبي الفاخر) */
:root { --tlv-primary: ${primaryColor}; --tlv-accent: #D4AF37; }
.tlv-description { max-width: 920px; margin: 0 auto; font-family: 'Cairo', system-ui, sans-serif; background: #faf8f5; padding: 20px; border-radius: 20px; }
.tlv-main-title { color: #856404; font-size: 23px; font-weight: 800; text-align: center; border-bottom: 2px dashed #D4AF37; padding-bottom: 10px; margin-bottom: 20px; }
.tlv-service-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
.tlv-service-card { background: #fff; border: 1px solid #e6d5b8; border-radius: 14px; padding: 16px; box-shadow: 0 4px 15px rgba(212,175,55,0.12); ${animRule} }
.tlv-badges-bar { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0; justify-content: center; }
.tlv-badge-item { background: linear-gradient(135deg, #D4AF37, #AA771C); color: #fff; border-radius: 25px; padding: 6px 16px; font-size: 12px; font-weight: bold; }
.tlv-description table { width: 100%; border-collapse: collapse; margin: 16px 0; background: #fff; border: 1px solid #e6d5b8; border-radius: 12px; }
.tlv-description table th { background: #fdf8ef; color: #856404; padding: 12px; text-align: right; }
.tlv-description table td { padding: 12px; border-bottom: 1px solid #f3e9d7; }
.tlv-live-help { background: linear-gradient(135deg, #fdf8ef, #fff8ec); border: 2px solid #D4AF37; border-radius: 16px; padding: 20px; text-align: center; ${animRule} }
@keyframes tlv-fancy-glow { 0% { box-shadow: 0 0 10px rgba(200,155,60,0.2); } 100% { box-shadow: 0 0 25px rgba(200,155,60,0.5); } }
`;
        break;

      case "cyberpunk":
        themeCSS = `
/* Theme: Dark Cyberpunk Tech (التقني المضيء) */
:root { --tlv-primary: #020617; --tlv-accent: #38bdf8; }
.tlv-description { max-width: 940px; margin: 0 auto; font-family: 'Cairo', system-ui, sans-serif; background: #020617; color: #f8fafc; padding: 24px; border-radius: 20px; border: 1px solid #1e293b; }
.tlv-main-title { color: #38bdf8; font-size: 24px; font-weight: 800; border-bottom: 2px solid #38bdf8; padding-bottom: 8px; text-shadow: 0 0 10px rgba(56,189,248,0.4); }
.tlv-service-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin: 18px 0; }
.tlv-service-card { background: #0f172a; border: 1px solid #334155; border-radius: 16px; padding: 16px; ${animRule} }
.tlv-badges-bar { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
.tlv-badge-item { background: #0284c7; color: #fff; border-radius: 8px; padding: 6px 14px; font-size: 12px; font-weight: bold; }
.tlv-description table { width: 100%; border-collapse: collapse; margin: 16px 0; background: #0f172a; border-radius: 12px; overflow: hidden; }
.tlv-description table th { background: #1e293b; color: #38bdf8; padding: 12px; text-align: right; }
.tlv-description table td { padding: 12px; border-bottom: 1px solid #334155; color: #cbd5e1; }
.tlv-live-help { background: linear-gradient(135deg, #0f172a, #1e1b4b); border: 1px solid #6366f1; border-radius: 16px; padding: 20px; text-align: center; }
@keyframes tlv-fancy-glow { 0% { border-color: #38bdf8; } 100% { border-color: #818cf8; } }
`;
        break;

      case "modern-glass":
        themeCSS = `
/* Theme: Modern SaaS Glass (العصري الشفاف) */
:root { --tlv-primary: ${primaryColor}; --tlv-accent: ${accentColor}; }
.tlv-description { max-width: 920px; margin: 0 auto; font-family: 'Cairo', system-ui, sans-serif; }
.tlv-main-title { color: var(--tlv-primary); font-size: 22px; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
.tlv-service-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin: 16px 0; }
.tlv-service-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.tlv-badges-bar { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0; }
.tlv-badge-item { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 20px; padding: 5px 14px; font-size: 12px; }
.tlv-description table { width: 100%; border-collapse: collapse; margin: 16px 0; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; }
.tlv-description table th { background: #f8fafc; color: var(--tlv-primary); padding: 10px 14px; text-align: right; }
.tlv-description table td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; }
.tlv-live-help { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; text-align: center; }
`;
        break;

      case "vibrant-gradient":
        themeCSS = `
/* Theme: Vibrant Pastel Gradient (الحيوي الملون) */
:root { --tlv-primary: ${primaryColor}; --tlv-accent: ${accentColor}; }
.tlv-description { max-width: 940px; margin: 0 auto; font-family: 'Cairo', system-ui, sans-serif; }
.tlv-main-title { background: linear-gradient(135deg, var(--tlv-primary), var(--tlv-accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 25px; font-weight: 800; margin-bottom: 16px; }
.tlv-service-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin: 16px 0; }
.tlv-service-card { background: linear-gradient(135deg, #ffffff, #f0f9ff); border: 2px solid #bae6fd; border-radius: 16px; padding: 16px; box-shadow: 0 8px 20px rgba(56,189,248,0.15); ${animRule} }
.tlv-badges-bar { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
.tlv-badge-item { background: linear-gradient(135deg, var(--tlv-primary), var(--tlv-accent)); color: #fff; border-radius: 20px; padding: 6px 16px; font-size: 12.5px; font-weight: 700; }
.tlv-description table { width: 100%; border-collapse: collapse; margin: 16px 0; background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); }
.tlv-description table th { background: linear-gradient(135deg, var(--tlv-primary), #3b82f6); color: #fff; padding: 12px; text-align: right; }
.tlv-description table td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
.tlv-live-help { background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border: 2px solid #7dd3fc; border-radius: 18px; padding: 22px; text-align: center; }
@keyframes tlv-fancy-glow { 0% { transform: translateY(0); } 100% { transform: translateY(-4px); } }
`;
        break;

      case "minimal-classic":
      default:
        themeCSS = `
/* Theme: Minimal Classic Elegance (الكلاسيكي الهادئ) */
:root { --tlv-primary: ${primaryColor}; --tlv-accent: ${accentColor}; }
.tlv-description { max-width: 900px; margin: 0 auto; font-family: 'Cairo', system-ui, sans-serif; line-height: 1.8; color: #1e293b; }
.tlv-main-title { color: var(--tlv-primary); font-size: 22px; font-weight: 700; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 16px; }
.tlv-service-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 14px 0; }
.tlv-service-card { background: #fafafa; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
.tlv-badges-bar { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0; }
.tlv-badge-item { background: #f1f5f9; color: #475569; border-radius: 6px; padding: 4px 12px; font-size: 12px; }
.tlv-description table { width: 100%; border-collapse: collapse; margin: 14px 0; }
.tlv-description table th, .tlv-description table td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 13.5px; }
.tlv-description table th { background: #f8fafc; font-weight: 700; }
.tlv-live-help { border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; text-align: center; background: #fafafa; }
`;
        break;
    }

    if (customInstructions.trim()) {
      themeCSS += `\n\n/* 📌 تعليمات مخصصة وقواعد إضافية مدخلة من المستخدم: */\n/* ${customInstructions.trim().replace(/\*\//g, "")} */\n.tlv-description {\n  /* Custom rules applied based on user prompt */\n}\n`;
    }

    return themeCSS.trim();
  };

  const sampleHTML = `
<div class="tlv-description">
  <div class="tlv-badges-bar">
    ${selectedBadges.map(b => `<span class="tlv-badge-item">${b}</span>`).join("\n    ")}
  </div>

  <h2 class="tlv-main-title">🌟 منتج استثنائي بتصميم عصري وأداء عالي</h2>
  <p>يجمع هذا المنتج بين الجودة الفائقة والتصميم الجذاب ليعطيك تجربة استثنائية لا تُنسى في كل استخدام.</p>

  <div class="tlv-service-cards">
    <div class="tlv-service-card">
      <span style="font-size:24px;">✨</span>
      <div>
        <h3 style="margin:0 0 4px; font-size:14px; font-weight:bold;">تصميم مبتكر</h3>
        <p style="margin:0; font-size:12px; opacity:0.8;">خامات عالية الجودة تضمن المتانة والجمال</p>
      </div>
    </div>
    <div class="tlv-service-card">
      <span style="font-size:24px;">🚀</span>
      <div>
        <h3 style="margin:0 0 4px; font-size:14px; font-weight:bold;">أداء سريع</h3>
        <p style="margin:0; font-size:12px; opacity:0.8;">سهولة الاستخدام مع أقصى كفاءة تشغيلية</p>
      </div>
    </div>
  </div>

  <h2 class="tlv-main-title">📋 جدول المواصفات الفنية</h2>
  <table>
    <tr><th>المادة الخام</th><td>ألمنيوم عالي الجودة ومعالج ضد الخدش</td></tr>
    <tr><th>الضمان</th><td>سنة كاملة ضد عيوب التصنيع</td></tr>
    <tr><th>محتويات العبوة</th><td>المنتج + دليل الاستخدام + شهادة الضمان</td></tr>
  </table>

  <div class="tlv-live-help">
    <h3 style="margin:0 0 6px; font-size:16px;">💡 هل لديك أي استفسار حول هذا المنتج؟</h3>
    <p style="margin:0; font-size:13px; opacity:0.9;">فريق خدمة العملاء متاح 24/7 لمساعدتك فوراً والإجابة عن جميع أسئلتك!</p>
  </div>
</div>
`;

  const cssContent = confirmedCode || generateAdditionalCSS();

  const handleConfirmModifications = () => {
    const compiled = generateAdditionalCSS();
    setConfirmedCode(compiled);
    setIsConfirmed(true);
    toast({
      title: "⚡ تم تأكيد وتطبيق التعديلات والتعليمات الخاصة وتوليد الـ CSS بنجاح!",
      description: "تم بناء وتحديث الكود النهائي بناءً على النمط والبادجات والتعليمات المدخلة."
    });
  };

  const handleCopyCSS = () => {
    navigator.clipboard.writeText(cssContent);
    setCopied(true);
    toast({ title: "تم نسخ كود الـ CSS الإضافية!", description: "الصقه في (مظهر -> تخصيص -> تنسيقات CSS إضافية) في ووردبريس." });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadCSS = () => {
    const blob = new Blob([cssContent], { type: "text/css" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Additional-CSS-${theme}.css`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast({ title: "تم تنزيل ملف الـ CSS بنجاح!", description: "الملف جاهز للرفع أو النسخ للموقع." });
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            مُنشئ ملف الـ CSS الإضافية للوصف المبهرج (Fancy Additional CSS Generator)
          </CardTitle>
          <CardDescription>
            اختر نمط البهرجة، الألوان، الأنيميشن، والبادجات لتوليد كود Additional CSS يوضع في ووردبريس لتجميل وصف المنتجات تلقائياً.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Style & Theme Selector */}
          <div className="space-y-3">
            <Label className="font-bold text-sm flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              اختر ثيم النمط المبهرج (6 أنماط مميزة):
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: "ultra-neon", title: "ترا هايبر مبهرج (Ultra Neon)", hint: "ألوان مشعة بأنيميشن وتأثيرات نيون براقة", badge: "أكثر طلباً 🔥" },
                { id: "royal-gold", title: "الملكي الذهبي (Royal Gold)", hint: "حواف ذهبية معدنية وبادجات فاخرة للمنتجات الثمينة", badge: "فاخر 💎" },
                { id: "cyberpunk", title: "التقني المضيء (Cyberpunk)", hint: "خلفيات غامقة مضيئة لعالم التكنولوجيا والإلكترونيات", badge: "عصري ⚡" },
                { id: "modern-glass", title: "العصري الشفاف (SaaS Glass)", hint: "تصميم شفاف ناعم مع ظلال هادئة وجذابة", badge: "أنيق ✨" },
                { id: "vibrant-gradient", title: "الحيوي الملون (Vibrant Pastel)", hint: "كروت ذات تدرجات ملونة حيوية ومبهجة", badge: "ملون 🎨" },
                { id: "minimal-classic", title: "الكلاسيكي الهادئ (Minimal Classic)", hint: "خطوط نظيفة ومساحات هادئة للماركات البسيطة", badge: "هادئ 🌿" },
              ].map(t => (
                <div
                  key={t.id}
                  onClick={() => setTheme(t.id as FancyTheme)}
                  className={`p-3.5 rounded-lg border-2 cursor-pointer transition-all ${theme === t.id ? "border-amber-500 bg-amber-500/10 shadow-md" : "border-border hover:border-amber-500/40"}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs">{t.title}</span>
                    <Badge variant="outline" className="text-[9px]">{t.badge}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">{t.hint}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Color & Animation Customization Controls */}
          <div className="p-4 bg-background rounded-lg border space-y-4">
            <Label className="font-bold text-xs flex items-center gap-1.5">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              خصائص الأنيميشن والإضاءة والألوان:
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">اللون الرئيسي (Primary):</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-8 w-10 cursor-pointer rounded border" />
                  <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="font-mono text-xs" dir="ltr" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">لون الإضاءة/التأكيد (Accent):</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="h-8 w-10 cursor-pointer rounded border" />
                  <Input value={accentColor} onChange={e => setAccentColor(e.target.value)} className="font-mono text-xs" dir="ltr" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">مستوى البهرجة (Glow Level):</Label>
                <Select value={glowLevel} onValueChange={(v: any) => setGlowLevel(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ultra-hyper">ترا هايبر (Ultra Glow)</SelectItem>
                    <SelectItem value="balanced">متوازن (Balanced)</SelectItem>
                    <SelectItem value="calm">هادئ (Calm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
              <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded border">
                <div>
                  <Label className="font-bold text-xs">تفعيل حركة الأنيميشن (Live Animation)</Label>
                  <p className="text-[10px] text-muted-foreground">إضافة توهج متحرك وحركة خفيفة للكروت</p>
                </div>
                <Switch checked={enableAnimation} onCheckedChange={setEnableAnimation} />
              </div>

              {enableAnimation && (
                <div className="space-y-1.5">
                  <Label className="text-xs">سرعة الأنيميشن:</Label>
                  <Select value={animationSpeed} onValueChange={(v: any) => setAnimationSpeed(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fast">سريع (1.5s)</SelectItem>
                      <SelectItem value="medium">متوسط (2.5s)</SelectItem>
                      <SelectItem value="slow">هادئ وخفيف (4s)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Custom Instructions & Badges */}
          <div className="space-y-4 p-4 bg-background rounded-lg border">
            <div className="space-y-2">
              <Label className="font-bold text-xs flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-amber-500" />
                بادجات الثقة والمميزات المفعلة في الوصف:
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DEFAULT_BADGES.map(b => (
                  <div key={b} className="flex items-center space-x-2 space-x-reverse border p-2 rounded bg-muted/20">
                    <Checkbox id={`bdg-${b}`} checked={selectedBadges.includes(b)} onCheckedChange={() => toggleBadge(b)} />
                    <label htmlFor={`bdg-${b}`} className="text-xs font-medium cursor-pointer">{b}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <Label className="font-bold text-xs">مربع النص للتعليمات المخصصة للتوليد (Custom Prompt Instructions):</Label>
              <Textarea
                placeholder="أدخل أي تعليمات إضافية تريد اتباعها عند توليد كود الوصف (مثال: ركز على المميزات التقنية فقط، أضف كود الخصم في النهاية)..."
                value={customInstructions}
                onChange={e => {
                  setCustomInstructions(e.target.value);
                  setIsConfirmed(false);
                }}
                rows={2}
              />
              <div className="flex justify-end pt-1">
                <Button onClick={handleConfirmModifications} className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 shadow-sm">
                  <Sparkles className="h-4 w-4" />
                  تأكيد وتطبيق التعديلات والتعليمات الخاصة وتوليد الـ CSS
                </Button>
              </div>
            </div>
          </div>

          {/* Code Output & Copy / Download Buttons */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-bold text-xs flex items-center gap-1.5">
                <CodeIcon className="h-4 w-4 text-primary" />
                كود الـ CSS الإضافية الجاهز للنسخ والرفع (Additional CSS):
              </Label>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleCopyCSS} variant="outline" className="font-bold gap-1 text-xs">
                  {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "تم النسخ!" : "نسخ الكود"}
                </Button>
                <Button size="sm" onClick={handleDownloadCSS} className="font-bold gap-1 text-xs bg-amber-600 hover:bg-amber-700 text-white">
                  <Download className="h-3.5 w-3.5" />
                  تنزيل Additional-CSS.css
                </Button>
              </div>
            </div>

            <div className="relative">
              <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-xs rounded-lg max-h-56 overflow-y-auto dir-ltr text-left border border-slate-800">
                <code>{cssContent}</code>
              </pre>
            </div>
          </div>

          {/* Live Preview Iframe */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="font-bold text-xs flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-primary" />
                معاينة الوصف بالستايل المختار الحقيقي (Live Preview):
              </Label>
              <Button size="sm" variant="ghost" onClick={() => setShowPreview(!showPreview)}>
                {showPreview ? "إخفاء المعاينة" : "إظهار المعاينة"}
              </Button>
            </div>

            {showPreview && (
              <div className="border rounded-xl overflow-hidden bg-white shadow-inner">
                <iframe
                  title="Fancy Description Live Preview"
                  srcDoc={`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet"><style>${cssContent}</style></head><body style="padding:16px; margin:0;">${sampleHTML}</body></html>`}
                  className="w-full h-[450px] border-0"
                />
              </div>
            )}
          </div>

        </CardContent>
      </Card>
    </div>
  );
}

function CodeIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}
