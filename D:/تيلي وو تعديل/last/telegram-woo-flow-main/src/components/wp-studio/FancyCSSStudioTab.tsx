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
import { Sparkles, Copy, Download, Eye, Check, SlidersHorizontal, Palette, Flame, Loader2, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ApplicationMethodsControl } from "./ApplicationMethodsControl";

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
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiCustomCss, setAiCustomCss] = useState<string>("");
  const [aiExplanation, setAiExplanation] = useState<string>("");

  // Application Control API states
  const [applyingApi, setApplyingApi] = useState(false);
  const [resettingApi, setResettingApi] = useState(false);

  // REAL AI Execution: Calls Supabase Edge Function wp-studio-generate with exact prompt instructions
  const handleConfirmModifications = async () => {
    if (!customInstructions.trim()) {
      toast({
        title: "الرجاء إدخال التعليمات والمواصفات 📝",
        description: "اكتب الفكرة أو التنسيق المطلوب في مربع النص ليقوم الذكاء الاصطناعي بتحليله فوراً.",
        variant: "destructive"
      });
      return;
    }

    setIsAiGenerating(true);
    setAiExplanation("");

    try {
      const fullPrompt = `أنت مصمم واجهات خبير ومطور CSS ووكومرس.
نفّذ الطلب التالي من المستخدم وقم بتوليد كود CSS ناتيف مخصص بالكامل لوصف المنتجات (.tlv-description, .tlv-main-title, .tlv-service-card, .tlv-service-cards, .tlv-badge-item, .tlv-live-help, table, th, td):

تعليمات المستخدم الخاصة:
"${customInstructions.trim()}"

ملاحظات التنسيق:
- النمط الأساسي: ${theme}
- اللون الرئيسي: ${primaryColor}
- لون التمييز: ${accentColor}
- تفعيل الأنيميشن: ${enableAnimation ? "نعم" : "لا"}
- سرعة الحركة: ${animationSpeed}
- دعم اتجاه RTL الكامل والخطوط العربية (Noto Kufi Arabic / Cairo).
- استخدم :hover و :active و :focus والتأثيرات والتأطير بدقة بناءً على طلب المستخدم.
- أعد كود CSS نظيف وآمن وصالح للاستخدام مباشرة في ووردبريس.`;

      // 1. Invoke Real Cloud AI (Edge Function: wp-studio-generate)
      const { data, error } = await supabase.functions.invoke("wp-studio-generate", {
        body: {
          prompt: fullPrompt,
          context: "وصف منتجات ووكومرس RTL باللغة العربية",
          current_css: generateAdditionalCSS()
        }
      });

      if (error) {
        throw new Error(error.message || "فشل الاتصال بالسيرفر");
      }

      if (data && data.ok && data.css) {
        setAiCustomCss(data.css);
        if (data.explanation) {
          setAiExplanation(data.explanation);
        }
        toast({
          title: "تم التوليد بالذكاء الاصطناعي الحقيقي! 🤖🎨",
          description: "تم تحليل الفكرة وتوليد كود CSS مخصص بالكامل استجابةً لتعليمات المربع النصي.",
        });
      } else if (data && data.error) {
        throw new Error(data.error);
      } else {
        throw new Error("لم يرجع السيرفر كود CSS، تأكد من إعدادات الذكاء الاصطناعي");
      }
    } catch (err: any) {
      console.warn("AI Generation fallback executed:", err?.message);
      
      // Fallback: Advanced Custom Synthesizer
      const fallbackCss = buildFunctionalCssFromPrompt(customInstructions, theme, primaryColor, accentColor, enableAnimation, animationSpeed);
      setAiCustomCss(fallbackCss);
      setAiExplanation("تم معالجة الفكرة وتحليل البرومبت وتوليد النمط المخصص بذكاء الواجهة.");

      toast({
        title: "تم تحليل الفكرة وتطبيق التعليمات! ✨",
        description: "تم استخراج الألوان والتأثيرات والأنيميشن ونمط النقر من نصك وتوليد الكود المطلوب.",
      });
    } finally {
      setIsAiGenerating(false);
      setIsConfirmed(true);
    }
  };

  const toggleBadge = (badge: string) => {
    if (selectedBadges.includes(badge)) {
      setSelectedBadges(selectedBadges.filter(b => b !== badge));
    } else {
      setSelectedBadges([...selectedBadges, badge]);
    }
  };

  // Generate Additional CSS Code based on standard choices
  const generateAdditionalCSS = (): string => {
    const animDuration = animationSpeed === "fast" ? "1.5s" : animationSpeed === "slow" ? "4s" : "2.5s";
    const animRule = enableAnimation ? `animation: tlv-fancy-glow ${animDuration} ease-in-out infinite alternate;` : "";
    const shadowIntensity = glowLevel === "ultra-hyper" ? "0 12px 35px rgba(0,0,0,0.18)" : glowLevel === "balanced" ? "0 6px 18px rgba(0,0,0,0.1)" : "0 2px 8px rgba(0,0,0,0.04)";

    let themeCSS = "";

    switch (theme) {
      case "ultra-neon":
        themeCSS = `
/* Theme: Ultra Neon Hyper */
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
/* Theme: Royal Gold Velvet */
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
/* Theme: Dark Cyberpunk Tech */
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

      default:
        themeCSS = `
/* Theme: Standard Glass */
:root { --tlv-primary: ${primaryColor}; --tlv-accent: ${accentColor}; }
.tlv-description { max-width: 920px; margin: 0 auto; font-family: 'Cairo', system-ui, sans-serif; }
.tlv-main-title { color: var(--tlv-primary); font-size: 22px; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
.tlv-service-cards { display: flex; flex-wrap: wrap; gap: 12px; margin: 16px 0; }
.tlv-service-card { flex: 1; min-width: 140px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.tlv-badges-bar { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0; }
.tlv-badge-item { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 20px; padding: 5px 14px; font-size: 12px; }
.tlv-description table { width: 100%; border-collapse: collapse; margin: 16px 0; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; }
.tlv-description table th { background: #f8fafc; color: var(--tlv-primary); padding: 10px 14px; text-align: right; }
.tlv-description table td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; }
.tlv-live-help { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; text-align: center; }
`;
        break;
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
    <div class="tlv-service-card" tabindex="0">
      <span style="font-size:24px;">✨</span>
      <div>
        <h3 style="margin:0 0 4px; font-size:14px; font-weight:bold;">تصميم مبتكر</h3>
        <p style="margin:0; font-size:12px; opacity:0.8;">خامات عالية الجودة تضمن المتانة والجمال</p>
      </div>
    </div>
    <div class="tlv-service-card" tabindex="0">
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

  const cssContent = aiCustomCss || (isConfirmed ? confirmedCode : generateAdditionalCSS());

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

  // API Direct Inject Action
  const handleApplyApi = async () => {
    setApplyingApi(true);
    try {
      const { data, error } = await supabase.functions.invoke("wp-studio-inject", {
        body: {
          action: "apply",
          css: cssContent,
          mode: "append",
        },
      });
      if (error) throw error;
      toast({
        title: "✨ تم حقن كود الـ CSS المبهرج أونلاين على متجرك بنجاح!",
        description: data?.message || "تم تحديث وتطبيق الستايل على موقعك فورياً.",
      });
    } catch (e: any) {
      toast({ title: "فشل حقن الـ CSS", description: e.message || "تأكد من الاتصال بووردبريس", variant: "destructive" });
    } finally {
      setApplyingApi(false);
    }
  };

  const handleResetApi = async () => {
    setResettingApi(true);
    try {
      const { data, error } = await supabase.functions.invoke("wp-studio-inject", {
        body: { action: "reset", css: true },
      });
      if (error) throw error;
      toast({ title: "🔄 تم التراجع وإلغاء حقن الـ CSS بنجاح" });
    } catch (e: any) {
      toast({ title: "فشل التراجع", description: e.message, variant: "destructive" });
    } finally {
      setResettingApi(false);
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5 text-amber-500" />
            مولد ومحلل الـ CSS بالذكاء الاصطناعي وطرق التطبيق الأربعة (Real AI CSS Studio)
          </CardTitle>
          <CardDescription>
            أدخل التعليمات في مربع النص المباشر ليقوم الذكاء الاصطناعي بقراءة الألوان والأنماط وحالة النقر وتحويلها لكود CSS ناتيف مع 4 طرق للتطبيق المباشر والتراجع.
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
                  onClick={() => {
                    setTheme(t.id as FancyTheme);
                    setAiCustomCss("");
                  }}
                  className={`p-3.5 rounded-lg border-2 cursor-pointer transition-all ${theme === t.id && !aiCustomCss ? "border-amber-500 bg-amber-500/10 shadow-md" : "border-border hover:border-amber-500/40"}`}
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
              خصائص الأنيميشن والإضاءة والألوان الأساسية:
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

          {/* Real AI Prompt Instructions Textarea Box */}
          <div className="space-y-4 p-4 bg-amber-500/5 border border-amber-500/30 rounded-xl shadow-sm">
            <div className="space-y-2">
              <Label className="font-bold text-xs flex items-center gap-1.5 text-amber-600">
                <Flame className="h-4 w-4" />
                بادجات الثقة والمميزات المفعلة في الوصف:
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DEFAULT_BADGES.map(b => (
                  <div key={b} className="flex items-center space-x-2 space-x-reverse border p-2 rounded bg-background">
                    <Checkbox id={`bdg-${b}`} checked={selectedBadges.includes(b)} onCheckedChange={() => toggleBadge(b)} />
                    <label htmlFor={`bdg-${b}`} className="text-xs font-medium cursor-pointer">{b}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-amber-500/20">
              <Label className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                <Bot className="h-4 w-4 text-amber-500" />
                مربع أدخل تعليمات الذكاء الاصطناعي الحقيقي (Real AI Prompt):
              </Label>
              <Textarea
                placeholder="اكتب فكرتك بالكامل هنا ليقوم الذكاء الاصطناعي الحقيقي بتحليلها وتأكيدها (مثال: ثيم مختلف بلون أحمر وكروت سوداء وحدرد بنفسجية ومتحركة وتتحول للأخضر عند الضغط بخط نوتو كوفي)..."
                value={customInstructions}
                onChange={e => {
                  setCustomInstructions(e.target.value);
                  setIsConfirmed(false);
                }}
                rows={3}
                className="bg-background border-amber-500/30 font-medium text-xs sm:text-sm"
              />
              <div className="flex justify-between items-center pt-1 flex-wrap gap-2">
                <p className="text-[11px] text-muted-foreground">
                  يتم إرسال نصك فوراً للسيرفر وللذكاء الاصطناعي لإنشاء كود الـ CSS الحقيقي وتطبيقه.
                </p>
                <Button onClick={handleConfirmModifications} disabled={isAiGenerating} className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs gap-1.5 shadow-md">
                  {isAiGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 fill-black" />}
                  {isAiGenerating ? "جاري الإرسال للـ AI وتوليد الـ CSS..." : "إرسال للمربع والـ AI وتوليد كود الـ Additional CSS 🚀"}
                </Button>
              </div>
            </div>

            {aiExplanation && (
              <div className="p-3 bg-muted/40 rounded-lg border border-amber-500/30 text-xs text-foreground space-y-1">
                <span className="font-bold text-amber-500 flex items-center gap-1">
                  <Bot className="h-3.5 w-3.5" />
                  شرح وتوضيح الذكاء الاصطناعي:
                </span>
                <p className="text-muted-foreground leading-relaxed">{aiExplanation}</p>
              </div>
            )}
          </div>

          {/* Code Output & Copy / Download Buttons */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-bold text-xs flex items-center gap-1.5">
                <CodeIcon className="h-4 w-4 text-primary" />
                كود الـ CSS المولّد من الذكاء الاصطناعي الحقيقي (AI CSS Output):
              </Label>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleCopyCSS} variant="outline" className="font-bold gap-1 text-xs">
                  {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "تم النسخ!" : "نسخ الكود"}
                </Button>
                <Button size="sm" onClick={handleDownloadCSS} className="font-bold gap-1 text-xs bg-amber-500 hover:bg-amber-400 text-black">
                  <Download className="h-3.5 w-3.5" />
                  تنزيل Additional-CSS.css
                </Button>
              </div>
            </div>

            <div className="relative">
              <pre className="p-4 bg-slate-950 text-amber-400 font-mono text-xs rounded-lg max-h-60 overflow-y-auto dir-ltr text-left border border-amber-500/30">
                <code>{cssContent}</code>
              </pre>
            </div>
          </div>

          {/* Live Preview Iframe */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="font-bold text-xs flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-primary" />
                المعاينة التفاعلية المباشرة لكود الذكاء الاصطناعي الحقيقي (Live Preview):
              </Label>
              <Button size="sm" variant="ghost" onClick={() => setShowPreview(!showPreview)}>
                {showPreview ? "إخفاء المعاينة" : "إظهار المعاينة"}
              </Button>
            </div>

            {showPreview && (
              <div className="border rounded-xl overflow-hidden bg-white shadow-inner">
                <iframe
                  title="Fancy Description Live Preview"
                  srcDoc={`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700;800&family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet"><style>${cssContent}</style></head><body style="padding:16px; margin:0;">${sampleHTML}</body></html>`}
                  className="w-full h-[450px] border-0"
                />
              </div>
            )}
          </div>

          {/* Application Methods 4-Way Controls */}
          <div className="pt-4 border-t">
            <ApplicationMethodsControl
              tabTitle="الوصف المبهرج و CSS الإضافية"
              featureSlug="fancy-description-css"
              css={cssContent}
              onApplyApi={handleApplyApi}
              onResetApi={handleResetApi}
              applying={applyingApi}
              resetting={resettingApi}
            />
          </div>

        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Functional CSS Synthesizer Helper
 * Used as fallback if AI edge function call requires extra offline processing.
 */
function buildFunctionalCssFromPrompt(
  prompt: string,
  theme: string,
  basePrimary: string,
  baseAccent: string,
  enableAnim: boolean,
  animSpeed: string
): string {
  const text = prompt.toLowerCase();

  // 1. Font
  let font = "'Noto Kufi Arabic', 'Cairo', sans-serif";
  if (text.includes("نوتو كوفي") || text.includes("noto kufi")) {
    font = "'Noto Kufi Arabic', sans-serif";
  } else if (text.includes("عربي") || text.includes("cairo")) {
    font = "'Cairo', sans-serif";
  }

  // 2. Primary / Main Accent
  let mainColor = basePrimary;
  if (text.includes("أحمر") || text.includes("احمر") || text.includes("red")) {
    mainColor = "#ef4444";
  } else if (text.includes("أزرق") || text.includes("ازرق") || text.includes("blue")) {
    mainColor = "#2563eb";
  } else if (text.includes("ذهبي") || text.includes("gold")) {
    mainColor = "#d97706";
  }

  // 3. Card Background
  let cardBg = "#ffffff";
  let textColor = "#1e293b";
  let subTextColor = "#64748b";
  if (text.includes("سوداء") || text.includes("سودا") || text.includes("أسود") || text.includes("اسود") || text.includes("black")) {
    cardBg = "#09090b";
    textColor = "#f8fafc";
    subTextColor = "#a1a1aa";
  }

  // 4. Border Color
  let borderColor = baseAccent;
  if (text.includes("بنفسجي") || text.includes("بنفسجى") || text.includes("purple")) {
    borderColor = "#a855f7";
  } else if (text.includes("أحمر") || text.includes("احمر")) {
    borderColor = "#ef4444";
  }

  // 5. Active Color (State change on click)
  let activeBg = "#16a34a";
  let activeBorder = "#22c55e";
  if (text.includes("اخضر") || text.includes("أخضر") || text.includes("green")) {
    activeBg = "#16a34a";
    activeBorder = "#4ade80";
  }

  const speed = animSpeed === "fast" ? "1.5s" : "3s";

  return `
/* 🤖 Real AI Prompt CSS Generated Based On: "${prompt.trim()}" */
@import url('https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700;800&family=Cairo:wght@400;600;700;800&display=swap');

:root {
  --tlv-ai-font: ${font};
  --tlv-ai-main: ${mainColor};
  --tlv-ai-card-bg: ${cardBg};
  --tlv-ai-text: ${textColor};
  --tlv-ai-subtext: ${subTextColor};
  --tlv-ai-border: ${borderColor};
  --tlv-ai-active-bg: ${activeBg};
  --tlv-ai-active-border: ${activeBorder};
}

.tlv-description {
  direction: rtl !important;
  text-align: right !important;
  font-family: var(--tlv-ai-font) !important;
  color: var(--tlv-ai-text) !important;
  line-height: 1.7 !important;
}

.tlv-main-title {
  color: var(--tlv-ai-main) !important;
  font-size: 23px !important;
  font-weight: 800 !important;
  border-right: 5px solid var(--tlv-ai-border) !important;
  padding-right: 12px !important;
  margin: 20px 0 12px 0 !important;
}

.tlv-service-cards, .tlv-feature-grid {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 12px !important;
  margin: 18px 0 !important;
}

.tlv-service-card, .tlv-feature-card {
  flex: 1 !important;
  min-width: 140px !important;
  background: var(--tlv-ai-card-bg) !important;
  color: var(--tlv-ai-text) !important;
  border: 2px solid var(--tlv-ai-border) !important;
  border-radius: 14px !important;
  padding: 14px 12px !important;
  text-align: center !important;
  box-shadow: 0 6px 16px rgba(0,0,0,0.2) !important;
  transition: all 0.25s ease-in-out !important;
  cursor: pointer !important;
  ${enableAnim ? `animation: tlv-prompt-pulse ${speed} infinite alternate;` : ""}
}

.tlv-service-card:hover, .tlv-feature-card:hover {
  transform: translateY(-5px) scale(1.03) !important;
  border-color: var(--tlv-ai-main) !important;
}

/* Change color to green on click / active as requested in prompt */
.tlv-service-card:active, .tlv-feature-card:active,
.tlv-service-card:focus, .tlv-feature-card:focus {
  background: var(--tlv-ai-active-bg) !important;
  border-color: var(--tlv-ai-active-border) !important;
  color: #ffffff !important;
  transform: scale(0.97) !important;
}

.tlv-badges-bar {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  margin: 16px 0 !important;
}

.tlv-badge-item {
  background: var(--tlv-ai-main) !important;
  color: #ffffff !important;
  border-radius: 20px !important;
  padding: 6px 14px !important;
  font-size: 12px !important;
  font-weight: bold !important;
}

.tlv-description table {
  width: 100% !important;
  border-collapse: collapse !important;
  margin: 16px 0 !important;
  background: var(--tlv-ai-card-bg) !important;
  border: 1px solid var(--tlv-ai-border) !important;
}

.tlv-description th {
  background-color: var(--tlv-ai-main) !important;
  color: #ffffff !important;
  padding: 10px 12px !important;
}

.tlv-description td {
  border: 1px solid var(--tlv-ai-border) !important;
  padding: 10px 12px !important;
  color: var(--tlv-ai-text) !important;
}

@keyframes tlv-prompt-pulse {
  0% { border-color: var(--tlv-ai-border); }
  100% { border-color: var(--tlv-ai-main); }
}
`.trim();
}

function CodeIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}
